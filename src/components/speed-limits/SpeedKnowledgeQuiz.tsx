import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  generateSpeedQuestion,
  SPEED_LIMIT_CATEGORIES,
  type QuizQuestion,
} from "../../data/speedLimits";
import { useStore } from "../../store";
import { cx } from "../../lib/utils";

// Map a licence letter (shared study preference) to the speed-table category ids
// that describe it, so a "studying for B" user is quizzed on B speeds by default.
const LICENCE_TO_SPEED: Record<string, string[]> = {
  AM: ["am"],
  A1: ["a1"],
  A2: ["a-a2"],
  A: ["a-a2"],
  B1: ["b1"],
  B: ["b"],
  BE: ["be-c1-d"],
  C1: ["be-c1-d"],
  C1E: ["be-c1-d"],
  C: ["c-ce"],
  CE: ["c-ce"],
  D1: ["be-c1-d"],
  D1E: ["be-c1-d"],
  D: ["be-c1-d"],
  DE: ["be-c1-d"],
};

const ALL_IDS = SPEED_LIMIT_CATEGORIES.map((c) => c.id);

interface Preset {
  label: string;
  licence?: string; // updates shared study pref when chosen
  ids: string[];
}
const PRESETS: Preset[] = [
  { label: "B", licence: "B", ids: ["b"] },
  { label: "A1", licence: "A1", ids: ["a1"] },
  { label: "A, A2", licence: "A2", ids: ["a-a2"] },
  { label: "C, CE", licence: "C", ids: ["c-ce"] },
  { label: "Професионални категории", ids: ["c-ce", "be-c1-d", "adr"] },
  { label: "Всички", ids: ALL_IDS },
];

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export function SpeedKnowledgeQuiz() {
  const { studyCategory, setStudyCategory } = useStore();
  const [scope, setScope] = useState<string[]>(
    () => LICENCE_TO_SPEED[studyCategory] ?? ["b"],
  );
  const [q, setQ] = useState<QuizQuestion>(() => generateSpeedQuestion(scope));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  const answered = picked !== null;
  const correct = picked === q.answer;

  const scopeLabel = useMemo(() => {
    if (sameIds(scope, ALL_IDS)) return "всички категории";
    const labels = SPEED_LIMIT_CATEGORIES.filter((c) => scope.includes(c.id)).map(
      (c) => c.shortLabel ?? c.label,
    );
    return labels.length === 1 ? `категория ${labels[0]}` : labels.join(" · ");
  }, [scope]);

  const applyScope = (ids: string[], licence?: string) => {
    setScope(ids);
    if (licence) setStudyCategory(licence);
    setPicked(null);
    setQ(generateSpeedQuestion(ids));
  };

  const toggleChip = (id: string) => {
    const next = scope.includes(id)
      ? scope.filter((x) => x !== id)
      : [...scope, id];
    applyScope(next.length ? next : [id]);
  };

  const choose = (choice: string) => {
    if (answered) return;
    setPicked(choice);
    setTotal((t) => t + 1);
    if (choice === q.answer) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else setStreak(0);
  };

  const next = () => {
    setPicked(null);
    setQ(generateSpeedQuestion(scope));
  };
  const restart = () => {
    setScore(0);
    setTotal(0);
    setStreak(0);
    next();
  };

  return (
    <div className="card-dark">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="caption-up text-on-dark-soft">Провери знанията си</span>
        <div className="flex items-center gap-3 text-sm text-on-dark-soft">
          <span>Точки <span className="font-bold text-on-dark">{score}/{total}</span></span>
          <span>Серия <span className="font-bold text-accent-amber">{streak}</span></span>
          <button className="btn-secondary-on-dark !py-1 text-xs" onClick={restart}>
            Нулирай
          </button>
        </div>
      </div>

      {/* Study scope */}
      <div className="mb-5 rounded-md bg-white/[0.04] p-3">
        <p className="mb-2 text-sm text-on-dark-soft">
          Упражняваш: <span className="font-semibold text-on-dark">{scopeLabel}</span>
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyScope(p.ids, p.licence)}
              className={cx(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                sameIds(scope, p.ids)
                  ? "bg-primary text-on-primary"
                  : "bg-white/5 text-on-dark-soft hover:bg-white/10",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SPEED_LIMIT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleChip(c.id)}
              className={cx(
                "rounded-md border px-2 py-0.5 text-xs transition-colors",
                scope.includes(c.id)
                  ? "border-accent-amber/60 bg-accent-amber/15 text-accent-amber"
                  : "border-white/10 text-on-dark-soft hover:bg-white/5",
              )}
            >
              {c.shortLabel ?? c.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.prompt + picked}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
        >
          <h3 className="mb-5 font-display text-title-lg font-semibold text-on-dark">{q.prompt}</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {q.choices.map((choice) => {
              const isAnswer = choice === q.answer;
              const isPicked = choice === picked;
              return (
                <button
                  key={choice}
                  onClick={() => choose(choice)}
                  disabled={answered}
                  className={cx(
                    "rounded-md border px-4 py-3 text-left text-sm font-medium transition-colors",
                    !answered && "border-white/10 bg-white/[0.04] text-on-dark hover:bg-white/[0.09]",
                    answered && isAnswer && "border-success bg-success/20 text-on-dark",
                    answered && isPicked && !isAnswer && "border-error bg-error/20 text-on-dark",
                    answered && !isAnswer && !isPicked && "border-white/10 bg-white/[0.02] text-on-dark-soft",
                  )}
                >
                  {choice}
                  {answered && isAnswer && " ✓"}
                  {answered && isPicked && !isAnswer && " ✗"}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between">
        <AnimatePresence>
          {answered && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={cx("text-sm font-medium", correct ? "text-success" : "text-error")}
            >
              {correct ? "Вярно!" : "Грешно"}
            </motion.span>
          )}
        </AnimatePresence>
        <button className="btn-primary ml-auto" onClick={next} disabled={!answered}>
          Следващ въпрос →
        </button>
      </div>
    </div>
  );
}
