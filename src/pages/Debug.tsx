import { useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { Logo, PageFade, ConfidenceBadge, StatusBadge } from "../components/ui";
import { CropSelector } from "../components/CropSelector";
import { statusOf } from "../lib/corrections";
import { cx } from "../lib/utils";
import type { ParsedQuestion, QuestionStatus } from "../types";

type Filter = "all" | "verified" | "corrected" | "parsed" | "low" | "excluded";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Всички" },
  { key: "verified", label: "Потвърдени" },
  { key: "corrected", label: "Коригирани" },
  { key: "parsed", label: "Автоматични" },
  { key: "low", label: "Ниска ув." },
  { key: "excluded", label: "Изключени" },
];

function matchFilter(q: ParsedQuestion, f: Filter): boolean {
  const s = statusOf(q);
  switch (f) {
    case "all":
      return true;
    case "low":
      return q.parseConfidence === "low" && !q.excluded;
    default:
      return s === (f as QuestionStatus);
  }
}

export default function Debug() {
  const { questions, setView, exportJSON, importJSON, clearAllCorrections } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(questions[0]?.fileName ?? null);
  const importRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter(
      (x) =>
        matchFilter(x, filter) &&
        (q === "" || x.title.toLowerCase().includes(q) || x.fileName.toLowerCase().includes(q)),
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
  const onImportFile = (file: File) => {
    file.text().then((t) => {
      try {
        importJSON(t);
      } catch {
        alert("Невалиден JSON файл.");
      }
    });
  };

  return (
    <PageFade>
      <div className="mx-auto max-w-[1300px] px-5 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={doExport}>
              Експорт JSON
            </button>
            <button className="btn-secondary" onClick={() => importRef.current?.click()}>
              Импорт JSON
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
              onClick={() => {
                if (confirm("Изтриване на всички локални корекции?")) clearAllCorrections();
              }}
            >
              Изчисти корекции
            </button>
            <button className="btn-primary" onClick={() => setView("dashboard")}>
              Към таблото
            </button>
          </div>
        </header>

        <h1 className="mb-1 font-display text-display-md font-semibold text-ink">
          Debug & корекции
        </h1>
        <p className="mb-6 text-body">
          Парсерът е автоматичен, но не е перфектен. Тук поправяш всичко ръчно — корекциите се пазят
          локално в браузъра.
        </p>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Master list */}
          <div className="flex flex-col gap-3">
            <input
              className="input w-full"
              placeholder="Търси по заглавие или файл…"
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
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
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
                  <div className="mt-1 text-xs text-muted-soft">
                    {q.answers.length} отг · {q.correctCount} верни
                  </div>
                </button>
              ))}
              {list.length === 0 && <p className="text-sm text-muted">Няма съвпадения.</p>}
            </div>
          </div>

          {/* Detail editor */}
          {current ? (
            <Editor key={current.fileName} q={current} />
          ) : (
            <div className="card-outline">Зареди въпроси, за да започнеш.</div>
          )}
        </div>
      </div>
    </PageFade>
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
  } = useStore();
  const [showBoxes, setShowBoxes] = useState(true);
  const [cropping, setCropping] = useState(false);
  const file = q.fileName;

  return (
    <div className="card-outline">
      {/* Header actions */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={statusOf(q)} />
          <ConfidenceBadge value={q.parseConfidence} />
          <span className="font-mono text-xs text-muted-soft">авт. запис</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={cx("chip", q.verified && "chip-active")}
            onClick={() => setVerified(file, !q.verified)}
          >
            {q.verified ? "✓ Потвърден" : "Потвърди"}
          </button>
          <button
            className={cx("chip", q.excluded && "!border-error !bg-error !text-on-primary")}
            onClick={() => setExcluded(file, !q.excluded)}
          >
            {q.excluded ? "Изключен" : "Изключи от тест"}
          </button>
          <button
            className="chip"
            onClick={() => {
              if (confirm("Връщане към изхода на парсера за този въпрос?")) resetQuestion(file);
            }}
          >
            Нулирай
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: screenshot + overlay + crop */}
        <div>
          {cropping ? (
            <CropSelector
              src={q.sourceImageUrl}
              onCancel={() => setCropping(false)}
              onCrop={(url) => {
                setSituationImage(file, url);
                setCropping(false);
              }}
            />
          ) : (
            <>
              <div className="relative inline-block max-w-full overflow-hidden rounded-md border border-hairline">
                <img src={q.sourceImageUrl} alt={q.fileName} className="block w-full" />
                {showBoxes && <Overlay q={q} />}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="chip text-xs" onClick={() => setShowBoxes((v) => !v)}>
                  {showBoxes ? "Скрий" : "Покажи"} рамки
                </button>
                <button className="chip text-xs" onClick={() => setCropping(true)}>
                  Избери ситуация (изрязване)
                </button>
                <button
                  className="chip text-xs"
                  onClick={() => setSituationImage(file, q.sourceImageUrl)}
                >
                  Цяла снимка като ситуация
                </button>
                {q.situationImageUrl && (
                  <button className="chip text-xs" onClick={() => setSituationImage(file, null)}>
                    Премахни ситуация
                  </button>
                )}
              </div>
              {q.situationImageUrl && (
                <div className="mt-3">
                  <span className="caption-up">Текуща ситуация</span>
                  <img
                    src={q.situationImageUrl}
                    alt="ситуация"
                    className="mt-1 max-h-40 rounded-md border border-hairline"
                  />
                </div>
              )}
            </>
          )}

          {q.parseWarnings.length > 0 && (
            <div className="mt-4 rounded-md bg-accent-amber/10 p-3">
              <span className="caption-up text-[#a06a13]">Предупреждения</span>
              <ul className="mt-1 space-y-1 text-sm text-[#8a5a10]">
                {q.parseWarnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: editable fields */}
        <div className="flex flex-col gap-5">
          <div>
            <label className="caption-up mb-1.5 block">Заглавие</label>
            <textarea
              className="input min-h-[64px] w-full resize-y"
              value={q.title}
              onChange={(e) => editTitle(file, e.target.value)}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="caption-up">
                Отговори · {q.correctCount} верни от {q.answers.length}
              </label>
              <button className="btn-link" onClick={() => addAnswer(file)}>
                + Добави отговор
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {q.answers.map((a) => (
                <div
                  key={a.id}
                  className={cx(
                    "flex items-center gap-2 rounded-md border p-2",
                    a.correct ? "border-success/50 bg-success/10" : "border-hairline bg-canvas",
                  )}
                >
                  <button
                    title="Маркирай верен/грешен"
                    onClick={() => toggleAnswerCorrect(file, a.id)}
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-bold transition-colors",
                      a.correct
                        ? "bg-success text-white"
                        : "bg-surface-strong text-muted hover:bg-error/20 hover:text-error",
                    )}
                  >
                    {a.correct ? "✓" : "✗"}
                  </button>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                    value={a.text}
                    onChange={(e) => editAnswerText(file, a.id, e.target.value)}
                  />
                  <button
                    title="Изтрий"
                    onClick={() => deleteAnswer(file, a.id)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-error/10 hover:text-error"
                  >
                    🗑
                  </button>
                </div>
              ))}
              {q.answers.length === 0 && (
                <p className="text-sm text-error">Няма отговори — добави поне 2.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Overlays detected layout boxes + icon dots onto the original screenshot. */
function Overlay({ q }: { q: ParsedQuestion }) {
  const boxes = q.debugBoxes ?? [];
  if (!q.debugFrame || (boxes.length === 0 && !(q.iconDots && q.iconDots.length))) return null;
  const { w: W, h: H } = q.debugFrame;
  const sw = Math.max(2, W / 280);
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
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
            strokeWidth={sw}
          />
          <rect x={b.x} y={Math.max(0, b.y - H / 38)} width={b.label.length * (W / 70)} height={H / 38} fill={b.color} />
          <text x={b.x + W / 220} y={b.y - H / 130} fill="#fff" fontSize={W / 55} fontWeight="600">
            {b.label}
          </text>
        </g>
      ))}
      {(q.iconDots ?? []).map((d, i) => (
        <circle
          key={`d${i}`}
          cx={d.x}
          cy={d.y}
          r={Math.max(3, W / 90)}
          fill={d.correct ? "#5db872" : "#c64545"}
          stroke="#fff"
          strokeWidth={sw / 2}
        />
      ))}
    </svg>
  );
}
