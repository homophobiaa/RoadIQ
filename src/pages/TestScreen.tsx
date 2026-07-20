import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ROUTES, useStore } from "../store";
import { Logo } from "../components/ui";
import { isAnswered } from "../lib/testEngine";
import { cx } from "../lib/utils";

// The test screen is a dark navy "product surface" per DESIGN.md — the cream-to-
// dark rhythm: cream dashboard, dark focused test chrome.
export default function TestScreen() {
  const { test, currentIndex, goto, toggleAnswer, submitTest, capHitSignal } = useStore();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  if (!test) return null;
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
    navigate(ROUTES.results);
  };

  return (
    <div className="min-h-screen bg-surface-dark text-on-dark">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8"
      >
        <Sidebar />
        <main className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <Logo onDark />
            <button className="btn-secondary-on-dark" onClick={() => navigate(ROUTES.dashboard)}>
              Изход
            </button>
          </div>

          <QuestionPanel
            capHitSignal={capHitSignal}
            onToggle={(aid) => toggleAnswer(currentIndex, aid)}
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                className="btn-secondary-on-dark"
                disabled={currentIndex === 0}
                onClick={() => goto(currentIndex - 1)}
              >
                ← Предишен
              </button>
              <button
                className="btn-secondary-on-dark"
                disabled={currentIndex === test.length - 1}
                onClick={() => goto(currentIndex + 1)}
              >
                Следващ →
              </button>
              <button
                className="btn-secondary-on-dark"
                onClick={() => goto(Math.min(currentIndex + 1, test.length - 1))}
              >
                Пропусни
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-on-dark-soft">
                Отговорени {answeredCount}/{test.length}
              </span>
              <button
                className={cx(
                  "btn-primary",
                  !allAnswered && "!bg-surface-dark-elevated !text-on-dark-soft !shadow-none",
                )}
                onClick={submit}
              >
                Предай теста
              </button>
            </div>
          </div>
        </main>
      </motion.div>

      <AnimatePresence>{toast && <Toast message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}

function Sidebar() {
  const { test, currentIndex, goto } = useStore();
  if (!test) return null;
  return (
    <aside className="hidden w-44 shrink-0 md:block">
      <div className="sticky top-6 rounded-lg bg-surface-dark-elevated p-4">
        <h3 className="caption-up mb-3 text-on-dark-soft">Въпроси</h3>
        <div className="grid grid-cols-4 gap-2">
          {test.map((tq, i) => {
            const done = isAnswered(tq);
            return (
              <button
                key={tq.question.id}
                onClick={() => goto(i)}
                className={cx(
                  "grid aspect-square place-items-center rounded-md text-sm font-medium transition-colors",
                  i === currentIndex
                    ? "bg-primary text-on-primary"
                    : done
                      ? "bg-success/20 text-success"
                      : "bg-white/5 text-on-dark-soft hover:bg-white/10",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-5 space-y-2 text-xs text-on-dark-soft">
          <Legend className="bg-primary" label="Текущ" />
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
      <span className={cx("h-3 w-3 rounded-sm", className)} />
      {label}
    </div>
  );
}

function QuestionPanel({
  capHitSignal,
  onToggle,
}: {
  capHitSignal: number;
  onToggle: (answerId: string) => void;
}) {
  const { test, currentIndex } = useStore();
  const tq = test![currentIndex];
  const q = tq.question;
  const controls = useAnimationControls();
  const lastSignal = useRef(capHitSignal);
  useEffect(() => {
    if (capHitSignal !== lastSignal.current) {
      lastSignal.current = capHitSignal;
      controls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.4 } });
    }
  }, [capHitSignal, controls]);

  return (
    <motion.div
      animate={controls}
      key={q.id}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="rounded-lg bg-surface-dark-soft p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="font-mono text-sm text-on-dark-soft">
              Въпрос {currentIndex + 1} от {test!.length}
            </span>
            <h2 className="mt-1.5 font-display text-display-sm font-semibold text-on-dark">
              {q.title}
            </h2>
          </div>
          <span className="badge shrink-0 bg-primary/20 text-[#e8a079]">
            Избери {q.correctCount} {plural(q.correctCount)}
          </span>
        </div>

        {/* Only the parsed/corrected situation crop ever appears in a test —
            never the full original screenshot (it would reveal the answers). */}
        {q.situationImageUrl && (
          <img
            src={q.situationImageUrl}
            alt="Ситуация"
            className="mb-6 max-h-80 w-auto rounded-md border border-white/10"
          />
        )}

        <div className="grid gap-3">
          {q.answers.map((a, i) => {
            const selected = tq.selected.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => onToggle(a.id)}
                className={cx(
                  "flex items-center gap-4 rounded-md border p-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/15"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                )}
              >
                <span
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-md border text-sm font-semibold",
                    selected
                      ? "border-primary bg-primary text-on-primary"
                      : "border-white/20 text-on-dark-soft",
                  )}
                >
                  {String.fromCharCode(1040 + i)}
                </span>
                <span className="text-on-dark">{a.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
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
      <div className="rounded-md border border-accent-amber/40 bg-[#2a2417] px-4 py-3 text-sm text-accent-amber">
        {message}
      </div>
    </motion.div>
  );
}

function plural(n: number): string {
  return n === 1 ? "верен отговор" : "верни отговора";
}
