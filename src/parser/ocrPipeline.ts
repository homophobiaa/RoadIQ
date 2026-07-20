// Multi-pass OCR pipeline — pure logic, shared verbatim by the browser and the
// Node harness. The actual Tesseract call is injected, everything else
// (variants, PSM ladder, scoring, short-answer recovery) lives here so what we
// test headless is exactly what ships.

import { tightenTextRect, type RawImage, type Rect } from "./detect";
import {
  adaptiveThreshold,
  binarizeForOcr,
  clearEdgeComponents,
  cropGray,
  cropPadGray,
  inkBBox,
  inkCount,
  normalizeOcrText,
  scoreOcrText,
  type GrayImage,
} from "./preprocess";
import { normalizeBulgarianText } from "./text";

export type OcrPsm = "6" | "7" | "8";

export interface OcrAttempt {
  variant: string;
  psm: OcrPsm;
  text: string;
  confidence: number;
  ok: boolean;
  reason?: string;
  score: number;
}

export interface RegionConfidence {
  detection: number;
  cropQuality: number;
  ocr: number;
  combined: number;
}

export interface OcrRegionOutcome {
  text: string;
  ok: boolean;
  reason?: string;
  /** True when common-word protection changed the chosen OCR result. */
  postProcessed: boolean;
  /** Suspicious-text score of the chosen (pre-protection) OCR result, 0..1. */
  suspicious: number;
  confidence: RegionConfidence;
  attempts: OcrAttempt[];
  /** The tightened rect actually OCR'd (source-image pixel coordinates). */
  rect: Rect;
}

export type RecognizeFn = (img: GrayImage, psm: OcrPsm) => Promise<{ text: string; confidence: number }>;

/**
 * Very conservative recovery for the two ubiquitous short answers. Applied
 * only to outputs of ≤3 characters, mapping known OCR confusions (latin
 * look-alikes, trailing dot) — never inventing longer text.
 */
function recoverShortAnswer(text: string): string {
  const t = text.toLowerCase().replace(/[.\s]/g, "");
  if (["да", "дa", "aa", "da", "дd"].includes(t)) return "да";
  if (["не", "нe", "he", "ne", "нè"].includes(t)) return "не";
  return text;
}

/**
 * Detects OCR corruption typical of gradient-shaded Cyrillic: runs of Latin
 * UPPERCASE letters embedded in Bulgarian text (e.g. "NMbTHWA" for "пътния",
 * "NbTHA" for "пътна"), and clusters of isolated single characters ("АЕ A",
 * "Й й"). Returns 0..1 where higher = more suspicious.
 */
export function suspiciousScore(text: string): number {
  if (!text) return 1;
  const chars = [...text.replace(/\s+/g, "")];
  const cyr = chars.filter((c) => /[Ѐ-ӿ]/.test(c)).length;
  const cyrRatio = chars.length ? cyr / chars.length : 0;
  let s = 0;
  // Latin-uppercase run of ≥2 (very rare in real BG answers, common in corruption).
  const latinRuns = text.match(/[A-Z]{2,}/g) ?? [];
  if (latinRuns.length) s += Math.min(0.6, 0.3 * latinRuns.length);
  // A token that mixes Latin+Cyrillic is almost always garbage.
  for (const tok of text.split(/\s+/)) {
    const hasLat = /[A-Za-z]/.test(tok);
    const hasCyr = /[Ѐ-ӿ]/.test(tok);
    if (hasLat && hasCyr && tok.length >= 3) s += 0.35;
  }
  // Many isolated 1-char tokens in a multi-word answer → fragmented junk.
  const tokens = text.split(/\s+/).filter(Boolean);
  const singles = tokens.filter((t) => t.length === 1 && /[A-Za-zЀ-ӿ]/.test(t)).length;
  if (tokens.length >= 2 && singles / tokens.length > 0.5) s += 0.4;
  // Overall too little Cyrillic for a text answer.
  if (chars.length > 3 && cyrRatio < 0.5) s += 0.3;
  return Math.min(1, s);
}

/**
 * Conservative, dictionary-free OCR-confusion recovery.
 *
 * Grayscale/gradient rendering makes Tesseract read "ъ" as the near-identical
 * "ь" (e.g. "пьтния" for "пътния"). In Bulgarian orthography "ь" is valid ONLY
 * in the sequence "ьо" (шофьор, бульон); anywhere else it is always an OCR
 * error for "ъ". So we replace "ь"→"ъ" unless it is immediately followed by
 * "о". This fixes the observed corruption without ever touching a valid word
 * (unlike an edit-distance word list, which wrongly "corrects" inflections such
 * as "автомобили"→"автомобил").
 */
export function protectCommonWords(text: string): { text: string; applied: boolean } {
  let applied = false;
  const out = text
    .replace(/ь(?!о)/g, () => {
      applied = true;
      return "ъ";
    })
    .replace(/Ь(?![оО])/g, () => {
      applied = true;
      return "Ъ";
    });
  return { text: out, applied };
}

function combinedScore(text: string, confidence: number, ok: boolean): number {
  const chars = [...text.replace(/\s+/g, "")];
  const cyr = chars.filter((c) => /[Ѐ-ӿ]/.test(c)).length;
  const cyrRatio = chars.length ? cyr / chars.length : 0;
  const suspicious = suspiciousScore(text);
  return (ok ? 100 : 0) + confidence + cyrRatio * 30 + Math.min(chars.length, 20) - suspicious * 90;
}

