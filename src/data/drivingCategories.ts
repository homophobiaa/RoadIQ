// Central editable dataset.
// Legal definitions may change. Update this file only.
// UI components must not contain duplicated category limits.

export interface CategoryFact {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  /** Optional grouping tag so the UI can visually separate e.g. moto vs tricycle. */
  group?: string;
}

export type CategoryGroup =
  | "mopeds"
  | "motorcycles"
  | "lightVehicles"
  | "goods"
  | "passenger";

export type IllustrationType =
  | "moped"
  | "motorcycle"
  | "motorTricycle"
  | "quadricycle"
  | "car"
  | "carTrailer"
  | "truckMedium"
  | "truckMediumTrailer"
  | "truckHeavy"
  | "truckHeavyTrailer"
  | "bus"
  | "busTrailer"
  | "minibus"
  | "minibusTrailer";

export interface DrivingCategory {
  id: string;
  label: string;
  group: CategoryGroup;
  shortDescription: string;
  fullDefinition: string;
  vehicleTypes: string[];
  facts: CategoryFact[];
  includes?: string[];
  requires?: string[];
  notes?: string[];
  sourceLabels: string[];
  illustrationType: IllustrationType;
}

export const CATEGORY_GROUPS: { id: CategoryGroup; label: string; categoryIds: string[] }[] = [
  { id: "mopeds", label: "Мотопеди", categoryIds: ["AM"] },
  { id: "motorcycles", label: "Мотоциклети", categoryIds: ["A1", "A2", "A"] },
  { id: "lightVehicles", label: "Леки и четириколесни", categoryIds: ["B1", "B", "BE"] },
  { id: "goods", label: "Товарни", categoryIds: ["C1", "C1E", "C", "CE"] },
  { id: "passenger", label: "Пътнически", categoryIds: ["D1", "D1E", "D", "DE"] },
];

const SRC_150A = "Закон за движението по пътищата — чл. 150а";
const SRC_DIR = "Директива 2006/126/ЕО — категории свидетелства за управление";

