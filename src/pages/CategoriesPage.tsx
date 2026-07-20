import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES, useStore } from "../store";
import { PageFade } from "../components/ui";
import { TopNav } from "../components/TopNav";
import { StudyCategoryControl } from "../components/StudyCategoryControl";
import { cx } from "../lib/utils";
import {
  CATEGORY_GROUPS,
  DATA_EDIT_NOTE,
  DRIVING_CATEGORIES,
  getDrivingCategory,
} from "../data/drivingCategories";
import { CategoryDetail } from "../components/categories/CategoryDetail";
import { NeighbourCompare } from "../components/categories/NeighbourCompare";
import { CategoryQuiz } from "../components/categories/CategoryQuiz";

export default function CategoriesPage() {
  const { studyCategory, setStudyCategory } = useStore();
  const [params, setParams] = useSearchParams();

  // Selected category comes from the URL (?category=), falling back to the shared
  // study preference, then B. Keeping it in the URL means refresh preserves it.
  const urlCat = params.get("category");
  const initial =
    (urlCat && getDrivingCategory(urlCat) && urlCat) ||
    (getDrivingCategory(studyCategory) && studyCategory) ||
    "B";
  const [selected, setSelectedState] = useState(initial);
  const [search, setSearch] = useState("");
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep URL in sync (replace, so back button isn't flooded).
  useEffect(() => {
    if (params.get("category") !== selected) {
      setParams({ category: selected }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const setSelected = (id: string) => {
    setSelectedState(id);
    setStudyCategory(id); // Part 10: selecting here updates the shared study scope.
  };

  const category = getDrivingCategory(selected) ?? getDrivingCategory("B")!;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DRIVING_CATEGORIES;
    return DRIVING_CATEGORIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.shortDescription.toLowerCase().includes(q),
    );
  }, [search]);

  const flatIds = filtered.map((c) => c.id);
  const onKey = (e: React.KeyboardEvent, id: string) => {
    const idx = flatIds.indexOf(id);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % flatIds.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + flatIds.length) % flatIds.length;
    if (next >= 0) {
      e.preventDefault();
      btnRefs.current[next]?.focus();
      setSelected(flatIds[next]);
    }
  };

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

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="badge mb-3 bg-primary/15 text-primary-active">Справочник</span>
            <h1 className="font-display text-display-md font-semibold text-ink">
              Категории превозни средства
            </h1>
            <p className="mt-2 max-w-2xl text-body">
              Разбери какво можеш да управляваш с всяка категория.
            </p>
          </div>
          <StudyCategoryControl />
        </div>

        {/* Grouped selector */}
        <div className="mb-6">
          <input
            className="input mb-3 w-full sm:max-w-xs"
            placeholder="Търси категория…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Търси категория"
          />
          <div className="flex flex-col gap-3">
            {CATEGORY_GROUPS.map((g) => {
              const items = filtered.filter((c) => c.group === g.id);
              if (items.length === 0) return null;
              return (
                <div key={g.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-xs font-medium uppercase tracking-wide text-muted-soft sm:w-40">
                    {g.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((c) => {
                      const active = c.id === selected;
                      return (
                        <button
                          key={c.id}
                          ref={(el) => (btnRefs.current[flatIds.indexOf(c.id)] = el)}
                          onClick={() => setSelected(c.id)}
                          onKeyDown={(e) => onKey(e, c.id)}
                          aria-pressed={active}
                          className={cx(
                            "rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            active
                              ? "border-primary bg-primary text-on-primary"
                              : "border-hairline bg-canvas text-body hover:bg-surface-soft",
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail + compare */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <CategoryDetail category={category} />
          <div className="flex flex-col gap-6">
            <NeighbourCompare selectedId={selected} />
            <CategoryQuiz selectedId={selected} groupId={category.group} />
          </div>
        </div>

        <p className="mt-8 rounded-md border border-hairline bg-surface-soft px-4 py-3 text-sm text-muted">
          {DATA_EDIT_NOTE}
        </p>
      </div>
    </PageFade>
  );
}
