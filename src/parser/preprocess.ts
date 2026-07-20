// Pure, DOM-free OCR preprocessing. Shared by the browser pipeline and the
// Node test harness so what we test headless is exactly what ships.
//
// Answer bars come in two variants:
//   - unselected: dark text on white/light card;
//   - selected: WHITE text on dark grey card.
// Otsu alone binarizes both, but Tesseract wants dark-on-light — so after
// thresholding we check polarity and invert when the crop is mostly dark.

import type { RawImage, Rect } from "./detect";

export interface GrayImage {
  data: Uint8ClampedArray; // single channel
  width: number;
  height: number;
}

/** Crop + upscale (nearest-neighbour then 3×3 box smooth) + grayscale. */
export function cropGray(img: RawImage, rect: Rect, scale: number, padPx = 6): GrayImage {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const w0 = Math.min(img.width - x0, Math.round(rect.w));
  const h0 = Math.min(img.height - y0, Math.round(rect.h));
  const w = Math.max(1, Math.round(w0 * scale)) + padPx * 2;
  const h = Math.max(1, Math.round(h0 * scale)) + padPx * 2;
  const out = new Uint8ClampedArray(w * h);
  out.fill(255);

  for (let y = 0; y < h - padPx * 2; y++) {
    const sy = y0 + Math.min(h0 - 1, Math.floor(y / scale));
    for (let x = 0; x < w - padPx * 2; x++) {
      const sx = x0 + Math.min(w0 - 1, Math.floor(x / scale));
      const i = (sy * img.width + sx) * 4;
      const g = (img.data[i] * 299 + img.data[i + 1] * 587 + img.data[i + 2] * 114) / 1000;
      out[(y + padPx) * w + (x + padPx)] = g;
    }
  }
  return { data: out, width: w, height: h };
}

/** Otsu threshold over a grayscale image. */
export function otsuThreshold(g: GrayImage): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < g.data.length; i++) hist[g.data[i]]++;
  const total = g.data.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let thresh = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) {
      maxVar = v;
      thresh = t;
    }
  }
  return thresh;
}

/**
 * Binarize with polarity normalization: output is always dark glyphs on a
 * white background regardless of the source card being light or dark.
 * Low-contrast crops are passed through untouched (thresholding a flat crop
 * produces speckle noise, not text).
 */
export function binarizeForOcr(g: GrayImage): GrayImage {
  let min = 255;
  let max = 0;
  for (let i = 0; i < g.data.length; i++) {
    const v = g.data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const out = new Uint8ClampedArray(g.data.length);
  if (max - min < 30) {
    out.set(g.data);
    return { ...g, data: out };
  }
  const t = otsuThreshold(g);
  let dark = 0;
  for (let i = 0; i < g.data.length; i++) {
    const bin = g.data[i] <= t ? 0 : 255;
    out[i] = bin;
    if (bin === 0) dark++;
  }
  // Polarity: text covers a minority of the crop. If most pixels are "dark",
  // the card itself was dark (selected bar) → invert so text becomes dark.
  if (dark > g.data.length / 2) {
    for (let i = 0; i < out.length; i++) out[i] = 255 - out[i];
  }
  return { ...g, data: out };
}

/** Convert a single-channel image back to RGBA (for canvas / PNG encoding). */
export function grayToRgba(g: GrayImage): Uint8ClampedArray {
  const out = new Uint8ClampedArray(g.width * g.height * 4);
  for (let i = 0; i < g.data.length; i++) {
    const v = g.data[i];
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}

// ---------------------------------------------------------------------------
// OCR text quality scoring — reject gibberish instead of accepting it.
// ---------------------------------------------------------------------------

export interface TextQuality {
  ok: boolean;
  score: number;
  reason?: string;
}

const DEBUG_WORDS = ["отговор 1", "отговор 2", "отговор 3", "отговор 4", "tick", "заглавие"];

export function scoreOcrText(raw: string): TextQuality {
  const text = raw.trim();
  if (text.length === 0) return { ok: false, score: 0, reason: "празен текст" };
  const lower = text.toLowerCase();
  if (DEBUG_WORDS.some((w) => lower === w)) {
    return { ok: false, score: 0, reason: "текстът съвпада с диагностичен етикет" };
  }
  const chars = [...text.replace(/\s+/g, "")];
  if (chars.length === 0) return { ok: false, score: 0, reason: "празен текст" };
  const good = chars.filter((c) => /[Ѐ-ӿ0-9A-Za-z.,;:!?%()\-–—"'„“/]/.test(c)).length;
  const cyr = chars.filter((c) => /[Ѐ-ӿ]/.test(c)).length;
  const letters = chars.filter((c) => /[Ѐ-ӿA-Za-z0-9]/.test(c)).length;
  const goodRatio = good / chars.length;
  // Repeated single character (|||||| or ......) → noise.
  const uniq = new Set(chars).size;
  if (chars.length >= 6 && uniq <= 2) return { ok: false, score: 0, reason: "повтарящи се символи" };
  if (goodRatio < 0.7) return { ok: false, score: goodRatio, reason: "твърде много непознати символи" };
  if (letters < 2) return { ok: false, score: goodRatio, reason: "няма достатъчно букви/цифри" };
  // Bulgarian answers should be mostly Cyrillic (unless numeric like "3,0 mm").
  const digits = chars.filter((c) => /[0-9]/.test(c)).length;
  if (cyr / chars.length < 0.3 && digits / chars.length < 0.2) {
    return { ok: false, score: goodRatio * 0.5, reason: "твърде малко кирилица" };
  }
  return { ok: true, score: goodRatio };
}

/** Whitespace/linebreak normalization that keeps multi-line answers readable. */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}
