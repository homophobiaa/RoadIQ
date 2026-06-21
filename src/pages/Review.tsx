import { useState } from "react";
import { useStore } from "../store";
import { PageFade } from "../components/ui";
import { cx } from "../lib/utils";
import type { TestResultRow } from "../types";

export default function Review() {
  const { grade, setView } = useStore();
  const [onlyMistakes, setOnlyMistakes] = useState(true);
  if (!grade) return null;

  const rows = onlyMistakes ? grade.rows.filter((r) => !r.isCorrect) : grade.rows;

  return (
    <PageFade>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Преглед</h1>
          <div className="flex gap-2">
            <button
              className={cx("btn-chip", onlyMistakes && "!bg-coral/20 !border-coral/50")}
              onClick={() => setOnlyMistakes(true)}
            >
              Само грешки
            </button>
            <button
              className={cx("btn-chip", !onlyMistakes && "!bg-coral/20 !border-coral/50")}
              onClick={() => setOnlyMistakes(false)}
            >
              Всички
            </button>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="card text-center text-slate-400">Няма грешки — браво! 🎉</div>
        )}

        <div className="flex flex-col gap-5">
          {rows.map((row, i) => (
            <ReviewCard key={row.question.id} row={row} index={i} />
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <button className="btn-ghost" onClick={() => setView("results")}>
            ← Към резултата
          </button>
          <button className="btn-ghost" onClick={() => setView("dashboard")}>
            Към таблото
          </button>
        </div>
      </div>
    </PageFade>
  );
}

function ReviewCard({ row, index }: { row: TestResultRow; index: number }) {
  const q = row.question;
  const selected = new Set(row.selected);

  return (
    <div className="card">
      <div className="mb-3 flex items-start gap-3">
        <span
          className={cx(
            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
            row.isCorrect ? "bg-success/20 text-success" : "bg-danger/20 text-danger",
          )}
        >
          {index + 1}
        </span>
        <h2 className="font-display text-lg font-semibold leading-snug">{q.title}</h2>
      </div>

      {q.situationImageUrl && (
        <img
          src={q.situationImageUrl}
          alt="Ситуация"
          className="mb-4 max-h-56 w-auto rounded-lg border border-white/10"
        />
      )}

      <div className="flex flex-col gap-2">
        {q.answers.map((a) => {
          const picked = selected.has(a.id);
          // correct → green; wrongly picked → red; missed correct → amber.
          let style = "border-white/10 bg-white/[0.03] text-slate-300";
          let tag = "";
          if (a.correct && picked) {
            style = "border-success/50 bg-success/10 text-success";
            tag = "Верен ✓";
          } else if (a.correct && !picked) {
            style = "border-amber/50 bg-amber/10 text-amber";
            tag = "Пропуснат верен";
          } else if (!a.correct && picked) {
            style = "border-danger/50 bg-danger/10 text-danger";
            tag = "Грешен избор ✗";
          }
          return (
            <div
              key={a.id}
              className={cx("flex items-center justify-between rounded-lg border px-4 py-2.5", style)}
            >
              <span>{a.text}</span>
              {tag && <span className="ml-3 shrink-0 text-xs font-medium opacity-80">{tag}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
