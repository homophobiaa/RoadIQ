import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CategoryFact, DrivingCategory } from "../../data/drivingCategories";
import { VehicleIllustration } from "./VehicleIllustration";

function FactCard({ fact }: { fact: CategoryFact }) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas p-4">
      <span className="caption-up">{fact.label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-title-lg font-semibold text-ink">{fact.value}</span>
        {fact.unit && <span className="text-sm text-muted">{fact.unit}</span>}
      </div>
      {fact.detail && <span className="text-xs text-muted-soft">{fact.detail}</span>}
    </div>
  );
}

function groupFacts(facts: CategoryFact[]): { name: string | null; items: CategoryFact[] }[] {
  const groups: { name: string | null; items: CategoryFact[] }[] = [];
  for (const f of facts) {
    const key = f.group ?? null;
    let g = groups.find((x) => x.name === key);
    if (!g) {
      g = { name: key, items: [] };
      groups.push(g);
    }
    g.items.push(f);
  }
  return groups;
}

export function CategoryDetail({ category }: { category: DrivingCategory }) {
  const [expanded, setExpanded] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const grouped = groupFacts(category.facts);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={category.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28 }}
        className="card-outline"
      >
        {/* Header + illustration */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="badge mb-2 bg-primary/15 text-primary-active">Категория {category.label}</span>
            <h2 className="font-display text-display-sm font-semibold text-ink">{category.label}</h2>
            <p className="mt-1 max-w-md text-body">{category.shortDescription}</p>
          </div>
          <div className="w-48 shrink-0 text-ink">
            <VehicleIllustration type={category.illustrationType} className="h-24 w-full" />
          </div>
        </div>

        {/* Vehicle types */}
        <span className="caption-up mb-2 block">Какво можеш да управляваш</span>
        <div className="mb-5 flex flex-wrap gap-2">
          {category.vehicleTypes.map((t) => (
            <span key={t} className="rounded-md border border-hairline bg-surface-soft px-3 py-1 text-sm text-body">
              {t}
            </span>
          ))}
        </div>

        {/* Fact stat cards, grouped where relevant */}
        <span className="caption-up mb-2 block">Основни ограничения</span>
        <div className="space-y-4">
          {grouped.map((g, i) => (
            <div key={i}>
              {g.name && <span className="caption-up mb-2 block text-primary-active">{g.name}</span>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((f, j) => (
                  <FactCard key={j} fact={f} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {category.notes && category.notes.length > 0 && (
          <div className="mt-5">
            <span className="caption-up mb-2 block text-primary-active">Важно уточнение</span>
            <ul className="space-y-1.5">
              {category.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-sm text-body">
                  <span className="text-primary">•</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable full definition */}
        <div className="mt-6 border-t border-hairline pt-4">
          <button className="btn-link" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Скрий" : "Пълно определение"} {expanded ? "▲" : "▼"}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden text-body leading-relaxed"
              >
                {category.fullDefinition}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Sources */}
        <div className="mt-3">
          <button className="btn-link" onClick={() => setShowSources((v) => !v)}>
            Източници и редакция на данните {showSources ? "▲" : "▼"}
          </button>
          <AnimatePresence>
            {showSources && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <ul className="space-y-1 text-sm text-muted">
                  {category.sourceLabels.map((s) => (
                    <li key={s}>— {s}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