/** Ink coverage of a binarized crop — flags mostly-empty or clipped crops. */
function inkCoverage(bin: GrayImage): number {
  let dark = 0;
  for (let i = 0; i < bin.data.length; i++) if (bin.data[i] < 128) dark++;
  return dark / bin.data.length;
}

export async function ocrRegionPipeline(
  raw: RawImage,
  rect: Rect,
  recognize: RecognizeFn,
  opts: { baseScale?: number; minLetters?: number } = {},
): Promise<OcrRegionOutcome> {
  const tight = tightenTextRect(raw, rect, 3);
  // Short crops get aggressive upscaling (a "не" is ~40 px tall at source).
  const baseScale = opts.baseScale ?? 2;
  const scale = tight.h < 70 ? Math.max(baseScale, 4) : baseScale;

  // Unpadded crop → card borders / rounded-corner arcs touch the crop edge and
  // can be flood-cleared. When the ink bbox was defined by the glyphs alone,
  // clearing would eat the text itself — detected via the ink-survival ratio,
  // in which case we keep the uncleared binary.
  const gray0 = cropGray(raw, tight, scale, 0);
  const bin0 = binarizeForOcr(gray0);
  const cleared0 = clearEdgeComponents(bin0);
  // Span-based clearing can't eat glyphs, but guard against pathological crops
  // where nothing readable remains (then the uncleared image is more honest).
  const useCleared = inkCount(cleared0) > 40;
  const binBase = useCleared ? cleared0 : bin0;

  // Re-tighten to the surviving glyphs and add clean white padding — Tesseract
  // then sees only text, and the PSM choice reflects the true glyph area.
  const bbox = inkBBox(binBase) ?? { x: 0, y: 0, w: binBase.width, h: binBase.height };
  const bin = cropPadGray(binBase, bbox, 14);
  const gray = cropPadGray(gray0, bbox, 14);

  // Glyph size back in source pixels drives PSM: tiny word → SINGLE_WORD,
  // one line → SINGLE_LINE, taller → BLOCK. Line height ≈ 34 px at source.
  const glyphH = bbox.h / scale;
  const glyphW = bbox.w / scale;
  const minLetters = opts.minLetters ?? (glyphW < 300 ? 1 : 2);
  const primaryPsm: OcrPsm = glyphH <= 55 ? (glyphW <= 240 ? "8" : "7") : "6";

  // Adaptive-threshold variant handles gradient bars where global Otsu corrupts
  // the leftmost word. Built lazily (from the surviving-glyph bbox on gray0) and
  // only OCR'd when the cheap first passes look suspicious/low-confidence.
  const clearedBinName = useCleared ? "binarized+cleared" : "binarized";
  const adaptiveFull = adaptiveThreshold(gray0);
  const adaptiveBase = inkCount(clearEdgeComponents(adaptiveFull)) > 40 ? clearEdgeComponents(adaptiveFull) : adaptiveFull;
  const adaptiveBBox = inkBBox(adaptiveBase) ?? bbox;
  const adaptive = cropPadGray(adaptiveBase, adaptiveBBox, 14);

  const plan: { variant: string; img: GrayImage; psm: OcrPsm }[] = [
    { variant: clearedBinName, img: bin, psm: primaryPsm },
    { variant: "adaptive", img: adaptive, psm: primaryPsm },
    { variant: clearedBinName, img: bin, psm: primaryPsm === "6" ? "7" : "6" },
    { variant: "grayscale", img: gray, psm: primaryPsm },
  ];

  const attempts: OcrAttempt[] = [];
  let best: OcrAttempt | null = null;

  for (const step of plan) {
    const res = await recognize(step.img, step.psm);
    let text = normalizeBulgarianText(normalizeOcrText(res.text));
    if (text.length <= 3) text = recoverShortAnswer(text);
    const q = scoreOcrText(text, minLetters);
    const attempt: OcrAttempt = {
      variant: step.variant,
      psm: step.psm,
      text,
      confidence: Math.round(res.confidence),
      ok: q.ok,
      reason: q.reason,
      score: combinedScore(text, res.confidence, q.ok),
    };
    attempts.push(attempt);
    if (!best || attempt.score > best.score) best = attempt;
    // Early exit only on a clean, confident, NON-suspicious result — a
    // high-confidence but corrupted "NMbTHWA" must not short-circuit the retry.
    if (attempt.ok && attempt.confidence >= 80 && suspiciousScore(attempt.text) < 0.2) break;
  }

  const coverage = inkCoverage(bin);
  const cropQuality = coverage < 0.002 ? 0 : coverage > 0.6 ? 0.3 : 1;
  const ocrConf = best ? best.confidence / 100 : 0;
  const combined = (best?.ok ? 1 : 0) * 0.5 + ocrConf * 0.3 + cropQuality * 0.2;

  // Conservative common-word recovery on the chosen result only.
  let finalText = best?.ok ? best.text : "";
  const prot = protectCommonWords(finalText);
  finalText = prot.text;

  return {
    text: finalText,
    ok: best?.ok ?? false,
    reason: best?.ok ? undefined : (best?.reason ?? "празен текст"),
    postProcessed: prot.applied,
    suspicious: best ? suspiciousScore(best.text) : 1,
    confidence: {
      detection: 1,
      cropQuality,
      ocr: ocrConf,
      combined,
    },
    attempts,
    rect: tight,
  };
}
