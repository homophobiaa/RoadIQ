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
    shortDescription: "Категория AM е за мотопеди и леки четириколесни превозни средства.",
    fullDefinition:
      "С категория AM можеш да управляваш двуколесни и триколесни мотопеди с максимална конструктивна скорост до 45 km/h, както и леки четириколесни превозни средства. Превозни средства с максимална конструктивна скорост до 25 km/h не се смятат за мотопеди и остават извън тази категория.",
    vehicleTypes: ["Мотопед (2 или 3 колела)", "Леко четириколесно превозно средство"],
    facts: [
      { label: "Максимална конструктивна скорост", value: "45", unit: "km/h" },
      { label: "Брой колела", value: "2 или 3" },
      { label: "Категорията включва и", value: "леки четириколесни превозни средства" },
    ],
    notes: ["Превозни средства с максимална конструктивна скорост до 25 km/h не влизат в тази категория."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "moped",
  },
  {
    id: "A1",
    label: "A1",
    group: "motorcycles",
    shortDescription: "Категория A1 е за леки мотоциклети до 125 cm³ и моторни триколки с ограничена мощност.",
    fullDefinition:
      "Категория A1 позволява управление на лек мотоциклет с работен обем до 125 cm³, мощност до 11 kW и съотношение мощност/маса до 0,1 kW/kg. Освен мотоциклети, категорията включва и моторни триколки с мощност до 15 kW.",
    vehicleTypes: ["Лек мотоциклет", "Моторна триколка"],
    facts: [
      { label: "Работен обем", value: "125", unit: "cm³", group: "Мотоциклет" },
      { label: "Мощност", value: "11", unit: "kW", group: "Мотоциклет" },
      { label: "Съотношение мощност/маса", value: "0,1", unit: "kW/kg", group: "Мотоциклет" },
      { label: "Мощност", value: "15", unit: "kW", group: "Моторна триколка" },
    ],
    notes: ["При моторните триколки максималната мощност е 15 kW."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "motorcycle",
  },
  {
    id: "A2",
    label: "A2",
    group: "motorcycles",
    shortDescription: "Категория A2 е за мотоциклети със средна мощност.",
    fullDefinition:
      "Мотоциклетът може да бъде с мощност до 35 kW и със съотношение мощност/маса до 0,2 kW/kg. Той не трябва да е преработен от модел с повече от два пъти по-висока мощност — това ограничение важи за произхода на мотоциклета, не за самия него.",
    vehicleTypes: ["Мотоциклет със средна мощност"],
    facts: [
      { label: "Мощност", value: "35", unit: "kW" },
      { label: "Съотношение мощност/маса", value: "0,2", unit: "kW/kg" },
    ],
    notes: [
      "Мотоциклетът не може да е преработен от модел с повече от два пъти по-висока мощност от неговата.",
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "motorcycle",
  },
  {
    id: "A",
    label: "A",
    group: "motorcycles",
    shortDescription: "Категория A позволява управление на мотоциклети без ограниченията за мощност при A1 и A2.",
    fullDefinition:
      "Категорията включва мотоциклети със или без кош, както и моторни триколесни превозни средства. За разлика от A1 и A2, тук няма горна граница за мощността на мотоциклета.",
    vehicleTypes: ["Мотоциклет", "Мотоциклет с кош", "Моторна триколка"],
    facts: [
      { label: "Ограничение за мощност", value: "няма", detail: "за разлика от A1 и A2" },
      { label: "Вид", value: "със или без кош" },
    ],
    notes: ["Липсата на ограничение важи само за мощността на мотоциклета — не отменя другите изисквания на категорията."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "motorcycle",
  },
  {
    id: "B1",
    label: "B1",
    group: "lightVehicles",
    shortDescription: "Категория B1 е за по-тежки четириколесни превозни средства, например някои микроколи.",
    fullDefinition:
      "Превозното средство може да има маса без товар до 400 kg, или до 550 kg, когато е предназначено за превоз на товари. Максималната нетна мощност е 15 kW. Категорията е различна от леките четириколесни превозни средства, включени в AM.",
    vehicleTypes: ["Четириколесно превозно средство (микроколa)"],
    facts: [
      { label: "Маса без товар", value: "400", unit: "kg" },
      { label: "Маса без товар при превоз на товари", value: "550", unit: "kg" },
      { label: "Максимална нетна мощност", value: "15", unit: "kW" },
    ],
    notes: [
      "При електрическите превозни средства масата на батериите не се включва в масата без товар.",
      "B1 не е двуколесна или триколесна категория — превозните средства тук имат четири колела и по-висока маса от леките четириколесни превозни средства в AM.",
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "quadricycle",
  },
  {
    id: "B",
    label: "B",
    group: "lightVehicles",
    shortDescription: "Категория B е за леки автомобили и други моторни превозни средства с допустима максимална маса до 3 500 kg.",
    fullDefinition:
      "Превозното средство може да има най-много 8 места за пътници, без мястото на водача, и допустима максимална маса до 3 500 kg. С него може да се тегли ремарке с допустима максимална маса до 750 kg. При определени условия категория B позволява и състав с по-тежко ремарке, когато общата допустима максимална маса на състава не надвишава 4 250 kg — за това може да са необходими допълнително обучение, изпит или съответен код в свидетелството.",
    vehicleTypes: ["Лек автомобил", "Друго моторно превозно средство до 3 500 kg"],
    facts: [
      { label: "Допустима максимална маса", value: "3 500", unit: "kg" },
      { label: "Пътнически места", value: "до 8", detail: "без водача" },
      { label: "Ремарке", value: "до 750", unit: "kg" },
    ],
    notes: [
      "Състав с по-тежко ремарке (над 750 kg) е допустим, ако общата маса на състава не надвишава 4 250 kg, при спазване на изискванията за допълнително обучение, изпит или код в свидетелството.",
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "carTrailer",
  },
  {
    id: "BE",
    label: "BE",
    group: "lightVehicles",
    shortDescription: "Категория BE позволява автомобил от категория B да тегли по-тежко ремарке или полуремарке.",
    fullDefinition:
      "Автомобилът трябва да е от категория B. Ремаркето или полуремаркето може да има допустима максимална маса до 3 500 kg.",
    vehicleTypes: ["Автомобил от категория B с ремарке или полуремарке"],
    facts: [
      { label: "Автомобил", value: "категория B" },
      { label: "Ремарке или полуремарке", value: "до 3 500", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "carTrailer",
  },
  {
    id: "C1",
    label: "C1",
    group: "goods",
    shortDescription: "Категория C1 е за товарни и други моторни превозни средства с маса над 3 500 kg, но не повече от 7 500 kg.",
    fullDefinition:
      "Превозното средство може да има до 8 места за пътници, без мястото на водача, и да тегли ремарке до 750 kg. Категорията не включва автобусите от категории D1 и D.",
    vehicleTypes: ["Среден товарен автомобил"],
    facts: [
      { label: "Допустима максимална маса", value: "3 500–7 500", unit: "kg" },
      { label: "Пътнически места", value: "до 8", detail: "без водача" },
      { label: "Ремарке", value: "до 750", unit: "kg" },
    ],
    notes: ["Автобусите от категории D1 и D не влизат в C1."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckMedium",
  },
  {
    id: "C1E",
    label: "C1E",
    group: "goods",
    shortDescription: "Категория C1E позволява състав с превозно средство C1, или определен по-тежък състав с автомобил от категория B.",
    fullDefinition:
      "Категория C1E позволява управление на два отделни вида състав. Първата възможност е превозно средство от категория C1 с ремарке или полуремарке над 750 kg, като общата допустима максимална маса на състава е до 12 000 kg. Втората възможност е автомобил от категория B с ремарке или полуремарке над 3 500 kg, също с обща допустима максимална маса до 12 000 kg.",
    vehicleTypes: ["Състав C1 с ремарке", "Състав B с по-тежко ремарке"],
    facts: [
      { label: "Теглещо превозно средство", value: "C1", group: "Възможност 1" },
      { label: "Ремарке или полуремарке", value: "над 750", unit: "kg", group: "Възможност 1" },
      { label: "Обща допустима максимална маса", value: "до 12 000", unit: "kg", group: "Възможност 1" },
      { label: "Теглещо превозно средство", value: "B", group: "Възможност 2" },
      { label: "Ремарке или полуремарке", value: "над 3 500", unit: "kg", group: "Възможност 2" },
      { label: "Обща допустима максимална маса", value: "до 12 000", unit: "kg", group: "Възможност 2" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckMediumTrailer",
  },
  {
    id: "C",
    label: "C",
    group: "goods",
    shortDescription: "Категория C е за моторни превозни средства с допустима максимална маса над 3 500 kg.",
    fullDefinition:
      "Превозното средство може да има до 8 места за пътници, без мястото на водача, и да тегли ремарке до 750 kg. Категорията не включва автобусите от категории D1 и D.",
    vehicleTypes: ["Тежък товарен автомобил"],
    facts: [
      { label: "Допустима максимална маса", value: "над 3 500", unit: "kg" },
      { label: "Пътнически места", value: "до 8", detail: "без водача" },
      { label: "Ремарке", value: "до 750", unit: "kg" },
    ],
    notes: ["Автобусите от категории D1 и D не влизат в C."],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckHeavy",
  },
  {
    id: "CE",
    label: "CE",
    group: "goods",
    shortDescription: "Категория CE позволява превозно средство от категория C да тегли ремарке или полуремарке над 750 kg.",
    fullDefinition:
      "Автомобилът трябва да е от категория C. Ремаркето или полуремаркето трябва да има допустима максимална маса над 750 kg.",
    vehicleTypes: ["Автомобил от категория C с ремарке или полуремарке"],
    facts: [
      { label: "Автомобил", value: "категория C" },
      { label: "Ремарке или полуремарке", value: "над 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "truckHeavyTrailer",
  },
  {
    id: "D1",
    label: "D1",
    group: "passenger",
    shortDescription: "Категория D1 е за по-малки автобуси и други превозни средства за превоз на до 16 пътници.",
    fullDefinition:
      "Превозното средство може да има до 16 места за пътници, без мястото на водача, и максимална дължина до 8 m. Може да тегли ремарке до 750 kg.",
    vehicleTypes: ["Малък автобус", "Микробус"],
    facts: [
      { label: "Пътнически места", value: "до 16", detail: "без водача" },
      { label: "Максимална дължина", value: "8", unit: "m" },
      { label: "Ремарке", value: "до 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "minibus",
  },
  {
    id: "D1E",
    label: "D1E",
    group: "passenger",
    shortDescription: "Категория D1E позволява превозно средство от категория D1 да тегли ремарке над 750 kg.",
    fullDefinition:
      "Превозното средство трябва да е от категория D1. Ремаркето трябва да има допустима максимална маса над 750 kg.",
    vehicleTypes: ["Микробус от категория D1 с ремарке"],
    facts: [
      { label: "Превозно средство", value: "категория D1" },
      { label: "Ремарке", value: "над 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "minibusTrailer",
  },
  {
    id: "D",
    label: "D",
    group: "passenger",
    shortDescription: "Категория D е за автобуси и други превозни средства, проектирани за превоз на повече от 8 пътници.",
    fullDefinition:
      "Броят на пътниците се изчислява без мястото на водача. Превозното средство може да тегли ремарке до 750 kg.",
    vehicleTypes: ["Автобус"],
    facts: [
      { label: "Пътнически места", value: "над 8", detail: "без водача" },
      { label: "Ремарке", value: "до 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "bus",
  },
  {
    id: "DE",
    label: "DE",
    group: "passenger",
    shortDescription: "Категория DE позволява превозно средство от категория D да тегли ремарке над 750 kg.",
    fullDefinition:
      "Превозното средство трябва да е от категория D. Ремаркето трябва да има допустима максимална маса над 750 kg.",
    vehicleTypes: ["Автобус от категория D с ремарке"],
    facts: [
      { label: "Превозно средство", value: "категория D" },
      { label: "Ремарке", value: "над 750", unit: "kg" },
    ],
    sourceLabels: [SRC_150A, SRC_DIR],
    illustrationType: "busTrailer",
  },
];

export const DATA_EDIT_NOTE =
  "Определенията за категориите се поддържат на едно място — в src/data/drivingCategories.ts, за да могат лесно да бъдат проверявани и редактирани. Приложението не замества официалния законов текст.";

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
    const prompt = `Какъв е показателят „${fact.label}“ при категория ${cat.label}?`;
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
