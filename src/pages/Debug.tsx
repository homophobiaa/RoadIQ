import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES, useStore } from "../store";
import { Logo, ConfidenceBadge, StatusBadge } from "../components/ui";
import { CropSelector } from "../components/CropSelector";
import { statusOf } from "../lib/corrections";
import { cx } from "../lib/utils";
import type { ParsedQuestion } from "../types";

type Filter = "all" | "review" | "verified" | "excluded" | "low";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Всички" },
  { key: "review", label: "За преглед" },
  { key: "verified", label: "Потвърдени" },
  { key: "low", label: "Ниска ув." },
  { key: "excluded", label: "Изключени" },
];

function matchFilter(q: ParsedQuestion, f: Filter): boolean {
  switch (f) {
    case "all":
      return true;
    case "verified":
      return !!q.verified && !q.excluded;
    case "excluded":
      return !!q.excluded;
    case "low":
      return q.parseConfidence === "low" && !q.excluded;
    case "review":
      return (
        !q.excluded &&
        !q.verified &&
        (q.parseConfidence === "low" || q.parseWarnings.length > 0 || q.correctCount === 0)
      );
  }
}

export default function Debug() {
  const { questions, exportJSON, importJSON, clearAllCorrections } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(questions[0]?.fileName ?? null);
  const importRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter(
      (x) =>
        matchFilter(x, filter) &&
        (s === "" || x.title.toLowerCase().includes(s) || x.fileName.toLowerCase().includes(s)),
    );
  }, [questions, filter, search]);

  const current = questions.find((x) => x.fileName === selected) ?? list[0] ?? null;

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roadiq-corrections.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImportFile = (file: File) =>
    file.text().then((t) => {
      try {
        importJSON(t);
      } catch {
        alert("Невалиден JSON файл.");
      }
    });

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-3">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="font-display text-title-lg font-semibold text-ink">Debug Studio</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={doExport}>
            Експорт
          </button>
          <button className="btn-secondary" onClick={() => importRef.current?.click()}>
            Импорт
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])}
          />
          <button
            className="btn-secondary !text-error"
            onClick={() => confirm("Изтриване на всички локални корекции?") && clearAllCorrections()}
          >
            Изчисти корекции
          </button>
          <button className="btn-primary" onClick={() => navigate(ROUTES.dashboard)}>
            Към таблото
          </button>
        </div>
      </header>

      {/* 3-pane body */}
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr_400px]">
        {/* LEFT: list */}
        <div className="flex min-h-0 flex-col border-r border-hairline">
          <div className="shrink-0 space-y-2 border-b border-hairline p-3">
            <input
              className="input w-full"
              placeholder="Търси заглавие/файл…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={cx("chip !px-2.5 !py-1 text-xs", filter === f.key && "chip-active")}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {list.map((q) => (
              <button
                key={q.fileName}
                onClick={() => setSelected(q.fileName)}
                className={cx(
                  "w-full rounded-md border p-3 text-left transition-colors",
                  current?.fileName === q.fileName
                    ? "border-primary bg-primary/10"
                    : "border-hairline bg-canvas hover:bg-surface-soft",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-muted">{q.fileName}</span>
                  <StatusBadge status={statusOf(q)} />
                </div>
                <div className="truncate text-sm text-ink">{q.title || "—"}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-soft">
                  <span>{q.answers.length} отг · {q.correctCount} верни</span>
                  {q.manualCrop && <span className="text-primary">• изрязан</span>}
                  {q.parseWarnings.length > 0 && <span className="text-[#a06a13]">• {q.parseWarnings.length}⚠</span>}
                </div>
              </button>
            ))}
            {list.length === 0 && <p className="p-2 text-sm text-muted">Няма съвпадения.</p>}
          </div>
        </div>

        {/* CENTER + RIGHT */}
        {current ? (
          <Studio key={current.fileName} q={current} />
        ) : (
          <div className="col-span-2 grid place-items-center text-muted">
            Зареди въпроси, за да започнеш.
          </div>
        )}
      </div>
    </div>
  );
}

const LAYOUT_LABEL: Record<string, string> = {
  "vertical-text": "Текстови отговори",
  "image-left-text-right": "Снимка + текстови отговори",
  "horizontal-image-answers": "Отговори-снимки",
  unknown: "Неразпознато",
};

