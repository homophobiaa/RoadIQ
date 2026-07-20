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

/**
 * Removes dark connected components that touch the crop edge. After ink-bbox
 * tightening, real glyphs sit inside the padding and never touch the border —
 * but card borders, shadows and rounded-corner arcs cross the crop edge and
 * Tesseract reads them as letters (measured on real screenshots: a "не" card
 * OCR'd as "Ко"/"МИ" because of corner arcs). Flood-clears those components.
 */
export function clearEdgeComponents(g: GrayImage): GrayImage {
  const { width: w, height: h } = g;
  const out = new Uint8ClampedArray(g.data);
  const seen = new Uint8Array(w * h);

  // Collect each dark component that touches the crop edge, then erase it only
  // when it SPANS most of the crop (>50 % of width or height): card borders,
  // ring outlines and shadow lines do; individual glyphs that happen to touch
  // the tight bbox edge never do — so text survives even when the bbox hugs it.
  const floodCollect = (start: number): { px: number[]; minX: number; maxX: number; minY: number; maxY: number } => {
    const px: number[] = [start];
    seen[start] = 1;
    let head = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    while (head < px.length) {
      const i = px[head++];
      const x = i % w;
      const y = (i / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const n of nb) {
        if (n < 0 || n >= w * h || seen[n] || out[n] >= 128) continue;
        seen[n] = 1;
        px.push(n);
      }
    }
    return { px, minX, maxX, minY, maxY };
  };

  const edgeStarts: number[] = [];
  for (let x = 0; x < w; x++) {
    edgeStarts.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    edgeStarts.push(y * w, y * w + w - 1);
  }
  for (const s of edgeStarts) {
    if (out[s] >= 128 || seen[s]) continue;
    const comp = floodCollect(s);
    const spanW = (comp.maxX - comp.minX + 1) / w;
    const spanH = (comp.maxY - comp.minY + 1) / h;
    if (spanW > 0.5 || spanH > 0.5) {
      for (const i of comp.px) out[i] = 255;
    }
  }
  return { ...g, data: out };
}

/** Count of dark (ink) pixels in a binarized image. */
export function inkCount(g: GrayImage): number {
  let n = 0;
  for (let i = 0; i < g.data.length; i++) if (g.data[i] < 128) n++;
  return n;
}

/** Bounding box of dark pixels; null when the image is blank. */
export function inkBBox(g: GrayImage): { x: number; y: number; w: number; h: number } | null {
  let minX = g.width;
  let maxX = -1;
  let minY = g.height;
  let maxY = -1;
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      if (g.data[y * g.width + x] < 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Crop a grayscale image to a box and surround it with clean white padding. */
export function cropPadGray(
  g: GrayImage,
  box: { x: number; y: number; w: number; h: number },
  padPx: number,
): GrayImage {
  const w = box.w + padPx * 2;
  const h = box.h + padPx * 2;
  const out = new Uint8ClampedArray(w * h);
  out.fill(255);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const sy = box.y + y;
      const sx = box.x + x;
      if (sy >= 0 && sy < g.height && sx >= 0 && sx < g.width) {
        out[(y + padPx) * w + (x + padPx)] = g.data[sy * g.width + sx];
      }
    }
  }
  return { data: out, width: w, height: h };
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

export function scoreOcrText(raw: string, minLetters = 2): TextQuality {
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
  // Valid answers can be a single character ("1", "I") — the caller lowers
  // minLetters for genuinely small crops instead of a blanket length rule.
  if (letters < minLetters) return { ok: false, score: goodRatio, reason: "няма достатъчно букви/цифри" };
  // Bulgarian answers should be mostly Cyrillic (unless numeric like "3,0 mm"
  // or a short Roman-numeral/label answer like "I", "II").
  const digits = chars.filter((c) => /[0-9]/.test(c)).length;
  if (chars.length > 3 && cyr / chars.length < 0.3 && digits / chars.length < 0.2) {
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
