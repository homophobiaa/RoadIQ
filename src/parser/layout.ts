// Layout & color detection — the heuristic heart of the parser.
//
// ASSUMPTIONS (Avtoizpit / listovki result screens, mobile):
//   - Light background.
//   - Title is a wide text area at the top.
//   - Answers are large horizontal cards stacked vertically.
//   - Correct answer → GREEN check icon; wrong answer → RED X icon (commonly on
//     the right; sometimes the whole row is tinted green/red).
//   - Optional "situation" photo, usually left/middle, between title and answers.
//   - Some questions are text-only (no photo).
//
// STRATEGY (icon-first, per the brief):
//   1. Find green/red icon blobs via connected-components on a downscaled mask.
//   2. Group blobs by vertical position → one answer row per icon Y.
//   3. Derive row boxes from icon Ys; OCR the text area excluding the icon side.
//   4. Title = region above the first row; situation = large photo-ish band.
//   5. Fallback: if no icons, detect large grey answer cards so rows still exist
//      for manual correction.
//
// Deliberately simple: surface warnings rather than chase perfection. The debug
// editor is the safety net for whatever this gets wrong.

import type { LoadedImage, Rect } from "./imageUtils";
import type { IconDot } from "../types";

export interface AnswerBand {
  rect: Rect;
  correct: boolean;
  /** Horizontal position of the icon/tint centroid, 0..1. */
  iconCenterX: number;
  /** True when correctness was guessed (grey-card fallback), not icon-derived. */
  uncertain: boolean;
}

export interface LayoutResult {
  titleRect: Rect | null;
  situationRect: Rect | null;
  answerBands: AnswerBand[];
  iconDots: IconDot[];
  warnings: string[];
}

// --- Pixel classifiers ---
function isGreen(r: number, g: number, b: number): boolean {
  return g > 90 && g - r > 30 && g - b > 18;
}
function isRed(r: number, g: number, b: number): boolean {
  return r > 105 && r - g > 40 && r - b > 30;
}
/** Photo pixel: saturated color OR mid-tone gray (sky/asphalt shading). */
function isPhoto(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 35 && max > 60) return true;
  if (max > 60 && max < 215 && max - min < 25) return true;
  return false;
}
/** Light-grey answer-card background (distinct from near-white canvas). */
function isCardGrey(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 18 && max >= 205 && max <= 244;
}

interface Component {
  green: number;
  red: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  cx: number;
  cy: number;
  size: number;
}