function Studio({ q }: { q: ParsedQuestion }) {
  const [cropping, setCropping] = useState(false);
  const { setSituationImage } = useStore();
  return (
    <>
      {/* CENTER: large viewer / crop */}
      <div className="flex min-h-0 flex-col overflow-hidden bg-surface-soft">
        {cropping ? (
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <CropSelector
              src={q.sourceImageUrl}
              onCancel={() => setCropping(false)}
              onCrop={(url) => {
                setSituationImage(q.fileName, url);
                setCropping(false);
              }}
            />
          </div>
        ) : (
          <Viewer q={q} onCrop={() => setCropping(true)} />
        )}
      </div>

      {/* RIGHT: editor */}
      <div className="min-h-0 overflow-y-auto border-l border-hairline">
        <Editor q={q} />
      </div>
    </>
  );
}

const ZOOMS = [
  { label: "Fit", value: 0 },
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1 },
  { label: "150%", value: 1.5 },
];

type ViewMode = "original" | "regions" | "crops";

function Viewer({ q, onCrop }: { q: ParsedQuestion; onCrop: () => void }) {
  const [zoom, setZoom] = useState(0); // 0 = fit width
  const [mode, setMode] = useState<ViewMode>("regions");
  const W = q.debugFrame?.w ?? 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline px-4 py-2">
        <span className="badge bg-primary/15 text-primary-active">
          {LAYOUT_LABEL[q.layout] ?? q.layout}
        </span>
        <div className="mx-1 h-5 w-px bg-hairline" />
        {(
          [
            ["original", "Оригинал"],
            ["regions", "Рамки"],
            ["crops", "Изрязвания"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            className={cx("chip !px-2.5 !py-1 text-xs", mode === m && "chip-active")}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-hairline" />
        <span className="caption-up">Мащаб</span>
        {ZOOMS.map((z) => (
          <button
            key={z.label}
            className={cx("chip !px-2.5 !py-1 text-xs", zoom === z.value && "chip-active")}
            onClick={() => setZoom(z.value)}
          >
            {z.label}
          </button>
        ))}
        <button className="chip !px-2.5 !py-1 text-xs" onClick={onCrop}>
          Изрежи ситуация
        </button>
        {mode === "regions" && <OverlayLegend />}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {mode === "crops" ? (
          <CropsPanel q={q} />
        ) : (
          <div
            className="relative mx-auto"
            style={zoom === 0 ? { width: "100%" } : { width: W * zoom, maxWidth: "none" }}
          >
            {/* Clean source image; the SVG overlay is a separate layer that is
                never part of any canvas the OCR pipeline reads. */}
            <img src={q.sourceImageUrl} alt={q.fileName} className="block w-full rounded-md border border-hairline" />
            {mode === "regions" && <Overlay q={q} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** Extracted crops at readable size + per-region OCR diagnostics. */
function CropsPanel({ q }: { q: ParsedQuestion }) {
  return (
    <div className="space-y-5">
      {q.situationImageUrl && (
        <div>
          <span className="caption-up mb-1.5 block">Ситуация (изрязана)</span>
          <img src={q.situationImageUrl} alt="ситуация" className="max-h-72 rounded-md border border-hairline" />
        </div>
      )}
      {q.answers.some((a) => a.type === "image") && (
        <div>
          <span className="caption-up mb-1.5 block">Отговори-снимки (изрязани)</span>
          <div className="flex flex-wrap gap-3">
            {q.answers.map(
              (a, i) =>
                a.type === "image" && (
                  <div key={a.id} className="text-center">
                    <img src={a.imageUrl} alt={a.altText ?? ""} className="max-h-48 rounded-md border border-hairline bg-white" />
                    <span className={cx("mt-1 block text-xs font-medium", a.correct ? "text-success" : "text-error")}>
                      {i + 1} · {a.correct ? "верен" : "грешен"}
                    </span>
                  </div>
                ),
            )}
          </div>
        </div>
      )}
      {q.ocrRegions && q.ocrRegions.length > 0 && (
        <div>
          <span className="caption-up mb-1.5 block">OCR резултати</span>
          <div className="space-y-2">
            {q.ocrRegions.map((r, i) => (
              <OcrRegionCard key={i} q={q} r={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One OCR region: result, confidence, exact coordinates, and every attempt —
 *  alternative results are clickable and applied as a manual correction. */
function OcrRegionCard({ q, r }: { q: ParsedQuestion; r: NonNullable<ParsedQuestion["ocrRegions"]>[number] }) {
  const { editTitle, editAnswerText } = useStore();
  const apply = (text: string) => {
    if (r.answerId) editAnswerText(q.fileName, r.answerId, text);
    else editTitle(q.fileName, text);
  };
  return (
    <div
      className={cx(
        "rounded-md border p-2.5 text-sm",
        r.ok ? "border-hairline bg-canvas" : "border-error/40 bg-error/5",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-ink">{r.name}</span>
        <span className={cx("font-mono text-xs", r.confidence >= 80 ? "text-success" : r.confidence >= 60 ? "text-[#a06a13]" : "text-error")}>
          conf {r.confidence}%{!r.ok && r.reason ? ` · ${r.reason}` : ""}
        </span>
      </div>
      <p className="text-body">{r.text || "—"}</p>
      {r.rect && (
        <p className="mt-1 font-mono text-[10px] text-muted-soft">
          crop x={r.rect.x} y={r.rect.y} w={r.rect.w} h={r.rect.h} (източник {q.debugFrame?.w}×{q.debugFrame?.h})
        </p>
      )}
      {r.attempts && r.attempts.length > 1 && (
        <div className="mt-1.5 space-y-1">
          {r.attempts.map((a, j) => (
            <button
              key={j}
              onClick={() => a.text && apply(a.text)}
              title="Приложи този вариант като корекция"
              className="block w-full rounded border border-hairline-soft bg-surface-soft px-2 py-1 text-left text-xs text-body hover:bg-surface-strong"
            >
              <span className="font-mono text-muted-soft">[{a.variant} psm{a.psm} · {a.confidence}%]</span>{" "}
              {a.text || "—"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OverlayLegend() {
  const items = [
    ["Заглавие", "#cc785c"],
    ["Отговор", "#5db872"],
    ["Грешен", "#c64545"],
    ["Ситуация", "#5db8a6"],
  ] as const;
  return (
    <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted">
      {items.map(([l, c]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

function Editor({ q }: { q: ParsedQuestion }) {
  const {
    editTitle,
    editAnswerText,
    toggleAnswerCorrect,
    addAnswer,
    deleteAnswer,
    setVerified,
    setExcluded,
    setSituationImage,
    resetQuestion,
    reparseOne,
    reparsing,
  } = useStore();
  const file = q.fileName;

  return (
    <div className="space-y-5 p-5">
      {/* Status + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={statusOf(q)} />
        <ConfidenceBadge value={q.parseConfidence} />
        {!q.usable && <span className="badge bg-error/15 text-error">за преглед</span>}
        <span className="ml-auto font-mono text-xs text-muted-soft">авт. запис ✓</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          className={cx("chip justify-center", q.verified && "chip-active")}
          onClick={() => setVerified(file, !q.verified)}
        >
          {q.verified ? "✓ Потвърден" : "Потвърди"}
        </button>
        <button
          className={cx("chip justify-center", q.excluded && "!border-error !bg-error !text-on-primary")}
          onClick={() => setExcluded(file, !q.excluded)}
        >
          {q.excluded ? "Изключен" : "Изключи"}
        </button>
        <button
          className="chip justify-center"
          onClick={() => confirm("Връщане към изхода на парсера?") && resetQuestion(file)}
        >
          Нулирай
        </button>
      </div>
      <button
        className="chip w-full justify-center"
        disabled={reparsing !== null}
        onClick={() => reparseOne(file)}
      >
        {reparsing === file ? "Разпознаване…" : "Повтори разпознаването"}
      </button>

      {q.needsImageCrop && !q.situationImageUrl && (
        <p className="rounded-md bg-accent-amber/15 px-3 py-2 text-sm text-[#8a5a10]">
          Този въпрос вероятно има ситуационна снимка, но тя не беше открита автоматично —
          използвай „Изрежи ситуация“ в прегледа вляво.
        </p>
      )}

      {/* Title */}
      <div>
        <label className="caption-up mb-1.5 block">Заглавие / въпрос</label>
        <textarea
          className="input min-h-[90px] w-full resize-y text-title-sm leading-relaxed"
          value={q.title}
          onChange={(e) => editTitle(file, e.target.value)}
        />
      </div>

      {/* Situation */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="caption-up">Ситуация (само това се показва в теста)</label>
        </div>
        {q.situationImageUrl ? (
          <>
            <img
              src={q.situationImageUrl}
              alt="ситуация"
              className="mb-2 max-h-52 w-auto rounded-md border border-hairline"
            />
            <div className="flex gap-2">
              <button
                className="chip text-xs"
                onClick={() => setSituationImage(file, q.sourceImageUrl)}
              >
                Цял скрийншот
              </button>
              <button className="chip text-xs !text-error" onClick={() => setSituationImage(file, null)}>
                Премахни
              </button>
            </div>
          </>
        ) : (
          <p className="rounded-md border border-dashed border-hairline px-3 py-2 text-sm text-muted">
            Няма изображение. Използвай „Изрежи ситуация“ в прегледа вляво.
          </p>
        )}
      </div>

      {/* Answers */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="caption-up">
            Отговори · {q.correctCount} верни от {q.answers.length}
          </label>
          <button className="btn-link" onClick={() => addAnswer(file)}>
            + Добави
          </button>
        </div>
        <div className="space-y-3">
          {q.answers.map((a, i) => (
            <div
              key={a.id}
              className={cx(
                "rounded-md border p-2.5",
                a.correct ? "border-success/50 bg-success/10" : "border-hairline bg-canvas",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-soft">{i + 1}</span>
                <button
                  onClick={() => toggleAnswerCorrect(file, a.id)}
                  className={cx(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                    a.correct
                      ? "bg-success text-white"
                      : "bg-surface-strong text-muted hover:bg-error/20 hover:text-error",
                  )}
                >
                  {a.correct ? "✓ Верен" : "✗ Грешен"}
                </button>
                <button
                  onClick={() => deleteAnswer(file, a.id)}
                  className="ml-auto rounded-md px-2 py-1 text-muted hover:bg-error/10 hover:text-error"
                >
                  Изтрий
                </button>
              </div>
              {a.type === "image" ? (
                <img
                  src={a.imageUrl}
                  alt={a.altText ?? `Отговор ${i + 1}`}
                  className="max-h-36 rounded-md border border-hairline bg-white"
                />
              ) : (
                <textarea
                  className="input min-h-[56px] w-full resize-y text-sm"
                  value={a.text}
                  onChange={(e) => editAnswerText(file, a.id, e.target.value)}
                  placeholder="(неразчетен текст — въведи ръчно)"
                />
              )}
            </div>
          ))}
          {q.answers.length === 0 && (
            <p className="text-sm text-error">Няма отговори — добави поне 2.</p>
          )}
        </div>
      </div>

      {/* Warnings */}
      {q.parseWarnings.length > 0 && (
        <div className="rounded-md bg-accent-amber/10 p-3">
          <span className="caption-up text-[#a06a13]">Предупреждения</span>
          <ul className="mt-1 space-y-1 text-sm text-[#8a5a10]">
            {q.parseWarnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Overlays detected layout boxes + icon dots onto the original screenshot. */
function Overlay({ q }: { q: ParsedQuestion }) {
  const boxes = q.debugBoxes ?? [];
  if (!q.debugFrame || (boxes.length === 0 && !(q.iconDots && q.iconDots.length))) return null;
  const { w: W, h: H } = q.debugFrame;
  const sw = Math.max(2, W / 320);
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      {boxes.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={b.color} strokeWidth={sw} />
          <rect
            x={b.x}
            y={Math.max(0, b.y - H / 36)}
            width={Math.min(W, b.label.length * (W / 64))}
            height={H / 36}
            fill={b.color}
          />
          <text x={b.x + W / 220} y={b.y - H / 120} fill="#fff" fontSize={W / 52} fontWeight="600">
            {b.label}
          </text>
        </g>
      ))}
      {(q.iconDots ?? []).map((d, i) => (
        <circle
          key={`d${i}`}
          cx={d.x}
          cy={d.y}
          r={Math.max(3, W / 80)}
          fill={d.correct ? "#5db872" : "#c64545"}
          stroke="#fff"
          strokeWidth={sw / 2}
        />
      ))}
    </svg>
  );
}
