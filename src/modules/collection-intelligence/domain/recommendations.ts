import type {
  CollectionAnalysisItem,
  CollectionCandidateScore,
  CollectionDirection,
  CollectionGrowthCandidate,
  CollectionGrowthRecommendationSet,
  CollectionPriceSegment,
  CollectionProfile,
  CollectionRecommendationCandidate,
  CollectionRecommendationIntent,
  CollectionRecommendationSet,
  CollectionRole,
} from "@/modules/collection-intelligence/domain/types";
import { buildCollectionProfile } from "@/modules/collection-intelligence/domain/profile";

export const collectionRecommendationPriceFloorMinor = 1_500_000;

const intentOrder: CollectionRecommendationIntent[] = [
  "travel",
  "formal",
  "sport",
  "first-mechanical",
  "strap-diversity",
  "colorful-accent",
  "everyday-upgrade",
];

const intentCopy: Record<
  CollectionRecommendationIntent,
  { title: string; explanation: string }
> = {
  travel: {
    title: "Для путешествий",
    explanation: "Модель, которая добавит поездкам отдельную роль и не повторит привычный характер коллекции.",
  },
  sport: {
    title: "Спортивные часы",
    explanation: "Более выносливое направление для движения, воды и активных выходных.",
  },
  formal: {
    title: "Компактная классика",
    explanation: "Спокойная модель для работы, рубашки и ситуаций, где важна сдержанность.",
  },
  "first-mechanical": {
    title: "Первая механика",
    explanation: "Механические часы добавят коллекции новый принцип работы и другой ритуал ношения.",
  },
  "colorful-accent": {
    title: "Яркий повседневный акцент",
    explanation: "Новый цвет добавит коллекции визуальный диапазон без потери универсальности.",
  },
  "strap-diversity": {
    title: "Другой ремень или браслет",
    explanation: "Новая фактура изменит ощущение часов и расширит сценарии ношения.",
  },
  "everyday-upgrade": {
    title: "Универсальная модель на каждый день",
    explanation: "Сбалансированное дополнение для регулярного ношения и разных сценариев.",
  },
};

function knownCount(distribution: Record<string, number> | Partial<Record<string, number>>): number {
  return Object.values(distribution).filter((value) => (value ?? 0) > 0).length;
}

function profileTopShare(distribution: Record<string, number>, total: number): number {
  if (total === 0) return 0;
  return Math.max(0, ...Object.values(distribution)) / total;
}

function addDirection(
  directions: Array<CollectionDirection & { order: number }>,
  intent: CollectionRecommendationIntent,
  score: number,
  evidence: string[],
): void {
  const copy = intentCopy[intent];
  directions.push({
    intent,
    title: copy.title,
    explanation: copy.explanation,
    evidence,
    score,
    order: intentOrder.indexOf(intent),
  });
}

