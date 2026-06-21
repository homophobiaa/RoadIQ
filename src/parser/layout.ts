// Layout & color detection. This is the heuristic heart of the parser.
//
// ASSUMPTIONS about Avtoizpit / listovki result screenshots (mobile app):
//   - White/light background.
//   - Question title is text near the top.
//   - An optional "situation" photo (road scene) sits between title and answers.
//   - Answers are stacked horizontal rows.
//   - Correctness is signalled with strong GREEN (correct) / RED (wrong) — either
//     as a check/X icon OR as a tinted row background. Both cases produce a
//     horizontal band dominated by green/red pixels, which is what we detect.
//
// Everything here works on a row-profile of green/red pixel counts. It is
// deliberately simple: prioritise a working MVP and surface warnings rather than
// chase pixel-perfect detection.

import type { LoadedImage, Rect } from "./imageUtils";

export interface AnswerBand {
  rect: Rect;
  correct: boolean;
  /** Where the colored icon/tint concentrates horizontally: 0..1. */
  iconCenterX: number;
  greenScore: number;
  redScore: number;
}

export interface LayoutResult {
  titleRect: Rect | null;
  situationRect: Rect | null;
  answerBands: AnswerBand[];
  warnings: string[];
}

function isGreen(r: number, g: number, b: number): boolean {
  return g > 95 && g - r > 35 && g - b > 20;
}
function isRed(r: number, g: number, b: number): boolean {
  return r > 110 && r - g > 45 && r - b > 35;
}
/** Pixel that likely belongs to a photo: saturated or mid-tone gray (shading). */
function isPhoto(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 35 && max > 60) return true; // saturated color
  if (max > 60 && max < 215 && max - min < 25) return true; // mid gray (sky/asphalt)
  return false;
}

/** Build per-row green/red/photo pixel ratios. Sample every `stride` px in x. */
function rowProfiles(src: LoadedImage) {
  const { width, height, data } = src;
  const d = data.data;
  const stride = Math.max(1, Math.floor(width / 320));
  const green = new Float32Array(height);
  const red = new Float32Array(height);
  const photo = new Float32Array(height);
  const samplesPerRow = Math.ceil(width / stride);

  for (let y = 0; y < height; y++) {
    let g = 0;
    let r = 0;
    let p = 0;
    const base = y * width * 4;
    for (let x = 0; x < width; x += stride) {
      const i = base + x * 4;
      const R = d[i];
      const G = d[i + 1];
      const B = d[i + 2];
      if (isGreen(R, G, B)) g++;
      else if (isRed(R, G, B)) r++;
      if (isPhoto(R, G, B)) p++;
    }
    green[y] = g / samplesPerRow;
    red[y] = r / samplesPerRow;
    photo[y] = p / samplesPerRow;
  }
  return { green, red, photo, stride, samplesPerRow };
}

interface Segment {
  top: number;
  bottom: number;
}

/** Merge consecutive rows above `thresh` into segments, dropping thin noise. */
function segmentsAbove(profile: Float32Array, thresh: number, minHeight: number): Segment[] {
  const segs: Segment[] = [];
  let start = -1;
  for (let y = 0; y < profile.length; y++) {
    const on = profile[y] >= thresh;
    if (on && start === -1) start = y;
    else if (!on && start !== -1) {
      if (y - start >= minHeight) segs.push({ top: start, bottom: y });
      start = -1;
    }
  }
  if (start !== -1 && profile.length - start >= minHeight) {
    segs.push({ top: start, bottom: profile.length });
  }
  return segs;
}

/** For a vertical band, find horizontal centroid of green+red pixels (0..1). */
function iconCentroidX(src: LoadedImage, top: number, bottom: number): number {
  const { width, data } = src;
  const d = data.data;
  let sum = 0;
  let count = 0;
  const stride = Math.max(1, Math.floor(width / 320));
  for (let y = top; y < bottom; y++) {
    const base = y * width * 4;
    for (let x = 0; x < width; x += stride) {
      const i = base + x * 4;
      const R = d[i];
      const G = d[i + 1];
      const B = d[i + 2];
      if (isGreen(R, G, B) || isRed(R, G, B)) {
        sum += x;
        count++;
      }
    }
  }
  if (count === 0) return 0.5;
  return sum / count / width;
}

