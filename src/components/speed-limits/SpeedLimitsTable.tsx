import { useState } from "react";
import {
  ROAD_TYPES,
  SPEED_LIMIT_CATEGORIES,
  type RoadType,
  type SpeedLimitValue,
} from "../../data/speedLimits";
import { SpeedValueSign } from "./shared";
import { cx } from "../../lib/utils";

export function SpeedLimitsTable({
  selectedCategory,
  selectedRoad,
  onSelect,
}: {
  selectedCategory: string;
  selectedRoad: RoadType;
  onSelect: (categoryId: string, road: RoadType) => void;
}) {
  const [hover, setHover] = useState<{ cat: string; road: RoadType } | null>(null);

  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="bg-surface-card">
            <th className="sticky left-0 z-20 bg-surface-card px-4 py-3 text-title-sm font-semibold text-ink">
              Категория
            </th>
            {ROAD_TYPES.map((r) => (
              <th
                key={r.id}
                className={cx(
                  "px-4 py-3 text-center text-title-sm font-semibold transition-colors",
                  (hover?.road ?? selectedRoad) === r.id ? "text-primary-active" : "text-ink",
                )}
              >
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SPEED_LIMIT_CATEGORIES.map((c) => {
            const rowActive = selectedCategory === c.id || hover?.cat === c.id;
            return (
              <tr
                key={c.id}
                className={cx(
                  "border-t border-hairline-soft transition-colors",
                  rowActive ? "bg-primary/[0.06]" : "hover:bg-surface-soft/60",
                )}
              >
                <th
                  scope="row"
                  className={cx(
                    "sticky left-0 z-10 px-4 py-3 text-sm font-medium transition-colors",
                    rowActive ? "bg-primary/10 text-ink" : "bg-canvas text-body",
                  )}
                >
                  {c.label}
                </th>
                {ROAD_TYPES.map((r) => {
                  const v = c.limits[r.id];
                  const colActive = (hover?.road ?? selectedRoad) === r.id;
                  const isSel = selectedCategory === c.id && selectedRoad === r.id;
                  return (
                    <td key={r.id} className="p-1.5 text-center">
                      <button
                        onClick={() => onSelect(c.id, r.id)}
                        onMouseEnter={() => setHover({ cat: c.id, road: r.id })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ cat: c.id, road: r.id })}
                        onBlur={() => setHover(null)}
                        aria-label={`${c.label}, ${r.label}: ${describe(v)}`}
                        className={cx(
                          "flex w-full flex-col items-center gap-1 rounded-md px-2 py-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSel
                            ? "bg-primary/15 ring-2 ring-primary"
                            : colActive || rowActive
                              ? "bg-white/50"
                              : "hover:bg-white/60",
                        )}
                      >
                        <SpeedValueSign v={v} size={44} />
                        {v.type === "speed" && v.note && (
                          <span className="text-[10px] leading-tight text-muted">{v.note}</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function describe(v: SpeedLimitValue): string {
  if (v.type === "speed") return v.note ? `${v.value} km/h ${v.note}` : `${v.value} km/h`;
  if (v.type === "prohibited") return "забранено движението";
  return "не е посочена стойност";
}
