import { useState } from "react";
import { useStore } from "../store";
import { ConfidenceBadge, PageFade } from "../components/ui";
import { cx } from "../lib/utils";
import type { ParsedQuestion } from "../types";

export default function Debug() {
  const { questions, setView } = useStore();
  const [filter, setFilter] = useState<"all" | "low">("all");

  const list = filter === "low" ? questions.filter((q) => q.parseConfidence === "low") : questions;

  return (
    <PageFade>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Debug — разчитане</h1>
          <button className="btn-ghost" onClick={() => setView("dashboard")}>
            Към таблото
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          <button
            className={cx("btn-chip", filter === "all" && "!bg-coral/20 !border-coral/50")}
            onClick={() => setFilter("all")}
          >
            Всички ({questions.length})
          </button>
          <button
            className={cx("btn-chip", filter === "low" && "!bg-coral/20 !border-coral/50")}
            onClick={() => setFilter("low")}
          >
            Ниска увереност ({questions.filter((q) => q.parseConfidence === "low").length})
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {list.map((q) => (
            <DebugCard key={q.id} q={q} />
          ))}
        </div>
      </div>
    </PageFade>
  );
}

function DebugCard({ q }: { q: ParsedQuestion }) {
  const [showBoxes, setShowBoxes] = useState(true);
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-xs text-slate-500">{q.fileName}</span>
        <ConfidenceBadge value={q.parseConfidence} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Left: original with overlay */}
        <div>
          <div className="relative inline-block max-w-full">
            <img src={q.sourceImageUrl} alt={q.fileName} className="w-full rounded-lg" />
            {showBoxes && <BoxOverlay q={q} />}
          </div>
          <button className="btn-chip mt-2 text-xs" onClick={() => setShowBoxes((v) => !v)}>
            {showBoxes ? "Скрий" : "Покажи"} рамки
          </button>
        </div>

        {/* Right: extracted data */}
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <span className="text-slate-500">Заглавие</span>
            <p className="text-slate-100">{q.title || "—"}</p>
          </div>

          <div>
            <span className="text-slate-500">
              Отговори · верни: {q.correctCount}/{q.answers.length}
            </span>
            <ul className="mt-1 space-y-1">
              {q.answers.map((a) => (
                <li
                  key={a.id}
                  className={cx(
                    "rounded-md border px-2 py-1",
                    a.correct
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-danger/40 bg-danger/10 text-danger",
                  )}
                >
                  {a.correct ? "✓" : "✗"} {a.text}
                </li>
              ))}
              {q.answers.length === 0 && <li className="text-danger">Няма открити отговори</li>}
            </ul>
          </div>

          {q.situationImageUrl && (
            <div>
              <span className="text-slate-500">Ситуация (crop)</span>
              <img
                src={q.situationImageUrl}
                alt="crop"
                className="mt-1 max-h-32 rounded-md border border-white/10"
              />
            </div>
          )}

          {q.parseWarnings.length > 0 && (
            <div>
              <span className="text-slate-500">Предупреждения</span>
              <ul className="mt-1 space-y-1">
                {q.parseWarnings.map((w, i) => (
                  <li key={i} className="text-amber">
                    • {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Overlays detected layout boxes on top of the original screenshot. Boxes are in
 * the parser's (possibly downscaled) pixel space; we render with percentage
 * coords via a viewBox-less absolute layer scaled to the natural image, using a
 * known reference: the parser scaled to max 1400px, so we normalise by the
 * box coords against the rendered image using object-relative percentages.
 */
function BoxOverlay({ q }: { q: ParsedQuestion }) {
  const boxes = q.debugBoxes ?? [];
  if (boxes.length === 0 || !q.debugFrame) return null;
  // Render an SVG sized to the exact analysis frame and stretch it onto the
  // rendered image via preserveAspectRatio="none", so box coords line up
  // regardless of how the browser scaled the displayed screenshot.
  const frameW = q.debugFrame.w;
  const frameH = q.debugFrame.h;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${frameW} ${frameH}`}
      preserveAspectRatio="none"
    >
      {boxes.map((b, i) => (
        <g key={i}>
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill="none"
            stroke={b.color}
            strokeWidth={Math.max(2, frameW / 300)}
          />
          <text x={b.x + 4} y={b.y + frameH / 60 + 14} fill={b.color} fontSize={frameW / 45}>
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
