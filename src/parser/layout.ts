// Layout & color detection — the heuristic heart of the parser.
//
// ZONES of an Avtoizpit / listovki result screen:
//   1. Top title/question band.
//   2. Optional situation picture (stacked under title, OR left of answers).
//   3. Answer rows.
//   4. Far-right green (correct) / red (wrong) correctness icons.
//
// RULES enforced here:
//   - Answer rows are derived ONLY from right-side green/red icons. The title is
//     never derived from row detection and can never become an answer.
//   - Title = region strictly ABOVE the first answer row (top header icons are
//     dropped so a logo/checkmark in the header can't spawn a row).
//   - Supports 2,3,4+ answers — no fixed count.
//   - Situation image: auto-added only when a clear photo band sits above the
//     answers (stacked). A left-of-answers image is detected only to exclude it
//     from answer-text crops and is flagged for MANUAL crop, never auto-shown.

import type { LoadedImage, Rect } from "./imageUtils";
import type { IconDot } from "../types";

export interface AnswerBand {
  rect: Rect; // full row band (analysis coords)
  textRect: Rect; // text-only crop (excludes icon column + any left image)
  correct: boolean;
  uncertain: boolean; // correctness guessed (grey-card fallback)
  iconCenterX: number;
}

export interface LayoutResult {
  titleRect: Rect | null;
  situationRect: Rect | null; // auto situation (stacked, confident)
  /** Possible left-side image, for debug overlay + manual-crop hint only. */
  sideImageRect: Rect | null;
  answerBands: AnswerBand[];
  iconDots: IconDot[];
  warnings: string[];
}

// --- Pixel classifiers ---
function isGreen(r: number, g: number, b: number) {
  return g > 90 && g - r > 30 && g - b > 18;
}
function isRed(r: number, g: number, b: number) {
  return r > 105 && r - g > 40 && r - b > 30;
}
function isPhoto(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 35 && max > 60) return true; // saturated
  if (max > 60 && max < 215 && max - min < 25) return true; // mid-gray shading
  return false;
}
function isCardGrey(r: number, g: number, b: number) {
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
  const ds = Math.max(1, Math.floor(width / 220));
  const mw = Math.ceil(width / ds);
  const mh = Math.ceil(height / ds);
  const kind = new Uint8Array(mw * mh);
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
      const nb = [idx - 1, idx + 1, idx - mw, idx + mw];
      if (x === 0) nb[0] = -1;
      if (x === mw - 1) nb[1] = -1;
      for (const nidx of nb) {
        if (nidx < 0 || nidx >= mw * mh || seen[nidx] || !kind[nidx]) continue;
        seen[nidx] = 1;
        stack.push(nidx);
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
      last.cx = (last.cx + c.cx) / 2;
    } else {
      groups.push({ top: c.minY, bottom: c.maxY, cx: c.cx, green: c.green, red: c.red });
    }
  }
  return groups;
}

