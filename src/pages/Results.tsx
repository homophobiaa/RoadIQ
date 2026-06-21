import { motion } from "framer-motion";
import { useStore } from "../store";
import { PageFade } from "../components/ui";
import { PASSING_PERCENT } from "../lib/testEngine";
import { formatDuration } from "../lib/utils";

export default function Results() {
  const { grade, elapsedMs, setView, startTest, test } = useStore();
  if (!grade) return null;
  const { percent, correct, total, passed } = grade;

  return (
    <PageFade>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="card w-full text-center"
        >
          <div
            className={`mx-auto mb-6 grid h-32 w-32 place-items-center rounded-full border-4 ${
              passed ? "border-success/50" : "border-danger/50"
            }`}
          >
            <span className="font-display text-4xl font-bold">{percent}%</span>
          </div>

          <h1
            className={`font-display text-3xl font-bold ${passed ? "text-success" : "text-danger"}`}
          >
            {passed ? "Издържал 🎉" : "Неиздържал"}
          </h1>
          <p className="mt-2 text-slate-400">
            {correct} от {total} верни · праг за преминаване {PASSING_PERCENT}%
          </p>
          <p className="mt-1 text-sm text-slate-500">Време: {formatDuration(elapsedMs)}</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              className="btn-primary py-3"
              onClick={() => startTest(test ? test.length : 10)}
            >
              Нов тест
            </button>
            <button className="btn-ghost" onClick={() => setView("review")}>
              Преглед на грешките
            </button>
            <button className="btn-ghost" onClick={() => setView("dashboard")}>
              Към таблото
            </button>
          </div>
        </motion.div>
      </div>
    </PageFade>
  );
}
