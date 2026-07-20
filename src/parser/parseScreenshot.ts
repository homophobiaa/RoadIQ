// Browser orchestrator:
//   loadImage (clean, full-res) → detectLayout → per-layout crops → OCR with
//   preprocessing + quality gates → validated ParsedQuestion.
//
// Never throws: any failure degrades to an unusable question flagged for the
// Debug Studio. The full screenshot is never used as a situation image, and
// text is never invented — a failed OCR region stays empty with a warning.

import type {
  DebugBox,
  OcrRegionInfo,
  ParsedAnswer,
  ParsedQuestion,
  ScreenshotSource,
} from "../types";
import {
  detectLayout,
  tightenTextRect,
  validateDetection,
  type DetectedLayout,
  type Rect,
} from "./detect";
import { binarizeForOcr, cropGray, normalizeOcrText, scoreOcrText } from "./preprocess";
import { loadImage, cropToJpeg, grayToDataUrl, type LoadedImage } from "./imageUtils";
import { runOcrOnRegion, PSM } from "./ocr";
import { normalizeBulgarianText } from "./text";

let uid = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${uid++}`;

const box = (label: string, r: Rect, color: string): DebugBox => ({
  label,
  x: r.x,
  y: r.y,
  w: r.w,
  h: r.h,
  color,
});

interface RegionOcr {
  text: string;
  info: OcrRegionInfo;
}

/**
 * OCR one text region: tighten to ink bbox → grayscale+Otsu (polarity-safe) →
 * Tesseract. When the binarized variant scores poorly, retry with the plain
 * grayscale variant and keep the better result — never silently accept junk.
 */
async function ocrTextRegion(
  src: LoadedImage,
  name: string,
  rect: Rect,
  scale: number,
): Promise<RegionOcr> {
  const tight = tightenTextRect(src.raw, rect);
  const gray = cropGray(src.raw, tight, scale);

  const run = async (img: typeof gray) => {
    const res = await runOcrOnRegion(grayToDataUrl(img), PSM.BLOCK);
    const text = normalizeBulgarianText(normalizeOcrText(res.text));
    const quality = scoreOcrText(text);
    return { text, confidence: res.confidence, quality };
  };

  let best = await run(binarizeForOcr(gray));
  if (!best.quality.ok || best.confidence < 65) {
    const alt = await run(gray);
    const altScore = (alt.quality.ok ? 1 : 0) * 100 + alt.confidence;
    const bestScore = (best.quality.ok ? 1 : 0) * 100 + best.confidence;
    if (altScore > bestScore) best = alt;
  }

  const ok = best.quality.ok;
  return {
    text: ok ? best.text : "",
    info: {
      name,
      text: best.text,
      confidence: Math.round(best.confidence),
      ok,
      reason: best.quality.reason,
    },
  };
}

export async function parseScreenshot(source: ScreenshotSource): Promise<ParsedQuestion> {
  const fail = (warnings: string[]): ParsedQuestion => ({
    id: nextId("q"),
    sourceImageUrl: source.url,
    fileName: source.fileName,
    title: source.fileName.replace(/\.[^.]+$/, ""),
    answers: [],
    correctCount: 0,
    layout: "unknown",
    usable: false,
    parseConfidence: "low",
    parseWarnings: warnings,
    debugBoxes: [],
  });

  let src: LoadedImage;
  try {
    src = await loadImage(source.url);
  } catch (e) {
    return fail([`Грешка при зареждане: ${(e as Error).message}`]);
  }

  const det: DetectedLayout = detectLayout(src.raw);
  const validation = validateDetection(det);
  const warnings = [...det.warnings, ...validation.warnings];
  const debugBoxes: DebugBox[] = [];
  const ocrRegions: OcrRegionInfo[] = [];

  // --- Title (independent region; can never become an answer) ---
  let title = "";
  let titleOk = false;
  if (det.titleRect) {
    debugBoxes.push(box("Заглавие", det.titleRect, "#cc785c"));
    const r = await ocrTextRegion(src, "Заглавие", det.titleRect, 1.6);
    ocrRegions.push(r.info);
    if (r.info.ok) {
      title = r.text;
      titleOk = true;
    } else {
      warnings.push("Заглавието не беше разчетено — нужна е ръчна проверка.");
      title = source.fileName.replace(/\.[^.]+$/, "");
    }
  }

  // --- Situation image (only the detected crop; never the full screenshot) ---
  let situationImageUrl: string | undefined;
  if (det.situationRect) {
    debugBoxes.push(box("Ситуация", det.situationRect, "#5db8a6"));
    situationImageUrl = cropToJpeg(src, det.situationRect);
  }

  // --- Answers per layout ---
  const answers: ParsedAnswer[] = [];
  let ocrFailures = 0;

  for (let i = 0; i < det.answers.length; i++) {
    const a = det.answers[i];
    const label = `Отговор ${i + 1}`;
    debugBoxes.push(
      box(`${label} ${a.correct ? "✓" : "✗"}`, a.rect, a.correct ? "#5db872" : "#c64545"),
    );

    if (det.layout === "horizontal-image-answers" && a.imageRect) {
      // Image answer: crop only; no OCR attempted on picture content.
      debugBoxes.push(box(`${label} (снимка)`, a.imageRect, "#e8a55a"));
      answers.push({
        id: nextId("a"),
        type: "image",
        imageUrl: cropToJpeg(src, a.imageRect, 500),
        correct: a.correct,
        altText: label, // accessibility metadata only — never OCR input/content
      });
      continue;
    }

    if (a.textRect) {
      const r = await ocrTextRegion(src, label, a.textRect, 2);
      ocrRegions.push(r.info);
      if (!r.info.ok) {
        ocrFailures++;
        warnings.push(`${label}: текстът не беше разчетен (${r.info.reason ?? "ниско качество"}).`);
      }
      answers.push({ id: nextId("a"), type: "text", text: r.text, correct: a.correct });
    }
  }

  const correctCount = answers.filter((a) => a.correct).length;
  const usable = validation.usable && ocrFailures < answers.length;

  const parseConfidence: ParsedQuestion["parseConfidence"] = !usable
    ? "low"
    : titleOk && ocrFailures === 0
      ? "high"
      : ocrFailures <= 1
        ? "medium"
        : "low";

  return {
    id: nextId("q"),
    sourceImageUrl: source.url,
    fileName: source.fileName,
    title,
    answers,
    correctCount,
    situationImageUrl,
    layout: det.layout,
    usable,
    parseConfidence,
    parseWarnings: warnings,
    ocrRegions,
    debugBoxes,
    iconDots: det.icons.map((ic) => ({ x: ic.cx, y: ic.cy, correct: ic.correct })),
    debugFrame: { w: src.width, h: src.height },
  };
}