export function determineNextCollectionDirection(profile: CollectionProfile): CollectionDirection | null {
  if (profile.activeCount === 0) return null;

  const directions: Array<CollectionDirection & { order: number }> = [];
  const roleKnown = !profile.lowConfidenceDimensions.includes("role");
  const movementKnown = !profile.lowConfidenceDimensions.includes("movement_type");
  const attachmentKnown = !profile.lowConfidenceDimensions.includes("attachment_type");
  const dialKnown = !profile.lowConfidenceDimensions.includes("dial_color_family");

  if (roleKnown && profile.roleDistribution.travel === 0) {
    const evidence = ["Сценарий путешествий пока не закрыт."];
    if (
      attachmentKnown &&
      (profile.attachmentDistribution.steel_bracelet ?? 0) === profile.activeCount
    ) {
      evidence.push("Все известные часы используют металлический браслет.");
    }
    if (
      !profile.lowConfidenceDimensions.includes("water_ready") &&
      profile.waterReadyCount === 0
    ) {
      evidence.push("В подтвержденных данных нет модели для воды.");
    }
    if (evidence.length < 2) evidence.push("Подборка добавит новую практическую роль.");
    addDirection(directions, "travel", 8, evidence.slice(0, 3));
  }

  const formalCount = profile.roleDistribution.business + profile.roleDistribution.formal;
  if (roleKnown && formalCount === 0) {
    addDirection(directions, "formal", 7, ["Нет отдельной деловой или формальной модели.", "Спокойный характер расширит сценарии ношения."]);
  }

  if (roleKnown && profile.roleDistribution.sport === 0 && profile.waterReadyCount === 0) {
    addDirection(directions, "sport", 6, ["Нет часов для спортивных сценариев.", "Пока нет модели для воды."]);
  }

  const mechanicalCount =
    (profile.movementDistribution.automatic ?? 0) + (profile.movementDistribution.manual ?? 0);
  if (movementKnown && mechanicalCount === 0) {
    const concentratedMovement = knownCount(profile.movementDistribution) <= 1;
    addDirection(
      directions,
      "first-mechanical",
      concentratedMovement ? 8 : 6,
      ["В коллекции пока нет механических часов.", "Новый механизм добавит другой опыт владения."],
    );
  }

  if (attachmentKnown && knownCount(profile.attachmentDistribution) <= 1) {
    addDirection(
      directions,
      "strap-diversity",
      5 + (profile.activeCount >= 3 ? 1 : 0),
      ["Известные часы используют один тип ремня или браслета.", "Другая фактура изменит характер коллекции."],
    );
  }

  const darkCount =
    (profile.dialDistribution.black ?? 0) +
    (profile.dialDistribution.blue ?? 0) +
    (profile.dialDistribution.grey ?? 0);
  if (
    dialKnown &&
    (knownCount(profile.dialDistribution) <= 1 ||
      (profile.activeCount >= 3 && darkCount / profile.activeCount >= 0.67))
  ) {
    addDirection(
      directions,
      "colorful-accent",
      5,
      ["Цветовая палитра коллекции сосредоточена вокруг близких оттенков.", "Контрастный циферблат добавит визуальное разнообразие."],
    );
  }

  const dailyCoverage = profile.roleDistribution.daily;
  if (roleKnown && dailyCoverage === 0) {
    addDirection(directions, "everyday-upgrade", 7, ["Нет подтвержденной универсальной модели на каждый день."]);
  } else {
    const brandConcentration = profileTopShare(profile.brandDistribution, profile.activeCount);
    const sizeConcentration = profileTopShare(
      profile.sizeDistribution as Record<string, number>,
      profile.activeCount,
    );
    addDirection(
      directions,
      "everyday-upgrade",
      brandConcentration >= 0.67 || sizeConcentration >= 0.67 ? 4 : 2,
      [
        brandConcentration >= 0.67
          ? "Коллекция заметно сосредоточена вокруг одного бренда."
          : "Универсальная модель может связать существующие роли.",
      ],
    );
  }

  return (
    directions
      .sort((left, right) => right.score - left.score || left.order - right.order)
      .map((direction) => ({
        intent: direction.intent,
        title: direction.title,
        explanation: direction.explanation,
        evidence: direction.evidence,
        score: direction.score,
      }))[0] ?? null
  );
}

function percentile(sorted: number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? null;
}

export function getRecommendationPriceBoundaries(candidates: CollectionRecommendationCandidate[]): {
  p40Minor: number | null;
  p70Minor: number | null;
  p90Minor: number | null;
} {
  const prices = candidates
    .filter(
      (candidate) =>
        candidate.currencyCode === "RUB" &&
        candidate.publicPriceMinor !== null &&
        candidate.publicPriceMinor >= collectionRecommendationPriceFloorMinor,
    )
    .map((candidate) => candidate.publicPriceMinor as number)
    .sort((left, right) => left - right);

  return {
    p40Minor: percentile(prices, 0.4),
    p70Minor: percentile(prices, 0.7),
    p90Minor: percentile(prices, 0.9),
  };
}

function segmentForPrice(
  priceMinor: number,
  boundaries: ReturnType<typeof getRecommendationPriceBoundaries>,
): CollectionPriceSegment {
  if (boundaries.p40Minor === null || priceMinor <= boundaries.p40Minor) return "rational";
  if (boundaries.p70Minor === null || priceMinor <= boundaries.p70Minor) return "balanced";
  return "upper";
}

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("ru")
    .normalize("NFKC")
    .replace(/[^a-zа-я0-9]+/g, "");
}

