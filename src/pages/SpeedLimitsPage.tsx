import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store";
import { Logo, PageFade } from "../components/ui";
import { cx } from "../lib/utils";
import { getCategory, type RoadType } from "../data/speedLimits";
import { SpeedLimitsHero } from "../components/speed-limits/SpeedLimitsHero";
import { RoadTypeSelector } from "../components/speed-limits/RoadTypeSelector";
import { CategorySelector } from "../components/speed-limits/CategorySelector";
import { SpeedDisplay } from "../components/speed-limits/SpeedDisplay";
import { SpeedLimitsTable } from "../components/speed-limits/SpeedLimitsTable";
import { CategoryCompare } from "../components/speed-limits/CategoryCompare";
import { SpeedKnowledgeQuiz } from "../components/speed-limits/SpeedKnowledgeQuiz";
import { SpeedLimitsSourceNote } from "../components/speed-limits/SpeedLimitsSourceNote";

type Mode = "explore" | "compare" | "quiz";
const MODES: { key: Mode; label: string }[] = [
  { key: "explore", label: "Изследвай" },
  { key: "compare", label: "Сравни категории" },
  { key: "quiz", label: "Провери знанията си" },
];

const DEFAULT_CATEGORY = "b";

export default function SpeedLimitsPage() {
  const { setView } = useStore();
  const [mode, setMode] = useState<Mode>("explore");
  const [roadType, setRoadType] = useState<RoadType>("urban");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY);
  const category = getCategory(categoryId) ?? getCategory(DEFAULT_CATEGORY)!;

  const reset = () => {
    setRoadType("urban");
    setCategoryId(DEFAULT_CATEGORY);
  };

  return (
    <PageFade>
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        {/* Nav */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden text-muted sm:inline">/</span>
            <button className="btn-link hidden sm:inline-flex" onClick={() => setView("cheatsheets")}>
              Справочник
            </button>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setView("cheatsheets")}>
              ← Справочник
            </button>
            <button className="btn-link" onClick={() => setView("dashboard")}>
              Табло
            </button>
          </div>
        </header>

        <SpeedLimitsHero />

        {/* Mode tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cx("relative rounded-md px-4 py-2 text-sm font-medium transition-colors", mode === m.key ? "text-on-primary" : "text-body hover:bg-surface-soft")}
            >
              {mode === m.key && (
                <motion.span
                  layoutId="modeTab"
                  className="absolute inset-0 -z-0 rounded-md bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative z-10">{m.label}</span>
            </button>
          ))}
          {mode === "explore" && (
            <button className="btn-link ml-auto" onClick={reset}>
              Нулирай избора
            </button>
          )}
        </div>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {mode === "explore" && (
              <motion.div
                key="explore"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid gap-6 lg:grid-cols-[1fr_360px]"
              >
                <div className="space-y-6">
                  <section>
                    <h2 className="caption-up mb-3">Тип път</h2>
                    <RoadTypeSelector value={roadType} onChange={setRoadType} />
                  </section>
                  <section>
                    <h2 className="caption-up mb-3">Категория</h2>
                    <CategorySelector value={categoryId} onChange={setCategoryId} />
                  </section>
                  <section>
                    <h2 className="caption-up mb-3">Пълна таблица</h2>
                    <SpeedLimitsTable
                      selectedCategory={categoryId}
                      selectedRoad={roadType}
                      onSelect={(c, r) => {
                        setCategoryId(c);
                        setRoadType(r);
                      }}
                    />
                  </section>
                </div>

                {/* Sticky central display */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                  <SpeedDisplay category={category} roadType={roadType} />
                </div>
              </motion.div>
            )}

            {mode === "compare" && (
              <motion.div key="compare" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <CategoryCompare />
              </motion.div>
            )}

            {mode === "quiz" && (
              <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <SpeedKnowledgeQuiz />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10">
          <SpeedLimitsSourceNote />
        </div>
      </div>
    </PageFade>
  );
}
