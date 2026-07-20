// "Каква е разликата?" — only compares neighbouring / commonly-confused
// categories (never random pairs). Shows the fields that actually differ.

import {
  NEIGHBOUR_COMPARISONS,
  getDrivingCategory,
  type CategoryFact,
} from "../../data/drivingCategories";
import { cx } from "../../lib/utils";

const fmt = (f: CategoryFact) => (f.unit ? `${f.value} ${f.unit}` : f.value);

export function NeighbourCompare({ selectedId }: { selectedId: string }) {
  const set = NEIGHBOUR_COMPARISONS.find((s) => s.includes(selectedId));
  if (!set) return null;
  const members = set.map(getDrivingCategory).filter(Boolean) as NonNullable<
    ReturnType<typeof getDrivingCategory>
  >[];

  // Union of fact labels, in first-seen order.
  const labels: string[] = [];
  for (const m of members) for (const f of m.facts) if (!labels.includes(f.label)) labels.push(f.label);

  // Keep only rows where the members differ (the useful part).
  const rows = labels
    .map((label) => ({
      label,
      values: members.map((m) => {
        const fs = m.facts.filter((f) => f.label === label);
        return fs.length ? fs.map(fmt).join(" · ") : "—";
      }),
    }))
    .filter((r) => new Set(r.values).size > 1);

  return (
    <div className="card-outline">
      <h3 className="font-display text-title-lg font-semibold text-ink">Каква е разликата?</h3>
      <p className="mb-4 mt-1 text-sm text-muted">
        Сравнение на често бъркани категории — показани са само разликите.
      </p>

      {/* Member summary cards */}
      <div className={cx("mb-4 grid gap-3", members.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {members.map((m) => (
          <div
            key={m.id}
            className={cx(
              "rounded-md border p-3",
              m.id === selectedId ? "border-primary bg-primary/10" : "border-hairline bg-canvas",
            )}
          >
            <span className="font-display text-title-md font-semibold text-ink">{m.label}</span>
            <p className="mt-1 text-xs text-body">{m.shortDescription}</p>
          </div>
        ))}
      </div>

      {/* Differing facts */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-muted">Ограничение</th>
                {members.map((m) => (
                  <th
                    key={m.id}
                    className={cx(
                      "px-3 py-2 text-left font-semibold",
                      m.id === selectedId ? "text-primary-active" : "text-ink",
                    )}
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-hairline-soft">
                  <td className="px-3 py-2 text-muted">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td
                      key={i}
                      className={cx(
                        "px-3 py-2",
                        members[i].id === selectedId ? "font-medium text-ink" : "text-body",
                      )}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted">Тези категории нямат разлики в посочените стойности.</p>
      )}
    </div>
  );
}
