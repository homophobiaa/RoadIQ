// Tesseract.js wrapper. A single Bulgarian+English worker is created lazily and
// reused for the whole session (creating a worker per region is very slow).

import Tesseract, { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

export function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    // "bul+eng" — listovki text is Bulgarian but often contains latin/digits (kg, mm).
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

export const PSM = {
  /** Single uniform block — titles and (possibly multi-line) answers. */
  BLOCK: "6",
  /** Single text line. */
  LINE: "7",
} as const;
export type Psm = (typeof PSM)[keyof typeof PSM];

export interface OcrResult {
  text: string;
  confidence: number;
}

/** Run OCR on a preprocessed data URL. Returns text + Tesseract confidence. */
export async function runOcrOnRegion(dataUrl: string, psm: Psm = PSM.BLOCK): Promise<OcrResult> {
  try {
    const worker = await getOcrWorker();
    await worker.setParameters({ tessedit_pageseg_mode: psm as Tesseract.PSM });
    const { data } = await worker.recognize(dataUrl);
    return { text: data.text ?? "", confidence: data.confidence ?? 0 };
  } catch {
    return { text: "", confidence: 0 };
  }
}
