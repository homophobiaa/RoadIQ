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
import { detectLayout, validateDetection, type DetectedLayout, type Rect } from "./detect";
import { ocrRegionPipeline, type RecognizeFn } from "./ocrPipeline";
import { loadImage, cropToJpeg, grayToDataUrl, type LoadedImage } from "./imageUtils";
import { runOcrOnRegion, type Psm } from "./ocr";

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

// The shared multi-pass pipeline (ocrPipeline.ts) does variants/PSM/scoring;
// the browser only supplies the actual Tesseract call.
const recognize: RecognizeFn = async (img, psm) => runOcrOnRegion(grayToDataUrl(img), psm as Psm);

interface RegionOcr {
  text: string;
  info: OcrRegionInfo;
}

async function ocrTextRegion(
  src: LoadedImage,
  name: string,
  rect: Rect,
  scale: number,
  answerId?: string,
): Promise<RegionOcr> {
  const out = await ocrRegionPipeline(src.raw, rect, recognize, { baseScale: scale });
  return {
    text: out.text,
    info: {
      name,
      answerId,
      text: out.attempts.length ? out.attempts.reduce((a, b) => (b.score > a.score ? b : a)).text : "",
      confidence: Math.round(out.confidence.ocr * 100),
      ok: out.ok,
      reason: out.reason,
      attempts: out.attempts.map((a) => ({
        variant: a.variant,
        psm: a.psm,
        text: a.text,
        confidence: a.confidence,
      })),
      rect: out.rect,
      combined: out.confidence.combined,
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
      const id = nextId("a");
      const r = await ocrTextRegion(src, label, a.textRect, 2, id);
      ocrRegions.push(r.info);
      if (!r.info.ok) {
        ocrFailures++;
        warnings.push(`${label}: текстът не беше разчетен (${r.info.reason ?? "ниско качество"}).`);
      }
      answers.push({ id, type: "text", text: r.text, correct: a.correct });
    }
  }

  const correctCount = answers.filter((a) => a.correct).length;

  // Review-gating: correctness detection alone is not enough. Any empty text
  // answer or unreadable title sends the question to review instead of tests.
  const usable = validation.usable && ocrFailures === 0 && (titleOk || det.layout === "horizontal-image-answers");

  const lowConf = ocrRegions.some((r) => r.ok && r.confidence < 60);
  const parseConfidence: ParsedQuestion["parseConfidence"] = !usable
    ? "low"
    : titleOk && !lowConf
      ? "high"
      : "medium";

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
    // Layout implies a situation image but detection was uncertain → the Debug
    // Studio prompts for a manual crop; the full screenshot is never used.
    needsImageCrop: det.layout === "image-left-text-right" && !det.situationRect,
    parseConfidence,
    parseWarnings: warnings,
    ocrRegions,
    debugBoxes,
    iconDots: det.icons.map((ic) => ({ x: ic.cx, y: ic.cy, correct: ic.correct })),
    debugFrame: { w: src.width, h: src.height },
  };
}
