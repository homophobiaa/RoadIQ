// Orchestrates the full per-screenshot pipeline:
//   loadImage → detectLayout → crop regions → OCR → normalize → buildQuestionModel
//
// Never throws: any failure degrades to a low-confidence question carrying the
// full screenshot as fallback, so a bad parse can't break the test flow.

import type { ParsedAnswer, ParsedQuestion, ScreenshotSource, DebugBox } from "../types";
import { loadImage, cropForOcr, cropPreview, type Rect } from "./imageUtils";
import { detectLayout } from "./layout";
import { runOcrOnRegion, PSM } from "./ocr";
import { normalizeBulgarianText, looksMeaningful } from "./text";

let uid = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${uid++}`;

function box(label: string, r: Rect, color: string): DebugBox {
  return { label, x: r.x, y: r.y, w: r.w, h: r.h, color };
}

export async function parseScreenshot(source: ScreenshotSource): Promise<ParsedQuestion> {
  const baseFail = (warnings: string[]): ParsedQuestion => ({
    id: nextId("q"),
    sourceImageUrl: source.url,
    fileName: source.fileName,
    title: source.fileName.replace(/\.[^.]+$/, ""),
    answers: [],
    correctCount: 0,
    parseConfidence: "low",
    parseWarnings: warnings,
    debugBoxes: [],
  });

  let src;
  try {
    src = await loadImage(source.url);
  } catch (e) {
    return baseFail([`Грешка при зареждане: ${(e as Error).message}`]);
  }

  const layout = detectLayout(src);
  const warnings = [...layout.warnings];
  const debugBoxes: DebugBox[] = [];

  // --- Title (OCR'd separately, single block, preprocessed) ---
  let title = "";
  let titleOk = false;
  if (layout.titleRect) {
    debugBoxes.push(box("Заглавие", layout.titleRect, "#cc785c"));
    const raw = await runOcrOnRegion(cropForOcr(src, layout.titleRect), PSM.BLOCK);
    title = normalizeBulgarianText(raw);
  }
  if (looksMeaningful(title)) {
    titleOk = true;
  } else {
    // Bad/empty title → filename fallback, but NEVER a fake answer.
    warnings.push("Заглавието не беше разпознато — ползвам име на файла.");
    title = source.fileName.replace(/\.[^.]+$/, "");
  }

  // --- Situation image: only the confident stacked crop. Never full screenshot. ---
  let situationImageUrl: string | undefined;
  if (layout.situationRect) {
    debugBoxes.push(box("Ситуация", layout.situationRect, "#5db8a6"));
    situationImageUrl = cropPreview(src, layout.situationRect);
  }
  if (layout.sideImageRect) {
    debugBoxes.push(box("Възможна ситуация (ръчно)", layout.sideImageRect, "#5db8a6"));
  }

  // --- Answers (only from icon-aligned rows; text crop excludes icon/image) ---
  const answers: ParsedAnswer[] = [];
  let ocrFailures = 0;
  for (let i = 0; i < layout.answerBands.length; i++) {
    const band = layout.answerBands[i];
    debugBoxes.push(
      box(
        `Отговор ${i + 1} ${band.uncertain ? "?" : band.correct ? "✓" : "✗"}`,
        band.rect,
        band.uncertain ? "#d4a017" : band.correct ? "#5db872" : "#c64545",
      ),
    );
    const raw = await runOcrOnRegion(cropForOcr(src, band.textRect), PSM.BLOCK);
    let text = normalizeBulgarianText(raw);
    if (!looksMeaningful(text)) {
      text = `Отговор ${i + 1}`;
      ocrFailures++;
    }
    answers.push({ id: nextId("a"), text, correct: band.correct });
  }

  const correctCount = answers.filter((a) => a.correct).length;
  const iconsMatch = !layout.answerBands.some((b) => b.uncertain);

  // --- Warnings ---
  if (answers.length === 0) warnings.push("Не са открити отговори.");
  else if (answers.length < 2) warnings.push("Подозрително малко отговори (по-малко от 2).");
  else if (answers.length > 6) warnings.push("Подозрително много отговори (повече от 6).");
  if (correctCount === 0 && answers.length > 0)
    warnings.push("Не е открит верен отговор (липсва зелен индикатор).");
  if (ocrFailures > 0) warnings.push(`OCR не разчете ${ocrFailures} отговор(а).`);

  const parseConfidence = scoreConfidence({
    answerCount: answers.length,
    correctCount,
    titleOk,
    iconsMatch,
    ocrFailures,
  });

  return {
    id: nextId("q"),
    sourceImageUrl: source.url,
    fileName: source.fileName,
    title,
    answers,
    correctCount,
    situationImageUrl,
    parseConfidence,
    parseWarnings: warnings,
    debugBoxes,
    iconDots: layout.iconDots,
    debugFrame: { w: src.width, h: src.height },
  };
}

interface ConfInput {
  answerCount: number;
  correctCount: number;
  titleOk: boolean;
  iconsMatch: boolean; // correctness came from real icons, not grey-card guess
  ocrFailures: number;
}

// High  : title + 2+ answers + 1+ correct + icons matched + clean OCR
// Medium: answers & correctness ok, but title weak OR some OCR misses
// Low    : no title / bad OCR / no icons / weird answer count
// (a question with no usable/correct answers also lands Low → filtered from tests)
function scoreConfidence(c: ConfInput): ParsedQuestion["parseConfidence"] {
  const usable = c.answerCount >= 2 && c.correctCount >= 1;
  if (!usable) return "low";
  if (c.titleOk && c.iconsMatch && c.ocrFailures === 0) return "high";
  if (c.iconsMatch && (c.titleOk || c.ocrFailures <= 1)) return "medium";
  return "low";
}
