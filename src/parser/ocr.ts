// Tesseract.js wrapper. A single Bulgarian+English worker is created lazily and
// reused for the whole session (creating a worker per region is very slow).

import Tesseract, { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

export function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    // "bul+eng" — listovki text is Bulgarian but often contains latin/digits.
    workerPromise = createWorker("bul+eng", Tesseract.OEM.LSTM_ONLY);
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

/** Tesseract page-segmentation modes we use per region. */
export const PSM = {
  /** Assume a single uniform block of text — used for titles. */
  BLOCK: "6",
  /** Assume a single text line — used for one-line answers. */
  LINE: "7",
} as const;
export type Psm = (typeof PSM)[keyof typeof PSM];

/** Run OCR on a single cropped data URL with the given segmentation mode. */
export async function runOcrOnRegion(dataUrl: string, psm: Psm = PSM.BLOCK): Promise<string> {
  try {
    const worker = await getOcrWorker();
    await worker.setParameters({ tessedit_pageseg_mode: psm as Tesseract.PSM });
    const { data } = await worker.recognize(dataUrl);
    return data.text ?? "";
  } catch {
    return "";
  }
}
