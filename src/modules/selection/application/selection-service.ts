import { toCatalogWatchCard } from "@/modules/catalog/application/catalog-read-service";
import {
  classifyCatalogFacets,
  findSpecificationValue,
  normalizeCaseSizeMm,
  type CatalogStrapMaterialGroup,
} from "@/modules/catalog/application/catalog-filter-taxonomy";
import type { CatalogMechanismGroup } from "@/modules/catalog/application/catalog-mechanism-taxonomy";
import { isSelectionFrontImage } from "@/modules/selection/application/selection-image-policy";
import type {
  CatalogImagePresentation,
  CatalogReadDataset,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import type {
  SelectionActualMovementKey,
  SelectionAnswerKey,
  SelectionAnswers,
  SelectionBudgetCode,
  SelectionBudgetFallbackTier,
  SelectionBudgetFit,
  SelectionCatalogDiagnostics,
  SelectionCharacterCode,
  SelectionCriterionEvaluation,
  SelectionCriterionStatus,
  SelectionDialColorBucket,
  SelectionDialColorPreference,
  SelectionFeatureCode,
  SelectionFitCode,
  SelectionFormDefinition,
  SelectionMovementPreference,
  SelectionRecommendation,
  SelectionRecommendationRole,
  SelectionScenarioCode,
  SelectionScoreBreakdown,
  SelectionStepCode,
  SelectionStrapKey,
} from "@/modules/selection/domain/types";

export const selectionStepOrder = [
  "scenario",
  "fit",
  "character",
  "movement",
  "dial-color",
  "features",
  "budget",
] as const;

export const selectionScoringWeights = {
  scenario: 0.14,
  fit: 0.15,
  character: 0.11,
  movement: 0.17,
  dialColor: 0.08,
  features: 0.14,
  budget: 0.18,
  dataConfidence: 0.03,
} as const;

export const selectionFormDefinition: SelectionFormDefinition = {
  steps: [
    {
      code: "scenario",
      answerKey: "scenario",
      eyebrow: "Шаг 1 из 6",
      title: "Для чего вы выбираете часы?",
      deck: "Выберите основной сценарий — дальше уточним посадку, характер и характеристики.",
      optional: false,
      options: [
        { code: "daily", label: "На каждый день", description: "Универсальные часы для города и повседневной носки." },
        { code: "work", label: "Для работы", description: "Сдержанные часы для офиса и делового образа." },
        { code: "occasion", label: "Для особого случая", description: "Более нарядные и выразительные модели." },
        { code: "sport", label: "Для спорта и активности", description: "Практичные часы с акцентом на прочность и функциональность." },
        { code: "travel", label: "Для путешествий", description: "Удобные и практичные часы для поездок и активного дня." },
        { code: "first-mechanical", label: "Первые механические часы", description: "Понятные модели для знакомства с механическими часами." },
        { code: "universal", label: "Универсальный вариант", description: "Часы без узкой роли, подходящие к разным ситуациям." },
      ],
    },
    {
      code: "fit",
      answerKey: "fit",
      eyebrow: "Шаг 2 из 6",
      title: "Какая посадка вам ближе?",
      deck: "Размер корпуса сильно влияет на то, как часы смотрятся на руке.",
      optional: false,
      options: [
        { code: "compact", label: "Компактная", description: "Небольшие часы; сюда также относится большинство женских моделей." },
        { code: "medium", label: "Средняя", description: "Универсальный размер для большинства запястий." },
        { code: "large", label: "Крупная", description: "Более заметные часы на руке." },
        { code: "unknown", label: "Не знаю", description: "Не будем ограничивать подбор по размеру." },
      ],
    },
    {
      code: "character",
      answerKey: "character",
      eyebrow: "Шаг 3 из 6",
      title: "Какой характер часов вам нравится?",
      deck: "Выберите то, как часы должны ощущаться визуально.",
      optional: false,
      options: [
        { code: "classic", label: "Классические", description: "Спокойный дизайн, чистый циферблат и минимум лишних деталей." },
        { code: "modern", label: "Современные", description: "Актуальный универсальный дизайн без излишней формальности." },
        { code: "sporty", label: "Спортивные", description: "Более функциональные и заметные часы." },
        { code: "expressive", label: "Выразительные", description: "Необычные детали, более заметный дизайн или характер." },
        { code: "neutral", label: "Не принципиально", description: "Не будем ограничивать подбор по стилю." },
      ],
    },
    {
      code: "movement",
      answerKey: "movement",
      eyebrow: "Шаг 4 из 7",
      title: "Какой механизм вы предпочитаете?",
      deck: "Если не уверены, можно оставить этот выбор открытым.",
      optional: false,
      options: [
        { code: "mechanical", label: "Механические / автоматические", description: "Классическая механика — с ручным заводом или автоподзаводом." },
        { code: "quartz", label: "Кварцевые", description: "Точные и неприхотливые часы для повседневного использования." },
        { code: "solar", label: "Solar / Eco-Drive", description: "Кварцевые часы с зарядкой от света." },
        { code: "neutral", label: "Не принципиально", description: "Механизм не будет ограничивать подбор." },
      ],
    },
    {
      code: "dial-color",
      answerKey: "dialColor",
      eyebrow: "Шаг 5 из 7",
      title: "Какой цвет циферблата вам ближе?",
      deck: "Это мягкое эстетическое предпочтение: оно помогает уточнить подбор, но не перебивает бюджет, посадку и механизм.",
      optional: false,
      options: [
        { code: "light", label: "Светлый", description: "Белый, серебристый, кремовый, шампань или светлый перламутр." },
        { code: "dark", label: "Темный", description: "Черный, графитовый, тёмно-серый или близкие спокойные оттенки." },
        { code: "blue", label: "Синий", description: "От тёмно-синего до более светлого голубого циферблата." },
        { code: "green", label: "Зеленый", description: "Зелёный, оливковый, мятный и близкие оттенки." },
        { code: "other", label: "Другой цвет", description: "Розовый, красный, бордовый, золотистый, коричневый или иной выразительный цвет." },
        { code: "neutral", label: "Неважно", description: "Не будем учитывать цвет циферблата в ранжировании." },
      ],
    },
    {
      code: "features",
      answerKey: "features",
      eyebrow: "Шаг 6 из 7",
      title: "Что для вас особенно важно?",
      deck: "Можно выбрать несколько вариантов.",
      optional: false,
      multiple: true,
      options: [
        { code: "sapphire", label: "Сапфировое стекло", description: "Если важна повышенная стойкость к царапинам." },
        { code: "water-resistance", label: "Повышенная водозащита", description: "Приоритет для моделей с подтверждённой защитой от 100 м." },
        { code: "steel-bracelet", label: "Металлический браслет", description: "Собранная посадка и универсальный внешний вид." },
        { code: "leather", label: "Кожаный ремешок", description: "Более спокойный и классический характер." },
        { code: "thin", label: "Небольшая толщина", description: "Когда хочется более аккуратный профиль на руке." },
        { code: "chronograph", label: "Хронограф", description: "Функция секундомера и более технический характер." },
        { code: "date", label: "Дата", description: "Практичная повседневная функция." },
        { code: "functions", label: "Дополнительные функции", description: "GMT, мировое время, будильник, таймер и другие полезные усложнения." },
        { code: "none", label: "Ничего конкретного", description: "Оставим подбор шире." },
      ],
    },
    {
      code: "budget",
      answerKey: "budget",
      eyebrow: "Шаг 7 из 7",
      title: "На какой бюджет ориентируемся?",
      deck: "Мы учитываем только публичную цену в рублях и не используем внутренние закупочные значения.",
      optional: false,
      options: [
        { code: "under_15000", label: "До 15 000 ₽", description: "Самый доступный диапазон текущего каталога." },
        { code: "range_15000_30000", label: "15 000–30 000 ₽", description: "Практичный стартовый диапазон." },
        { code: "range_30000_50000", label: "30 000–50 000 ₽", description: "Больше вариантов по дизайну, материалам и механике." },
        { code: "range_50000_100000", label: "50 000–100 000 ₽", description: "Шире выбор механики и более сложных моделей." },
        { code: "over_100000", label: "Выше 100 000 ₽", description: "Верхний диапазон текущего каталога." },
        { code: "unknown", label: "Пока без рамки", description: "Сначала назначение и характер, затем цена." },
      ],
    },
  ],
};

const roleLabels: Record<SelectionRecommendationRole, string> = {
  main: "Главный выбор",
  rational_alternative: "Альтернативный баланс",
  expressive_variant: "Другой характер",
  alternative_direction: "Ещё одно направление",
};

const unavailableSelectionImageUrls = new Set([
  "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0002S/product_en_file/file/RA-AB0002S_main.webp",
  "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0003S/product_en_file/file/RA-AB0003S_main.webp",
]);

const thinCaseThresholdMm = 10.5;
const rubMinor = 100;

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scorePart(value: number): number {
  return Math.round(clampScore(value) * 100);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^\p{Letter}\p{Number}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function numberFromText(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.normalize("NFKC").replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]!);
  return Number.isFinite(parsed) ? parsed : null;
}

