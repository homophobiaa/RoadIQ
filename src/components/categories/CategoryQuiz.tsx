import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CATEGORY_GROUPS,
  ALL_CATEGORY_IDS,
  generateCategoryQuestion,
  getDrivingCategory,
  type CategoryQuizQuestion,
} from "../../data/drivingCategories";
import { cx } from "../../lib/utils";

type ScopeKind = "category" | "group" | "all";

export function CategoryQuiz({ selectedId, groupId }: { selectedId: string; groupId: string }) {
  const [scopeKind, setScopeKind] = useState<ScopeKind>("category");

  const scopeIds = useMemo(() => {
    if (scopeKind === "all") return ALL_CATEGORY_IDS;
    if (scopeKind === "group")
      return CATEGORY_GROUPS.find((g) => g.id === groupId)?.categoryIds ?? [selectedId];
    return [selectedId];
  }, [scopeKind, groupId, selectedId]);

  const [q, setQ] = useState<CategoryQuizQuestion>(() => generateCategoryQuestion(scopeIds));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  const answered = picked !== null;
  const correct = picked === q.answer;

  const regenerate = (ids: string[]) => {
    setPicked(null);
    setQ(generateCategoryQuestion(ids));
  };
  const setScope = (k: ScopeKind) => {
    setScopeKind(k);
    const ids =
      k === "all"
        ? ALL_CATEGORY_IDS
        : k === "group"
          ? CATEGORY_GROUPS.find((g) => g.id === groupId)?.categoryIds ?? [selectedId]
          : [selectedId];
    regenerate(ids);
  };

  const choose = (c: string) => {
    if (answered) return;
    setPicked(c);
    setTotal((t) => t + 1);
    if (c === q.answer) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else setStreak(0);
  };

  const groupLabel = CATEGORY_GROUPS.find((g) => g.id === groupId)?.label ?? "групата";
  const scopes: { k: ScopeKind; label: string }[] = [
    { k: "category", label: `Категория ${getDrivingCategory(selectedId)?.title ?? ""}` },
    { k: "group", label: groupLabel },
    { k: "all", label: "Всички" },
  ];

  return (
    <div className="card-dark">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="caption-up text-on-dark-soft">Провери категориите</span>
        <div className="flex items-center gap-3 text-sm text-on-dark-soft">
          <span>Точки <span className="font-bold text-on-dark">{score}/{total}</span></span>
          <span>Серия <span className="font-bold text-accent-amber">{streak}</span></span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {scopes.map((s) => (
          <button
            key={s.k}
            onClick={() => setScope(s.k)}
            className={cx(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              scopeKind === s.k ? "bg-primary text-on-primary" : "bg-white/5 text-on-dark-soft hover:bg-white/10",
            )}
          >
            {s.label}
          </button>
        ))}
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
        <button className="btn-primary ml-auto" onClick={() => regenerate(scopeIds)} disabled={!answered}>
          Следващ въпрос →
        </button>
      </div>
    </div>
  );
}
