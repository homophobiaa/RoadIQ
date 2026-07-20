// Shared "which licence am I studying for" control. Writes the preference used
// as the default quiz scope across the speed and category pages.

import { useStore } from "../store";
import { ALL_CATEGORY_IDS } from "../data/drivingCategories";

export function StudyCategoryControl({ compact = false }: { compact?: boolean }) {
  const { studyCategory, setStudyCategory } = useStore();
  return (
    <label
      className={`inline-flex items-center gap-2 rounded-md border border-hairline bg-canvas px-3 py-2 ${
        compact ? "text-sm" : ""
      }`}
    >
      <span className="text-sm text-muted">Уча за категория:</span>
      <select
        value={studyCategory}
        onChange={(e) => setStudyCategory(e.target.value)}
        className="bg-transparent text-sm font-semibold text-ink outline-none"
        aria-label="Избери категория за учене"
      >
        {ALL_CATEGORY_IDS.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    </label>
  );
}
