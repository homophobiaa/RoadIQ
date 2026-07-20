import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { generateQuestion, type QuizQuestion } from "../../data/speedLimits";
import { cx } from "../../lib/utils";

export function SpeedKnowledgeQuiz() {
  const [q, setQ] = useState<QuizQuestion>(() => generateQuestion());
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const answered = picked !== null;
  const correct = picked === q.answer;

  const choose = (choice: string) => {
    if (answered) return;
    setPicked(choice);
    if (choice === q.answer) {
      setStreak((s) => {
        const n = s + 1;
        setBest((b) => Math.max(b, n));
        return n;
      });
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    setPicked(null);
    setQ(generateQuestion());
  };

  return (
    <div className="card-dark">
      <div className="mb-5 flex items-center justify-between">
        <span className="caption-up text-on-dark-soft">Провери знанията си</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-on-dark-soft">
            Серия <span className="font-bold text-accent-amber">{streak}</span>
          </span>
          <span className="text-on-dark-soft">
            Рекорд <span className="font-bold text-on-dark">{best}</span>
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.prompt + picked}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
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
        <button
          className="btn-primary ml-auto"
          onClick={next}
          disabled={!answered}
        >
          Следващ въпрос →
        </button>
      </div>
    </div>
  );
}
