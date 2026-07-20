import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ROAD_TYPES, SPEED_LIMIT_CATEGORIES } from "../../data/speedLimits";
import { SpeedValueSign, RoadTypeIcon } from "./shared";
import { cx } from "../../lib/utils";

const MARKER_COLORS = ["#cc785c", "#5db8a6", "#e8a55a"];
const MAX = 3;

export function CategoryCompare() {
  const [selected, setSelected] = useState<string[]>(["b", "c-ce", "adr"]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX
          ? [...prev, id]
          : prev,
    );
  };

  const chosen = selected
    .map((id) => SPEED_LIMIT_CATEGORIES.find((c) => c.id === id)!)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="caption-up">Избери до 3 категории</span>
          <span className="text-sm text-muted">{selected.length}/{MAX}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SPEED_LIMIT_CATEGORIES.map((c) => {
            const idx = selected.indexOf(c.id);
            const active = idx >= 0;
            const disabled = !active && selected.length >= MAX;
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                disabled={disabled}
                className={cx(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
                  active ? "text-white" : "border-hairline bg-canvas text-body hover:bg-surface-soft",
                )}
                style={active ? { background: MARKER_COLORS[idx], borderColor: MARKER_COLORS[idx] } : undefined}
              >
                {c.shortLabel ?? c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Four road-type lanes */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROAD_TYPES.map((r) => (
          <div key={r.id} className="card-outline p-5">
            <div className="mb-4 flex items-center gap-2 text-body">
              <RoadTypeIcon type={r.id} size={22} />
              <span className="text-title-sm font-medium text-ink">{r.label}</span>
            </div>
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {chosen.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex items-center gap-3"
                  >
                    <SpeedValueSign v={c.limits[r.id]} size={40} />
                    <span
                      className="rounded-pill px-2 py-0.5 text-xs font-medium text-white"
                      style={{ background: MARKER_COLORS[selected.indexOf(c.id)] }}
                    >
                      {c.shortLabel ?? c.label}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {chosen.length === 0 && <p className="text-sm text-muted">Избери категории.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
