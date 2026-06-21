import { useState } from "react";
import { useStore } from "../store";
import { Logo, PageFade } from "../components/ui";
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
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <div className="flex gap-2">
            <button
              className={cx("chip", onlyMistakes && "chip-active")}
              onClick={() => setOnlyMistakes(true)}
            >
              Само грешки
            </button>
            <button
              className={cx("chip", !onlyMistakes && "chip-active")}
              onClick={() => setOnlyMistakes(false)}
            >
              Всички
            </button>
          </div>
        </div>

        <h1 className="mb-6 font-display text-display-md font-semibold text-ink">Преглед</h1>

        {rows.length === 0 && (
          <div className="card-outline text-center text-body">Няма грешки — браво! 🎉</div>
        )}

        <div className="flex flex-col gap-5">
          {rows.map((row, i) => (
            <ReviewCard key={row.question.id} row={row} index={i} />
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-3">
          <button className="btn-secondary" onClick={() => setView("results")}>
            ← Към резултата
          </button>
          <button className="btn-link" onClick={() => setView("dashboard")}>
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
    <div className="card-outline">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cx(
            "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-pill text-xs font-bold",
            row.isCorrect ? "bg-success/20 text-[#3f8a4f]" : "bg-error/15 text-error",
          )}
        >
          {index + 1}
        </span>
        <h2 className="font-display text-title-lg font-semibold leading-snug text-ink">{q.title}</h2>
      </div>

      {q.situationImageUrl && (
        <img
          src={q.situationImageUrl}
          alt="Ситуация"
          className="mb-4 max-h-56 w-auto rounded-md border border-hairline"
        />
      )}

      <div className="flex flex-col gap-2">
        {q.answers.map((a) => {
          const picked = selected.has(a.id);
          // correct → green; wrongly picked → red; missed correct → amber.
          let style = "border-hairline bg-canvas text-body";
          let tag = "";
          if (a.correct && picked) {
            style = "border-success/50 bg-success/10 text-[#3f8a4f]";
            tag = "Верен ✓";
          } else if (a.correct && !picked) {
            style = "border-accent-amber/60 bg-accent-amber/10 text-[#a06a13]";
            tag = "Пропуснат верен";
          } else if (!a.correct && picked) {
            style = "border-error/50 bg-error/10 text-error";
            tag = "Грешен избор ✗";
          }
          return (
            <div
              key={a.id}
              className={cx("flex items-center justify-between rounded-md border px-4 py-2.5", style)}
            >
              <span>{a.text}</span>
              {tag && <span className="ml-3 shrink-0 text-xs font-medium opacity-90">{tag}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
