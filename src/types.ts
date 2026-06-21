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
  /** Size of the (possibly downscaled) frame the boxes are expressed in. */
  debugFrame?: { w: number; h: number };
}

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
