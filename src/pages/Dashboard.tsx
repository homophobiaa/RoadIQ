import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { questionCounts, useStore } from "../store";
import { Logo, PageFade, SpikeMark, StatCard } from "../components/ui";
import { cx } from "../lib/utils";

export default function Dashboard() {
  const { sources, questions, loadState, loadQuestions, startTest, setView } = useStore();
  const counts = useMemo(() => questionCounts(questions), [questions]);

  return (
    <PageFade>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Top nav */}
        <header className="mb-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button className="btn-link" onClick={() => setView("cheatsheets")}>
              Справочник
            </button>
            {loadState === "done" && (
              <>
                <button className="btn-link" onClick={() => setView("debug")}>
                  Debug / корекции
                </button>
                <button className="btn-secondary" onClick={() => loadQuestions(true)}>
                  Презареди
                </button>
              </>
            )}
          </div>
        </header>

        {/* Hero */}
        <section className="mb-12 max-w-3xl">
          <span className="caption-up mb-4 inline-flex items-center gap-2">
            <SpikeMark className="h-3.5 w-3.5" /> Листовки тренировка
          </span>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-display-lg font-semibold text-ink sm:text-display-xl"
          >
            Учи от собствените си грешки.
          </motion.h1>
          <p className="mt-5 max-w-xl text-title-md text-body">
            Пусни скрийншоти на сгрешени листовки в{" "}
            <code className="rounded-sm bg-surface-card px-1.5 py-0.5 font-mono text-sm text-primary-active">
              public/screenshots/
            </code>
            . RoadIQ ги разчита автоматично в браузъра с OCR и генерира случайни тестове — без
            backend, без ръчно писане.
          </p>
        </section>

        {loadState === "idle" && <IdlePanel found={sources.length} onLoad={() => loadQuestions()} />}
        {loadState === "loading" && <LoadingPanel />}
        {loadState === "done" && (
          <DonePanel counts={counts} sources={sources.length} onStart={startTest} />
        )}
      </div>
    </PageFade>
  );
}

function IdlePanel({ found, onLoad }: { found: number; onLoad: () => void }) {
  return (
    <div className="card-dark max-w-xl">
      <p className="text-on-dark-soft">
        Намерени снимки в папката:{" "}
        <span className="font-semibold text-on-dark">{found}</span>
      </p>
      {found === 0 ? (
        <p className="mt-3 text-sm text-[#e0a08c]">
          Няма снимки. Добави .png / .jpg файлове в <code>public/screenshots/</code> и презареди
          страницата.
        </p>
      ) : (
        <button className="btn-primary mt-6 px-7 py-3 text-base shadow-coral" onClick={onLoad}>
          Зареди въпросите →
        </button>
      )}
    </div>
  );
}

function LoadingPanel() {
  const { progress } = useStore();
  if (!progress) return null;
  return (
    <div className="card-dark max-w-2xl">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="font-display text-display-sm font-semibold text-on-dark">
          {progress.percent}%
        </span>
        <span className="font-mono text-sm text-on-dark-soft">
          {progress.current} / {progress.total}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-pill bg-white/10">
        <motion.div
          className="h-full rounded-pill bg-primary"
          animate={{ width: `${progress.percent}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>
      <p className="mt-4 truncate font-mono text-sm text-on-dark-soft">
        {progress.fileName ? `▸ ${progress.fileName}` : "Финализирам…"}
      </p>
      <p className="mt-2 text-sm text-on-dark-soft/70">
        OCR работи изцяло в браузъра — първото зареждане сваля езиков модел и може да отнеме малко.
      </p>
    </div>
  );
}

type Counts = ReturnType<typeof questionCounts>;

function DonePanel({
  counts,
  sources,
  onStart,
}: {
  counts: Counts;
  sources: number;
  onStart: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Намерени" value={sources} />
        <StatCard label="Годни за тест" value={counts.usable} accent="text-primary-active" />
        <StatCard label="За преглед" value={counts.needsReview} accent="text-[#a06a13]" />
        <StatCard label="Потвърдени" value={counts.verified} accent="text-success" />
        <StatCard label="Изключени" value={counts.excluded} accent="text-muted" />
        <StatCard label="Ръчни изрязвания" value={counts.manualCrops} accent="text-primary" />
        <StatCard label="Ниска увереност" value={counts.low} accent="text-error" />
      </div>

      <TestSetup counts={counts} onStart={onStart} />
    </div>
  );
}

function TestSetup({ counts, onStart }: { counts: Counts; onStart: (n: number) => void }) {
  const { includeUnverified, setIncludeUnverified, setView } = useStore();
  const max = counts.usable;
  const [count, setCount] = useState(Math.min(10, Math.max(1, max)));
  const disabled = max === 0;
  const set = (n: number) => setCount(Math.min(Math.max(1, n), Math.max(1, max)));

  const trusted = counts.verified + counts.corrected;
  const willUseUnverified = includeUnverified || trusted < count;
  const warnUnverified = willUseUnverified && trusted < count;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Featured coral-adjacent setup card */}
      <div className="card-outline">
        <h2 className="font-display text-display-sm font-semibold text-ink">Започни тест</h2>
        <p className="mt-1 text-body">
          {disabled
            ? "Няма годни въпроси. Отвори Debug, за да коригираш разчитането."
            : `Налични годни въпроси: ${max}`}
        </p>

        <label className="caption-up mt-7 mb-2 block">Брой въпроси</label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={1}
            max={Math.max(1, max)}
            value={count}
            disabled={disabled}
            onChange={(e) => set(parseInt(e.target.value || "1", 10))}
            className="input w-24 text-center text-title-lg font-semibold"
          />
          {[10, 20, 30].map((q) => (
            <button
              key={q}
              disabled={disabled || q > max}
              className={cx("chip", count === q && "chip-active")}
              onClick={() => set(q)}
            >
              {q}
            </button>
          ))}
          <button
            disabled={disabled}
            className={cx("chip", count === max && "chip-active")}
            onClick={() => set(max)}
          >
            Всички
          </button>
        </div>

        <label className="mt-6 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={includeUnverified}
            onChange={(e) => setIncludeUnverified(e.target.checked)}
            className="h-4 w-4 accent-[#cc785c]"
          />
          <span className="text-sm text-body">Използвай и непроверени въпроси</span>
        </label>

        {warnUnverified && (
          <p className="mt-3 rounded-md bg-accent-amber/15 px-3 py-2 text-sm text-[#a06a13]">
            ⚠ Тестът ще включи непроверени/нискоувереност въпроси — потвърдените не достигат.
          </p>
        )}

        <button
          disabled={disabled}
          className="btn-primary mt-7 w-full py-3 text-base shadow-coral"
          onClick={() => onStart(count)}
        >
          Започни тест →
        </button>
      </div>

      {/* Side dark card: correction safety-net pitch */}
      <div className="card-dark flex flex-col justify-between">
        <div>
          <SpikeMark className="mb-4 h-5 w-5" color="#cc785c" />
          <h3 className="font-display text-title-lg font-semibold text-on-dark">
            Парсерът греши — ти го поправяш.
          </h3>
          <p className="mt-3 text-sm text-on-dark-soft">
            В Debug режима можеш да редактираш заглавия и отговори, да маркираш верните, да изрязваш
            ситуационната снимка и да потвърждаваш въпроси. Корекциите се пазят локално.
          </p>
        </div>
        <button className="btn-secondary-on-dark mt-6 w-full" onClick={() => setView("debug")}>
          Отвори Debug Studio
        </button>
      </div>
    </div>
  );
}