/** Connected-components over a downscaled green|red mask. */
function findIconBlobs(src: LoadedImage): Component[] {
  const { width, height, data } = src;
  const d = data.data;
  const ds = Math.max(1, Math.floor(width / 200));
  const mw = Math.ceil(width / ds);
  const mh = Math.ceil(height / ds);
  const kind = new Uint8Array(mw * mh); // 0 none, 1 green, 2 red

  for (let my = 0; my < mh; my++) {
    const sy = Math.min(height - 1, my * ds);
    for (let mx = 0; mx < mw; mx++) {
      const sx = Math.min(width - 1, mx * ds);
      const i = (sy * width + sx) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (isGreen(r, g, b)) kind[my * mw + mx] = 1;
      else if (isRed(r, g, b)) kind[my * mw + mx] = 2;
    }
  }

  const seen = new Uint8Array(mw * mh);
  const comps: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < mw * mh; start++) {
    if (!kind[start] || seen[start]) continue;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    let green = 0;
    let red = 0;
    let minX = mw;
    let maxX = 0;
    let minY = mh;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;
    let size = 0;
    while (stack.length) {
      const idx = stack.pop()!;
      const x = idx % mw;
      const y = (idx / mw) | 0;
      if (kind[idx] === 1) green++;
      else red++;
      size++;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      // 4-neighbours
      const nb = [idx - 1, idx + 1, idx - mw, idx + mw];
      if (x === 0) nb[0] = -1;
      if (x === mw - 1) nb[1] = -1;
      for (const n of nb) {
        if (n < 0 || n >= mw * mh || seen[n] || !kind[n]) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    comps.push({
      green,
      red,
      minX: minX * ds,
      maxX: maxX * ds,
      minY: minY * ds,
      maxY: maxY * ds,
      cx: (sumX / size) * ds,
      cy: (sumY / size) * ds,
      size,
    });
  }
  // Drop tiny noise (anti-aliasing specks).
  const minSize = Math.max(2, Math.round((mw * mh) / 6000));
  return comps.filter((c) => c.size >= minSize);
}

interface RowGroup {
  top: number;
  bottom: number;
  cx: number;
  green: number;
  red: number;
}

/** Group icon blobs whose vertical extents overlap → one answer row each. */
function groupRows(comps: Component[], height: number): RowGroup[] {
  if (comps.length === 0) return [];
  const sorted = [...comps].sort((a, b) => a.cy - b.cy);
  const gap = Math.round(height * 0.012);
  const groups: RowGroup[] = [];
  for (const c of sorted) {
    const last = groups[groups.length - 1];
    if (last && c.minY <= last.bottom + gap) {
      last.top = Math.min(last.top, c.minY);
      last.bottom = Math.max(last.bottom, c.maxY);
      last.green += c.green;
      last.red += c.red;
      // Weight centroid toward the dominant blob.
      last.cx = (last.cx + c.cx) / 2;
    } else {
      groups.push({ top: c.minY, bottom: c.maxY, cx: c.cx, green: c.green, red: c.red });
    }
  }
  return groups;
}

/** Per-row profile of grey-card pixels, for the no-icon fallback. */
function greyCardBands(src: LoadedImage, fromY: number): RowGroup[] {
  const { width, height, data } = src;
  const d = data.data;
  const stride = Math.max(1, Math.floor(width / 240));
  const ratio = new Float32Array(height);
  const samples = Math.ceil(width / stride);
  for (let y = fromY; y < height; y++) {
    let n = 0;
    const base = y * width * 4;
    for (let x = 0; x < width; x += stride) {
      const i = base + x * 4;
      if (isCardGrey(d[i], d[i + 1], d[i + 2])) n++;
    }
    ratio[y] = n / samples;
  }
  // Bands where >40% of the row is card-grey, min height ~2% of image.
  const bands: RowGroup[] = [];
  const minH = Math.round(height * 0.02);
  let start = -1;
  for (let y = fromY; y <= height; y++) {
    const on = y < height && ratio[y] > 0.4;
    if (on && start === -1) start = y;
    else if (!on && start !== -1) {
      if (y - start >= minH) bands.push({ top: start, bottom: y, cx: width / 2, green: 0, red: 0 });
      start = -1;
    }
  }
  return bands;
}

export function detectLayout(src: LoadedImage): LayoutResult {
  const { width, height } = src;
  const warnings: string[] = [];

  // 1) Icon blobs → rows.
  const blobs = findIconBlobs(src);
  const iconDots: IconDot[] = blobs.map((c) => ({
    x: c.cx,
    y: c.cy,
    correct: c.green >= c.red,
  }));
  let rows = groupRows(blobs, height);
  let uncertain = false;

  // 2) Fallback: no icons → grey answer cards (correctness unknown).
  if (rows.length === 0) {
    warnings.push("Не са открити зелени/червени икони — използвам сиви карти (непроверено).");
    rows = greyCardBands(src, Math.round(height * 0.1));
    uncertain = true;
    if (rows.length === 0) warnings.push("Не са открити и сиви карти с отговори.");
  }

  const pad = Math.round(height * 0.006);
  const answerBands: AnswerBand[] = rows.map((g) => ({
    rect: {
      x: 0,
      y: Math.max(0, g.top - pad),
      w: width,
      h: Math.min(height, g.bottom + pad) - Math.max(0, g.top - pad),
    },
    correct: uncertain ? false : g.green >= g.red,
    iconCenterX: g.cx / width,
    uncertain,
  }));

  const firstRowTop = answerBands.length ? answerBands[0].rect.y : Math.round(height * 0.85);

  // 3) Situation image: largest photo-ish band above the first row.
  const situationRect = detectSituation(src, firstRowTop);

  // 4) Title: text region between top and situation/first row.
  const titleTop = Math.round(height * 0.02);
  const titleBottom = situationRect ? situationRect.y : firstRowTop;
  let titleRect: Rect | null = null;
  if (titleBottom - titleTop > height * 0.02) {
    titleRect = { x: 0, y: titleTop, w: width, h: titleBottom - titleTop };
  } else {
    warnings.push("Заглавната зона е твърде малка — възможно неточно разпознаване.");
  }

  return { titleRect, situationRect, answerBands, iconDots, warnings };
}

function detectSituation(src: LoadedImage, firstRowTop: number): Rect | null {
  const { width, height, data } = src;
  const d = data.data;
  const stride = Math.max(1, Math.floor(width / 240));
  const samples = Math.ceil(width / stride);
  const ratio = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    let n = 0;
    const base = y * width * 4;
    for (let x = 0; x < width; x += stride) {
      const i = base + x * 4;
      if (isPhoto(d[i], d[i + 1], d[i + 2])) n++;
    }
    ratio[y] = n / samples;
  }
  let best: { top: number; bottom: number } | null = null;
  let start = -1;
  const minH = Math.round(height * 0.05);
  for (let y = Math.round(height * 0.03); y <= firstRowTop; y++) {
    const on = y < firstRowTop && ratio[y] > 0.22;
    if (on && start === -1) start = y;
    else if (!on && start !== -1) {
      if (y - start >= minH && (!best || y - start > best.bottom - best.top)) {
        best = { top: start, bottom: y };
      }
      start = -1;
    }
  }
  if (!best) return null;
  return { x: 0, y: best.top, w: width, h: best.bottom - best.top };
}

/**
 * Text crop for an answer band, excluding the icon column. Icons usually sit on
 * the right; we cut whichever side the icon centroid favours. Tinted full rows
 * (centroid near middle) keep full width.
 */
export function answerTextRect(band: AnswerBand, width: number): Rect {
  const r = band.rect;
  const iconZone = 0.16;
  if (band.iconCenterX > 1 - iconZone) {
    return { x: 0, y: r.y, w: Math.round(width * (1 - iconZone)), h: r.h };
  }
  if (band.iconCenterX < iconZone) {
    const cut = Math.round(width * iconZone);
    return { x: cut, y: r.y, w: width - cut, h: r.h };
  }
  return { x: 0, y: r.y, w: width, h: r.h };
}
