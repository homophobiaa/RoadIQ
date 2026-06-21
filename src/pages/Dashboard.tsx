import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../store";
import { Logo, PageFade, StatCard } from "../components/ui";
import { cx } from "../lib/utils";

export default function Dashboard() {
  const { sources, questions, loadState, progress, loadQuestions, startTest, setView } = useStore();

  const stats = useMemo(() => {
    const high = questions.filter((q) => q.parseConfidence === "high").length;
    const medium = questions.filter((q) => q.parseConfidence === "medium").length;
    const low = questions.filter((q) => q.parseConfidence === "low").length;
    const usable = questions.filter((q) => q.answers.length >= 2 && q.correctCount >= 1).length;
    return { high, medium, low, usable, parsed: high + medium };
  }, [questions]);

  return (
    <PageFade>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-12 flex items-center justify-between">
          <Logo />
          {loadState === "done" && (
            <button className="btn-ghost" onClick={() => setView("debug")}>
              Debug разчетените въпроси
            </button>
          )}
        </header>

        {/* Hero */}
        <section className="mb-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
          >
            Тренирай листовките
            <span className="block bg-gradient-to-r from-coral via-coral-soft to-amber bg-clip-text text-transparent">
              от собствените си грешки
            </span>
          </motion.h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Пусни снимки на сгрешени листовки в <code className="text-coral-soft">public/screenshots/</code> и
            RoadIQ ще ги разчете автоматично в браузъра с OCR и генерира случайни тестове.
          </p>
        </section>

        {loadState === "idle" && <IdlePanel found={sources.length} onLoad={() => loadQuestions()} />}
        {loadState === "loading" && progress && <LoadingPanel />}
        {loadState === "done" && (
          <DonePanel stats={stats} onStart={startTest} onReload={() => loadQuestions(true)} />
        )}
      </div>
    </PageFade>
  );
}

function IdlePanel({ found, onLoad }: { found: number; onLoad: () => void }) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <p className="text-slate-300">
        Намерени снимки: <span className="font-bold text-white">{found}</span>
      </p>
      {found === 0 ? (
        <p className="text-sm text-danger">
          Няма снимки. Добави .png / .jpg файлове в <code>public/screenshots/</code> и презареди.
        </p>
      ) : (
        <button className="btn-primary px-8 py-3 text-base" onClick={onLoad}>
          Зареди въпросите
        </button>
      )}
    </div>
  );
}

function LoadingPanel() {
  const { progress } = useStore();
  if (!progress) return null;
  return (
    <div className="card mx-auto max-w-xl">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-display text-2xl font-bold">{progress.percent}%</span>
        <span className="text-sm text-slate-400">
          {progress.current} / {progress.total}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-coral to-amber"
          animate={{ width: `${progress.percent}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>
      <p className="mt-3 truncate text-sm text-slate-400">
        {progress.fileName ? `Обработвам: ${progress.fileName}` : "Финализирам…"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        OCR работи в браузъра — първото зареждане сваля езиков модел и може да отнеме малко.
      </p>
    </div>
  );
}

interface Stats {
  high: number;
  medium: number;
  low: number;
  usable: number;
  parsed: number;
}

function DonePanel({
  stats,
  onStart,
  onReload,
}: {
  stats: Stats;
  onStart: (n: number) => void;
  onReload: () => void;
}) {
  const { sources } = useStore();
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Намерени снимки" value={sources.length} />
        <StatCard label="Успешно разчетени" value={stats.parsed} accent="text-success" />
        <StatCard label="С ниска увереност" value={stats.low} accent="text-amber" />
        <StatCard label="Годни за тест" value={stats.usable} accent="text-coral-soft" />
      </div>

      <TestSetup max={stats.usable} onStart={onStart} />

      <div className="flex flex-wrap justify-center gap-3">
        <button className="btn-ghost" onClick={onReload}>
          Презареди (повтори OCR)
        </button>
      </div>
    </div>
  );
}

function TestSetup({ max, onStart }: { max: number; onStart: (n: number) => void }) {
  const [count, setCount] = useState(Math.min(10, Math.max(1, max)));
  const quick = [10, 20, 30];
  const disabled = max === 0;

  const set = (n: number) => setCount(Math.min(Math.max(1, n), Math.max(1, max)));

  return (
    <div className="card mx-auto w-full max-w-xl">
      <h2 className="mb-1 font-display text-xl font-bold">Започни тест</h2>
      <p className="mb-5 text-sm text-slate-400">
        {disabled
          ? "Няма годни въпроси. Виж Debug за да провериш разчитането."
          : `Налични годни въпроси: ${max}`}
      </p>

      <label className="mb-2 block text-sm text-slate-300">Брой въпроси</label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={Math.max(1, max)}
          value={count}
          disabled={disabled}
          onChange={(e) => set(parseInt(e.target.value || "1", 10))}
          className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-semibold outline-none focus:border-coral/60"
        />
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              disabled={disabled || q > max}
              className={cx("btn-chip", count === q && "!bg-coral/20 !border-coral/50 text-white")}
              onClick={() => set(q)}
            >
              {q}
            </button>
          ))}
          <button
            disabled={disabled}
            className={cx("btn-chip", count === max && "!bg-coral/20 !border-coral/50 text-white")}
            onClick={() => set(max)}
          >
            Всички
          </button>
        </div>
      </div>

      <button
        disabled={disabled}
        className="btn-primary mt-6 w-full py-3 text-base"
        onClick={() => onStart(count)}
      >
        Започни тест →
      </button>
    </div>
  );
}