const recommendationRoleLabels: Record<CollectionRole, string> = {
  daily: "на каждый день",
  business: "для работы",
  formal: "для особых случаев",
  travel: "для путешествий",
  sport: "для спорта",
  outdoor: "для активного отдыха",
  weekend: "на выходные",
};

const recommendationMovementLabels: Record<string, string> = {
  automatic: "автоматический механизм",
  manual: "механизм с ручным заводом",
  quartz: "кварцевый механизм",
  solar: "солнечный механизм",
  smart: "цифровой или смарт-механизм",
};

const recommendationAttachmentLabels: Record<string, string> = {
  steel_bracelet: "стальной браслет",
  leather_strap: "кожаный ремень",
  rubber_strap: "каучуковый ремень",
  textile_strap: "текстильный ремень",
  other: "другой тип ремня или браслета",
};

const recommendationSizeLabels: Record<string, string> = {
  small: "компактный размер корпуса",
  medium: "средний размер корпуса",
  large: "крупный размер корпуса",
  oversized: "очень крупный размер корпуса",
};

const recommendationColorLabels: Record<string, string> = {
  black: "черный циферблат",
  blue: "синий циферблат",
  white: "белый циферблат",
  silver: "серебристый циферблат",
  green: "зеленый циферблат",
  grey: "серый циферблат",
  champagne: "циферблат цвета шампань",
  other: "контрастный цвет циферблата",
};

function intentInterpretation(
  candidate: CollectionRecommendationCandidate,
  intent: CollectionRecommendationIntent,
): { code: string; reason: string } | null {
  if (intent === "travel") {
    if (candidate.roles.includes("travel") && ["digital", "hybrid"].includes(candidate.displayType)) {
      return { code: "digital-world-time", reason: "Цифровой инструмент для смены часовых поясов" };
    }
    if (candidate.roles.includes("travel")) {
      return { code: "travel-function", reason: "Функции подходят для путешествий" };
    }
    if (candidate.caseStyle === "diver" || candidate.waterReady === true) {
      return { code: "water-ready-travel", reason: "Защищенный вариант для воды и поездок" };
    }
    if (["quartz", "solar"].includes(candidate.movementType) && candidate.roles.includes("daily")) {
      return { code: "reliable-quartz", reason: "Надежный кварцевый вариант для дороги" };
    }
    return null;
  }
  if (intent === "sport") {
    if (candidate.roles.includes("sport") && ["digital", "hybrid"].includes(candidate.displayType)) {
      return { code: "digital-sport", reason: "Цифровой спортивный инструмент" };
    }
    if (candidate.caseStyle === "diver" || candidate.waterReady === true) {
      return { code: "water-sport", reason: "Подходит для воды и активного отдыха" };
    }
    return candidate.roles.includes("sport")
      ? { code: "active-sport", reason: "Подходит для активных спортивных сценариев" }
      : null;
  }
  if (intent === "formal") {
    return candidate.roles.includes("business") || candidate.roles.includes("formal")
      ? { code: candidate.caseStyle === "classic" ? "classic-dress" : "restrained-formal", reason: "Подходит для работы и формальных случаев" }
      : null;
  }
  if (intent === "first-mechanical") {
    return candidate.movementType === "automatic" || candidate.movementType === "manual"
      ? {
          code: candidate.movementType,
          reason: `Добавляет ${recommendationMovementLabels[candidate.movementType] ?? "механический принцип работы"}`,
        }
      : null;
  }
  if (intent === "colorful-accent") {
    return ["green", "blue", "champagne", "other"].includes(candidate.dialColorFamily)
      ? {
          code: `dial-${candidate.dialColorFamily}`,
          reason: `Добавляет ${recommendationColorLabels[candidate.dialColorFamily] ?? "новый цвет циферблата"}`,
        }
      : null;
  }
  if (intent === "strap-diversity") {
    return candidate.attachmentType !== "unknown"
      ? {
          code: candidate.attachmentType,
          reason: `Добавляет ${recommendationAttachmentLabels[candidate.attachmentType] ?? "другой тип ремня или браслета"}`,
        }
      : null;
  }
  return candidate.roles.includes("daily")
    ? { code: candidate.caseStyle, reason: "Подходит для регулярного ношения" }
    : null;
}

