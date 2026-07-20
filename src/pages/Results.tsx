import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ROUTES, useStore } from "../store";
import { PageFade } from "../components/ui";
import { PASSING_PERCENT } from "../lib/testEngine";
import { formatDuration } from "../lib/utils";

export default function Results() {
  const { grade, elapsedMs, startTest, test } = useStore();
  const navigate = useNavigate();
  if (!grade) return null;
  const { percent, correct, total, passed } = grade;
  const ring = passed ? "#5db872" : "#c64545";

  return (
    <PageFade>
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="card-outline w-full text-center"
        >
          {/* Progress ring */}
          <div className="relative mx-auto mb-7 h-36 w-36">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#e6dfd8" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - percent / 100) }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-display-md font-semibold text-ink">{percent}%</span>
            </div>
          </div>

          <h1
            className="font-display text-display-sm font-semibold"
            style={{ color: ring }}
          >
            {passed ? "Издържал" : "Неиздържал"}
          </h1>
          <p className="mt-2 text-body">
            {correct} от {total} верни · праг {PASSING_PERCENT}%
          </p>
          <p className="mt-1 font-mono text-sm text-muted">Време: {formatDuration(elapsedMs)}</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              className="btn-primary py-3 shadow-coral"
              onClick={() => {
                startTest(test ? test.length : 10);
                navigate(ROUTES.test);
              }}
            >
              Нов тест
            </button>
            <button className="btn-secondary" onClick={() => navigate(ROUTES.review)}>
              Преглед на грешките
            </button>
            <button className="btn-link mx-auto" onClick={() => navigate(ROUTES.dashboard)}>
              Към таблото
            </button>
          </div>
        </motion.div>
      </div>
    </PageFade>
  );
}