export function detectLayout(src: LoadedImage): LayoutResult {
  const { width, height } = src;
  const warnings: string[] = [];
  const { green, red, photo } = rowProfiles(src);

  // --- Answer bands: rows where green OR red is clearly present. ---
  const combined = new Float32Array(height);
  for (let y = 0; y < height; y++) combined[y] = Math.max(green[y], red[y]);
  const minBandHeight = Math.max(6, Math.round(height * 0.012));
  let bandSegs = segmentsAbove(combined, 0.06, minBandHeight);

  // Merge segments separated by tiny gaps (icon + nearby tint fragments).
  const merged: Segment[] = [];
  const gapTol = Math.round(height * 0.015);
  for (const s of bandSegs) {
    const last = merged[merged.length - 1];
    if (last && s.top - last.bottom <= gapTol) last.bottom = s.bottom;
    else merged.push({ ...s });
  }
  bandSegs = merged;

  const answerBands: AnswerBand[] = bandSegs.map((s) => {
    // Score each color across the band to decide correct vs wrong.
    let gScore = 0;
    let rScore = 0;
    for (let y = s.top; y < s.bottom; y++) {
      gScore += green[y];
      rScore += red[y];
    }
    const correct = gScore >= rScore;
    const iconCenterX = iconCentroidX(src, s.top, s.bottom);
    // Pad band vertically a touch so text above/below the tint is captured.
    const pad = Math.round(height * 0.004);
    const rect: Rect = {
      x: 0,
      y: Math.max(0, s.top - pad),
      w: width,
      h: Math.min(height, s.bottom + pad) - Math.max(0, s.top - pad),
    };
    return { rect, correct, iconCenterX, greenScore: gScore, redScore: rScore };
  });

  if (answerBands.length === 0) warnings.push("Не са открити цветни редове с отговори.");

  const firstAnswerTop = answerBands.length ? answerBands[0].rect.y : Math.round(height * 0.85);

  // --- Situation image: a tall photo-ish band above the first answer. ---
  const photoSegs = segmentsAbove(photo, 0.22, Math.round(height * 0.05)).filter(
    (s) => s.bottom <= firstAnswerTop + 2 && s.top > height * 0.03,
  );
  let situationRect: Rect | null = null;
  if (photoSegs.length) {
    // Largest photo band wins.
    const best = photoSegs.sort((a, b) => b.bottom - b.top - (a.bottom - a.top))[0];
    situationRect = { x: 0, y: best.top, w: width, h: best.bottom - best.top };
  }

  // --- Title: text region at the top, above situation image / first answer. ---
  const titleTop = Math.round(height * 0.02);
  const titleBottom = situationRect ? situationRect.y : firstAnswerTop;
  let titleRect: Rect | null = null;
  if (titleBottom - titleTop > height * 0.02) {
    titleRect = { x: 0, y: titleTop, w: width, h: titleBottom - titleTop };
  } else {
    warnings.push("Заглавната зона е твърде малка — възможно неточно разпознаване.");
  }

  return { titleRect, situationRect, answerBands, warnings };
}

/**
 * Given an answer band and its icon position, crop the text region (excluding
 * the icon column). If the colored area is a full-row tint (centroid near
 * middle or spanning), we keep the full width — the text sits on the tint.
 */
export function answerTextRect(band: AnswerBand, width: number): Rect {
  const r = band.rect;
  const iconZone = 0.16; // ~16% of width reserved for the icon column
  if (band.iconCenterX < iconZone) {
    // Icon on the left → text to the right.
    const cut = Math.round(width * iconZone);
    return { x: cut, y: r.y, w: width - cut, h: r.h };
  }
  if (band.iconCenterX > 1 - iconZone) {
    // Icon on the right → text to the left.
    return { x: 0, y: r.y, w: Math.round(width * (1 - iconZone)), h: r.h };
  }
  // Tinted full row — OCR the whole width.
  return { x: 0, y: r.y, w: width, h: r.h };
}