function mostCommonBrand(profile: CollectionProfile): string | null {
  return (
    Object.entries(profile.brandDistribution)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ru"))[0]?.[0] ?? null
  );
}

export function scoreCollectionCandidate(
  candidate: CollectionRecommendationCandidate,
  items: CollectionAnalysisItem[],
  profile: CollectionProfile,
  intent: CollectionRecommendationIntent,
  boundaries: ReturnType<typeof getRecommendationPriceBoundaries>,
): CollectionCandidateScore | null {
  const interpretation = intentInterpretation(candidate, intent);
  if (
    candidate.publicPriceMinor === null ||
    candidate.publicPriceMinor < collectionRecommendationPriceFloorMinor ||
    candidate.currencyCode !== "RUB" ||
    !candidate.imageUrl ||
    !candidate.href.startsWith("/watches/") ||
    candidate.dataCompleteness < 0.45 ||
    interpretation === null
  ) {
    return null;
  }

  const active = items.filter((item) => item.ownershipStatus === "owned");
  const ownedReferences = new Set(
    active.map((item) => item.catalogReferenceId).filter((value): value is string => Boolean(value)),
  );
  if (ownedReferences.has(candidate.catalogReferenceId)) return null;

  const reasons = [interpretation.reason];
  const penalties: string[] = [];
  let total = 6;

  const activeRoles = new Set(active.flatMap((item) => item.roles));
  const secondaryRole = candidate.roles.find((role) => !activeRoles.has(role));
  if (secondaryRole) {
    total += 4;
    reasons.push(`Добавляет сценарий «${recommendationRoleLabels[secondaryRole]}»`);
  }

  const movements = new Set(active.map((item) => item.movementType).filter((value) => value !== "unknown"));
  if (movements.size > 0 && candidate.movementType !== "unknown" && !movements.has(candidate.movementType)) {
    total += 3;
    reasons.push(`Добавляет ${recommendationMovementLabels[candidate.movementType] ?? "новый механизм"}`);
  }

  const attachments = new Set(active.map((item) => item.attachmentType).filter((value) => value !== "unknown"));
  if (attachments.size > 0 && candidate.attachmentType !== "unknown" && !attachments.has(candidate.attachmentType)) {
    total += 3;
    reasons.push(
      `Добавляет ${recommendationAttachmentLabels[candidate.attachmentType] ?? "другой тип ремня или браслета"}`,
    );
  }

  const sizes = new Set(active.map((item) => item.sizeBand).filter((value) => value !== "unknown"));
  if (sizes.size > 0 && candidate.sizeBand !== "unknown" && !sizes.has(candidate.sizeBand)) {
    total += 2;
    reasons.push(`Добавляет ${recommendationSizeLabels[candidate.sizeBand] ?? "другой размер корпуса"}`);
  }

  const colors = new Set(active.map((item) => item.dialColorFamily).filter((value) => value !== "unknown"));
  if (colors.size > 0 && candidate.dialColorFamily !== "unknown" && !colors.has(candidate.dialColorFamily)) {
    total += 2;
    reasons.push(
      `Добавляет ${recommendationColorLabels[candidate.dialColorFamily] ?? "новый цвет циферблата"}`,
    );
  }

  const brands = new Set(active.map((item) => item.brandName).filter((value): value is string => Boolean(value)));
  if (brands.size > 0 && !brands.has(candidate.brandName)) {
    total += 2;
    reasons.push(`Добавляет новый бренд — ${candidate.brandName}`);
  }

  if (profile.knownPurchasePriceCount >= 2 && profile.medianPurchasePriceMinor !== null) {
    const lower = profile.medianPurchasePriceMinor * 0.75;
    const upper = profile.medianPurchasePriceMinor * 2.25;
    if (candidate.publicPriceMinor >= lower && candidate.publicPriceMinor <= upper) {
      total += 2;
      reasons.push("Сохраняет привычный ценовой диапазон");
    }
  }

  if (candidate.dataCompleteness >= 0.75) total += 1;
  total += 1;

  const ownedModelNames = new Set(active.map((item) => normalizeIdentity(item.modelName ?? item.displayName)));
  if (ownedModelNames.has(normalizeIdentity(candidate.modelName))) {
    total -= 15;
    penalties.push("Такая модель уже представлена");
  }

  const ownedFamilyKeys = new Set(
    active.map((item) => `${normalizeIdentity(item.brandName)}:${normalizeIdentity(item.modelName ?? item.displayName)}`),
  );
  if (ownedFamilyKeys.has(candidate.familyKey)) {
    total -= 8;
    penalties.push("Близкая reference family уже есть");
  }

  const repeatedCore = active.some(
    (item) =>
      item.roles.some((role: CollectionRole) => candidate.roles.includes(role)) &&
      item.movementType !== "unknown" &&
      item.movementType === candidate.movementType &&
      item.dialColorFamily !== "unknown" &&
      item.dialColorFamily === candidate.dialColorFamily,
  );
  if (repeatedCore) {
    total -= 6;
    penalties.push("Повторяет сценарий, механизм и цвет");
  }

  const concentratedBrand = mostCommonBrand(profile);
  if (
    concentratedBrand === candidate.brandName &&
    (profile.brandDistribution[concentratedBrand] ?? 0) / Math.max(profile.activeCount, 1) >= 0.67
  ) {
    total -= 4;
    penalties.push("Усиливает концентрацию одного бренда");
  }

  if (boundaries.p90Minor !== null && candidate.publicPriceMinor > boundaries.p90Minor) {
    total -= 3;
    penalties.push("Цена выше P90 доступной подборки");
  }

  return {
    candidate,
    total,
    reasons: reasons.slice(0, 3),
    penalties,
    priceSegment: segmentForPrice(candidate.publicPriceMinor, boundaries),
    interpretation: interpretation.code,
  };
}

