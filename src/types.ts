export type ParseConfidence = "high" | "medium" | "low";

export interface ParsedAnswer {
  id: string;
  text: string;
  correct: boolean;
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
  parseConfidence: ParseConfidence;
  parseWarnings: string[];
  /** Detected layout boxes in analysis-frame pixel coords, for debug overlay. */
  debugBoxes?: DebugBox[];
  /** Detected green/red icon centers (analysis-frame coords) for overlay dots. */
  iconDots?: IconDot[];
  /** Size of the (possibly downscaled) frame the boxes are expressed in. */
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
