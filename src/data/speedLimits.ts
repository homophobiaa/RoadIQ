// Single source of truth for the speed-limit cheat sheet. Values are taken
// verbatim from the supplied учебна таблица — do NOT infer, expand or "correct"
// anything from outside sources. UI components must read from here only.

export type SpeedLimitValue =
  | { type: "speed"; value: number; note?: string }
  | { type: "prohibited" }
  | { type: "notSpecified" };

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

// Helpers to keep the table below terse and unambiguous.
const s = (value: number, note?: string): SpeedLimitValue =>
  note ? { type: "speed", value, note } : { type: "speed", value };
const X: SpeedLimitValue = { type: "prohibited" };
const NA: SpeedLimitValue = { type: "notSpecified" };
const TOW_NOTE = "с твърда връзка";

export const SPEED_LIMIT_CATEGORIES: SpeedLimitCategory[] = [
  {
    id: "am",
    label: "AM",
    limits: { urban: s(45), outsideUrban: s(45), motorway: X, expressway: X },
  },
  {
    id: "a1",
    label: "A1",
    limits: { urban: s(50), outsideUrban: s(80), motorway: X, expressway: X },
  },
  {
    id: "a-a2",
    label: "A, A2",
    limits: { urban: s(50), outsideUrban: s(90), motorway: s(140), expressway: s(120) },
  },
  {
    id: "b1",
    label: "B1",
    limits: { urban: s(50), outsideUrban: s(70), motorway: X, expressway: X },
  },
  {
    id: "b",
    label: "B",
    limits: { urban: s(50), outsideUrban: s(90), motorway: s(140), expressway: s(120) },
  },
  {
    id: "c-ce",
    label: "C, CE",
    limits: { urban: s(50), outsideUrban: s(80), motorway: s(90), expressway: s(90) },
  },
  {
    id: "be-c1-d",
    label: "BE, C1, C1E, D1, D1E, D, DE",
    shortLabel: "BE, C1, D…",
    limits: { urban: s(50), outsideUrban: s(80), motorway: s(100), expressway: s(100) },
  },
  {
    id: "ttm",
    label: "Tтм",
    limits: { urban: s(50), outsideUrban: NA, motorway: NA, expressway: NA },
  },
  {
    id: "self-propelled",
    label: "Самоходни машини",
    shortLabel: "Самоходни",
    limits: { urban: s(40), outsideUrban: s(40), motorway: X, expressway: X },
  },
  {
    id: "towing",
    label: "При теглене",
    limits: {
      urban: s(40),
      outsideUrban: s(40),
      motorway: s(70, TOW_NOTE),
      expressway: s(70, TOW_NOTE),
    },
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

export function getCategory(id: string): SpeedLimitCategory | undefined {
  return SPEED_LIMIT_CATEGORIES.find((c) => c.id === id);
}

export function roadTypeLabel(id: RoadType): string {
  return ROAD_TYPES.find((r) => r.id === id)!.label;
}

/** Short human string for a value — used in compare/quiz answer text. */
export function valueText(v: SpeedLimitValue): string {
  switch (v.type) {
    case "speed":
      return v.note ? `${v.value} km/h (${v.note})` : `${v.value} km/h`;
    case "prohibited":
      return "Забранено движението";
    case "notSpecified":
      return "Не е посочена стойност в таблицата";
  }
}

// ---------------------------------------------------------------------------
// Quiz generation — questions derive STRICTLY from the matrix above.
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answer: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** All distinct numeric speeds present in the table (for plausible distractors). */
const ALL_SPEEDS = Array.from(
  new Set(
    SPEED_LIMIT_CATEGORIES.flatMap((c) =>
      Object.values(c.limits).flatMap((v) => (v.type === "speed" ? [v.value] : [])),
    ),
  ),
).sort((a, b) => a - b);

/** Build a single random question from the dataset. */
export function generateQuestion(): QuizQuestion {
  const kind = pick(["value", "allowed", "value"] as const);
  const cat = pick(SPEED_LIMIT_CATEGORIES);
  const road = pick(ROAD_TYPES);
  const v = cat.limits[road.id];

  if (kind === "allowed") {
    // Allowed-movement yes/no — meaningful for prohibited/speed rows.
    const prompt = `Разрешено ли е движението на категория ${cat.label} по „${road.label.toLowerCase()}“ според таблицата?`;
    const answer =
      v.type === "prohibited"
        ? "Не — забранено движението"
        : v.type === "notSpecified"
          ? "Не е посочена стойност в таблицата"
          : `Да — ${v.value} km/h`;
    const choices = shuffle([
      "Да — 90 km/h",
      "Не — забранено движението",
      "Не е посочена стойност в таблицата",
      v.type === "speed" ? `Да — ${v.value} km/h` : "Да — 50 km/h",
    ]);
    // Guarantee the answer is present.
    if (!choices.includes(answer)) choices[0] = answer;
    return { prompt, choices: shuffle(Array.from(new Set(choices))).slice(0, 4), answer };
  }

  // Value question.
  const prompt = `Каква е максималната скорост за категория ${cat.label} при „${road.label.toLowerCase()}“?`;
  const answer = valueText(v);

  const distractors = new Set<string>();
  if (v.type === "speed") {
    for (const sp of shuffle(ALL_SPEEDS)) {
      if (sp !== v.value) distractors.add(`${sp} km/h`);
      if (distractors.size >= 2) break;
    }
    distractors.add("Забранено движението");
  } else {
    // prohibited / notSpecified — distractors are speeds + the other special state.
    for (const sp of shuffle(ALL_SPEEDS)) {
      distractors.add(`${sp} km/h`);
      if (distractors.size >= 2) break;
    }
    distractors.add(
      v.type === "prohibited" ? "Не е посочена стойност в таблицата" : "Забранено движението",
    );
  }
  const choices = shuffle([answer, ...Array.from(distractors)]).slice(0, 4);
  if (!choices.includes(answer)) choices[0] = answer;
  return { prompt, choices: shuffle(choices), answer };
}
