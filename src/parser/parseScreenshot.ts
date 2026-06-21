// Orchestrates the full per-screenshot pipeline:
//   loadImage → detectLayout → crop regions → OCR → normalize → buildQuestionModel
//
// Never throws: any failure degrades to a low-confidence question carrying the
// full screenshot as fallback, so a bad parse can't break the test flow.

import type { ParsedAnswer, ParsedQuestion, ScreenshotSource, DebugBox } from "../types";
import { loadImage, cropToDataUrl, cropPreview, type Rect } from "./imageUtils";
import { detectLayout, answerTextRect } from "./layout";
import { runOcrOnRegion } from "./ocr";
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

  // --- Title ---
  let title = "";
  if (layout.titleRect) {
    debugBoxes.push(box("Заглавие", layout.titleRect, "#cc785c"));
    const raw = await runOcrOnRegion(cropToDataUrl(src, layout.titleRect));
    title = normalizeBulgarianText(raw);
  }
  if (!looksMeaningful(title)) {
    warnings.push("Заглавието не беше разпознато надеждно.");
    if (!title) title = source.fileName.replace(/\.[^.]+$/, "");
  }

  // --- Situation image ---
  let situationImageUrl: string | undefined;
  if (layout.situationRect) {
    debugBoxes.push(box("Ситуация", layout.situationRect, "#5db8a6"));
    situationImageUrl = cropPreview(src, layout.situationRect);
  }

  // --- Answers ---
  const answers: ParsedAnswer[] = [];
  for (let i = 0; i < layout.answerBands.length; i++) {
    const band = layout.answerBands[i];
    const textRect = answerTextRect(band, src.width);
    debugBoxes.push(
      box(
        `Отговор ${i + 1} ${band.uncertain ? "?" : band.correct ? "✓" : "✗"}`,
        band.rect,
        band.uncertain ? "#d4a017" : band.correct ? "#5db872" : "#c64545",
      ),
    );
    const raw = await runOcrOnRegion(cropToDataUrl(src, textRect));
    let text = normalizeBulgarianText(raw);
    if (!looksMeaningful(text)) text = `Отговор ${i + 1}`;
    answers.push({ id: nextId("a"), text, correct: band.correct });
  }

  const correctCount = answers.filter((a) => a.correct).length;

  // --- Warnings on suspicious results ---
  if (answers.length === 0) warnings.push("Не са открити отговори.");
  else if (answers.length < 2) warnings.push("Подозрително малко отговори (по-малко от 2).");
  else if (answers.length > 6) warnings.push("Подозрително много отговори (повече от 6).");
  if (correctCount === 0 && answers.length > 0)
    warnings.push("Не е открит верен отговор (липсва зелен индикатор).");
  if (answers.some((a) => a.text.startsWith("Отговор ")))
    warnings.push("Част от текста на отговорите не беше разчетен.");

  const parseConfidence = scoreConfidence(answers.length, correctCount, warnings.length, title);

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

function scoreConfidence(
  answerCount: number,
  correctCount: number,
  warningCount: number,
  title: string,
): ParsedQuestion["parseConfidence"] {
  const goodTitle = looksMeaningful(title);
  if (answerCount >= 2 && correctCount >= 1 && warningCount === 0 && goodTitle) return "high";
  if (answerCount >= 2 && correctCount >= 1 && warningCount <= 2) return "medium";
  return "low";
}
