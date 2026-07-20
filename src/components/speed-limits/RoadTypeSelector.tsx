import { motion } from "framer-motion";
import { ROAD_TYPES, type RoadType } from "../../data/speedLimits";
import { RoadTypeIcon } from "./shared";
import { cx } from "../../lib/utils";

export function RoadTypeSelector({
  value,
  onChange,
}: {
  value: RoadType;
  onChange: (r: RoadType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ROAD_TYPES.map((r) => {
        const active = r.id === value;
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            aria-pressed={active}
            aria-label={r.label}
            className={cx(
              "group relative overflow-hidden rounded-lg border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "border-primary bg-primary/10"
                : "border-hairline bg-canvas hover:bg-surface-soft",
            )}
          >
            {active && (
              <motion.div
                layoutId="roadTypeActive"
                className="absolute inset-0 -z-0 rounded-lg ring-2 ring-primary"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-3">
              <span
                className={cx(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-md transition-colors",
                  active ? "bg-primary text-on-primary" : "bg-surface-card text-body",
                )}
              >
                <RoadTypeIcon type={r.id} size={26} />
              </span>
              <span
                className={cx(
                  "text-title-sm font-medium leading-tight",
                  active ? "text-ink" : "text-body",
                )}
              >
                {r.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
