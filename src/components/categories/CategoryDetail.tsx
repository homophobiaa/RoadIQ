import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DrivingCategory, VariantFact, VehicleVariant } from "../../data/drivingCategories";
import { resolveSources } from "../../data/drivingCategories";
import { VehicleIllustration } from "./VehicleIllustration";
import { cx } from "../../lib/utils";

function FactCard({ fact }: { fact: VariantFact }) {
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

function PropulsionRules({ rules }: { rules: NonNullable<VehicleVariant["propulsionRules"]> }) {
  const rows: { label: string; value: string }[] = [];
  if (rules.sparkIgnition) rows.push({ label: "При бензинов двигател (запалване с искра)", value: rules.sparkIgnition });
  if (rules.compressionIgnition) rows.push({ label: "При дизелов двигател (запалване чрез сгъстяване)", value: rules.compressionIgnition });
  if (rules.electricOrOther) rows.push({ label: "При електрическо или друго задвижване", value: rules.electricOrOther });
  if (rows.length === 0) return null;
  return (
    <ul className="mb-3 space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="text-sm text-body">
          <span className="font-medium text-ink">{r.label}:</span> {r.value}
        </li>
      ))}
    </ul>
  );
}

function VariantPanel({ variant }: { variant: VehicleVariant }) {
  return (
    <motion.div
      key={variant.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-40 shrink-0 text-ink">
          <VehicleIllustration type={variant.illustrationType} className="h-20 w-full" />
        </div>
        <div>
          <h3 className="font-display text-title-md font-semibold text-ink">{variant.title}</h3>
          <p className="text-sm text-body">{variant.plainDescription}</p>
          {variant.wheels && <p className="mt-0.5 text-xs text-muted">Брой колела: {variant.wheels}</p>}
        </div>
      </div>

      {variant.propulsionRules && <PropulsionRules rules={variant.propulsionRules} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {variant.facts.map((f, i) => (
          <FactCard key={i} fact={f} />
        ))}
      </div>

      {variant.additionalRules && variant.additionalRules.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {variant.additionalRules.map((n, i) => (
            <li key={i} className="flex gap-2 text-sm text-body">
              <span className="text-primary">•</span>
              {n}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export function CategoryDetail({ category }: { category: DrivingCategory }) {
  const [activeVariant, setActiveVariant] = useState(category.variants[0]?.id);
  const [showSources, setShowSources] = useState(false);
  const variant =
    category.variants.find((v) => v.id === activeVariant) ?? category.variants[0];
  const multi = category.variants.length > 1;

  const sourceIds = new Set<string>(category.sourceIds);
  for (const v of category.variants) for (const id of v.sourceIds) sourceIds.add(id);
  const sources = resolveSources(Array.from(sourceIds));
  const divergences = category.variants.filter((v) => v.sourceDivergence);

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
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="badge mb-2 bg-primary/15 text-primary-active">Категория {category.title}</span>
            <h2 className="font-display text-display-sm font-semibold text-ink">{category.title}</h2>
          </div>
        </div>
        <p className="mb-6 max-w-2xl text-body">{category.summary}</p>

        {/* Variant sub-tabs — each vehicle subtype gets its own limits, never blended. */}
        {multi && (
          <span className="caption-up mb-2 block">Видове превозни средства в тази категория</span>
        )}
        {multi && (
          <div className="mb-5 flex flex-wrap gap-2">
            {category.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                aria-pressed={variant?.id === v.id}
                className={cx(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  variant?.id === v.id
                    ? "border-primary bg-primary text-on-primary"
                    : "border-hairline bg-canvas text-body hover:bg-surface-soft",
                )}
              >
                {v.title}
              </button>
            ))}
          </div>
        )}

        {variant && <VariantPanel variant={variant} />}

        {/* Shared facts across all variants */}
        {category.sharedFacts && category.sharedFacts.length > 0 && (
          <div className="mt-5">
            <span className="caption-up mb-2 block text-primary-active">
              {category.variants.length === 2 ? "За двата вида" : "За всички видове"}
            </span>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.sharedFacts.map((f, i) => (
                <FactCard key={i} fact={f} />
              ))}
            </div>
          </div>
        )}

        {/* Exclusions / conditional rights / included categories */}
        {(category.exclusions?.length || category.conditionalRights?.length || category.notes?.length) && (
          <div className="mt-5 space-y-3">
            {category.conditionalRights?.map((n, i) => (
              <p key={`c${i}`} className="rounded-md bg-accent-amber/10 px-3 py-2 text-sm text-[#8a5a10]">
                <span className="font-medium">Условно право: </span>
                {n}
              </p>
            ))}
            {category.exclusions?.map((n, i) => (
              <p key={`e${i}`} className="text-sm text-body">
                <span className="font-medium text-ink">Изключение: </span>
                {n}
              </p>
            ))}
            {category.notes?.map((n, i) => (
              <p key={`n${i}`} className="flex gap-2 text-sm text-body">
                <span className="text-primary">•</span>
                {n}
              </p>
            ))}
          </div>
        )}

        {category.includedCategories && category.includedCategories.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            Изгражда се върху категория{category.includedCategories.length > 1 ? "и" : ""}{" "}
            {category.includedCategories.join(", ")}.
          </p>
        )}

        {/* Sources + EU divergence — never merged into the main figures above. */}
        <div className="mt-6 border-t border-hairline pt-4">
          <button className="btn-link" onClick={() => setShowSources((v) => !v)}>
            Източник и уточнения {showSources ? "▲" : "▼"}
          </button>
          <AnimatePresence>
            {showSources && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <ul className="space-y-2">
                  {sources.map((s) => (
                    <li key={s.id} className="text-sm">
                      <span className={cx("badge mr-2", s.jurisdiction === "BG" ? "bg-success/15 text-[#3f8a4f]" : "bg-primary/15 text-primary-active")}>
                        {s.jurisdiction}
                        {s.examRelevant ? " · изпит" : ""}
                      </span>
                      <span className="text-body">{s.label}</span>
                      <p className="mt-0.5 text-xs text-muted">{s.effectiveContext}</p>
                    </li>
                  ))}
                </ul>

                {divergences.length > 0 && (
                  <div className="mt-4 space-y-2 rounded-md bg-accent-amber/10 p-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#a06a13]">
                      Разлика спрямо по-новата техническа класификация на ЕС
                    </span>
                    {divergences.map((v) => (
                      <p key={v.id} className="text-sm text-[#8a5a10]">
                        <span className="font-medium">{v.title}:</span> {v.sourceDivergence}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
