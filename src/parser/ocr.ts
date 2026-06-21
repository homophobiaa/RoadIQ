// Tesseract.js wrapper. A single Bulgarian+English worker is created lazily and
// reused for the whole session (creating a worker per region is very slow).

import Tesseract, { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

export function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    // "bul+eng" — listovki text is Bulgarian but often contains latin/digits.
    workerPromise = createWorker("bul+eng", Tesseract.OEM.LSTM_ONLY, {
      // Keep logs quiet; progress is reported at the file level instead.
    });
  }
  return workerPromise;
}

export async function terminateOcr(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}

/** Run OCR on a single cropped data URL. Returns trimmed text ("" on failure). */
export async function runOcrOnRegion(dataUrl: string): Promise<string> {
  try {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(dataUrl);
    return data.text ?? "";
  } catch {
    return "";
  }
}
