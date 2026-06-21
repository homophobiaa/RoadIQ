// Batch driver: parses every screenshot source sequentially (OCR is CPU-heavy;
// running in parallel would thrash a single Tesseract worker), emitting progress
// after each file so the UI can show a live progress bar.

import type { ParsedQuestion, ParseProgress, ScreenshotSource } from "../types";
import { parseScreenshot } from "./parseScreenshot";
import { terminateOcr } from "./ocr";

export { loadScreenshotSources } from "./sources";

export async function parseAllScreenshots(
  sources: ScreenshotSource[],
  onProgress: (p: ParseProgress) => void,
): Promise<ParsedQuestion[]> {
  const results: ParsedQuestion[] = [];
  const total = sources.length;

  for (let i = 0; i < total; i++) {
    const src = sources[i];
    onProgress({
      current: i,
      total,
      fileName: src.fileName,
      percent: Math.round((i / Math.max(1, total)) * 100),
    });
    // Yield to the event loop so the progress paint isn't blocked.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const q = await parseScreenshot(src);
    results.push(q);
  }

  onProgress({ current: total, total, fileName: "", percent: 100 });
  // Free the OCR worker once the batch is done.
  await terminateOcr().catch(() => {});
  return results;
}