function allWatchText(watch: CatalogWatchDetail): string {
  return normalizeText(
    [
      watch.brandName,
      watch.title,
      watch.officialName,
      watch.watchModelName,
      watch.brandCollectionName,
      ...watch.specifications
        .filter((specification) => specification.key !== "dial_color_raw")
        .map((specification) => specification.value),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function caseThicknessMm(watch: CatalogWatchDetail): number | null {
  return numberFromText(
    findSpecificationValue(watch.specifications, [
      "case_thickness_raw",
      "case_depth_raw",
      "thickness_raw",
      "dimensions_thickness_raw",
    ]),
  );
}

function waterResistanceMeters(watch: CatalogWatchDetail): number | null {
  const raw = findSpecificationValue(watch.specifications, ["water_resistance_raw"]);
  if (!raw) return null;
  const text = raw.normalize("NFKC").toLocaleLowerCase("ru");
  const meterMatch = text.match(/(\d+)\s*(?:м(?![а-яё])|метр|m\b)/iu);
  if (meterMatch?.[1]) return Number(meterMatch[1]);
  const atmMatch = text.match(/(\d+)\s*(?:atm|bar|бар)/iu);
  if (atmMatch?.[1]) return Number(atmMatch[1]) * 10;
  return null;
}

function actualMovementKey(group: CatalogMechanismGroup | null): SelectionActualMovementKey {
  if (group === "automatic" || group === "hand_wound") return "mechanical";
  if (group === "analog_digital") return "analog-digital";
  return group ?? "unknown";
}

function strapKey(group: CatalogStrapMaterialGroup | null): SelectionStrapKey {
  if (group === "steel_bracelet") return "steel-bracelet";
  return group ?? "unknown";
}

function familyKey(watch: CatalogWatchDetail): string {
  return normalizeText(`${watch.brandSlug}:${watch.brandCollectionName ?? ""}:${watch.watchModelName}`);
}

export function buildSelectionImageCandidates(
  watch: CatalogWatchDetail,
): Array<Exclude<CatalogImagePresentation, { kind: "none" }>> {
  const seen = new Set<string>();
  const result: Array<Exclude<CatalogImagePresentation, { kind: "none" }>> = [];
  const candidates = [watch.primaryImage, ...watch.imageGallery];

  for (const [galleryIndex, image] of candidates.entries()) {
    if (image.kind === "none") continue;
    if (!isSelectionFrontImage(image, galleryIndex)) continue;
    if (image.kind === "remote" && unavailableSelectionImageUrls.has(image.url)) continue;
    if (seen.has(image.src)) continue;
    seen.add(image.src);
    result.push(image);
  }

  return result;
}

function criterion(input: {
  key: string;
  label: string;
  status: SelectionCriterionStatus;
  score: number;
  reason: string;
}): SelectionCriterionEvaluation {
  return {
    key: input.key,
    label: input.label,
    status: input.status,
    score: clampScore(input.score),
    reason: input.reason,
  };
}

function priceMinor(watch: CatalogWatchDetail): number | null {
  return watch.publicPrice?.amountMinor ?? null;
}

type BudgetRange = {
  minMinor: number | null;
  maxMinor: number | null;
};

function budgetRange(budget: SelectionBudgetCode): BudgetRange {
  switch (budget) {
    case "under_15000":
      return { minMinor: null, maxMinor: 15_000 * rubMinor };
    case "range_15000_30000":
      return { minMinor: 15_000 * rubMinor, maxMinor: 30_000 * rubMinor };
    case "range_30000_50000":
      return { minMinor: 30_000 * rubMinor, maxMinor: 50_000 * rubMinor };
    case "range_50000_100000":
      return { minMinor: 50_000 * rubMinor, maxMinor: 100_000 * rubMinor };
    case "over_100000":
      return { minMinor: 100_000 * rubMinor, maxMinor: null };
    case "unknown":
      return { minMinor: null, maxMinor: null };
  }
}

function budgetRangeWidth(range: BudgetRange): number {
  if (range.minMinor !== null && range.maxMinor !== null) {
    return range.maxMinor - range.minMinor;
  }
  if (range.maxMinor !== null) return range.maxMinor;
  if (range.minMinor !== null) return range.minMinor;
  return 0;
}

function lowTolerance(range: BudgetRange): number {
  if (range.minMinor === null) return 0;
  const width = budgetRangeWidth(range);
  return Math.max(1_500 * rubMinor, Math.min(5_000 * rubMinor, width * 0.12, range.minMinor * 0.08));
}

function broadLowTolerance(range: BudgetRange): number {
  if (range.minMinor === null) return 0;
  const width = budgetRangeWidth(range);
  return Math.max(3_500 * rubMinor, Math.min(18_000 * rubMinor, width * 0.35, range.minMinor * 0.22));
}

function highTolerance(range: BudgetRange): number {
  if (range.maxMinor === null) return 0;
  const width = budgetRangeWidth(range);
  return Math.max(1_500 * rubMinor, Math.min(6_000 * rubMinor, width * 0.1, range.maxMinor * 0.06));
}

function broadHighTolerance(range: BudgetRange): number {
  if (range.maxMinor === null) return 0;
  const width = budgetRangeWidth(range);
  return Math.max(3_000 * rubMinor, Math.min(16_000 * rubMinor, width * 0.22, range.maxMinor * 0.13));
}

export function evaluateBudgetFit(budget: SelectionBudgetCode, amountMinor: number | null): SelectionBudgetFit {
  if (budget === "unknown") {
    return {
      status: "unknown",
      criterionStatus: "neutral",
      score: 0.68,
      distance: 0,
      tier: "budget_neutral",
      reason: "Бюджет оставлен открытым",
    };
  }

  if (amountMinor === null || amountMinor <= 0) {
    return {
      status: "unknown",
      criterionStatus: "unknown",
      score: 0.3,
      distance: 1,
      tier: "unknown_price",
      reason: "Публичная цена пока не указана",
    };
  }

  const range = budgetRange(budget);
  if (range.maxMinor !== null && amountMinor > range.maxMinor) {
    const overBy = amountMinor - range.maxMinor;
    const distance = overBy / Math.max(range.maxMinor, 1);
    const near = highTolerance(range);
    const broad = broadHighTolerance(range);

    if (overBy <= near) {
      return {
        status: "acceptable_high",
        criterionStatus: "conflict",
        score: 0.54,
        distance,
        tier: "slightly_above",
        reason: "Цена немного выше выбранного ценового диапазона",
      };
    }

    return {
      status: "too_expensive",
      criterionStatus: "conflict",
      score: overBy <= broad ? 0.22 : 0.04,
      distance,
      tier: "broader_above",
      reason: overBy <= broad
        ? "Цена заметно выше выбранного ценового диапазона"
        : "Цена сильно выше выбранного ценового диапазона",
    };
  }

  if (range.minMinor !== null && amountMinor < range.minMinor) {
    const underBy = range.minMinor - amountMinor;
    const distance = underBy / Math.max(range.minMinor, 1);
    const near = lowTolerance(range);
    const broad = broadLowTolerance(range);

    if (underBy <= near) {
      return {
        status: "acceptable_low",
        criterionStatus: "neutral",
        score: 0.78,
        distance,
        tier: "slightly_below",
        reason: "Цена чуть ниже выбранного ценового диапазона",
      };
    }

    return {
      status: "too_cheap",
      criterionStatus: "conflict",
      score: underBy <= broad ? 0.36 : 0.08,
      distance,
      tier: "broader_below",
      reason: underBy <= broad
        ? "Цена заметно ниже выбранного ценового класса"
        : "Цена сильно ниже выбранного ценового класса",
    };
  }

  return {
    status: "ideal",
    criterionStatus: "match",
    score: 1,
    distance: 0,
    tier: "exact_budget_band",
    reason: "Цена находится в выбранном ценовом диапазоне",
  };
}

export function selectionBudgetContainsPrice(budget: SelectionBudgetCode, amountMinor: number): boolean {
  const fit = evaluateBudgetFit(budget, amountMinor);
  return fit.tier === "budget_neutral" || fit.tier === "exact_budget_band" || fit.tier === "slightly_below";
}

function budgetEvaluation(watch: CatalogWatchDetail, budget: SelectionBudgetCode): SelectionCriterionEvaluation {
  const fit = evaluateBudgetFit(budget, priceMinor(watch));
  return criterion({
    key: "budget",
    label: "Бюджет",
    status: fit.criterionStatus,
    score: fit.score,
    reason: fit.reason,
  });
}

type WatchTraits = {
  text: string;
  movement: SelectionActualMovementKey;
  dialColor: SelectionDialColorBucket;
  caseSizeMm: number | null;
  caseSize: SelectionFitCode | null;
  thicknessMm: number | null;
  strap: SelectionStrapKey;
  waterMeters: number | null;
  hasHighWaterResistance: boolean | null;
  hasSapphire: boolean | null;
  hasChronograph: boolean | null;
  hasDate: boolean | null;
  hasAdditionalFunctions: boolean | null;
  classic: boolean;
  modern: boolean;
  sporty: boolean;
  expressive: boolean;
};

export function selectionDialColorBucketFromRaw(rawValue: string | null | undefined): SelectionDialColorBucket {
  if (!rawValue) return "unknown";

  const text = normalizeText(rawValue);
  if (!text) return "unknown";

  const has = (patterns: readonly RegExp[]) => patterns.some((pattern) => pattern.test(text));

  if (has([/син/u, /\bblue\b/u, /\bnavy\b/u, /голуб/u, /turquoise/u, /\baqua\b/u])) return "blue";
  if (has([/зел/u, /\bgreen\b/u, /\bolive\b/u, /\bmint\b/u])) return "green";
  if (has([/черн/u, /\bblack\b/u, /графит/u, /\bcharcoal\b/u, /антрацит/u, /\banthracite\b/u])) return "dark";
  if (
    has([
      /темн/u,
      /\bdark\b/u,
      /сер(?:ы|о|еб)/u,
      /\bsilver\b/u,
      /\bgrey\b/u,
      /\bgray\b/u,
      /бел/u,
      /\bwhite\b/u,
      /крем/u,
      /\bcream\b/u,
      /\bivory\b/u,
      /беж/u,
      /\bbeige\b/u,
      /шамп/u,
      /\bchampagne\b/u,
      /перламутр/u,
      /\bmother\b/u,
      /\bpearl\b/u,
    ])
  ) {
    if (has([/темн/u, /\bdark\b/u, /темно корич/u, /\bdark brown\b/u])) return "dark";
    return "light";
  }

  if (has([/роз/u, /\bpink\b/u, /\bmauve\b/u, /крас/u, /\bred\b/u, /бордо/u, /\bburgundy\b/u, /фиолет/u, /\bpurple\b/u, /оранж/u, /\borange\b/u, /желт/u, /\byellow\b/u, /золот/u, /\bgold\b/u, /корич/u, /\bbrown\b/u, /мульти/u, /\bmulticolou?r\b/u])) {
    return "other";
  }

  return "unknown";
}

function booleanFromFeatureText(text: string, raw: string | null, positiveWords: readonly string[]): boolean | null {
  if (includesAny(text, positiveWords)) return true;
  if (raw) return false;
  return null;
}

function traitsFor(watch: CatalogWatchDetail): WatchTraits {
  const facets = classifyCatalogFacets(watch);
  const text = allWatchText(watch);
  const movement = actualMovementKey(facets.movement);
  const dialColor = selectionDialColorBucketFromRaw(findSpecificationValue(watch.specifications, ["dial_color_raw"]));
  const caseSizeMm = normalizeCaseSizeMm(watch);
  const thicknessMm = caseThicknessMm(watch);
  const strap = strapKey(facets.strapMaterial);
  const waterMeters = waterResistanceMeters(watch);
  const rawFunctions = findSpecificationValue(watch.specifications, ["functions_raw", "features_raw", "calendar_raw"]);
  const functionText = normalizeText(rawFunctions ?? "");
  const combinedFunctionText = `${functionText} ${text}`;
  const hasChronograph = booleanFromFeatureText(combinedFunctionText, rawFunctions, [
    "chronograph",
    "chrono",
    "хронограф",
    "секундомер",
    "stopwatch",
  ]);
  const hasDate = booleanFromFeatureText(combinedFunctionText, rawFunctions, [
    "date",
    "day date",
    "calendar",
    "календар",
    "дата",
    "число",
  ]);
  const hasAdditionalFunctions = booleanFromFeatureText(combinedFunctionText, rawFunctions, [
    "gmt",
    "world time",
    "dual time",
    "alarm",
    "timer",
    "bluetooth",
    "radio",
    "radiocontrolled",
    "радиосинх",
    "будильник",
    "таймер",
    "мировое время",
    "второй часовой пояс",
    "moonphase",
    "moon phase",
    "power reserve",
    "запас хода",
    "многофункц",
  ]);

  const classic = includesAny(text, [
    "classic",
    "dress",
    "классичес",
    "делов",
    "офис",
    "roman",
    "римск",
  ]) || (strap === "leather" && movement !== "digital" && movement !== "analog-digital");
  const sporty = includesAny(text, [
    "sport",
    "sports",
    "diver",
    "дайвер",
    "g shock",
    "edifice",
    "outdoor",
    "tool",
    "спортив",
  ]) || movement === "digital" || movement === "analog-digital" || strap === "rubber" || strap === "polymer" || hasChronograph === true || (waterMeters ?? 0) >= 100;
  const expressive = includesAny(text, [
    "skeleton",
    "open heart",
    "open-heart",
    "скелетон",
    "открытый баланс",
    "открытое сердце",
    "moonphase",
    "moon phase",
    "бриллиант",
    "diamond",
    "перламутр",
    "авангард",
  ]);
  const modern = includesAny(text, [
    "contemporary",
    "modern",
    "современ",
    "интегрирован",
    "integrated",
    "clean",
    "urban",
  ]) || (strap === "steel-bracelet" && !classic && !expressive);

  return {
    text,
    movement,
    dialColor,
    caseSizeMm,
    caseSize: facets.caseSize,
    thicknessMm,
    strap,
    waterMeters,
    hasHighWaterResistance: waterMeters === null ? null : waterMeters >= 100,
    hasSapphire: facets.crystal === null ? null : facets.crystal === "sapphire",
    hasChronograph,
    hasDate,
    hasAdditionalFunctions,
    classic,
    modern,
    sporty,
    expressive,
  };
}

function scenarioEvaluation(
  watch: CatalogWatchDetail,
  scenario: SelectionScenarioCode,
  traits: WatchTraits = traitsFor(watch),
): SelectionCriterionEvaluation {
  const positives: string[] = [];
  const penalties: string[] = [];

  const add = (condition: boolean | null | undefined, reason: string) => {
    if (condition === true) positives.push(reason);
  };
  const penalize = (condition: boolean | null | undefined, reason: string) => {
    if (condition === true) penalties.push(reason);
  };

  switch (scenario) {
    case "daily":
      add(traits.caseSize === "medium" || traits.caseSize === "compact", "размер подходит для регулярной носки");
      add(traits.hasHighWaterResistance === true || (traits.waterMeters ?? 0) >= 50, "есть практичная водозащита");
      add(["steel-bracelet", "leather", "rubber", "polymer"].includes(traits.strap), "крепление подходит для повседневной носки");
      add(traits.movement === "quartz" || traits.movement === "solar" || traits.movement === "mechanical", "механизм понятен для повседневного использования");
      penalize(traits.caseSize === "large" && (traits.caseSizeMm ?? 0) >= 45, "крупный корпус может быть менее универсальным");
      break;
    case "work":
      add(traits.classic || traits.modern, "характер подходит для работы");
      add(traits.caseSize === "compact" || traits.caseSize === "medium", "размер выглядит сдержанно");
      add(traits.thicknessMm !== null && traits.thicknessMm <= thinCaseThresholdMm, "корпус с аккуратной толщиной");
      add(traits.hasSapphire === true, "подтверждено сапфировое стекло");
      add(traits.strap === "leather" || traits.strap === "steel-bracelet", "ремешок или браслет подходит к деловому образу");
      penalize(traits.movement === "digital" || traits.sporty, "модель выглядит более спортивной");
      break;
    case "occasion":
      add(traits.classic || traits.expressive, "есть нарядный или выразительный характер");
      add(traits.thicknessMm !== null && traits.thicknessMm <= thinCaseThresholdMm, "корпус выглядит аккуратно по толщине");
      add(traits.movement === "mechanical", "механический механизм уместен для особого случая");
      add(traits.strap === "leather" || traits.strap === "steel-bracelet", "крепление подходит к более собранному образу");
      penalize(traits.movement === "digital", "цифровая подача менее уместна для нарядного сценария");
      break;
    case "sport":
      add(traits.hasHighWaterResistance === true, "подтверждена водозащита от 100 м");
      add(traits.strap === "rubber" || traits.strap === "polymer" || traits.strap === "steel-bracelet", "крепление подходит для активной носки");
      add(traits.hasChronograph === true || traits.hasAdditionalFunctions === true, "есть полезные спортивные функции");
      add(traits.sporty, "характер модели ближе к спортивному");
      add(traits.movement === "quartz" || traits.movement === "solar" || traits.movement === "digital" || traits.movement === "analog-digital", "механизм практичен для активного режима");
      break;
    case "travel":
      add(traits.hasHighWaterResistance === true, "водозащита полезна в поездках");
      add(traits.movement === "solar" || traits.movement === "quartz" || traits.movement === "analog-digital", "механизм практичен в дороге");
      add(traits.hasAdditionalFunctions === true, "есть полезные функции для поездок");
      add(traits.hasDate === true, "есть дата");
      add(["steel-bracelet", "rubber", "polymer", "textile"].includes(traits.strap), "крепление удобно для активного дня");
      break;
    case "first-mechanical":
      add(traits.movement === "mechanical", "механический механизм подтверждён");
      add((priceMinor(watch) ?? Number.POSITIVE_INFINITY) <= 100_000 * rubMinor, "цена выглядит разумной для первой механики");
      add(traits.caseSize === "compact" || traits.caseSize === "medium", "размер подходит для знакомства с механикой");
      add(traits.classic || traits.modern, "дизайн понятен для первой механической модели");
      penalize((priceMinor(watch) ?? 0) > 150_000 * rubMinor, "модель заметно дороже типичного первого выбора");
      break;
    case "universal":
      add(traits.caseSize === "medium", "средний размер проще сочетать с разными ситуациями");
      add(traits.hasHighWaterResistance === true || (traits.waterMeters ?? 0) >= 50, "водозащита добавляет универсальности");
      add(traits.strap === "steel-bracelet" || traits.strap === "leather", "крепление универсально по стилю");
      add(traits.modern || traits.classic, "характер не слишком узко специализирован");
      penalize(traits.expressive && traits.sporty, "модель сильнее уходит в специальный характер");
      break;
  }

  if (positives.length === 0 && penalties.length === 0) {
    return criterion({
      key: "scenario",
      label: "Сценарий",
      status: "unknown",
      score: 0.35,
      reason: "По этому сценарию не хватает подтверждённых признаков",
    });
  }

  const score = clampScore(0.35 + positives.length * 0.18 - penalties.length * 0.12);
  const status: SelectionCriterionStatus = positives.length >= 2 ? "match" : penalties.length > positives.length ? "conflict" : "neutral";
  return criterion({
    key: "scenario",
    label: "Сценарий",
    status,
    score,
    reason: positives[0] ?? penalties[0] ?? "Сценарий учтён как мягкое предпочтение",
  });
}

function fitEvaluation(
  watch: CatalogWatchDetail,
  fit: SelectionFitCode,
  traits: WatchTraits = traitsFor(watch),
): SelectionCriterionEvaluation {
  if (fit === "unknown") {
    return criterion({
      key: "fit",
      label: "Посадка",
      status: "neutral",
      score: 0.66,
      reason: "Размер оставлен открытым",
    });
  }

  if (!traits.caseSize) {
    return criterion({
      key: "fit",
      label: "Посадка",
      status: "unknown",
      score: 0.32,
      reason: "Размер корпуса пока не указан",
    });
  }

  if (traits.caseSize === fit) {
    return criterion({
      key: "fit",
      label: "Посадка",
      status: "match",
      score: 1,
      reason: fit === "compact" ? "Подтверждён компактный корпус" : fit === "medium" ? "Подтверждён средний размер корпуса" : "Подтверждён крупный корпус",
    });
  }

  const adjacent =
    (fit === "compact" && traits.caseSize === "medium") ||
    (fit === "medium" && traits.caseSize !== null) ||
    (fit === "large" && traits.caseSize === "medium");

  return criterion({
    key: "fit",
    label: "Посадка",
    status: adjacent ? "neutral" : "conflict",
    score: adjacent ? 0.58 : 0.16,
    reason: adjacent ? "Размер близок к выбранной посадке" : "Размер заметно отличается от выбранной посадки",
  });
}

function characterEvaluation(
  watch: CatalogWatchDetail,
  character: SelectionCharacterCode,
  traits: WatchTraits = traitsFor(watch),
): SelectionCriterionEvaluation {
  if (character === "neutral") {
    return criterion({
      key: "character",
      label: "Характер",
      status: "neutral",
      score: 0.66,
      reason: "Стиль оставлен открытым",
    });
  }

  const matches = {
    classic: traits.classic,
    modern: traits.modern,
    sporty: traits.sporty,
    expressive: traits.expressive,
  } satisfies Record<Exclude<SelectionCharacterCode, "neutral">, boolean>;

  if (matches[character]) {
    return criterion({
      key: "character",
      label: "Характер",
      status: "match",
      score: 1,
      reason: character === "classic"
        ? "Характер модели ближе к классическому"
        : character === "modern"
          ? "Модель выглядит современно и универсально"
          : character === "sporty"
            ? "Характер модели ближе к спортивному"
            : "У модели есть выразительные детали",
    });
  }

  const anyKnownStyle = traits.classic || traits.modern || traits.sporty || traits.expressive;
  return criterion({
    key: "character",
    label: "Характер",
    status: anyKnownStyle ? "conflict" : "unknown",
    score: anyKnownStyle ? 0.28 : 0.35,
    reason: anyKnownStyle ? "Характер модели ближе к другому направлению" : "По стилю пока недостаточно подтверждённых данных",
  });
}

function movementEvaluation(
  watch: CatalogWatchDetail,
  preference: SelectionMovementPreference,
  traits: WatchTraits = traitsFor(watch),
): SelectionCriterionEvaluation {
  if (preference === "neutral") {
    return criterion({
      key: "movement",
      label: "Механизм",
      status: "neutral",
      score: 0.66,
      reason: "Механизм оставлен открытым",
    });
  }

  const actual = traits.movement;
  if (actual === "unknown" || actual === "other") {
    return criterion({
      key: "movement",
      label: "Механизм",
      status: "unknown",
      score: 0.28,
      reason: "Тип механизма пока не указан",
    });
  }

  const match =
    (preference === "mechanical" && actual === "mechanical") ||
    (preference === "quartz" && (actual === "quartz" || actual === "digital" || actual === "analog-digital")) ||
    (preference === "solar" && actual === "solar");

  const softMatch = preference === "quartz" && actual === "solar";

  return criterion({
    key: "movement",
    label: "Механизм",
    status: match ? "match" : softMatch ? "neutral" : "conflict",
    score: match ? 1 : softMatch ? 0.62 : 0.06,
    reason: match
      ? "Тип механизма соответствует предпочтению"
      : softMatch
        ? "Solar остаётся практичной кварцевой архитектурой"
      : "Тип механизма отличается от выбранного",
  });
}

function dialColorEvaluation(
  preference: SelectionDialColorPreference,
  traits: WatchTraits,
): SelectionCriterionEvaluation {
  if (preference === "neutral") {
    return criterion({
      key: "dialColor",
      label: "Циферблат",
      status: "neutral",
      score: 0.66,
      reason: "Цвет циферблата оставлен открытым",
    });
  }

  if (traits.dialColor === "unknown") {
    return criterion({
      key: "dialColor",
      label: "Циферблат",
      status: "unknown",
      score: 0.4,
      reason: "Цвет циферблата пока не указан в MASTER-характеристиках",
    });
  }

  const labels: Record<Exclude<SelectionDialColorPreference, "neutral">, string> = {
    light: "светлый циферблат",
    dark: "тёмный циферблат",
    blue: "синий циферблат",
    green: "зелёный циферблат",
    other: "другой цвет циферблата",
  };

  return criterion({
    key: "dialColor",
    label: "Циферблат",
    status: traits.dialColor === preference ? "match" : "conflict",
    score: traits.dialColor === preference ? 1 : 0.3,
    reason: traits.dialColor === preference
      ? `Подтверждён ${labels[preference]}`
      : "Цвет циферблата отличается от выбранного предпочтения",
  });
}

function featureEvaluation(
  watch: CatalogWatchDetail,
  feature: SelectionFeatureCode,
  traits: WatchTraits = traitsFor(watch),
): SelectionCriterionEvaluation {
  const featureLabels: Record<SelectionFeatureCode, string> = {
    sapphire: "Стекло",
    "water-resistance": "Водозащита",
    "steel-bracelet": "Браслет",
    leather: "Ремешок",
    thin: "Толщина",
    chronograph: "Хронограф",
    date: "Дата",
    functions: "Функции",
    none: "Особые пожелания",
  };

  if (feature === "none") {
    return criterion({
      key: "feature:none",
      label: featureLabels.none,
      status: "neutral",
      score: 0.68,
      reason: "Особые характеристики оставлены открытыми",
    });
  }

  const known = (value: boolean | null, positive: string, negative: string, unknown: string) => {
    if (value === true) {
      return criterion({ key: `feature:${feature}`, label: featureLabels[feature], status: "match", score: 1, reason: positive });
    }
    if (value === false) {
      return criterion({ key: `feature:${feature}`, label: featureLabels[feature], status: "conflict", score: 0.22, reason: negative });
    }
    return criterion({ key: `feature:${feature}`, label: featureLabels[feature], status: "unknown", score: 0.32, reason: unknown });
  };

  switch (feature) {
    case "sapphire":
      return known(traits.hasSapphire, "Подтверждено сапфировое стекло", "Стекло указано как не сапфировое", "Тип стекла пока не указан");
    case "water-resistance":
      return known(traits.hasHighWaterResistance, "Подтверждена водозащита от 100 м", "Водозащита ниже 100 м", "Водозащита пока не указана");
    case "steel-bracelet":
      return known(
        traits.strap === "unknown" ? null : traits.strap === "steel-bracelet",
        "Подтверждён металлический браслет",
        "Указан другой тип ремешка или браслета",
        "Материал ремешка или браслета пока не указан",
      );
    case "leather":
      return known(
        traits.strap === "unknown" ? null : traits.strap === "leather",
        "Подтверждён кожаный ремешок",
        "Указан другой тип ремешка или браслета",
        "Материал ремешка или браслета пока не указан",
      );
    case "thin":
      return known(
        traits.thicknessMm === null ? null : traits.thicknessMm <= thinCaseThresholdMm,
        "Подтверждён аккуратный профиль корпуса",
        "Толщина корпуса выше выбранного ориентира",
        "Толщина корпуса пока не указана",
      );
    case "chronograph":
      return known(traits.hasChronograph, "Подтверждён хронограф", "Хронограф не указан среди функций", "Функции пока не указаны");
    case "date":
      return known(traits.hasDate, "Подтверждена функция даты", "Дата не указана среди функций", "Функции пока не указаны");
    case "functions":
      return known(traits.hasAdditionalFunctions, "Подтверждены дополнительные функции", "Дополнительные функции не указаны", "Функции пока не указаны");
  }
}

function featureEvaluations(
  watch: CatalogWatchDetail,
  features: readonly SelectionFeatureCode[],
  traits: WatchTraits = traitsFor(watch),
): SelectionCriterionEvaluation[] {
  const activeFeatures = features.length > 0 ? features : (["none"] as const);
  return activeFeatures.map((feature) => featureEvaluation(watch, feature, traits));
}

function dataConfidenceEvaluation(
  watch: CatalogWatchDetail,
  traits: WatchTraits = traitsFor(watch),
): SelectionCriterionEvaluation {
  const important = [
    traits.movement !== "unknown",
    traits.caseSize !== null,
    traits.waterMeters !== null,
    traits.strap !== "unknown",
    traits.dialColor !== "unknown",
    traits.hasSapphire !== null,
    watch.publicPrice !== null,
  ];
  const present = important.filter(Boolean).length;
  const score = 0.28 + present * 0.1 + (watch.primaryImage.kind === "none" ? 0 : 0.04);
  return criterion({
    key: "data",
    label: "Данные",
    status: present >= 4 ? "match" : "unknown",
    score,
    reason: present >= 4 ? "Основные характеристики указаны" : "Часть характеристик пока не указана",
  });
}

function scoringEligibility(watch: CatalogWatchDetail): {
  eligible: boolean;
  missingIdentity: boolean;
  missingCanonicalHref: boolean;
  missingSpecifications: boolean;
} {
  const missingIdentity = !watch.id || !watch.brandName || !watch.title || !watch.referenceDisplay;
  const missingCanonicalHref = !watch.href || !watch.href.startsWith("/watches/");
  const missingSpecifications = watch.specifications.length === 0;
  return {
    eligible: !missingIdentity && !missingCanonicalHref,
    missingIdentity,
    missingCanonicalHref,
    missingSpecifications,
  };
}

export function buildSelectionCatalogDiagnostics(dataset: CatalogReadDataset): SelectionCatalogDiagnostics {
  const seen = new Set<string>();
  let duplicateIdentity = 0;
  let missingIdentity = 0;
  let missingCanonicalHref = 0;
  let missingSpecifications = 0;
  let scorableRecords = 0;

  const byBrandMap = new Map<string, number>();
  for (const watch of dataset.watches) {
    byBrandMap.set(watch.brandName, (byBrandMap.get(watch.brandName) ?? 0) + 1);
    const eligibility = scoringEligibility(watch);
    if (seen.has(watch.id)) duplicateIdentity += 1;
    seen.add(watch.id);
    if (eligibility.missingIdentity) missingIdentity += 1;
    if (eligibility.missingCanonicalHref) missingCanonicalHref += 1;
    if (eligibility.missingSpecifications) missingSpecifications += 1;
    if (eligibility.eligible) scorableRecords += 1;
  }

  return {
    totalRecords: dataset.watches.length,
    withCanonicalHref: dataset.watches.filter((watch) => watch.href.startsWith("/watches/")).length,
    withPrice: dataset.watches.filter((watch) => watch.publicPrice !== null).length,
    withCleanPrimaryImage: dataset.watches.filter((watch) => watch.primaryImage.kind !== "none").length,
    byBrand: [...byBrandMap.entries()]
      .map(([brandName, count]) => ({ brandName, count }))
      .sort((left, right) => right.count - left.count || left.brandName.localeCompare(right.brandName, "ru")),
    scorableRecords,
    exclusions: {
      missingIdentity,
      missingCanonicalHref,
      missingSpecifications,
      duplicateIdentity,
    },
  };
}

function scoreWatch(watch: CatalogWatchDetail, answers: SelectionAnswers): SelectionRecommendation | null {
  if (!scoringEligibility(watch).eligible) {
    return null;
  }

  const traits = traitsFor(watch);
  const scenario = scenarioEvaluation(watch, answers.scenario, traits);
  const fit = fitEvaluation(watch, answers.fit, traits);
  const character = characterEvaluation(watch, answers.character, traits);
  const movement = movementEvaluation(watch, answers.movement, traits);
  const dialColor = dialColorEvaluation(answers.dialColor, traits);
  const features = featureEvaluations(watch, answers.features, traits);
  const budget = budgetEvaluation(watch, answers.budget);
  const data = dataConfidenceEvaluation(watch, traits);
  const featureAverage = features.reduce((total, item) => total + item.score, 0) / Math.max(features.length, 1);

  const criteria = [scenario, fit, character, movement, dialColor, ...features, budget, data];
  const breakdown: SelectionScoreBreakdown = {
    scenarioFit: scorePart(scenario.score),
    fitFit: scorePart(fit.score),
    characterFit: scorePart(character.score),
    movementFit: scorePart(movement.score),
    dialColorFit: scorePart(dialColor.score),
    featureFit: scorePart(featureAverage),
    budgetFit: scorePart(budget.score),
    dataConfidence: scorePart(data.score),
  };

  const total =
    breakdown.scenarioFit * selectionScoringWeights.scenario +
    breakdown.fitFit * selectionScoringWeights.fit +
    breakdown.characterFit * selectionScoringWeights.character +
    breakdown.movementFit * selectionScoringWeights.movement +
    breakdown.dialColorFit * selectionScoringWeights.dialColor +
    breakdown.featureFit * selectionScoringWeights.features +
    breakdown.budgetFit * selectionScoringWeights.budget +
    breakdown.dataConfidence * selectionScoringWeights.dataConfidence;

  const conflicts = criteria.filter((item) => item.status === "conflict");
  const matches = criteria.filter((item) => item.status === "match");
  const unknowns = criteria.filter((item) => item.status === "unknown" && item.key !== "data");
  const hardKeys = hardCriterionKeys(answers);
  const hardUnknowns = unknowns.filter((item) => hardKeys.some((key) => item.key === key || item.key.startsWith(`${key}:`)));
  const isPreliminary = hardUnknowns.length > 0;
  const score = Math.round(total);
  if (score < 25 || conflicts.length >= 5) {
    return null;
  }

  const matchLabel = isPreliminary
    ? "Предварительный вариант"
    : score >= 78 && conflicts.length === 0 && matches.length >= 4
      ? "Сильное совпадение"
      : conflicts.length === 0
        ? "Хорошее совпадение"
        : "Компромиссный вариант";
  return {
    watch: toCatalogWatchCard(watch),
    imageCandidates: buildSelectionImageCandidates(watch),
    score,
    matchLabel,
    role: "alternative_direction",
    roleLabel: roleLabels.alternative_direction,
    roleDescription: "Подходит по ключевым ответам и дополняет короткий список.",
    confidenceLabel:
      isPreliminary
        ? "Некоторые характеристики требуют уточнения"
        : conflicts.length > 0
          ? "Есть компромисс"
          : unknowns.length > 0
            ? "Не все характеристики указаны"
            : "Характеристики подтверждены",
    isPreliminary,
    familyKey: familyKey(watch),
    movementKey: traits.movement,
    dialColorBucket: traits.dialColor,
    caseSizeMm: traits.caseSizeMm,
    strapKey: traits.strap,
    breakdown,
    criteria,
    reasons: matches.filter((item) => item.key !== "data").slice(0, 4).map((item) => item.reason),
    compromises:
      conflicts.length > 0
        ? conflicts.slice(0, 2).map((item) => item.reason)
        : unknowns.slice(0, 1).map((item) => item.reason),
  };
}

function hardCriterionKeys(answers: SelectionAnswers): string[] {
  const hasRealFeatures = answers.features.some((feature) => feature !== "none");
  return [
    answers.budget === "unknown" ? null : "budget",
    answers.movement === "neutral" ? null : "movement",
    hasRealFeatures ? "feature" : null,
    answers.fit === "unknown" ? null : "fit",
  ].filter((key): key is string => key !== null);
}

function requiredConfirmationRank(
  recommendation: SelectionRecommendation,
  answers: SelectionAnswers,
): number {
  const requiredKeys = hardCriterionKeys(answers);

  return requiredKeys.reduce((total, key) => {
    const statuses = recommendation.criteria
      .filter((criterionItem) => criterionItem.key === key || criterionItem.key.startsWith(`${key}:`))
      .map((criterionItem) => criterionItem.status);
    if (statuses.includes("match")) return total + 3;
    if (statuses.includes("neutral")) return total + 1;
    if (statuses.includes("conflict")) return total - 3;
    if (statuses.includes("unknown")) return total - 1;
    return total;
  }, 0);
}

function knownConflictCount(recommendation: SelectionRecommendation): number {
  return recommendation.criteria.filter((criterionItem) => criterionItem.status === "conflict").length;
}

function criterionStatus(recommendation: SelectionRecommendation, key: string): SelectionCriterionStatus | null {
  return recommendation.criteria.find((criterionItem) => criterionItem.key === key)?.status ?? null;
}

function recommendationBudgetTier(
  recommendation: SelectionRecommendation,
  budget: SelectionBudgetCode,
): SelectionBudgetFallbackTier {
  return evaluateBudgetFit(budget, recommendation.watch.publicPrice?.amountMinor ?? null).tier;
}

function phaseRecommendationsByBudget(
  scored: SelectionRecommendation[],
  answers: SelectionAnswers,
): SelectionRecommendation[] {
  if (answers.budget === "unknown") return scored;

  const movementCompatible = scored.filter((recommendation) => criterionStatus(recommendation, "movement") !== "conflict");
  const movementPool = movementCompatible.length > 0 ? movementCompatible : scored;
  const orderedTiers: SelectionBudgetFallbackTier[] = [
    "exact_budget_band",
    "slightly_below",
    "slightly_above",
    "broader_below",
    "unknown_price",
    "broader_above",
  ];

  const phased: SelectionRecommendation[] = [];
  const used = new Set<string>();
  for (const tier of orderedTiers) {
    for (const recommendation of movementPool) {
      if (used.has(recommendation.watch.href)) continue;
      if (recommendationBudgetTier(recommendation, answers.budget) !== tier) continue;
      phased.push(recommendation);
      used.add(recommendation.watch.href);
    }
  }

  for (const recommendation of scored) {
    if (used.has(recommendation.watch.href)) continue;
    phased.push(recommendation);
    used.add(recommendation.watch.href);
  }

  return phased;
}

function roleForIndex(index: number): SelectionRecommendationRole {
  if (index === 0) return "main";
  if (index === 1) return "rational_alternative";
  if (index === 2) return "expressive_variant";
  return "alternative_direction";
}

function alternativeRole(
  recommendation: SelectionRecommendation,
  featured: SelectionRecommendation,
  index: number,
): { role: SelectionRecommendationRole; label: string; description: string } {
  const role = roleForIndex(index);
  const featuredPrice = featured.watch.publicPrice?.amountMinor ?? null;
  const price = recommendation.watch.publicPrice?.amountMinor ?? null;

  if (recommendation.isPreliminary) {
    return {
      role,
      label: "Предварительный вариант",
      description: "Некоторые характеристики требуют уточнения.",
    };
  }

  const meaningfulSaving =
    featuredPrice !== null &&
    price !== null &&
    featuredPrice - price >= Math.max(10_000 * rubMinor, featuredPrice * 0.05);
  if (meaningfulSaving) {
    return {
      role,
      label: "Более доступный вариант",
      description: "Сохраняет ключевые совпадения при более низкой цене.",
    };
  }

  if (recommendation.watch.brandSlug === featured.watch.brandSlug) {
    return {
      role,
      label: "Альтернатива той же марки",
      description: `Другая модель ${recommendation.watch.brandName} с близким соответствием вашим ответам.`,
    };
  }

  if (Math.abs(recommendation.score - featured.score) <= 8) {
    return {
      role,
      label: "Другой бренд",
      description: `Модель ${recommendation.watch.brandName} с похожим назначением и подтверждёнными характеристиками.`,
    };
  }

  if (
    recommendation.caseSizeMm !== null &&
    featured.caseSizeMm !== null &&
    Math.abs(recommendation.caseSizeMm - featured.caseSizeMm) >= 3
  ) {
    return {
      role,
      label: recommendation.caseSizeMm < featured.caseSizeMm
        ? "Более компактный вариант"
        : "Более крупный вариант",
      description: "Подтверждённый размер корпуса предлагает заметно другую посадку.",
    };
  }

  if (
    recommendation.strapKey !== "unknown" &&
    featured.strapKey !== "unknown" &&
    recommendation.strapKey !== featured.strapKey
  ) {
    return {
      role,
      label: "Другое крепление",
      description: "Подтверждённый материал ремешка или браслета даёт другой характер носки.",
    };
  }

  if (
    featuredPrice !== null &&
    price !== null &&
    Math.abs(featuredPrice - price) <= Math.max(10_000 * rubMinor, featuredPrice * 0.08)
  ) {
    return {
      role,
      label: "Вариант с близкой ценой",
      description: "Сопоставимая стоимость при другой расстановке предпочтений.",
    };
  }

  return {
    role,
    label: "Ещё один сильный вариант",
    description: "Ещё один способ расставить приоритеты без нарушения выбранных условий.",
  };
}

function fourthAddsMeaningfulVariation(
  recommendation: SelectionRecommendation,
  selected: SelectionRecommendation[],
): boolean {
  const featured = selected[0];
  if (!featured || recommendation.score < featured.score - 18) return false;

  return selected.every((item) => item.familyKey !== recommendation.familyKey) &&
    selected.every((item) => item.watch.brandSlug !== recommendation.watch.brandSlug);
}

function diversifyRecommendations(scored: SelectionRecommendation[], limit: number): SelectionRecommendation[] {
  const selected: SelectionRecommendation[] = [];
  const brandCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  const selectedHrefs = new Set<string>();
  const selectedReferences = new Set<string>();

  for (const recommendation of scored) {
    if (selectedHrefs.has(recommendation.watch.href)) continue;
    if (selectedReferences.has(recommendation.watch.referenceNormalized)) continue;
    if ((brandCounts.get(recommendation.watch.brandSlug) ?? 0) >= 2) continue;
    if ((familyCounts.get(recommendation.familyKey) ?? 0) >= 2) continue;

    selected.push(recommendation);
    selectedHrefs.add(recommendation.watch.href);
    selectedReferences.add(recommendation.watch.referenceNormalized);
    brandCounts.set(recommendation.watch.brandSlug, (brandCounts.get(recommendation.watch.brandSlug) ?? 0) + 1);
    familyCounts.set(recommendation.familyKey, (familyCounts.get(recommendation.familyKey) ?? 0) + 1);

    if (selected.length === limit) break;
  }

  for (const recommendation of scored) {
    if (selected.length === limit) break;
    if (selectedHrefs.has(recommendation.watch.href)) continue;
    if (selectedReferences.has(recommendation.watch.referenceNormalized)) continue;
    selected.push(recommendation);
    selectedHrefs.add(recommendation.watch.href);
    selectedReferences.add(recommendation.watch.referenceNormalized);
  }

  const meaningful = selected.filter((recommendation, index, current) =>
    index < 3 || fourthAddsMeaningfulVariation(recommendation, current.slice(0, index)),
  );
  const featured = meaningful[0];

  return meaningful.map((recommendation, index) => {
    const presentation = index === 0 || !featured
      ? { role: "main" as const, label: roleLabels.main, description: "Лучшее общее соответствие вашим ответам." }
      : alternativeRole(recommendation, featured, index);
    return {
      ...recommendation,
      role: presentation.role,
      roleLabel: presentation.label,
      roleDescription: presentation.description,
    };
  });
}

function scoreSort(input: { answers: SelectionAnswers }) {
  return (left: SelectionRecommendation, right: SelectionRecommendation) =>
    right.score - left.score ||
    right.criteria.filter((item) => item.status === "match").length -
      left.criteria.filter((item) => item.status === "match").length ||
    requiredConfirmationRank(right, input.answers) - requiredConfirmationRank(left, input.answers) ||
    knownConflictCount(left) - knownConflictCount(right) ||
    Number(right.watch.publicPrice !== null) - Number(left.watch.publicPrice !== null) ||
    Number(right.imageCandidates.length > 0) - Number(left.imageCandidates.length > 0) ||
    left.watch.brandName.localeCompare(right.watch.brandName, "ru") ||
    left.watch.title.localeCompare(right.watch.title, "ru") ||
    left.watch.referenceNormalized.localeCompare(right.watch.referenceNormalized);
}

export function buildSelectionRecommendations(input: {
  dataset: CatalogReadDataset;
  answers: SelectionAnswers;
  limit?: number;
}): SelectionRecommendation[] {
  const limit = input.limit ?? 4;
  const scored = input.dataset.watches
    .map((watch) => scoreWatch(watch, input.answers))
    .filter((recommendation): recommendation is SelectionRecommendation => recommendation !== null)
    .sort(scoreSort({ answers: input.answers }));

  const pool = phaseRecommendationsByBudget(scored, input.answers);

  return diversifyRecommendations(pool, limit);
}

export function nextSelectionStep(currentStep: SelectionStepCode): SelectionStepCode {
  const index = selectionStepOrder.indexOf(currentStep as Exclude<SelectionStepCode, "start" | "results">);
  if (index === -1) return "scenario";
  return selectionStepOrder[index + 1] ?? "results";
}

export function previousSelectionStep(currentStep: SelectionStepCode): SelectionStepCode {
  const index = selectionStepOrder.indexOf(currentStep as Exclude<SelectionStepCode, "start" | "results">);
  if (index <= 0) return "start";
  return selectionStepOrder[index - 1] ?? "start";
}

export function resolveSelectionStep(input: {
  requestedStep: SelectionStepCode;
  hasAnswers: boolean;
  searchParams: Record<string, string | string[] | undefined>;
  answeredKeys?: readonly SelectionAnswerKey[];
}): SelectionStepCode {
  if (!input.hasAnswers) {
    return input.requestedStep === "results" ? "start" : input.requestedStep;
  }

  if (input.requestedStep !== "start") return input.requestedStep;

  const answered = new Set(input.answeredKeys);
  for (const step of selectionFormDefinition.steps) {
    if (!answered.has(step.answerKey) && !input.searchParams[step.answerKey]) {
      return step.code;
    }
  }

  return "results";
}

export function selectionStepByCode(step: SelectionStepCode) {
  return selectionFormDefinition.steps.find((item) => item.code === step) ?? null;
}

export function selectionAnswerLabel(key: SelectionAnswerKey, value: SelectionAnswers[SelectionAnswerKey]): string {
  const step = selectionFormDefinition.steps.find((item) => item.answerKey === key);
  if (key === "features") {
    const values = Array.isArray(value) ? value : [String(value)];
    return values
      .map((feature) => step?.options.find((option) => option.code === feature)?.label ?? feature)
      .join(", ");
  }

  return step?.options.find((option) => option.code === value)?.label ?? String(value);
}