function greyCardBands(src: LoadedImage, fromY: number): RowGroup[] {
  const { width, height, data } = src;
  const d = data.data;
  const stride = Math.max(1, Math.floor(width / 240));
  const samples = Math.ceil(width / stride);
  const ratio = new Float32Array(height);
  for (let y = fromY; y < height; y++) {
    let n = 0;
    const base = y * width * 4;
    for (let x = 0; x < width; x += stride) {
      const i = base + x * 4;
      if (isCardGrey(d[i], d[i + 1], d[i + 2])) n++;
    }
    ratio[y] = n / samples;
  }
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

/** Photo ratio per row, full width — for the stacked situation band. */
function photoRowRatio(src: LoadedImage): Float32Array {
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
  return ratio;
}

/**
 * Detects a left-of-answers image block within the content Y-range by scanning
 * column photo-richness. Returns the right edge X of the image (0 if none).
 */
function detectSideImageRight(src: LoadedImage, top: number, bottom: number): number {
  const { width, data } = src;
  const d = data.data;
  const ystride = Math.max(1, Math.floor((bottom - top) / 60));
  const cols = Math.min(width, 200);
  const colW = width / cols;
  let runEnd = 0;
  for (let c = 0; c < cols; c++) {
    const x = Math.min(width - 1, Math.round(c * colW));
    let photo = 0;
    let n = 0;
    for (let y = top; y < bottom; y += ystride) {
      const i = (y * width + x) * 4;
      if (isPhoto(d[i], d[i + 1], d[i + 2])) photo++;
      n++;
    }
    if (n > 0 && photo / n > 0.5) runEnd = x;
    else if (x > width * 0.05) break; // run broke after a real start
  }
  // Valid side image: ends between 12% and 55% of width.
  if (runEnd > width * 0.12 && runEnd < width * 0.55) return runEnd;
  return 0;
}

export function detectLayout(src: LoadedImage): LayoutResult {
  const { width, height } = src;
  const warnings: string[] = [];

  const blobs = findIconBlobs(src);
  const iconDots: IconDot[] = blobs.map((c) => ({ x: c.cx, y: c.cy, correct: c.green >= c.red }));

  // Drop top-header blobs (logos/badges) so they never form a row → title stays title.
  const rowBlobs = blobs.filter((c) => c.cy >= height * 0.1);
  let rows = groupRows(rowBlobs, height);
  let uncertain = false;

  if (rows.length === 0) {
    warnings.push("Не са открити зелени/червени икони — използвам сиви карти (непроверено).");
    rows = greyCardBands(src, Math.round(height * 0.14));
    uncertain = true;
    if (rows.length === 0) warnings.push("Не са открити и сиви карти с отговори.");
  }

  const firstRowTop = rows.length ? rows[0].top : Math.round(height * 0.85);
  const lastRowBottom = rows.length ? rows[rows.length - 1].bottom : height;

  // --- Situation: stacked photo band fully above the answers (confident). ---
  let situationRect: Rect | null = null;
  if (rows.length) {
    const pr = photoRowRatio(src);
    let start = -1;
    let best: { top: number; bottom: number } | null = null;
    const minH = Math.round(height * 0.06);
    for (let y = Math.round(height * 0.03); y <= firstRowTop; y++) {
      const on = y < firstRowTop && pr[y] > 0.25;
      if (on && start === -1) start = y;
      else if (!on && start !== -1) {
        if (y - start >= minH && (!best || y - start > best.bottom - best.top)) {
          best = { top: start, bottom: y };
        }
        start = -1;
      }
    }
    if (best) situationRect = { x: 0, y: best.top, w: width, h: best.bottom - best.top };
  }

  // --- Side image (left of answers): exclude from text crops + flag manual. ---
  const sideImageRightX = situationRect
    ? 0
    : detectSideImageRight(src, firstRowTop, lastRowBottom);
  let sideImageRect: Rect | null = null;
  if (sideImageRightX > 0) {
    sideImageRect = { x: 0, y: firstRowTop, w: sideImageRightX, h: lastRowBottom - firstRowTop };
    warnings.push("Възможно изображение до отговорите — нужно е ръчно изрязване.");
  }

  // --- Title: strictly above situation/first row. ---
  const titleTop = Math.round(height * 0.02);
  const titleBottom = situationRect ? situationRect.y : firstRowTop;
  let titleRect: Rect | null = null;
  if (titleBottom - titleTop > height * 0.02) {
    titleRect = { x: 0, y: titleTop, w: width, h: titleBottom - titleTop };
  } else {
    warnings.push("Заглавната зона е твърде малка — възможно неточно разпознаване.");
  }

  // --- Build answer bands with text-only crop rects. ---
  const pad = Math.round(height * 0.006);
  const iconMarginX = Math.round(width * 0.16); // far-right icon column width
  const answerBands: AnswerBand[] = rows.map((g) => {
    const y = Math.max(0, g.top - pad);
    const h = Math.min(height, g.bottom + pad) - y;
    const iconCenterX = g.cx / width;
    // Icons assumed on the right; cut the right icon column. If a side image is
    // present, also cut it from the left.
    let textX = sideImageRightX > 0 ? sideImageRightX + Math.round(width * 0.01) : 0;
    let textW = width - iconMarginX - textX;
    // Rare: icon actually on the left → cut left instead.
    if (iconCenterX < 0.35 && sideImageRightX === 0) {
      textX = iconMarginX;
      textW = width - iconMarginX;
    }
    if (textW < width * 0.1) {
      textX = 0;
      textW = width - iconMarginX;
    }
    return {
      rect: { x: 0, y, w: width, h },
      textRect: { x: textX, y, w: textW, h },
      correct: uncertain ? false : g.green >= g.red,
      uncertain,
      iconCenterX,
    };
  });

  return { titleRect, situationRect, sideImageRect, answerBands, iconDots, warnings };
}
