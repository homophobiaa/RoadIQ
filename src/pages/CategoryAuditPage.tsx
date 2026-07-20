// Development-only audit view. Lists every category, variant, fact and source
// so data-entry mistakes (missing sources, contradictory values, empty
// variants) surface immediately. Not linked from production navigation.

import { Link } from "react-router-dom";
import { ROUTES } from "../store";
import { PageFade } from "../components/ui";
import { TopNav } from "../components/TopNav";
import { cx } from "../lib/utils";
import {
  DRIVING_CATEGORIES,
  auditAllCategories,
  resolveSources,
  type DrivingCategory,
} from "../data/drivingCategories";

export default function CategoryAuditPage() {
  const warnings = auditAllCategories();

  return (
    <PageFade>
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <TopNav
          right={
            <Link className="btn-secondary" to={ROUTES.categories}>
              ← Категории
            </Link>
          }
        />

        <h1 className="mb-2 font-display text-display-md font-semibold text-ink">
          Одит на данните за категории
        </h1>
        <p className="mb-6 text-body">
          Само за разработка. Показва всяка категория, вариант, факт и източник — за проверка на
          пълнота и вътрешна съгласуваност. Не проверява правна точност.
        </p>

        <div className="mb-8 rounded-lg border border-hairline bg-surface-card p-5">
          <h2 className="mb-3 font-display text-title-lg font-semibold text-ink">
            Резултат: {warnings.length === 0 ? "няма проблеми" : `${warnings.length} находки`}
          </h2>
          {warnings.length === 0 ? (
            <p className="text-sm text-success">Всички категории имат данни и източници.</p>
          ) : (
            <ul className="space-y-1.5">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className={cx(
                    "text-sm",
                    w.severity === "error" ? "text-error" : "text-[#a06a13]",
                  )}
                >
                  <span className="font-mono text-xs">[{w.categoryId}]</span>{" "}
                  {w.severity === "error" ? "Грешка:" : "Предупреждение:"} {w.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          {DRIVING_CATEGORIES.map((cat) => (
            <CategoryAuditCard key={cat.id} cat={cat} />
          ))}
        </div>
      </div>
    </PageFade>
  );
}

function CategoryAuditCard({ cat }: { cat: DrivingCategory }) {
  const sources = resolveSources(cat.sourceIds);
  return (
    <div className="card-outline">
      <h3 className="mb-1 font-display text-title-lg font-semibold text-ink">{cat.title}</h3>
      <p className="mb-3 text-sm text-body">{cat.summary}</p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <span key={s.id} className="badge bg-surface-strong text-muted">
            {s.jurisdiction}: {s.id}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {cat.variants.map((v) => (
          <div key={v.id} className="rounded-md border border-hairline-soft bg-canvas p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{v.title}</span>
              <span className="font-mono text-xs text-muted-soft">{v.id}</span>
            </div>
            <p className="mb-2 text-xs text-muted">{v.plainDescription}</p>
            {v.propulsionRules && (
              <pre className="mb-2 overflow-x-auto rounded bg-surface-soft p-2 text-xs text-body">
                {JSON.stringify(v.propulsionRules, null, 2)}
              </pre>
            )}
            <ul className="space-y-0.5">
              {v.facts.map((f, i) => (
                <li key={i} className="text-xs text-body">
                  {f.label}: <span className="font-semibold text-ink">{f.value}{f.unit ? ` ${f.unit}` : ""}</span>
                  {f.detail && <span className="text-muted-soft"> ({f.detail})</span>}
                </li>
              ))}
            </ul>
            {v.additionalRules?.map((r, i) => (
              <p key={i} className="mt-1 text-xs text-muted">
                • {r}
              </p>
            ))}
            {v.sourceDivergence && (
              <p className="mt-1 rounded bg-accent-amber/10 p-1.5 text-xs text-[#8a5a10]">
                Разлика (EU): {v.sourceDivergence}
              </p>
            )}
            <p className="mt-1 font-mono text-[10px] text-muted-soft">
              sourceIds: {v.sourceIds.join(", ") || "—"}
            </p>
          </div>
        ))}
      </div>

      {cat.sharedFacts && cat.sharedFacts.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-semibold text-primary-active">Общи за всички варианти</span>
          <ul className="mt-1 space-y-0.5">
            {cat.sharedFacts.map((f, i) => (
              <li key={i} className="text-xs text-body">
                {f.label}: <span className="font-semibold text-ink">{f.value}{f.unit ? ` ${f.unit}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(cat.exclusions?.length || cat.conditionalRights?.length || cat.notes?.length || cat.includedCategories?.length) && (
        <div className="mt-3 space-y-1 text-xs text-muted">
          {cat.exclusions?.map((e, i) => <p key={`e${i}`}>Изключение: {e}</p>)}
          {cat.conditionalRights?.map((e, i) => <p key={`c${i}`}>Условно право: {e}</p>)}
          {cat.notes?.map((e, i) => <p key={`n${i}`}>Забележка: {e}</p>)}
          {cat.includedCategories && <p>Включва: {cat.includedCategories.join(", ")}</p>}
        </div>
      )}
    </div>
  );
}
