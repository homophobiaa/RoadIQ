import type { QuestionLayout } from "./parser/detect";

export type ParseConfidence = "high" | "medium" | "low";

export type ParsedAnswer =
  | {
      id: string;
      type: "text";
      text: string;
      correct: boolean;
    }
  | {
      id: string;
      type: "image";
      /** Cropped answer-image data URL — the only visual shown in tests. */
      imageUrl: string;
      correct: boolean;
      /** Accessibility/debug label only — NEVER OCR output, never shown as content. */
      altText?: string;
    };

/** Per-region OCR diagnostics surfaced in the Debug Studio. */
export interface OcrRegionInfo {
  name: string;
  /** Answer id this region belongs to (absent for the title). */
  answerId?: string;
  text: string;
  confidence: number;
  ok: boolean;
  reason?: string;
  /** All OCR attempts (variant + PSM + text + confidence) for diagnostics. */
  attempts?: { variant: string; psm: string; text: string; confidence: number }[];
  /** Exact source-pixel rect that was OCR'd. */
  rect?: { x: number; y: number; w: number; h: number };
  /** Composite region confidence (detection / crop quality / OCR). */
  combined?: number;
}

export interface ParsedQuestion {
  id: string;
  sourceImageUrl: string;
  /** Original filename, useful for caching + debug. */
  fileName: string;
  title: string;
  answers: ParsedAnswer[];
  correctCount: number;
  situationImageUrl?: string;
  /** Which of the three supported layouts the screenshot matched. */
  layout: QuestionLayout;
  /** Structural validation verdict — unusable questions never enter tests automatically. */
  usable: boolean;
  parseConfidence: ParseConfidence;
  parseWarnings: string[];
  /** OCR text + confidence per region, for the Debug Studio. */
  ocrRegions?: OcrRegionInfo[];
  /** Detected layout boxes in source-image pixel coords, for debug overlay. */
  debugBoxes?: DebugBox[];
  /** Detected green/red icon centers for overlay dots. */
  iconDots?: IconDot[];
  /** Source-image dimensions the boxes are expressed in. */
  debugFrame?: { w: number; h: number };

  // ---- Manual-correction layer (applied from localStorage after parsing) ----
  /** True once the user has edited any field of this question. */
  corrected?: boolean;
  /** User marked the question as reviewed/trustworthy. */
  verified?: boolean;
  /** User excluded the question from tests. */
  excluded?: boolean;
  /** Situation image came from a manual crop / full-screenshot choice. */
  manualCrop?: boolean;
  /** Layout suggests a situation image but automatic detection was uncertain. */
  needsImageCrop?: boolean;
}

export interface IconDot {
  x: number;
  y: number;
  correct: boolean;
}

/** Status used for filtering/labelling in the debug editor & dashboard counts. */
export type QuestionStatus = "verified" | "corrected" | "excluded" | "parsed";

export interface DebugBox {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** css color for the overlay stroke */
  color: string;
}

export interface ScreenshotSource {
  fileName: string;
  url: string;
}

/** Progress payload emitted while parsing the screenshot batch. */
export interface ParseProgress {
  current: number;
  total: number;
  fileName: string;
  percent: number;
}

/** A question instance inside an active test (answers shuffled, selection tracked). */
export interface TestQuestion {
  question: ParsedQuestion;
  /** Answer ids the user has selected. Order = selection order. */
  selected: string[];
}

export interface TestResultRow {
  question: ParsedQuestion;
  selected: string[];
  isCorrect: boolean;
}
