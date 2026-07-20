// Central editable dataset for the speed-limit cheat sheet. Values are taken
// verbatim from the supplied учебна таблица — do NOT infer, expand or "correct"
// anything from outside sources. UI components read from here only.
//
// NOTE: per product decision, non-numeric cells (including the source table's
// Tтм dashes) are all presented to the user as "Забранено движението". There is
// no user-facing "not specified" state.

export type SpeedLimitValue = { type: "speed"; value: number; note?: string } | { type: "prohibited" };

export type RoadType = "urban" | "outsideUrban" | "motorway" | "expressway";

export interface SpeedLimitCategory {
  id: string;
  label: string;
  shortLabel?: string;
  limits: Record<RoadType, SpeedLimitValue>;
}

export interface RoadTypeMeta {
  id: RoadType;
  label: string;
}

export const ROAD_TYPES: RoadTypeMeta[] = [
  { id: "urban", label: "Населено място" },
  { id: "outsideUrban", label: "Извън населено място" },
  { id: "motorway", label: "Автомагистрала" },
  { id: "expressway", label: "Скоростен път" },
];

const s = (value: number, note?: string): SpeedLimitValue =>
  note ? { type: "speed", value, note } : { type: "speed", value };
const X: SpeedLimitValue = { type: "prohibited" };
const TOW_NOTE = "с твърда връзка";

export const SPEED_LIMIT_CATEGORIES: SpeedLimitCategory[] = [
  { id: "am", label: "AM", limits: { urban: s(45), outsideUrban: s(45), motorway: X, expressway: X } },
  { id: "a1", label: "A1", limits: { urban: s(50), outsideUrban: s(80), motorway: X, expressway: X } },
  { id: "a-a2", label: "A, A2", limits: { urban: s(50), outsideUrban: s(90), motorway: s(140), expressway: s(120) } },
  { id: "b1", label: "B1", limits: { urban: s(50), outsideUrban: s(70), motorway: X, expressway: X } },
  { id: "b", label: "B", limits: { urban: s(50), outsideUrban: s(90), motorway: s(140), expressway: s(120) } },
  { id: "c-ce", label: "C, CE", limits: { urban: s(50), outsideUrban: s(80), motorway: s(90), expressway: s(90) } },
  {
    id: "be-c1-d",
    label: "BE, C1, C1E, D1, D1E, D, DE",
    shortLabel: "BE, C1, D…",
    limits: { urban: s(50), outsideUrban: s(80), motorway: s(100), expressway: s(100) },
  },
  // Source table shows Tтм as dashes off-town → presented as prohibited per spec.
  { id: "ttm", label: "Tтм", limits: { urban: s(50), outsideUrban: X, motorway: X, expressway: X } },
  {
    id: "self-propelled",
    label: "Самоходни машини",
    shortLabel: "Самоходни",
    limits: { urban: s(40), outsideUrban: s(40), motorway: X, expressway: X },
  },
  {
    id: "towing",
    label: "При теглене",
    limits: { urban: s(40), outsideUrban: s(40), motorway: s(70, TOW_NOTE), expressway: s(70, TOW_NOTE) },
  },
  {
    id: "adr",
    label: "Превоз на опасни товари (ADR)",
    shortLabel: "ADR",
    limits: { urban: s(40), outsideUrban: s(50), motorway: s(90), expressway: s(90) },
  },
];

export const SOURCE_NOTE =
  "Когато максимално допустимата скорост е различна от горепосочената, това се сигнализира с пътен знак В26. Забраните се прилагат и за средната скорост в определен участък от пътя.";

export const B26_MEANING = "Забранено е движението със скорост, по-висока от означената.";

export function getCategory(id: string): SpeedLimitCategory | undefined {
  return SPEED_LIMIT_CATEGORIES.find((c) => c.id === id);
}
export function roadTypeLabel(id: RoadType): string {
  return ROAD_TYPES.find((r) => r.id === id)!.label;
}
export function valueText(v: SpeedLimitValue): string {
  if (v.type === "speed") return v.note ? `${v.value} km/h (${v.note})` : `${v.value} km/h`;
  return "Забранено движението";
}

// ---------------------------------------------------------------------------
// Quiz generation — questions derive STRICTLY from the matrix above, scoped to
// the categories the user is studying.
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answer: string;
  scopeLabel: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const ALL_SPEEDS = Array.from(
  new Set(
    SPEED_LIMIT_CATEGORIES.flatMap((c) =>
      Object.values(c.limits).flatMap((v) => (v.type === "speed" ? [v.value] : [])),
    ),
  ),
).sort((a, b) => a - b);

/** Build one random question from the categories in `scopeIds`. */
export function generateSpeedQuestion(scopeIds: string[]): QuizQuestion {
  const pool = SPEED_LIMIT_CATEGORIES.filter((c) => scopeIds.includes(c.id));
  const cats = pool.length ? pool : SPEED_LIMIT_CATEGORIES;
  const cat = pick(cats);
  const scopeLabel = cats.length === 1 ? `категория ${cats[0].label}` : "избрани категории";

  // Prefer a "where" question when the category has a value unique to one road.
  const speedRoads = ROAD_TYPES.filter((r) => cat.limits[r.id].type === "speed");
  const uniqueValue = speedRoads.find((r) => {
    const val = (cat.limits[r.id] as { value: number }).value;
    return speedRoads.filter((rr) => (cat.limits[rr.id] as { value: number }).value === val).length === 1;
  });

  const kind = pick(
    uniqueValue ? (["value", "allowed", "where"] as const) : (["value", "allowed"] as const),
  );

  if (kind === "where" && uniqueValue) {
    const val = (cat.limits[uniqueValue.id] as { value: number }).value;
    const prompt = `Къде категория ${cat.label} има ограничение ${val} km/h според таблицата?`;
    const answer = roadTypeLabel(uniqueValue.id);
    const choices = shuffle(ROAD_TYPES.map((r) => r.label)).slice(0, 4);
    if (!choices.includes(answer)) choices[0] = answer;
    return { prompt, choices: shuffle(choices), answer, scopeLabel };
  }

  const road = pick(ROAD_TYPES);
  const v = cat.limits[road.id];

  if (kind === "allowed") {
    const prompt = `Разрешено ли е движението на категория ${cat.label} по „${road.label.toLowerCase()}“ според таблицата?`;
    const answer = v.type === "prohibited" ? "Не — забранено движението" : `Да — ${v.value} km/h`;
    const set = new Set<string>([answer, "Не — забранено движението"]);
    for (const sp of shuffle(ALL_SPEEDS)) {
      set.add(`Да — ${sp} km/h`);
      if (set.size >= 4) break;
    }
    const choices = shuffle(Array.from(set)).slice(0, 4);
    if (!choices.includes(answer)) choices[0] = answer;
    return { prompt, choices: shuffle(choices), answer, scopeLabel };
  }

  // value
  const prompt = `Каква е максимално допустимата скорост за категория ${cat.label} при „${road.label.toLowerCase()}“?`;
  const answer = valueText(v);
  const set = new Set<string>([answer]);
  if (v.type === "speed") set.add("Забранено движението");
  for (const sp of shuffle(ALL_SPEEDS)) {
    if (v.type !== "speed" || sp !== v.value) set.add(`${sp} km/h`);
    if (set.size >= 4) break;
  }
  const choices = shuffle(Array.from(set)).slice(0, 4);
  if (!choices.includes(answer)) choices[0] = answer;
  return { prompt, choices: shuffle(choices), answer, scopeLabel };
}