function rankCandidates(
  items: CollectionAnalysisItem[],
  candidates: CollectionRecommendationCandidate[],
  intent: CollectionRecommendationIntent,
): {
  ranked: CollectionCandidateScore[];
  boundaries: ReturnType<typeof getRecommendationPriceBoundaries>;
} {
  const profile = buildCollectionProfile(items);
  const boundaries = getRecommendationPriceBoundaries(candidates);
  const scored = candidates
    .map((candidate) => scoreCollectionCandidate(candidate, items, profile, intent, boundaries))
    .filter((entry): entry is CollectionCandidateScore => entry !== null)
    .sort(
      (left, right) =>
        right.total - left.total ||
        (left.candidate.publicPriceMinor ?? 0) - (right.candidate.publicPriceMinor ?? 0) ||
        left.candidate.brandName.localeCompare(right.candidate.brandName, "ru") ||
        left.candidate.referenceDisplay.localeCompare(right.candidate.referenceDisplay, "ru"),
    );

  const withinDefaultCeiling =
    boundaries.p90Minor === null
      ? scored
      : scored.filter((entry) => (entry.candidate.publicPriceMinor ?? 0) <= boundaries.p90Minor!);

  return { ranked: withinDefaultCeiling, boundaries };
}

function normalizedModelKey(entry: CollectionCandidateScore): string {
  return `${normalizeIdentity(entry.candidate.brandName)}:${normalizeIdentity(entry.candidate.modelName)}`;
}

function canAddToRecommendation(
  selected: CollectionCandidateScore[],
  entry: CollectionCandidateScore,
): boolean {
  if (selected.some((current) => current.candidate.catalogReferenceId === entry.candidate.catalogReferenceId)) {
    return false;
  }
  if (selected.some((current) => current.candidate.familyKey === entry.candidate.familyKey)) return false;
  if (selected.some((current) => normalizedModelKey(current) === normalizedModelKey(entry))) return false;
  return selected.filter((current) => current.candidate.brandName === entry.candidate.brandName).length < 2;
}

