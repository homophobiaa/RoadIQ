// Central editable dataset.
// Legal definitions may change. Update this file only.
// UI components must not contain duplicated category limits.
//
// SOURCE HANDLING — read before editing:
// Bulgarian exam/study materials and newer EU technical type-approval rules
// sometimes use different criteria for the same category (e.g. AM's light
// quadricycle: BG study sources state "маса без товар до 350 kg", while the
// newer EU technical classification — Регламент (ЕС) № 168/2013, category L6e
// — uses "маса в готовност за движение" and adds a separate compression-ignition
// engine-capacity limit). These are NEVER merged into one value. Each
// VehicleVariant carries `sourceIds` pointing at the BG exam definition, and an
// optional `sourceDivergence` string that is shown ONLY inside the expandable
// "Източник и уточнения" section, clearly labelled as a difference — never
// presented as if both applied simultaneously.

export interface SourceRef {
  id: string;
  label: string;
  jurisdiction: "BG" | "EU";
  /** Plain-language note on what this source is used for / how current it is. */
  effectiveContext: string;
  /** Whether this is the definition the Bulgarian driving exam actually tests. */
  examRelevant: boolean;
  notes?: string[];
}

export const SOURCES: SourceRef[] = [
  {
    id: "bg-exam",
    label: "Българска наредба и учебни материали за изпит за категория",
    jurisdiction: "BG",
    effectiveContext:
      "Определението, използвано в това приложение като основно за подготовка за изпита в България.",
    examRelevant: true,
  },
  {
    id: "bg-zdvp-150a",
    label: "Закон за движението по пътищата — чл. 150а",
    jurisdiction: "BG",
    effectiveContext: "Законова база за категориите свидетелства за управление в България.",
    examRelevant: true,
  },
  {
    id: "eu-dir-2006-126",
    label: "Директива 2006/126/ЕО, член 4 — категории свидетелства за управление",
    jurisdiction: "EU",
    effectiveContext:
      "Хармонизирани категории на ЕС, транспонирани в българското законодателство. Съвпада с определенията за изпита.",
    examRelevant: true,
  },
  {
    id: "eu-reg-168-2013",
    label: "Регламент (ЕС) № 168/2013 — техническа класификация на превозни средства от категория L (вкл. L6e, L7e)",
    jurisdiction: "EU",
    effectiveContext:
      "По-нова техническа класификация за одобряване на типа на превозното средство — не е основният текст, ползван в българските учебни материали за изпит.",
    examRelevant: false,
    notes: [
      "Използва понятието „маса в готовност за движение“ вместо „маса без товар“ — двете не са едно и също число.",
      "Добавя отделен по-висок работен обем за двигател със запалване чрез сгъстяване (compression-ignition), който не присъства в опростеното учебно определение.",
    ],
  },
];

export function resolveSources(ids: string[]): SourceRef[] {
  return ids.map((id) => SOURCES.find((s) => s.id === id)).filter((s): s is SourceRef => !!s);
}

