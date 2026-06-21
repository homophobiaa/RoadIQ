// Pure test-construction & grading logic, kept separate from React.

import type { ParsedQuestion, TestQuestion, TestResultRow } from "../types";
import { shuffle } from "./utils";

const PASS_THRESHOLD = 0.7;
export const PASSING_PERCENT = 70;

/**
 * Selects `count` questions, preferring high/medium confidence but topping up
 * with low-confidence ones if needed. Questions are shuffled, and each
 * question's answer order is shuffled while preserving correctness.
 */
export function buildTest(all: ParsedQuestion[], count: number): TestQuestion[] {
  // Only usable questions (must have at least one correct answer to be gradable).
  const gradable = all.filter((q) => q.answers.length >= 2 && q.correctCount >= 1);
  const preferred = gradable.filter((q) => q.parseConfidence !== "low");
  const fallback = gradable.filter((q) => q.parseConfidence === "low");

  const pool = [...shuffle(preferred), ...shuffle(fallback)].slice(0, count);

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
