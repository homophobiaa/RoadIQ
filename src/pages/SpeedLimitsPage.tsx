import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ROUTES } from "../store";
import { PageFade } from "../components/ui";
import { TopNav } from "../components/TopNav";
import { cx } from "../lib/utils";
import {
  getCategory,
  ROAD_TYPES,
  SPEED_LIMIT_CATEGORIES,
  roadTypeLabel,
  type RoadType,
} from "../data/speedLimits";
import { RoadTypeIcon, RoadSignNumber, ProhibitedSign } from "../components/speed-limits/shared";
import { SpeedLimitsTable } from "../components/speed-limits/SpeedLimitsTable";
import { SpeedKnowledgeQuiz } from "../components/speed-limits/SpeedKnowledgeQuiz";
import { SpeedLimitsSourceNote } from "../components/speed-limits/SpeedLimitsSourceNote";

const DEFAULT_CATEGORY = "b";

export default function SpeedLimitsPage() {
  const [roadType, setRoadType] = useState<RoadType>("urban");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY);
  const [tab, setTab] = useState<"table" | "quiz">("table");
  const category = getCategory(categoryId) ?? getCategory(DEFAULT_CATEGORY)!;

  return (
    <PageFade>
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <TopNav
          right={
            <Link className="btn-secondary" to={ROUTES.cheatsheets}>
              ← Справочник
            </Link>
          }
        />

        {/* Slim hero */}
        <div className="mb-6">
          <span className="badge mb-3 bg-primary/15 text-primary-active">Данни от учебната таблица</span>
          <h1 className="font-display text-display-md font-semibold text-ink">
            Ограничения на скоростта
          </h1>
          <p className="mt-2 max-w-2xl text-body">
            Максимално допустимите скорости по категория и тип път. Кликни клетка в таблицата, за да
            я заредиш в бързата проверка.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex items-center gap-2">
          {(["table", "quiz"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx(
                "relative rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t ? "text-on-primary" : "text-body hover:bg-surface-soft",
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="speedTab"
                  className="absolute inset-0 -z-0 rounded-md bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative z-10">{t === "table" ? "Таблица" : "Провери знанията си"}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "table" ? (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="grid gap-6 lg:grid-cols-[1fr_320px]"
            >
              {/* Table is the primary content */}
              <section className="lg:order-1 order-2">
                <SpeedLimitsTable
                  selectedCategory={categoryId}
                  selectedRoad={roadType}
                  onSelect={(c, r) => {
                    setCategoryId(c);
                    setRoadType(r);
                  }}
                />
              </section>

              {/* Compact quick-check panel (side on desktop, collapsible on mobile) */}
              <aside className="lg:order-2 order-1 lg:sticky lg:top-6 lg:self-start">
                <QuickCheck
                  roadType={roadType}
                  categoryId={categoryId}
                  onRoad={setRoadType}
                  onCategory={setCategoryId}
                  category={category}
                />
              </aside>
            </motion.div>
          ) : (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <SpeedKnowledgeQuiz />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10">
          <SpeedLimitsSourceNote />
        </div>
      </div>
    </PageFade>
  );
}

function QuickCheck({
  roadType,
  categoryId,
  onRoad,
  onCategory,
  category,
}: {
  roadType: RoadType;
  categoryId: string;
  onRoad: (r: RoadType) => void;
  onCategory: (c: string) => void;
  category: ReturnType<typeof getCategory>;
}) {
  // Collapsed by default on mobile; always shown on lg via CSS.
  const [open, setOpen] = useState(false);
  const v = category!.limits[roadType];

  return (
    <div className="rounded-lg border border-hairline bg-surface-card">
      <button
        className="flex w-full items-center justify-between px-4 py-3 lg:cursor-default"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-display text-title-md font-semibold text-ink">Бърза проверка</span>
        <span className={cx("text-muted transition-transform lg:hidden", open && "rotate-180")}>▾</span>
      </button>

      <div className={cx("px-4 pb-4", open ? "block" : "hidden lg:block")}>
        {/* Central compact sign */}
        <div className="mb-4 flex flex-col items-center rounded-md bg-surface-dark p-4 text-on-dark">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${categoryId}-${roadType}-${v.type}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex flex-col items-center"
            >
              {v.type === "speed" ? <RoadSignNumber value={v.value} size={92} /> : <ProhibitedSign size={92} />}
              <span className="mt-2 text-sm text-on-dark-soft">
                {v.type === "speed" ? "km/h" : "Забранено движението"}
              </span>
              {v.type === "speed" && v.note && (
                <span className="mt-1 badge bg-accent-amber/20 text-accent-amber">{v.note}</span>
              )}
            </motion.div>
          </AnimatePresence>
          <span className="mt-3 text-center text-xs text-on-dark-soft">
            {category!.label} · {roadTypeLabel(roadType)}
          </span>
        </div>

        {/* Road-type mini selector */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          {ROAD_TYPES.map((r) => (
            <button
              key={r.id}
              onClick={() => onRoad(r.id)}
              className={cx(
                "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                r.id === roadType
                  ? "border-primary bg-primary/10 text-ink"
                  : "border-hairline bg-canvas text-body hover:bg-surface-soft",
              )}
            >
              <RoadTypeIcon type={r.id} size={18} />
              <span className="leading-tight">{r.label}</span>
            </button>
          ))}
        </div>

        {/* Category compact chips */}
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {SPEED_LIMIT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategory(c.id)}
              className={cx(
                "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                c.id === categoryId
                  ? "border-primary bg-primary text-on-primary"
                  : "border-hairline bg-canvas text-body hover:bg-surface-soft",
              )}
            >
              {c.shortLabel ?? c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
