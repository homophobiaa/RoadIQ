// Manual-correction persistence layer. The parser is frontend-only and
// imperfect, so every parsed question can be overridden by the user. Corrections
// are stored in localStorage keyed by screenshot filename and re-applied on top
// of fresh parser output on every load.

import type { ParsedAnswer, ParsedQuestion, QuestionStatus } from "../types";

const STORE_KEY = "roadiq:corrections:v1";

/** What we persist per screenshot. Only fields the user can override. */
export interface Correction {
  title?: string;
  answers?: ParsedAnswer[];
  /** Manually cropped (or full-screenshot fallback) situation image data URL. */
  situationImageUrl?: string | null; // null = explicitly cleared
  verified?: boolean;
  excluded?: boolean;
  /** Set when the user edited title/answers/image (distinct from verified). */
  edited?: boolean;
}

export type CorrectionMap = Record<string, Correction>;

export function loadCorrections(): CorrectionMap {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as CorrectionMap) : {};
  } catch {
    return {};
  }
}

export function saveCorrections(map: CorrectionMap): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* quota — best effort (situation crops can be large) */
  }
}

export function clearCorrections(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportCorrections(): string {
  return JSON.stringify(loadCorrections(), null, 2);
}

/** Merge imported JSON over existing corrections. Returns merged map. */
export function importCorrections(json: string): CorrectionMap {
  const incoming = JSON.parse(json) as CorrectionMap;
  const merged = { ...loadCorrections(), ...incoming };
  saveCorrections(merged);
  return merged;
}

/**
 * Applies a saved correction onto fresh parser output. Pure — returns a new
 * question. Recomputes correctCount from the (possibly edited) answers so the
 * count always matches the number of answers flagged correct.
 */
export function applyCorrection(q: ParsedQuestion, c: Correction | undefined): ParsedQuestion {
  if (!c) return q;
  const answers = c.answers ?? q.answers;
  const out: ParsedQuestion = {
    ...q,
    title: c.title ?? q.title,
    answers,
    correctCount: answers.filter((a) => a.correct).length,
    verified: c.verified ?? false,
    excluded: c.excluded ?? false,
    corrected: !!c.edited,
  };
  if (c.situationImageUrl === null) out.situationImageUrl = undefined;
  else if (c.situationImageUrl !== undefined) {
    out.situationImageUrl = c.situationImageUrl;
    out.manualCrop = true;
  }
  return out;
}

export function applyAll(questions: ParsedQuestion[], map: CorrectionMap): ParsedQuestion[] {
  return questions.map((q) => applyCorrection(q, map[q.fileName]));
}

export function statusOf(q: ParsedQuestion): QuestionStatus {
  if (q.excluded) return "excluded";
  if (q.verified) return "verified";
  if (q.corrected) return "corrected";
  return "parsed";
}

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  verified: "Потвърден",
  corrected: "Коригиран",
  excluded: "Изключен",
  parsed: "Автоматичен",
};
