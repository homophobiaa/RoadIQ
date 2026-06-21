// Pure test-construction & grading logic, kept separate from React.

import type { ParsedQuestion, TestQuestion, TestResultRow } from "../types";
import { shuffle } from "./utils";

const PASS_THRESHOLD = 0.7;
export const PASSING_PERCENT = 70;

export interface BuildOptions {
  /** Allow parser-only (not verified/corrected) questions into the pool. */
  includeUnverified: boolean;
}

/** A question is gradable when it has ≥2 answers and ≥1 correct, and isn't excluded. */
export function isGradable(q: ParsedQuestion): boolean {
  return !q.excluded && q.answers.length >= 2 && q.correctCount >= 1;
}

/**
 * Selects `count` questions. Excluded questions are never used. Verified/
 * corrected questions are always preferred; unverified parser questions are only
 * pulled in when explicitly allowed OR when there aren't enough verified ones.
 * Within the unverified pool, high/medium confidence is preferred over low.
 * Questions and per-question answer order are shuffled (correctness preserved).
 */
export function buildTest(all: ParsedQuestion[], count: number, opts: BuildOptions): TestQuestion[] {
  const gradable = all.filter(isGradable);
  const trusted = gradable.filter((q) => q.verified || q.corrected);
  const untrusted = gradable.filter((q) => !q.verified && !q.corrected);
  const untrustedSorted = [
    ...shuffle(untrusted.filter((q) => q.parseConfidence !== "low")),
    ...shuffle(untrusted.filter((q) => q.parseConfidence === "low")),
  ];

  let candidates = shuffle(trusted);
  if (opts.includeUnverified || candidates.length < count) {
    candidates = [...candidates, ...untrustedSorted];
  }
  const pool = candidates.slice(0, count);

  return shuffle(pool).map((q) => ({
    question: { ...q, answers: shuffle(q.answers) },
    selected: [],
  }));
}

export function isAnswered(tq: TestQuestion): boolean {
  return tq.selected.length > 0;
}

export function gradeQuestion(tq: TestQuestion): boolean {
  const correctIds = new Set(tq.question.answers.filter((a) => a.correct).map((a) => a.id));
  const selected = new Set(tq.selected);
  if (correctIds.size !== selected.size) return false;
  for (const id of correctIds) if (!selected.has(id)) return false;
  return true;
}

export interface GradeSummary {
  rows: TestResultRow[];
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
}

export function gradeTest(test: TestQuestion[]): GradeSummary {
  const rows: TestResultRow[] = test.map((tq) => ({
    question: tq.question,
    selected: tq.selected,
    isCorrect: gradeQuestion(tq),
  }));
  const correct = rows.filter((r) => r.isCorrect).length;
  const total = rows.length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { rows, correct, total, percent, passed: percent >= PASS_THRESHOLD * 100 };
}