function canAddGrowthCandidate(
  selected: CollectionGrowthCandidate[],
  entry: CollectionCandidateScore,
): boolean {
  return canAddToRecommendation(selected, entry);
}

function diversityVector(selected: CollectionCandidateScore[]): number[] {
  const unique = <T>(values: T[]) => new Set(values).size;
  const pairPenalty = selected.reduce((total, left, index) => {
    return total + selected.slice(index + 1).reduce((pairTotal, right) => {
      const sameCase =
        left.candidate.caseStyle !== "unknown" &&
        left.candidate.caseStyle === right.candidate.caseStyle;
      const sameCore =
        left.candidate.movementType !== "unknown" &&
        left.candidate.movementType === right.candidate.movementType &&
        left.candidate.attachmentType !== "unknown" &&
        left.candidate.attachmentType === right.candidate.attachmentType &&
        left.candidate.dialColorFamily !== "unknown" &&
        left.candidate.dialColorFamily === right.candidate.dialColorFamily;
      return pairTotal + (sameCase ? 4 : 0) + (sameCore ? 8 : 0);
    }, 0);
  }, 0);

  return [
    selected.length,
    unique(selected.map((entry) => entry.priceSegment)),
    unique(selected.map((entry) => entry.candidate.brandName)),
    unique(selected.map((entry) => entry.interpretation)),
    unique(selected.map((entry) => entry.candidate.attachmentType)),
    unique(selected.map((entry) => `${entry.candidate.movementType}:${entry.candidate.displayType}`)),
    unique(selected.map((entry) => entry.candidate.dialColorFamily)),
    unique(selected.map((entry) => entry.candidate.caseStyle)),
    selected.reduce((total, entry) => total + entry.total, 0) - pairPenalty,
  ];
}

function vectorIsBetter(left: number[], right: number[]): boolean {
  for (let index = 0; index < left.length; index += 1) {
    if ((left[index] ?? 0) !== (right[index] ?? 0)) return (left[index] ?? 0) > (right[index] ?? 0);
  }
  return false;
}

function pickDiverseCore(ranked: CollectionCandidateScore[], target = 3): CollectionCandidateScore[] {
  const pool = [...new Map(
    (["rational", "balanced", "upper"] as const)
      .flatMap((segment) => ranked.filter((entry) => entry.priceSegment === segment).slice(0, 16))
      .map((entry) => [entry.candidate.catalogReferenceId, entry]),
  ).values()];
  let best: CollectionCandidateScore[] = [];
  let bestVector = diversityVector(best);

  function visit(start: number, selected: CollectionCandidateScore[]): void {
    const vector = diversityVector(selected);
    if (vectorIsBetter(vector, bestVector)) {
      best = [...selected];
      bestVector = vector;
    }
    if (selected.length >= target) return;
    for (let index = start; index < pool.length; index += 1) {
      const entry = pool[index];
      if (entry && canAddToRecommendation(selected, entry)) {
        visit(index + 1, [...selected, entry]);
      }
    }
  }

  visit(0, []);
  const segmentOrder: Record<CollectionPriceSegment, number> = { rational: 0, balanced: 1, upper: 2 };
  return best.sort(
    (left, right) =>
      segmentOrder[left.priceSegment] - segmentOrder[right.priceSegment] ||
      right.total - left.total ||
      left.candidate.referenceDisplay.localeCompare(right.candidate.referenceDisplay, "ru"),
  );
}

function buildDiverseRecommendationList(
  ranked: CollectionCandidateScore[],
  limit: number,
): CollectionCandidateScore[] {
  const selected = pickDiverseCore(ranked, Math.min(3, limit));
  while (selected.length < limit) {
    const available = ranked.filter((entry) => canAddToRecommendation(selected, entry));
    if (available.length === 0) break;
    const next = available
      .map((entry) => ({ entry, vector: diversityVector([...selected, entry]) }))
      .sort((left, right) => {
        if (vectorIsBetter(left.vector, right.vector)) return -1;
        if (vectorIsBetter(right.vector, left.vector)) return 1;
        return (
          right.entry.total - left.entry.total ||
          left.entry.candidate.referenceDisplay.localeCompare(right.entry.candidate.referenceDisplay, "ru")
        );
      })[0]?.entry;
    if (!next) break;
    selected.push(next);
  }
  return selected;
}

