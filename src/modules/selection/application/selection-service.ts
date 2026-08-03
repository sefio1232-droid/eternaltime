import { toCatalogWatchCard } from "@/modules/catalog/application/catalog-read-service";
import { isSelectionFrontImage } from "@/modules/selection/application/selection-image-policy";
import type {
  CatalogImagePresentation,
  CatalogPublicSpecification,
  CatalogReadDataset,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import type {
  SelectionAnswerKey,
  SelectionAnswers,
  SelectionAttachmentCode,
  SelectionBudgetCode,
  SelectionCatalogDiagnostics,
  SelectionCharacterCode,
  SelectionCriterionEvaluation,
  SelectionCriterionStatus,
  SelectionFitCode,
  SelectionFormDefinition,
  SelectionMovementPreference,
  SelectionPracticalCode,
  SelectionRecommendation,
  SelectionRecommendationRole,
  SelectionScenarioCode,
  SelectionScoreBreakdown,
  SelectionStepCode,
} from "@/modules/selection/domain/types";

export const selectionStepOrder = [
  "scenario",
  "character",
  "budget",
  "movement",
  "fit",
  "attachment",
  "practical",
] as const;

export const selectionFormDefinition: SelectionFormDefinition = {
  steps: [
    {
      code: "scenario",
      answerKey: "scenario",
      eyebrow: "Шаг 1 из 7",
      title: "Что важнее всего в будущих часах?",
      deck: "Выберите главный сценарий или цель. Остальные предпочтения уточним на следующих шагах.",
      optional: false,
      options: [
        { code: "everyday", label: "На каждый день", description: "Спокойный вариант для регулярной носки." },
        { code: "work", label: "Для работы", description: "Сдержанные часы для офиса, встреч и делового ритма." },
        { code: "special", label: "Для особого случая", description: "Более нарядная или классическая модель." },
        { code: "travel", label: "Для путешествий", description: "Практичность, надежность и полезные функции." },
        { code: "sport", label: "Для спорта и активности", description: "Повышенная прочность, водозащита и функциональность." },
        { code: "first_mechanical", label: "Первые механические часы", description: "Понятная модель для знакомства с механикой." },
        { code: "universal", label: "Универсальный вариант", description: "Сбалансированные часы для разных ситуаций." },
      ],
    },
    {
      code: "character",
      answerKey: "character",
      eyebrow: "Шаг 2 из 7",
      title: "Каким должен быть характер часов?",
      deck: "Характер помогает выбрать не только характеристики, но и общее впечатление от модели.",
      optional: false,
      options: [
        { code: "quiet", label: "Сдержанные", description: "Спокойный дизайн без лишних акцентов." },
        { code: "universal", label: "Универсальные", description: "Без выраженного уклона в один стиль." },
        { code: "expressive", label: "Выразительные", description: "Заметный дизайн или цветовой акцент." },
        { code: "sporty", label: "Спортивные", description: "Динамичная форма и более активный образ." },
        { code: "classic", label: "Классические", description: "Традиционные пропорции и спокойные материалы." },
        { code: "instrumental", label: "Инструментальные", description: "Функциональность, прочность и утилитарный характер." },
      ],
    },
    {
      code: "budget",
      answerKey: "budget",
      eyebrow: "Шаг 3 из 7",
      title: "На какой бюджет ориентироваться?",
      deck: "Цена будет ограничением только для моделей с известной стоимостью.",
      optional: false,
      options: [
        { code: "under_15000", label: "До 15 000 ₽", description: "Самый доступный диапазон." },
        { code: "range_15000_30000", label: "15 000-30 000 ₽", description: "Практичный стартовый диапазон." },
        { code: "range_30000_50000", label: "30 000-50 000 ₽", description: "Больше вариантов по дизайну и материалам." },
        { code: "range_50000_100000", label: "50 000-100 000 ₽", description: "Шире выбор механики и более сложных моделей." },
        { code: "over_100000", label: "Выше 100 000 ₽", description: "Верхний диапазон текущего каталога." },
        { code: "any", label: "Без строгой рамки", description: "Сначала назначение и характеристики, затем цена." },
      ],
    },
    {
      code: "movement",
      answerKey: "movement",
      eyebrow: "Шаг 4 из 7",
      title: "Есть предпочтение по механизму?",
      deck: "Выберите знакомый тип или оставьте больше вариантов для подбора.",
      optional: true,
      options: [
        { code: "any", label: "Без предпочтений", description: "Подбирать по назначению и остальным характеристикам." },
        { code: "quartz", label: "Кварцевые", description: "Точность и минимальный уход." },
        { code: "mechanical", label: "Механические", description: "Механика с автоподзаводом." },
        { code: "solar", label: "Solar", description: "Питание от света." },
        { code: "digital", label: "Цифровые", description: "Электронная индикация и практичные функции." },
        { code: "ana_digi", label: "Аналого-цифровые", description: "Стрелки и цифровой экран в одной модели." },
      ],
    },
    {
      code: "fit",
      answerKey: "fit",
      eyebrow: "Шаг 5 из 7",
      title: "Какой размер корпуса предпочитаете?",
      deck: "Размер учитывается ориентировочно. Неизвестный диаметр не исключает модель автоматически.",
      optional: true,
      options: [
        { code: "compact", label: "Компактный", description: "Обычно до 38 мм." },
        { code: "medium", label: "Средний", description: "Обычно от 38 до 42 мм." },
        { code: "large", label: "Крупный", description: "Обычно от 42 мм." },
        { code: "unknown", label: "Без предпочтений", description: "Не ограничивать подбор по размеру." },
      ],
    },
    {
      code: "attachment",
      answerKey: "attachment",
      eyebrow: "Шаг 6 из 7",
      title: "Что предпочитаете: ремень или браслет?",
      deck: "Крепление влияет на внешний вид, вес и сценарий использования.",
      optional: true,
      options: [
        { code: "bracelet", label: "Стальной браслет", description: "Практичный и собранный вариант." },
        { code: "leather", label: "Кожаный ремень", description: "Более классический и спокойный образ." },
        { code: "rubber", label: "Каучук или полимер", description: "Для воды, спорта и активного режима." },
        { code: "any", label: "Без предпочтений", description: "Не ограничивать подбор по креплению." },
      ],
    },
    {
      code: "practical",
      answerKey: "practical",
      eyebrow: "Шаг 7 из 7",
      title: "Есть обязательное практическое требование?",
      deck: "Выберите только то условие, без которого модель вам не подойдет.",
      optional: true,
      options: [
        { code: "none", label: "Без обязательных требований", description: "Оставить подбор шире." },
        { code: "high_water", label: "Высокая водозащита", description: "Приоритет от 100 м." },
        { code: "sapphire", label: "Сапфировое стекло", description: "Больше устойчивости к царапинам." },
        { code: "chronograph", label: "Хронограф", description: "Секундомер и спортивная логика." },
        { code: "date", label: "Дата", description: "Базовая повседневная функция." },
        { code: "gmt", label: "GMT / мировое время", description: "Для поездок и часовых поясов." },
        { code: "lume", label: "Подсветка", description: "Читаемость в темноте." },
        { code: "shock", label: "Повышенная прочность", description: "Для активного режима и частой носки." },
      ],
    },
  ],
};

const roleLabels: Record<SelectionRecommendationRole, string> = {
  main: "Главный выбор",
  rational_alternative: "Альтернативный баланс",
  expressive_variant: "Другой характер",
  alternative_direction: "Еще одно направление",
};

const unavailableSelectionImageUrls = new Set([
  "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0002S/product_en_file/file/RA-AB0002S_main.webp",
  "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0003S/product_en_file/file/RA-AB0003S_main.webp",
]);

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scorePart(value: number): number {
  return Math.round(clampScore(value) * 100);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{Letter}\p{Number}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function specValue(watch: CatalogWatchDetail, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = watch.specifications.find((specification) => specification.key === key)?.value.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function numberFromSpec(specification: CatalogPublicSpecification | undefined): number | null {
  if (!specification) {
    return null;
  }

  const match = specification.value.normalize("NFKC").replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
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
      ...watch.specifications.map((specification) => specification.value),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function caseDiameter(watch: CatalogWatchDetail): number | null {
  return numberFromSpec(
    watch.specifications.find((specification) =>
      ["case_diameter_raw", "case_dimensions_raw"].includes(specification.key),
    ),
  );
}

function waterResistanceMeters(watch: CatalogWatchDetail): number | null {
  return numberFromSpec(watch.specifications.find((specification) => specification.key === "water_resistance_raw"));
}

function movementKind(watch: CatalogWatchDetail): SelectionMovementPreference | "unknown" {
  const movement = normalizeText(specValue(watch, ["movement_type_raw", "movement_raw", "power_source_raw"]) ?? "");
  const text = allWatchText(watch);

  if (
    includesAny(text, [
      "ana digi",
      "analog digital",
      "аналого цифров",
      "аналогово цифров",
      "стрелочно цифров",
      "перевод стрелок",
      "hand shift",
    ])
  ) return "ana_digi";
  if (includesAny(`${movement} ${text}`, ["solar", "солнеч", "tough solar"])) return "solar";
  if (includesAny(text, ["digital", "цифров"]) && !includesAny(text, ["аналог"])) return "digital";
  if (includesAny(movement, ["автомат", "automatic"])) return "automatic";
  if (includesAny(movement, ["механ", "mechanical", "manual"])) return "mechanical";
  if (includesAny(movement, ["кварц", "quartz"])) return "quartz";
  return "unknown";
}

function attachmentKind(watch: CatalogWatchDetail): SelectionAttachmentCode | "unknown" {
  const attachment = normalizeText(
    specValue(watch, ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"]) ?? "",
  );
  const text = allWatchText(watch);

  if (includesAny(attachment, ["сталь", "steel", "браслет", "bracelet"])) return "bracelet";
  if (includesAny(attachment, ["кожа", "leather"])) return "leather";
  if (includesAny(`${attachment} ${text}`, ["rubber", "каучук", "resin", "резин", "polymer", "полимер"])) return "rubber";
  return "unknown";
}

function familyKey(watch: CatalogWatchDetail): string {
  return normalizeText(`${watch.brandSlug}:${watch.brandCollectionName ?? ""}:${watch.watchModelName}`);
}

export function buildSelectionImageCandidates(
  watch: CatalogWatchDetail,
): Array<Exclude<CatalogImagePresentation, { kind: "none" }>> {
  const seen = new Set<string>();
  const result: Array<Exclude<CatalogImagePresentation, { kind: "none" }>> = [];
  const candidates = [
    { image: watch.primaryImage, galleryIndex: 0 },
    ...watch.imageGallery.map((image, galleryIndex) => ({ image, galleryIndex })),
  ];

  for (const { image, galleryIndex } of candidates) {
    if (!isSelectionFrontImage(image, galleryIndex)) continue;
    if (image.kind === "remote" && unavailableSelectionImageUrls.has(image.url)) continue;

    const identity = image.kind === "remote" ? image.url : image.imageKey;
    if (seen.has(identity)) continue;
    seen.add(identity);
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
    ...input,
    score: clampScore(input.score),
  };
}

export function selectionBudgetContainsPrice(budget: SelectionBudgetCode, priceMinor: number): boolean {
  if (budget === "under_15000") return priceMinor <= 1500000;
  if (budget === "range_15000_30000") return priceMinor > 1500000 && priceMinor <= 3000000;
  if (budget === "range_30000_50000") return priceMinor > 3000000 && priceMinor <= 5000000;
  if (budget === "range_50000_100000") return priceMinor > 5000000 && priceMinor <= 10000000;
  if (budget === "over_100000") return priceMinor > 10000000;
  return true;
}

function budgetEvaluation(watch: CatalogWatchDetail, budget: SelectionBudgetCode): SelectionCriterionEvaluation {
  const price = watch.publicPrice?.amountMinor ?? null;
  if (budget === "any") {
    return criterion({
      key: "budget",
      label: "Бюджет",
      status: "neutral",
      score: price === null ? 0.62 : 0.9,
      reason: "Бюджет оставлен без строгой рамки",
    });
  }

  if (price === null) {
    return criterion({
      key: "budget",
      label: "Бюджет",
      status: "unknown",
      score: 0.58,
      reason: "Цена пока не указана",
    });
  }

  const matchesBudget = selectionBudgetContainsPrice(budget, price);

  return criterion({
    key: "budget",
    label: "Бюджет",
    status: matchesBudget ? "match" : "conflict",
    score: matchesBudget ? 1 : 0,
    reason: matchesBudget ? "Цена входит в выбранный диапазон" : "Цена находится вне выбранного диапазона",
  });
}

function scenarioEvaluation(watch: CatalogWatchDetail, scenario: SelectionScenarioCode): SelectionCriterionEvaluation {
  const text = allWatchText(watch);
  const movement = movementKind(watch);
  const attachment = attachmentKind(watch);
  const diameter = caseDiameter(watch);
  const water = waterResistanceMeters(watch);
  const hasWater = water !== null && water >= 100;
  const hasFunctions = includesAny(text, ["gmt", "world time", "миров", "chrono", "хронограф", "timer", "таймер", "alarm", "будильник"]);
  const classic = includesAny(text, ["classic", "класс", "dress", "кожа", "leather", "сапфир", "sapphire"]);
  const sporty = hasWater || attachment === "rubber" || includesAny(text, ["sport", "diver", "shock", "outdoor"]);

  let score = 0.5;
  let reason = "Модель остается возможным направлением";

  if (scenario === "everyday" || scenario === "universal") {
    score = 0.7 + (diameter !== null && diameter >= 36 && diameter <= 42 ? 0.15 : 0) + (watch.publicPrice ? 0.08 : 0);
    reason = scenario === "everyday" ? "Подходит для повседневной носки" : "Подходит для разных ситуаций";
  }

  if (scenario === "work") {
    score = (classic ? 0.86 : 0.58) + (sporty ? -0.18 : 0.08);
    reason = classic ? "Подходит для офиса и делового ритма" : "Деловой характер выражен умеренно";
  }

  if (scenario === "special") {
    score = classic ? 0.92 : 0.54;
    reason = classic ? "Подходит для более нарядного сценария" : "Нарядный характер не подтвержден";
  }

  if (scenario === "travel") {
    score = 0.52 + (hasWater ? 0.18 : 0) + (hasFunctions ? 0.2 : 0) + (movement === "quartz" || movement === "solar" ? 0.08 : 0);
    reason = hasFunctions ? "Есть функции, полезные в поездках" : "Подходит для поездок по базовым параметрам";
  }

  if (scenario === "sport") {
    score = sporty ? 0.92 : 0.36;
    reason = sporty ? "Подходит для спорта и активной носки" : "Спортивные признаки выражены слабо";
  }

  if (scenario === "first_mechanical") {
    const mechanical = movement === "automatic" || movement === "mechanical";
    score = mechanical ? 0.9 : 0.22;
    reason = mechanical ? "Механический механизм соответствует сценарию" : "Механический механизм не подтвержден";
  }

  if (scenario === "collection_gap") {
    score = 0.72 + (classic && sporty ? 0.08 : 0) + (movement !== "unknown" ? 0.07 : 0);
    reason = "Модель предлагает отдельное стилевое направление";
  }

  const finalScore = clampScore(score);
  return criterion({
    key: "scenario",
    label: "Сценарий",
    status: finalScore >= 0.66 ? "match" : finalScore <= 0.38 ? "conflict" : "neutral",
    score: finalScore,
    reason,
  });
}

function characterEvaluation(watch: CatalogWatchDetail, character: SelectionCharacterCode): SelectionCriterionEvaluation {
  const text = allWatchText(watch);
  const technical = includesAny(text, ["chrono", "хронограф", "timer", "таймер", "alarm", "digital", "цифров", "resin", "резин", "diver", "дайвер"]);
  const classic = includesAny(text, ["classic", "класс", "dress", "leather", "кожа", "roman", "римск", "сапфир"]);
  const expressive = includesAny(text, ["gold", "золот", "green", "зелен", "blue", "син", "red", "красн"]);

  if (character === "universal") {
    return criterion({
      key: "character",
      label: "Характер",
      status: "neutral",
      score: 0.82,
      reason: "Характер модели остается универсальным",
    });
  }

  if (character === "quiet") {
    return criterion({
      key: "character",
      label: "Характер",
      status: technical ? "conflict" : "match",
      score: technical ? 0.34 : 0.92,
      reason: technical ? "Инструментальный характер заметнее желаемого" : "Дизайн модели остается сдержанным",
    });
  }

  if (character === "classic") {
    return criterion({
      key: "character",
      label: "Характер",
      status: classic ? "match" : technical ? "conflict" : "neutral",
      score: classic ? 1 : technical ? 0.34 : 0.62,
      reason: classic ? "Классический характер соответствует предпочтению" : "Классический характер выражен не полностью",
    });
  }

  if (character === "instrumental" || character === "sporty") {
    return criterion({
      key: "character",
      label: "Характер",
      status: technical ? "match" : "neutral",
      score: technical ? 1 : 0.58,
      reason: technical ? "Спортивный или утилитарный характер подтвержден" : "Инструментальный характер выражен умеренно",
    });
  }

  return criterion({
    key: "character",
    label: "Характер",
    status: expressive ? "match" : "neutral",
    score: expressive ? 0.94 : 0.62,
    reason: expressive ? "У модели есть заметный визуальный акцент" : "Выразительность модели умеренная",
  });
}

function movementEvaluation(watch: CatalogWatchDetail, preference: SelectionMovementPreference): SelectionCriterionEvaluation {
  const actual = movementKind(watch);
  if (preference === "any") {
    return criterion({
      key: "movement",
      label: "Механизм",
      status: "neutral",
      score: actual === "unknown" ? 0.62 : 1,
      reason: "Тип механизма оставлен без предпочтений",
    });
  }

  if (actual === "unknown") {
    return criterion({
      key: "movement",
      label: "Механизм",
      status: "unknown",
      score: 0.58,
      reason: "Тип механизма пока не указан",
    });
  }

  const mechanicalMatch = preference === "mechanical" && (actual === "mechanical" || actual === "automatic");
  const quartzFamilyMatch = preference === "quartz" && (actual === "digital" || actual === "ana_digi");
  const exactMatch = actual === preference || mechanicalMatch || quartzFamilyMatch;
  return criterion({
    key: "movement",
    label: "Механизм",
    status: exactMatch ? "match" : "conflict",
    score: exactMatch ? 1 : 0.18,
    reason: exactMatch ? "Механизм соответствует предпочтению" : "Механизм отличается от выбранного",
  });
}

function fitEvaluation(watch: CatalogWatchDetail, fit: SelectionFitCode): SelectionCriterionEvaluation {
  const diameter = caseDiameter(watch);
  if (fit === "unknown") {
    return criterion({
      key: "fit",
      label: "Размер",
      status: "neutral",
      score: diameter === null ? 0.62 : 1,
      reason: "Размер оставлен без предпочтений",
    });
  }

  if (diameter === null) {
    return criterion({
      key: "fit",
      label: "Размер",
      status: "unknown",
      score: 0.58,
      reason: "Диаметр корпуса пока не указан",
    });
  }

  const score =
    fit === "compact"
      ? diameter <= 38
        ? 1
        : diameter <= 40
          ? 0.74
          : 0.28
      : fit === "medium"
        ? diameter >= 38 && diameter <= 42
          ? 1
          : diameter >= 36 && diameter <= 44
            ? 0.72
            : 0.34
        : diameter >= 42
          ? 1
          : diameter >= 40
            ? 0.68
            : 0.32;

  return criterion({
    key: "fit",
    label: "Размер",
    status: score >= 0.72 ? "match" : "conflict",
    score,
    reason: score >= 0.72 ? "Размер корпуса входит в выбранный диапазон" : "Размер корпуса отличается от предпочтения",
  });
}

function attachmentEvaluation(watch: CatalogWatchDetail, attachment: SelectionAttachmentCode): SelectionCriterionEvaluation {
  const actual = attachmentKind(watch);
  if (attachment === "any") {
    return criterion({
      key: "attachment",
      label: "Ремень/браслет",
      status: "neutral",
      score: actual === "unknown" ? 0.62 : 1,
      reason: "Крепление оставлено без предпочтений",
    });
  }

  if (actual === "unknown") {
    return criterion({
      key: "attachment",
      label: "Ремень/браслет",
      status: "unknown",
      score: 0.58,
      reason: "Данные о креплении требуют уточнения",
    });
  }

  return criterion({
    key: "attachment",
    label: "Ремень/браслет",
    status: actual === attachment ? "match" : "conflict",
    score: actual === attachment ? 1 : 0.28,
    reason: actual === attachment ? "Крепление соответствует предпочтению" : "Крепление отличается от выбранного",
  });
}

function practicalEvaluation(watch: CatalogWatchDetail, practical: SelectionPracticalCode): SelectionCriterionEvaluation {
  const text = allWatchText(watch);
  const meters = waterResistanceMeters(watch);
  if (practical === "none") {
    return criterion({
      key: "practical",
      label: "Практика",
      status: "neutral",
      score: 0.84,
      reason: "Обязательных практических требований нет",
    });
  }

  const crystal = normalizeText(specValue(watch, ["crystal_type_raw"]) ?? "");
  const functions = normalizeText(specValue(watch, ["functions_raw"]) ?? "");
  const attachment = normalizeText(
    specValue(watch, ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"]) ?? "",
  );
  const matches: Record<Exclude<SelectionPracticalCode, "none">, boolean | null> = {
    high_water: meters === null ? null : meters >= 100,
    sapphire: crystal ? includesAny(crystal, ["sapphire", "сапфир"]) : null,
    chronograph: functions ? includesAny(functions, ["chronograph", "хронограф", "chrono"]) : null,
    date: functions ? includesAny(functions, ["date", "дата", "число"]) : null,
    gmt: functions ? includesAny(functions, ["gmt", "world time", "миров"]) : null,
    lume: functions ? includesAny(functions, ["lume", "подсвет", "illuminator", "свет"]) : null,
    shock: functions || attachment ? includesAny(`${functions} ${attachment} ${text}`, ["shock", "удар", "resin", "резин"]) : null,
  };
  const result = matches[practical];
  if (result === null) {
    return criterion({
      key: "practical",
      label: "Практика",
      status: "unknown",
      score: 0.58,
      reason: "Эта характеристика пока не указана",
    });
  }

  return criterion({
    key: "practical",
    label: "Практика",
    status: result ? "match" : "conflict",
    score: result ? 1 : 0.24,
    reason: result ? "Практическое требование подтверждено" : "Практическое требование не подтверждено",
  });
}

function dataConfidenceEvaluation(watch: CatalogWatchDetail): SelectionCriterionEvaluation {
  const important = [
    specValue(watch, ["movement_type_raw", "movement_raw"]),
    specValue(watch, ["case_diameter_raw", "case_dimensions_raw"]),
    specValue(watch, ["water_resistance_raw"]),
    specValue(watch, ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"]),
  ];
  const present = important.filter(Boolean).length;
  const score = 0.44 + present * 0.12 + (watch.publicPrice ? 0.05 : 0) + (watch.primaryImage.kind === "none" ? 0 : 0.03);
  return criterion({
    key: "data",
    label: "Данные",
    status: present >= 3 ? "match" : "unknown",
    score,
    reason: present >= 3 ? "Основные характеристики указаны" : "Часть характеристик пока не указана",
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

  const budget = budgetEvaluation(watch, answers.budget);
  if (budget.status === "conflict") {
    return null;
  }
  const movement = movementEvaluation(watch, answers.movement);
  if (movement.status === "conflict") {
    return null;
  }

  const fit = fitEvaluation(watch, answers.fit);
  const attachment = attachmentEvaluation(watch, answers.attachment);
  if (answers.attachment !== "any" && attachment.status === "conflict") {
    return null;
  }
  const practical = practicalEvaluation(watch, answers.practical);
  if (practical.status === "conflict") {
    return null;
  }

  const criteria = [
    scenarioEvaluation(watch, answers.scenario),
    characterEvaluation(watch, answers.character),
    budget,
    movement,
    fit,
    attachment,
    practical,
    dataConfidenceEvaluation(watch),
  ];
  const breakdown: SelectionScoreBreakdown = {
    scenarioFit: scorePart(criteria[0]?.score ?? 0),
    characterFit: scorePart(criteria[1]?.score ?? 0),
    budgetFit: scorePart(criteria[2]?.score ?? 0),
    movementFit: scorePart(criteria[3]?.score ?? 0),
    fitFit: scorePart(criteria[4]?.score ?? 0),
    attachmentFit: scorePart(criteria[5]?.score ?? 0),
    practicalFit: scorePart(criteria[6]?.score ?? 0),
    dataConfidence: scorePart(criteria[7]?.score ?? 0),
  };

  const total =
    breakdown.scenarioFit * 0.23 +
    breakdown.characterFit * 0.1 +
    breakdown.budgetFit * 0.16 +
    breakdown.movementFit * 0.15 +
    breakdown.fitFit * 0.1 +
    breakdown.attachmentFit * 0.08 +
    breakdown.practicalFit * 0.1 +
    breakdown.dataConfidence * 0.08;

  const conflicts = criteria.filter((item) => item.status === "conflict");
  const matches = criteria.filter((item) => item.status === "match");
  const unknowns = criteria.filter((item) => item.status === "unknown" && item.key !== "data");
  const hardKeys = hardCriterionKeys(answers);
  const hardUnknowns = unknowns.filter((item) => hardKeys.includes(item.key));
  const isPreliminary = hardUnknowns.length > 0;
  const score = Math.round(total);
  if (score < 60 || conflicts.length >= 4) {
    return null;
  }

  const matchLabel = isPreliminary
    ? "Предварительный вариант"
    : score >= 78 && conflicts.length === 0 && unknowns.length === 0 && matches.length >= 4
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
        ? "Есть расхождение"
        : unknowns.length > 0
          ? "Не все характеристики указаны"
          : "Характеристики подтверждены",
    isPreliminary,
    familyKey: familyKey(watch),
    movementKey: movementKind(watch),
    caseDiameterMm: caseDiameter(watch),
    attachmentKey: attachmentKind(watch),
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
  return [
    answers.budget === "any" ? null : "budget",
    answers.movement === "any" ? null : "movement",
    answers.practical === "none" ? null : "practical",
    answers.attachment === "any" ? null : "attachment",
  ].filter((key): key is string => key !== null);
}

function requiredConfirmationRank(
  recommendation: SelectionRecommendation,
  answers: SelectionAnswers,
): number {
  const requiredKeys = hardCriterionKeys(answers);

  return requiredKeys.reduce((total, key) => {
    const status = recommendation.criteria.find((criterionItem) => criterionItem.key === key)?.status;
    return total + (status === "match" ? 3 : status === "neutral" ? 1 : status === "conflict" ? -2 : 0);
  }, 0);
}

function knownConflictCount(recommendation: SelectionRecommendation): number {
  return recommendation.criteria.filter((criterionItem) => criterionItem.status === "conflict").length;
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
    featuredPrice - price >= Math.max(100_000, featuredPrice * 0.05);
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
      description: `Модель ${recommendation.watch.brandName} с похожим назначением и подтвержденными характеристиками.`,
    };
  }

  if (
    recommendation.caseDiameterMm !== null &&
    featured.caseDiameterMm !== null &&
    Math.abs(recommendation.caseDiameterMm - featured.caseDiameterMm) >= 3
  ) {
    return {
      role,
      label: recommendation.caseDiameterMm < featured.caseDiameterMm
        ? "Более компактный вариант"
        : "Более крупный вариант",
      description: "Подтвержденный диаметр предлагает заметно другую посадку.",
    };
  }

  if (
    recommendation.attachmentKey !== "unknown" &&
    featured.attachmentKey !== "unknown" &&
    recommendation.attachmentKey !== featured.attachmentKey
  ) {
    return {
      role,
      label: "Другое крепление",
      description: "Подтвержденный материал ремня или браслета дает другой характер носки.",
    };
  }

  if (
    featuredPrice !== null &&
    price !== null &&
    Math.abs(featuredPrice - price) <= Math.max(100_000, featuredPrice * 0.08)
  ) {
    return {
      role,
      label: "Вариант с близкой ценой",
      description: "Сопоставимая стоимость при другой расстановке предпочтений.",
    };
  }

  return {
    role,
    label: "Еще один сильный вариант",
    description: "Еще один способ расставить приоритеты без нарушения выбранных условий.",
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

export function buildSelectionRecommendations(input: {
  dataset: CatalogReadDataset;
  answers: SelectionAnswers;
  limit?: number;
}): SelectionRecommendation[] {
  const scored = input.dataset.watches
    .map((watch) => scoreWatch(watch, input.answers))
    .filter((recommendation): recommendation is SelectionRecommendation => recommendation !== null)
    .sort(
      (left, right) =>
        Number(knownConflictCount(left) > 0) - Number(knownConflictCount(right) > 0) ||
        requiredConfirmationRank(right, input.answers) - requiredConfirmationRank(left, input.answers) ||
        right.criteria.filter((item) => item.status === "match").length -
          left.criteria.filter((item) => item.status === "match").length ||
        (Math.abs(right.score - left.score) <= 3
          ? Number(right.imageCandidates.length > 0) - Number(left.imageCandidates.length > 0)
          : right.score - left.score) ||
        right.score - left.score ||
        Number(right.watch.publicPrice !== null) - Number(left.watch.publicPrice !== null) ||
        left.watch.brandName.localeCompare(right.watch.brandName, "ru") ||
        left.watch.title.localeCompare(right.watch.title, "ru") ||
        left.watch.referenceNormalized.localeCompare(right.watch.referenceNormalized),
    );

  const hardKeys = hardCriterionKeys(input.answers);
  if (hardKeys.length === 0) {
    return diversifyRecommendations(scored, input.limit ?? 4);
  }

  const confirmed = scored.filter((recommendation) => !recommendation.isPreliminary);
  if (confirmed.length === 0) {
    return [];
  }

  const eligible = confirmed.length >= 3
    ? confirmed
    : [...confirmed, ...scored.filter((recommendation) => recommendation.isPreliminary)];
  return diversifyRecommendations(eligible, input.limit ?? 4);
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
}): SelectionStepCode {
  if (!input.hasAnswers) {
    return input.requestedStep === "start" ? "start" : input.requestedStep === "results" ? "start" : input.requestedStep;
  }

  if (input.requestedStep !== "start") return input.requestedStep;

  for (const step of selectionFormDefinition.steps) {
    if (!input.searchParams[step.answerKey]) {
      return step.code;
    }
  }

  return "results";
}

export function selectionStepByCode(step: SelectionStepCode) {
  return selectionFormDefinition.steps.find((item) => item.code === step) ?? null;
}

export function selectionAnswerLabel(key: SelectionAnswerKey, value: SelectionAnswers[SelectionAnswerKey]): string {
  if (key === "scenario" && value === "collection_gap") {
    return "Другой сценарий";
  }

  const step = selectionFormDefinition.steps.find((item) => item.answerKey === key);
  return step?.options.find((option) => option.code === value)?.label ?? String(value);
}
