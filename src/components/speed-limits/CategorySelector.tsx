import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SPEED_LIMIT_CATEGORIES } from "../../data/speedLimits";
import { cx } from "../../lib/utils";

export function CategorySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SPEED_LIMIT_CATEGORIES.filter((c) => !q || c.label.toLowerCase().includes(q));
  }, [query]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % filtered.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i - 1 + filtered.length) % filtered.length;
    if (next >= 0) {
      e.preventDefault();
      btnRefs.current[next]?.focus();
      onChange(filtered[next].id);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          className="input w-full sm:max-w-xs"
          placeholder="Търси категория…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Търси категория"
        />
        <span className="hidden shrink-0 text-sm text-muted sm:block">
          {filtered.length} категории
        </span>
      </div>

      <div className="flex flex-wrap gap-2" role="listbox" aria-label="Категории">
        {filtered.map((c, i) => {
          const active = c.id === value;
          return (
            <button
              key={c.id}
              ref={(el) => (btnRefs.current[i] = el)}
              role="option"
              aria-selected={active}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => onChange(c.id)}
              className={cx(
                "relative rounded-md border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "border-primary text-on-primary"
                  : "border-hairline bg-canvas text-body hover:bg-surface-soft",
              )}
            >
              {active && (
                <motion.span
                  layoutId="categoryActive"
                  className="absolute inset-0 -z-0 rounded-md bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative z-10">{c.shortLabel ?? c.label}</span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted">Няма съвпадения.</p>}
      </div>
    </div>
  );
}