export function buildCollectionRecommendationSet(
  items: CollectionAnalysisItem[],
  candidates: CollectionRecommendationCandidate[],
  intent: CollectionRecommendationIntent,
  limit = 3,
): CollectionRecommendationSet {
  const { ranked, boundaries } = rankCandidates(items, candidates, intent);
  const selected = buildDiverseRecommendationList(ranked, limit);
  const copy = intentCopy[intent];

  return {
    intent,
    title: copy.title,
    explanation: copy.explanation,
    state: selected.length > 0 ? "ready" : "no_match",
    candidates: selected,
    priceFloorMinor: collectionRecommendationPriceFloorMinor,
    priceBoundaries: boundaries,
  };
}

export function buildCollectionGrowthRecommendationSet(
  items: CollectionAnalysisItem[],
  candidates: CollectionRecommendationCandidate[],
  primaryIntent: CollectionRecommendationIntent,
  confidence: CollectionGrowthRecommendationSet["confidence"],
): CollectionGrowthRecommendationSet {
  const exactRanked = rankCandidates(items, candidates, primaryIntent).ranked;
  const exact = buildDiverseRecommendationList(exactRanked, 2).map(
    (entry): CollectionGrowthCandidate => ({
      ...entry,
      intent: primaryIntent,
      position: "exact",
    }),
  );
  const selected: CollectionGrowthCandidate[] = [...exact];
  const alternatePools = intentOrder
    .filter((intent) => intent !== primaryIntent)
    .flatMap((intent) =>
      rankCandidates(items, candidates, intent).ranked.slice(0, 12).map((entry) => ({ entry, intent })),
    );

  while (selected.length < 4) {
    const available = alternatePools.filter(
      ({ entry, intent }) =>
        canAddGrowthCandidate(selected, entry) &&
        !selected.some(
          (current) =>
            current.position === "exploratory" &&
            current.intent === intent &&
            current.candidate.catalogReferenceId !== entry.candidate.catalogReferenceId,
        ),
    );
    if (available.length === 0) break;

    const next = available
      .map(({ entry, intent }) => ({
        entry,
        intent,
        vector: diversityVector([...selected, entry]),
      }))
      .sort((left, right) => {
        if (vectorIsBetter(left.vector, right.vector)) return -1;
        if (vectorIsBetter(right.vector, left.vector)) return 1;
        return (
          right.entry.total - left.entry.total ||
          intentOrder.indexOf(left.intent) - intentOrder.indexOf(right.intent) ||
          left.entry.candidate.referenceDisplay.localeCompare(right.entry.candidate.referenceDisplay, "ru")
        );
      })[0];
    if (!next) break;
    selected.push({
      ...next.entry,
      intent: next.intent,
      position: "exploratory",
    });
  }

  if (selected.length < 4) {
    for (const entry of exactRanked) {
      if (selected.length >= 4) break;
      if (!canAddGrowthCandidate(selected, entry)) continue;
      selected.push({
        ...entry,
        intent: primaryIntent,
        position: selected.filter((candidate) => candidate.position === "exact").length < 2
          ? "exact"
          : "exploratory",
      });
    }
  }

  return {
    primaryIntent,
    state: selected.length > 0 ? "ready" : "no_match",
    confidence,
    candidates: selected,
    priceFloorMinor: collectionRecommendationPriceFloorMinor,
  };
}

export function isCollectionRecommendationIntent(value: string): value is CollectionRecommendationIntent {
  return intentOrder.includes(value as CollectionRecommendationIntent);
}

export function collectionRecommendationIntentTitle(intent: CollectionRecommendationIntent): string {
  return intentCopy[intent].title;
}
