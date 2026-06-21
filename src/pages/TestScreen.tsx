import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { useStore } from "../store";
import { Logo, PageFade } from "../components/ui";
import { isAnswered } from "../lib/testEngine";
import { cx } from "../lib/utils";

export default function TestScreen() {
  const { test, currentIndex, goto, toggleAnswer, submitTest, capHitSignal, setView } = useStore();
  const [showSituation, setShowSituation] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  if (!test) return null;
  const tq = test[currentIndex];
  const answeredCount = test.filter(isAnswered).length;
  const allAnswered = answeredCount === test.length;
  const unanswered = test.map((t, i) => (isAnswered(t) ? -1 : i)).filter((i) => i >= 0);

  const submit = () => {
    if (!allAnswered) {
      setToast(
        `Не можеш да предадеш теста преди да отговориш на всички въпроси. Остават: ${unanswered
          .map((i) => i + 1)
          .join(", ")}`,
      );
      return;
    }
    submitTest();
  };

  return (
    <PageFade>
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <Sidebar />
        <main className="flex-1">
          <div className="mb-5 flex items-center justify-between">
            <Logo />
            <button className="btn-ghost text-sm" onClick={() => setView("dashboard")}>
              Изход
            </button>
          </div>

          <QuestionPanel
            key={tq.question.id}
            showSituation={showSituation}
            setShowSituation={setShowSituation}
            capHitSignal={capHitSignal}
            onToggle={(aid) => toggleAnswer(currentIndex, aid)}
          />

          {/* Nav controls */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                className="btn-ghost"
                disabled={currentIndex === 0}
                onClick={() => goto(currentIndex - 1)}
              >
                ← Предишен
              </button>
              <button
                className="btn-ghost"
                disabled={currentIndex === test.length - 1}
                onClick={() => goto(currentIndex + 1)}
              >
                Следващ →
              </button>
              <button
                className="btn-chip"
                onClick={() => goto(Math.min(currentIndex + 1, test.length - 1))}
              >
                Пропусни
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                Отговорени {answeredCount}/{test.length}
              </span>
              <button
                className={cx("btn-primary", !allAnswered && "!bg-white/10 !shadow-none")}
                onClick={submit}
              >
                Предай теста
              </button>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </PageFade>
  );
}

function Sidebar() {
  const { test, currentIndex, goto } = useStore();
  if (!test) return null;
  return (
    <aside className="hidden w-40 shrink-0 md:block">
      <div className="card sticky top-6 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Въпроси</h3>
        <div className="grid grid-cols-4 gap-2">
          {test.map((tq, i) => {
            const done = isAnswered(tq);
            return (
              <button
                key={tq.question.id}
                onClick={() => goto(i)}
                className={cx(
                  "grid aspect-square place-items-center rounded-lg border text-sm font-medium transition-all",
                  i === currentIndex
                    ? "border-coral bg-coral/20 text-white"
                    : done
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-1.5 text-xs text-slate-500">
          <Legend className="bg-coral/40" label="Текущ" />
          <Legend className="bg-success/40" label="Отговорен" />
          <Legend className="bg-white/10" label="Без отговор" />
        </div>
      </div>
    </aside>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cx("h-3 w-3 rounded", className)} />
      {label}
    </div>
  );
}

function QuestionPanel({
  showSituation,
  setShowSituation,
  capHitSignal,
  onToggle,
}: {
  showSituation: boolean;
  setShowSituation: (v: boolean) => void;
  capHitSignal: number;
  onToggle: (answerId: string) => void;
}) {
  const { test, currentIndex } = useStore();
  const tq = test![currentIndex];
  const q = tq.question;
  // Re-trigger the shake animation whenever the cap signal increments.
  const controls = useAnimationControls();
  const lastSignal = useRef(capHitSignal);
  useEffect(() => {
    if (capHitSignal !== lastSignal.current) {
      lastSignal.current = capHitSignal;
      controls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.4 } });
    }
  }, [capHitSignal, controls]);

  return (
    <motion.div animate={controls}>
      <div className="card">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-sm text-slate-500">
              Въпрос {currentIndex + 1} от {test!.length}
            </span>
            <h2 className="mt-1 font-display text-2xl font-bold leading-snug">{q.title}</h2>
          </div>
          <span className="shrink-0 rounded-full border border-coral/40 bg-coral/15 px-3 py-1 text-sm text-coral-soft">
            Избери {q.correctCount} {plural(q.correctCount)}
          </span>
        </div>

        {q.situationImageUrl && showSituation && (
          <img
            src={q.situationImageUrl}
            alt="Ситуация"
            className="mb-5 max-h-72 w-auto rounded-xl border border-white/10"
          />
        )}
        {!q.situationImageUrl && q.sourceImageUrl && (
          <SituationFallback url={q.sourceImageUrl} show={showSituation} toggle={setShowSituation} />
        )}

        <div className="grid gap-3">
          {q.answers.map((a, i) => {
            const selected = tq.selected.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => onToggle(a.id)}
                className={cx(
                  "group flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-coral bg-coral/15 shadow-glow"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                )}
              >
                <span
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-sm font-semibold",
                    selected ? "border-coral bg-coral text-white" : "border-white/20 text-slate-400",
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-slate-100">{a.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function SituationFallback({
  url,
  show,
  toggle,
}: {
  url: string;
  show: boolean;
  toggle: (v: boolean) => void;
}) {
  return (
    <div className="mb-5">
      <button className="btn-chip mb-2 text-xs" onClick={() => toggle(!show)}>
        {show ? "Скрий" : "Покажи"} оригиналната снимка
      </button>
      {show && (
        <img
          src={url}
          alt="Оригинална снимка"
          className="max-h-72 w-auto rounded-xl border border-white/10 opacity-80"
        />
      )}
    </div>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2"
    >
      <div className="glass rounded-xl border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
        {message}
      </div>
    </motion.div>
  );
}

function plural(n: number): string {
  return n === 1 ? "верен отговор" : "верни отговора";
}