export const DRIVING_CATEGORIES: DrivingCategory[] = [
  {
    id: "AM",
    label: "AM",
    group: "mopeds",
    shortDescription: "Мотопеди и леки четириколесни превозни средства.",
    fullDefinition:
      "Двуколесни или триколесни моторни превозни средства с максимална конструктивна скорост не повече от 45 km/h, с изключение на тези с максимална конструктивна скорост не повече от 25 km/h. Категорията включва и леки четириколесни превозни средства.",
    vehicleTypes: ["Мотопеди (2 или 3 колела)", "Леки четириколесни превозни средства"],
    facts: [
      { label: "Максимална конструктивна скорост", value: "45", unit: "km/h" },
      { label: "Колела", value: "2 или 3" },
      { label: "Допълнително", value: "леки четириколесни ПС" },
    ],
    notes: ["Изключват се ПС с максимална конструктивна скорост не повече от 25 km/h."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "moped",
  },
  {
    id: "A1",
    label: "A1",
    group: "motorcycles",
    shortDescription: "Леки мотоциклети и моторни триколесни ПС с ограничена мощност.",
    fullDefinition:
      "Мотоциклети с работен обем до 125 cm³, мощност до 11 kW и съотношение мощност/маса до 0.1 kW/kg. Включва и моторни триколесни превозни средства с мощност до 15 kW.",
    vehicleTypes: ["Леки мотоциклети", "Моторни триколесни ПС"],
    facts: [
      { label: "Работен обем", value: "125", unit: "cm³", group: "Мотоциклет" },
      { label: "Мощност", value: "11", unit: "kW", group: "Мотоциклет" },
      { label: "Мощност/маса", value: "0.1", unit: "kW/kg", group: "Мотоциклет" },
      { label: "Мощност", value: "15", unit: "kW", group: "Моторно триколесно" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "motorcycle",
  },
  {
    id: "A2",
    label: "A2",
    group: "motorcycles",
    shortDescription: "Мотоциклети със средна мощност.",
    fullDefinition:
      "Мотоциклети с мощност до 35 kW и съотношение мощност/маса до 0.2 kW/kg, които не са получени от мотоциклет с повече от двойно по-голяма мощност.",
    vehicleTypes: ["Мотоциклети със средна мощност"],
    facts: [
      { label: "Мощност", value: "35", unit: "kW" },
      { label: "Мощност/маса", value: "0.2", unit: "kW/kg" },
    ],
    notes: [
      "Не може да е преработен от мотоциклет с повече от двойно по-голяма мощност.",
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "motorcycle",
  },
  {
    id: "A",
    label: "A",
    group: "motorcycles",
    shortDescription: "Мотоциклети без ограничението за мощност на A2.",
    fullDefinition:
      "Мотоциклети със или без кош и моторни триколесни превозни средства, без ограничението за мощност, което важи за категория A2.",
    vehicleTypes: ["Мотоциклети", "Мотоциклети с кош", "Моторни триколесни ПС"],
    facts: [
      { label: "Мощност на мотоциклет", value: "без ограничението на A2" },
      { label: "Тип", value: "със или без кош" },
    ],
    notes: ["„Без ограничение“ се отнася само за ограничението за мощност на мотоциклетите от A2."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "motorcycle",
  },
  {
    id: "B1",
    label: "B1",
    group: "lightVehicles",
    shortDescription: "По-тежки четириколесни превозни средства.",
    fullDefinition:
      "Четириколесни превозни средства, различни от леките четириколесни превозни средства от категория L6e. Маса без товар до 400 kg (до 550 kg при превоз на товари) и максимална нетна мощност до 15 kW.",
    vehicleTypes: ["Тежки четириколесни ПС (микроколи)"],
    facts: [
      { label: "Маса без товар", value: "400", unit: "kg" },
      { label: "Маса без товар (товари)", value: "550", unit: "kg" },
      { label: "Максимална нетна мощност", value: "15", unit: "kW" },
    ],
    notes: [
      "При електрическите ПС масата на акумулаторните батерии не се включва в масата без товар.",
      "Различава се от леките четириколесни ПС в категория AM.",
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "quadricycle",
  },
  {
    id: "B",
    label: "B",
    group: "lightVehicles",
    shortDescription: "Леки автомобили и други моторни ПС до 3.5 t.",
    fullDefinition:
      "Моторни превозни средства с допустима максимална маса до 3500 kg и до 8 места за сядане без мястото на водача. Може да се тегли ремарке до 750 kg. Може да се управлява и състав с ремарке над 750 kg, когато общата допустима максимална маса на състава не надвишава 4250 kg, при приложимите изисквания за обучение, изпит и код.",
    vehicleTypes: ["Леки автомобили", "Лекотоварни ПС до 3.5 t"],
    facts: [
      { label: "Допустима максимална маса", value: "3500", unit: "kg" },
      { label: "Места за пътници", value: "8", detail: "без водача" },
      { label: "Ремарке", value: "750", unit: "kg" },
    ],
    notes: [
      "Състав с ремарке над 750 kg е допустим, ако общата маса на състава е до 4250 kg, при приложимите изисквания за обучение, изпит и код.",
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "carTrailer",
  },
  {
    id: "BE",
    label: "BE",
    group: "lightVehicles",
    shortDescription: "Превозно средство от категория B с по-тежко ремарке.",
    fullDefinition:
      "Състав от теглещо превозно средство от категория B и ремарке или полуремарке с допустима максимална маса до 3500 kg.",
    vehicleTypes: ["Автомобил категория B + ремарке/полуремарке"],
    facts: [
      { label: "Теглещо ПС", value: "категория B" },
      { label: "Ремарке/полуремарке", value: "3500", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "carTrailer",
  },
  {
    id: "C1",
    label: "C1",
    group: "goods",
    shortDescription: "Товарни ПС между 3.5 t и 7.5 t.",
    fullDefinition:
      "Моторни превозни средства, различни от тези в категории D1 и D, с допустима максимална маса над 3500 kg и до 7500 kg и до 8 места за сядане без мястото на водача. Може да се тегли ремарке до 750 kg.",
    vehicleTypes: ["Средни товарни автомобили"],
    facts: [
      { label: "Допустима максимална маса", value: "3500–7500", unit: "kg" },
      { label: "Места за пътници", value: "8", detail: "без водача" },
      { label: "Ремарке", value: "750", unit: "kg" },
    ],
    notes: ["Изключват се автобусите от категории D1 и D."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckMedium",
  },
  {
    id: "C1E",
    label: "C1E",
    group: "goods",
    shortDescription: "Състав с теглещо C1, или определен състав с теглещо B.",
    fullDefinition:
      "Форма 1: теглещо превозно средство C1 с ремарке/полуремарке над 750 kg, обща допустима максимална маса до 12 000 kg. Форма 2: теглещо превозно средство B с ремарке/полуремарке над 3500 kg, обща допустима максимална маса до 12 000 kg.",
    vehicleTypes: ["Състав C1 + ремарке", "Състав B + тежко ремарке"],
    facts: [
      { label: "Теглещо ПС", value: "C1", group: "Форма 1" },
      { label: "Ремарке/полуремарке", value: "над 750", unit: "kg", group: "Форма 1" },
      { label: "Обща маса", value: "12 000", unit: "kg", group: "Форма 1" },
      { label: "Теглещо ПС", value: "B", group: "Форма 2" },
      { label: "Ремарке/полуремарке", value: "над 3500", unit: "kg", group: "Форма 2" },
      { label: "Обща маса", value: "12 000", unit: "kg", group: "Форма 2" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckMediumTrailer",
  },
  {
    id: "C",
    label: "C",
    group: "goods",
    shortDescription: "Моторни ПС над 3.5 t, различни от автобусите в D1 и D.",
    fullDefinition:
      "Моторни превозни средства, различни от тези в категории D1 и D, с допустима максимална маса над 3500 kg и до 8 места за сядане без мястото на водача. Може да се тегли ремарке до 750 kg.",
    vehicleTypes: ["Тежки товарни автомобили"],
    facts: [
      { label: "Допустима максимална маса", value: "над 3500", unit: "kg" },
      { label: "Места за пътници", value: "8", detail: "без водача" },
      { label: "Ремарке", value: "750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckHeavy",
  },
  {
    id: "CE",
    label: "CE",
    group: "goods",
    shortDescription: "Превозно средство от категория C с ремарке над 750 kg.",
    fullDefinition:
      "Състав от теглещо превозно средство от категория C и ремарке или полуремарке с допустима максимална маса над 750 kg.",
    vehicleTypes: ["Автомобил категория C + ремарке/полуремарке"],
    facts: [
      { label: "Теглещо ПС", value: "категория C" },
      { label: "Ремарке/полуремарке", value: "над 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckHeavyTrailer",
  },
  {
    id: "D1",
    label: "D1",
    group: "passenger",
    shortDescription: "По-малки превозни средства за превоз на пътници.",
    fullDefinition:
      "Моторни превозни средства за превоз на пътници с до 16 места за сядане без мястото на водача и максимална дължина до 8 m. Може да се тегли ремарке до 750 kg.",
    vehicleTypes: ["Малки автобуси / микробуси"],
    facts: [
      { label: "Места за пътници", value: "16", detail: "без водача" },
      { label: "Максимална дължина", value: "8", unit: "m" },
      { label: "Ремарке", value: "750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "minibus",
  },
  {
    id: "D1E",
    label: "D1E",
    group: "passenger",
    shortDescription: "Превозно средство от категория D1 с ремарке над 750 kg.",
    fullDefinition:
      "Състав от теглещо превозно средство от категория D1 и ремарке с допустима максимална маса над 750 kg.",
    vehicleTypes: ["Микробус категория D1 + ремарке"],
    facts: [
      { label: "Теглещо ПС", value: "категория D1" },
      { label: "Ремарке", value: "над 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "minibusTrailer",
  },
  {
    id: "D",
    label: "D",
    group: "passenger",
    shortDescription: "Превозни средства за превоз на повече от 8 пътници.",
    fullDefinition:
      "Моторни превозни средства, проектирани и конструирани за превоз на повече от 8 пътници без мястото на водача. Може да се тегли ремарке до 750 kg.",
    vehicleTypes: ["Автобуси"],
    facts: [
      { label: "Места за пътници", value: "над 8", detail: "без водача" },
      { label: "Ремарке", value: "750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "bus",
  },
  {
    id: "DE",
    label: "DE",
    group: "passenger",
    shortDescription: "Превозно средство от категория D с ремарке над 750 kg.",
    fullDefinition:
      "Състав от теглещо превозно средство от категория D и ремарке с допустима максимална маса над 750 kg.",
    vehicleTypes: ["Автобус категория D + ремарке"],
    facts: [
      { label: "Теглещо ПС", value: "категория D" },
      { label: "Ремарке", value: "над 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "busTrailer",
  },
];

export const DATA_EDIT_NOTE =
  "Категорийните определения са централизирани в src/data/drivingCategories.ts, за да могат лесно да бъдат проверявани и редактирани. Приложението не замества официалния законов текст.";

export function getDrivingCategory(id: string): DrivingCategory | undefined {
  return DRIVING_CATEGORIES.find((c) => c.id === id);
}

export const ALL_CATEGORY_IDS = DRIVING_CATEGORIES.map((c) => c.id);

// Neighbouring / commonly-confused comparisons (Part 9). Only these are allowed.
export const NEIGHBOUR_COMPARISONS: string[][] = [
  ["AM", "B1"],
  ["A1", "A2", "A"],
  ["B", "BE"],
  ["C1", "C"],
  ["C1E", "CE"],
  ["D1", "D"],
  ["D1E", "DE"],
];

// ---------------------------------------------------------------------------
// Category quiz — generated strictly from the dataset above.
// ---------------------------------------------------------------------------

export interface CategoryQuizQuestion {
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
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Generate one question from the categories in scope. */
export function generateCategoryQuestion(scopeIds: string[]): CategoryQuizQuestion {
  const pool = DRIVING_CATEGORIES.filter((c) => scopeIds.includes(c.id));
  const cats = pool.length ? pool : DRIVING_CATEGORIES;

  // Question A: "which category matches this short description?"
  // Question B: "what is fact X for category Y?" using a concrete fact.
  const useFact = Math.random() < 0.6;
  const cat = pick(cats);

  if (useFact && cat.facts.length) {
    const fact = pick(cat.facts);
    const factText = fact.unit ? `${fact.value} ${fact.unit}` : fact.value;
    const prompt = `Каква е стойността „${fact.label}“ за категория ${cat.label}?`;
    const others = DRIVING_CATEGORIES.flatMap((c) =>
      c.facts.filter((f) => f.label === fact.label).map((f) => (f.unit ? `${f.value} ${f.unit}` : f.value)),
    );
    const distractSet = new Set<string>([factText, ...shuffle(others)]);
    const choices = shuffle(Array.from(distractSet)).slice(0, 4);
    if (!choices.includes(factText)) choices[0] = factText;
    return { prompt, choices: shuffle(choices), answer: factText };
  }

  const prompt = `Коя категория отговаря на описанието: „${cat.shortDescription}“?`;
  const answer = cat.label;
  const distract = shuffle(DRIVING_CATEGORIES.filter((c) => c.id !== cat.id)).slice(0, 3).map((c) => c.label);
  return { prompt, choices: shuffle([answer, ...distract]), answer };
}