export interface VariantFact {
  /** Complete, self-explanatory label — never a bare word like "Маса". */
  label: string;
  value: string;
  unit?: string;
  detail?: string;
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

export interface VehicleVariant {
  id: string;
  title: string;
  plainDescription: string;
  illustrationType: IllustrationType;
  wheels?: string;
  propulsionRules?: {
    sparkIgnition?: string;
    compressionIgnition?: string;
    electricOrOther?: string;
  };
  /** Speed / mass / power / passenger / length / trailer / combination limits — each fully labelled. */
  facts: VariantFact[];
  additionalRules?: string[];
  /** Shown ONLY inside "Източник и уточнения" — never merged into `facts`. */
  sourceDivergence?: string;
  sourceIds: string[];
}

export interface DrivingCategory {
  id: string;
  title: string;
  group: CategoryGroup;
  summary: string;
  variants: VehicleVariant[];
  /** Facts that apply identically across every variant (e.g. B1's shared power limit). */
  sharedFacts?: VariantFact[];
  exclusions?: string[];
  conditionalRights?: string[];
  includedCategories?: string[];
  notes?: string[];
  sourceIds: string[];
}

export const CATEGORY_GROUPS: { id: CategoryGroup; label: string; categoryIds: string[] }[] = [
  { id: "mopeds", label: "Мотопеди", categoryIds: ["AM"] },
  { id: "motorcycles", label: "Мотоциклети", categoryIds: ["A1", "A2", "A"] },
  { id: "lightVehicles", label: "Леки и четириколесни", categoryIds: ["B1", "B", "BE"] },
  { id: "goods", label: "Товарни", categoryIds: ["C1", "C1E", "C", "CE"] },
  { id: "passenger", label: "Пътнически", categoryIds: ["D1", "D1E", "D", "DE"] },
];

export const DRIVING_CATEGORIES: DrivingCategory[] = [
  // ---------------------------------------------------------------------
  // AM — AUDITED: three distinct vehicle types, not one blended entry.
  // ---------------------------------------------------------------------
  {
    id: "AM",
    title: "AM",
    group: "mopeds",
    summary:
      "Категория AM обхваща три различни вида превозни средства — двуколесни мотопеди, триколесни мотопеди и леки четириколесни превозни средства. Всеки вид има собствени технически ограничения.",
    variants: [
      {
        id: "am-2wheel",
        title: "Двуколесен мотопед",
        plainDescription: "Мотопед с две колела.",
        illustrationType: "moped",
        wheels: "2",
        propulsionRules: {
          sparkIgnition: "работен обем не повече от 50 cm³",
          electricOrOther: "максимална нетна мощност не повече от 4 kW",
        },
        facts: [{ label: "Максимална конструктивна скорост", value: "45", unit: "km/h" }],
        additionalRules: [
          "Превозни средства с максимална конструктивна скорост до 25 km/h не се смятат за мотопеди по смисъла на тази категория.",
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
      {
        id: "am-3wheel",
        title: "Триколесен мотопед",
        plainDescription: "Мотопед с три колела.",
        illustrationType: "motorTricycle",
        wheels: "3",
        propulsionRules: {
          sparkIgnition: "работен обем не повече от 50 cm³",
          electricOrOther: "максимална нетна мощност не повече от 4 kW",
        },
        facts: [{ label: "Максимална конструктивна скорост", value: "45", unit: "km/h" }],
        additionalRules: [
          "Превозни средства с максимална конструктивна скорост до 25 km/h не се смятат за мотопеди по смисъла на тази категория.",
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
      {
        id: "am-quadricycle",
        title: "Леко четириколесно превозно средство",
        plainDescription:
          "Лека четириколка (микроколичка), различна и от двата вида мотопеди по-горе.",
        illustrationType: "quadricycle",
        wheels: "4",
        propulsionRules: {
          sparkIgnition: "работен обем не повече от 50 cm³",
          electricOrOther: "максимална нетна мощност не повече от 4 kW",
        },
        facts: [
          { label: "Максимална конструктивна скорост", value: "45", unit: "km/h" },
          {
            label: "Маса без товар",
            value: "до 350",
            unit: "kg",
            detail: "по определението от българските учебни материали за изпит",
          },
        ],
        additionalRules: [
          "При електрическите превозни средства масата на тяговите батерии не се включва в масата без товар.",
        ],
        sourceDivergence:
          "Регламент (ЕС) № 168/2013 определя това превозно средство като категория L6e и използва „маса в готовност за движение“ вместо „маса без товар“ — двете стойности не са пряко сравними. Освен това регламентът допуска и двигател със запалване чрез сгъстяване с работен обем до 500 cm³, каквото ограничение не се среща в опростеното учебно определение за изпита.",
        sourceIds: ["bg-exam"],
      },
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // A1
  // ---------------------------------------------------------------------
  {
    id: "A1",
    title: "A1",
    group: "motorcycles",
    summary:
      "Категория A1 включва два отделни вида превозни средства — леки мотоциклети и моторни триколки, всеки с различни технически ограничения.",
    variants: [
      {
        id: "a1-motorcycle",
        title: "Лек мотоциклет",
        plainDescription: "Мотоциклет с ограничен обем на двигателя, мощност и съотношение мощност/маса.",
        illustrationType: "motorcycle",
        wheels: "2",
        facts: [
          { label: "Максимален работен обем при двигател с вътрешно горене", value: "125", unit: "cm³" },
          { label: "Максимална нетна мощност", value: "11", unit: "kW" },
          { label: "Максимално съотношение мощност/маса", value: "0,1", unit: "kW/kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
      {
        id: "a1-tricycle",
        title: "Моторна триколка",
        plainDescription: "Моторно превозно средство с три колела, с ограничена мощност.",
        illustrationType: "motorTricycle",
        wheels: "3",
        facts: [{ label: "Максимална нетна мощност на моторната триколка", value: "15", unit: "kW" }],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // A2
  // ---------------------------------------------------------------------
  {
    id: "A2",
    title: "A2",
    group: "motorcycles",
    summary: "Категория A2 е за мотоциклети със средна мощност — междинна стъпка преди пълната категория A.",
    variants: [
      {
        id: "a2-motorcycle",
        title: "Мотоциклет със средна мощност",
        plainDescription: "Мотоциклет с по-висока мощност от A1, но все още с горна граница.",
        illustrationType: "motorcycle",
        wheels: "2",
        facts: [
          { label: "Максимална нетна мощност", value: "35", unit: "kW" },
          { label: "Максимално съотношение мощност/маса", value: "0,2", unit: "kW/kg" },
        ],
        additionalRules: [
          "Мотоциклетът не трябва да е получен от модел с повече от два пъти по-висока мощност от неговата.",
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // A
  // ---------------------------------------------------------------------
  {
    id: "A",
    title: "A",
    group: "motorcycles",
    summary:
      "Категория A е за мотоциклети без горна граница за мощност, както и за мотоциклети с кош и по-мощни моторни триколки.",
    variants: [
      {
        id: "a-motorcycle",
        title: "Мотоциклет (със или без кош)",
        plainDescription: "Мотоциклет без ограничението за мощност, което важи при A1 и A2.",
        illustrationType: "motorcycle",
        wheels: "2",
        facts: [
          { label: "Максимална нетна мощност", value: "няма ограничение", detail: "за разлика от категории A1 и A2" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
      {
        id: "a-tricycle",
        title: "Моторна триколка с по-висока мощност",
        plainDescription: "Моторна триколка, чиято мощност надвишава границата за категория A1.",
        illustrationType: "motorTricycle",
        wheels: "3",
        facts: [
          { label: "Изисквана мощност", value: "над 15", unit: "kW", detail: "над границата за A1" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    notes: [
      "Липсата на ограничение за мощност важи само за мотоциклетите — не отменя другите изисквания на категорията.",
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // B1 — AUDITED: passenger vs goods variant, shared power fact.
  // ---------------------------------------------------------------------
  {
    id: "B1",
    title: "B1",
    group: "lightVehicles",
    summary:
      "Категория B1 е за по-тежки четириколесни превозни средства — различни от леките четириколки в AM — с отделни ограничения според предназначението им.",
    variants: [
      {
        id: "b1-passenger",
        title: "За превоз на пътници",
        plainDescription: "Четириколесно превозно средство, предназначено за возене на хора.",
        illustrationType: "quadricycle",
        wheels: "4",
        facts: [{ label: "Маса без товар при превоз на пътници", value: "до 400", unit: "kg" }],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
      {
        id: "b1-goods",
        title: "За превоз на товари",
        plainDescription: "Четириколесно превозно средство, предназначено за превоз на стоки.",
        illustrationType: "quadricycle",
        wheels: "4",
        facts: [{ label: "Маса без товар при превоз на товари", value: "до 550", unit: "kg" }],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    sharedFacts: [{ label: "Максимална нетна мощност", value: "до 15", unit: "kW" }],
    notes: [
      "При електрическите превозни средства масата на тяговите батерии не се включва в масата без товар.",
      "B1 не е двуколесна или триколесна категория — превозните средства тук имат четири колела и по-висока допустима маса от леките четириколки в AM.",
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // B
  // ---------------------------------------------------------------------
  {
    id: "B",
    title: "B",
    group: "lightVehicles",
    summary: "Категория B е за леки автомобили и други моторни превозни средства с допустима максимална маса до 3 500 kg.",
    variants: [
      {
        id: "b-vehicle",
        title: "Основно превозно средство",
        plainDescription: "Лек автомобил или друго моторно превозно средство до 3 500 kg.",
        illustrationType: "carTrailer",
        facts: [
          { label: "Допустима максимална маса", value: "до 3 500", unit: "kg" },
          { label: "Пътнически места, без мястото на водача", value: "до 8" },
          { label: "Ремарке или полуремарке с допустима максимална маса", value: "до 750", unit: "kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    conditionalRights: [
      "Позволен е състав с по-тежко ремарке (над 750 kg), ако общата допустима максимална маса на състава не надвишава 4 250 kg — при спазване на изискванията за допълнително обучение, изпит или съответен код в свидетелството за управление.",
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // BE
  // ---------------------------------------------------------------------
  {
    id: "BE",
    title: "BE",
    group: "lightVehicles",
    summary: "Категория BE позволява автомобил от категория B да тегли по-тежко ремарке или полуремарке.",
    variants: [
      {
        id: "be-combo",
        title: "Автомобил категория B с ремарке",
        plainDescription: "Състав от лек автомобил (категория B) и ремарке или полуремарке.",
        illustrationType: "carTrailer",
        facts: [{ label: "Ремарке или полуремарке с допустима максимална маса", value: "до 3 500", unit: "kg" }],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    includedCategories: ["B"],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // C1
  // ---------------------------------------------------------------------
  {
    id: "C1",
    title: "C1",
    group: "goods",
    summary: "Категория C1 е за товарни и други моторни превозни средства с маса над 3 500 kg, но не повече от 7 500 kg.",
    variants: [
      {
        id: "c1-vehicle",
        title: "Основно превозно средство",
        plainDescription: "Среден товарен автомобил.",
        illustrationType: "truckMedium",
        facts: [
          { label: "Допустима максимална маса", value: "над 3 500, до 7 500", unit: "kg" },
          { label: "Пътнически места, без мястото на водача", value: "до 8" },
          { label: "Ремарке с допустима максимална маса", value: "до 750", unit: "kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    exclusions: ["Автобусите от категории D1 и D."],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // C1E — AUDITED: two clearly separated combinations, never merged.
  // ---------------------------------------------------------------------
  {
    id: "C1E",
    title: "C1E",
    group: "goods",
    summary:
      "Категория C1E позволява управление на два отделни вида състав: с теглещо превозно средство от категория C1, или — при по-строги условия — с автомобил от категория B.",
    variants: [
      {
        id: "c1e-with-c1",
        title: "Товарен автомобил категория C1 с ремарке",
        plainDescription: "Състав от превозно средство C1 и ремарке или полуремарке над 750 kg.",
        illustrationType: "truckMediumTrailer",
        facts: [
          { label: "Ремарке или полуремарке с допустима максимална маса", value: "над 750", unit: "kg" },
          { label: "Обща допустима максимална маса на състава", value: "до 12 000", unit: "kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
      {
        id: "c1e-with-b",
        title: "Лек автомобил категория B с тежко ремарке",
        plainDescription:
          "По-рядко използвана възможност: автомобил от категория B с ремарке, по-тежко от обичайното за BE.",
        illustrationType: "carTrailer",
        facts: [
          { label: "Ремарке или полуремарке с допустима максимална маса", value: "над 3 500", unit: "kg" },
          { label: "Обща допустима максимална маса на състава", value: "до 12 000", unit: "kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    includedCategories: ["C1", "B"],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // C
  // ---------------------------------------------------------------------
  {
    id: "C",
    title: "C",
    group: "goods",
    summary: "Категория C е за моторни превозни средства с допустима максимална маса над 3 500 kg.",
    variants: [
      {
        id: "c-vehicle",
        title: "Основно превозно средство",
        plainDescription: "Тежък товарен автомобил.",
        illustrationType: "truckHeavy",
        facts: [
          { label: "Допустима максимална маса", value: "над 3 500", unit: "kg" },
          { label: "Пътнически места, без мястото на водача", value: "до 8" },
          { label: "Ремарке с допустима максимална маса", value: "до 750", unit: "kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    exclusions: ["Автобусите от категории D1 и D."],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // CE
  // ---------------------------------------------------------------------
  {
    id: "CE",
    title: "CE",
    group: "goods",
    summary: "Категория CE позволява превозно средство от категория C да тегли ремарке или полуремарке над 750 kg.",
    variants: [
      {
        id: "ce-combo",
        title: "Автомобил категория C с ремарке",
        plainDescription: "Състав от тежък товарен автомобил и ремарке или полуремарке.",
        illustrationType: "truckHeavyTrailer",
        facts: [{ label: "Ремарке или полуремарке с допустима максимална маса", value: "над 750", unit: "kg" }],
        additionalRules: ["За разлика от C1E, тук няма горна граница за общата маса на състава."],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    includedCategories: ["C"],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // D1
  // ---------------------------------------------------------------------
  {
    id: "D1",
    title: "D1",
    group: "passenger",
    summary: "Категория D1 е за по-малки автобуси и други превозни средства за превоз на до 16 пътници.",
    variants: [
      {
        id: "d1-vehicle",
        title: "Основно превозно средство",
        plainDescription: "Малък автобус или микробус.",
        illustrationType: "minibus",
        facts: [
          { label: "Пътнически места, без мястото на водача", value: "до 16" },
          { label: "Максимална дължина на превозното средство", value: "8", unit: "m" },
          { label: "Ремарке с допустима максимална маса", value: "до 750", unit: "kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // D1E
  // ---------------------------------------------------------------------
  {
    id: "D1E",
    title: "D1E",
    group: "passenger",
    summary: "Категория D1E позволява превозно средство от категория D1 да тегли ремарке над 750 kg.",
    variants: [
      {
        id: "d1e-combo",
        title: "Микробус категория D1 с ремарке",
        plainDescription: "Състав от малък автобус и ремарке.",
        illustrationType: "minibusTrailer",
        facts: [
          { label: "Ремарке с допустима максимална маса", value: "над 750", unit: "kg" },
          { label: "Обща допустима максимална маса на състава", value: "до 12 000", unit: "kg" },
        ],
        additionalRules: ["Ремаркето не може да се използва за превоз на пътници."],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    includedCategories: ["D1"],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // D
  // ---------------------------------------------------------------------
  {
    id: "D",
    title: "D",
    group: "passenger",
    summary: "Категория D е за автобуси и други превозни средства, проектирани за превоз на повече от 8 пътници.",
    variants: [
      {
        id: "d-vehicle",
        title: "Основно превозно средство",
        plainDescription: "Автобус.",
        illustrationType: "bus",
        facts: [
          { label: "Пътнически места, без мястото на водача", value: "над 8" },
          { label: "Ремарке с допустима максимална маса", value: "до 750", unit: "kg" },
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },

  // ---------------------------------------------------------------------
  // DE
  // ---------------------------------------------------------------------
  {
    id: "DE",
    title: "DE",
    group: "passenger",
    summary: "Категория DE позволява превозно средство от категория D да тегли ремарке над 750 kg.",
    variants: [
      {
        id: "de-combo",
        title: "Автобус категория D с ремарке",
        plainDescription: "Състав от автобус и ремарке.",
        illustrationType: "busTrailer",
        facts: [{ label: "Ремарке с допустима максимална маса", value: "над 750", unit: "kg" }],
        additionalRules: [
          "Ремаркето не може да се използва за превоз на пътници.",
          "За разлика от D1E, тук няма горна граница за общата маса на състава.",
        ],
        sourceIds: ["bg-exam", "eu-dir-2006-126"],
      },
    ],
    includedCategories: ["D"],
    sourceIds: ["bg-exam", "bg-zdvp-150a", "eu-dir-2006-126"],
  },
];

export const DATA_EDIT_NOTE =
  "Определенията за категориите се поддържат на едно място — в src/data/drivingCategories.ts, за да могат лесно да бъдат проверявани и редактирани. Приложението не замества официалния законов текст.";

export function getDrivingCategory(id: string): DrivingCategory | undefined {
  return DRIVING_CATEGORIES.find((c) => c.id === id);
}

export const ALL_CATEGORY_IDS = DRIVING_CATEGORIES.map((c) => c.id);

/** First variant's illustration — used for compact previews (hub cards, chips). */
export function primaryIllustration(cat: DrivingCategory): IllustrationType {
  return cat.variants[0]?.illustrationType ?? "car";
}

/**
 * Flattens a category's facts for display/comparison. When a category has more
 * than one variant, each fact label is prefixed with its variant title so
 * "маса без товар при превоз на пътници" and "...при превоз на товари" are
 * never collapsed into one ambiguous row.
 */
export function flattenFacts(cat: DrivingCategory): VariantFact[] {
  const multi = cat.variants.length > 1;
  const out: VariantFact[] = [];
  for (const v of cat.variants) {
    for (const f of v.facts) {
      out.push(multi ? { ...f, label: `${v.title} — ${f.label}` } : f);
    }
  }
  if (cat.sharedFacts) out.push(...cat.sharedFacts);
  return out;
}

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
  const cat = pick(cats);

  const allFacts = flattenFacts(cat);
  const useFact = Math.random() < 0.6 && allFacts.length > 0;

  if (useFact) {
    const fact = pick(allFacts);
    const factText = fact.unit ? `${fact.value} ${fact.unit}` : fact.value;
    const prompt = `Какъв е показателят „${fact.label}“ при категория ${cat.title}?`;
    const others = DRIVING_CATEGORIES.flatMap((c) =>
      flattenFacts(c)
        .filter((f) => f.label === fact.label)
        .map((f) => (f.unit ? `${f.value} ${f.unit}` : f.value)),
    );
    const distractSet = new Set<string>([factText, ...shuffle(others)]);
    const choices = shuffle(Array.from(distractSet)).slice(0, 4);
    if (!choices.includes(factText)) choices[0] = factText;
    return { prompt, choices: shuffle(choices), answer: factText };
  }

  const prompt = `Коя категория отговаря на описанието: „${cat.summary}“?`;
  const answer = cat.title;
  const distract = shuffle(DRIVING_CATEGORIES.filter((c) => c.id !== cat.id)).slice(0, 3).map((c) => c.title);
  return { prompt, choices: shuffle([answer, ...distract]), answer };
}

// ---------------------------------------------------------------------------
// Data audit — completeness + internal consistency check for every category.
// Surfaced in the dev-only audit view (src/pages/CategoryAuditPage.tsx).
// This catches missing/contradictory DATA ENTRY, not legal accuracy — the
// per-category facts above were individually reviewed against BG exam sources
// and the EU directive before being written; this function is a safety net
// against future edits, not a substitute for that review.
// ---------------------------------------------------------------------------

export interface AuditWarning {
  categoryId: string;
  severity: "error" | "warning";
  message: string;
}

export function auditCategory(cat: DrivingCategory): AuditWarning[] {
  const warnings: AuditWarning[] = [];
  const push = (severity: AuditWarning["severity"], message: string) =>
    warnings.push({ categoryId: cat.id, severity, message });

  if (cat.sourceIds.length === 0) push("error", "Категорията няма посочен източник.");
  if (cat.variants.length === 0) {
    push("error", "Категорията няма нито един вариант превозно средство.");
    return warnings;
  }

  for (const v of cat.variants) {
    const hasContent =
      v.facts.length > 0 || !!v.propulsionRules || (v.additionalRules?.length ?? 0) > 0;
    if (!hasContent) push("error", `Вариант „${v.title}“ няма никакви технически данни.`);
    if (v.sourceIds.length === 0) push("warning", `Вариант „${v.title}“ няма посочен източник.`);

    // Internal contradiction check: same exact label appearing twice with a
    // different value inside the same variant.
    const seen = new Map<string, string>();
    for (const f of v.facts) {
      const key = f.label;
      const val = f.unit ? `${f.value} ${f.unit}` : f.value;
      if (seen.has(key) && seen.get(key) !== val) {
        push("error", `Противоречиви стойности за „${key}“ във вариант „${v.title}“ (${seen.get(key)} ≠ ${val}).`);
      }
      seen.set(key, val);
    }
  }

  // Same check across sharedFacts.
  if (cat.sharedFacts) {
    const seen = new Map<string, string>();
    for (const f of cat.sharedFacts) {
      const val = f.unit ? `${f.value} ${f.unit}` : f.value;
      if (seen.has(f.label) && seen.get(f.label) !== val) {
        push("error", `Противоречиви общи стойности за „${f.label}“.`);
      }
      seen.set(f.label, val);
    }
  }

  return warnings;
}

export function auditAllCategories(): AuditWarning[] {
  return DRIVING_CATEGORIES.flatMap(auditCategory);
}
