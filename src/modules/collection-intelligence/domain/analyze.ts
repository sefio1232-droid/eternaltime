import type {
  CollectionAnalysisItem,
  CollectionAnalysisResult,
  CollectionGap,
  CollectionOverlap,
  CollectionProfile,
  CollectionRecommendation,
  CollectionRecommendationCandidate,
  CollectionRole,
} from "@/modules/collection-intelligence/domain/types";
import {
  buildCollectionGrowthRecommendationSet,
  determineNextCollectionDirection,
} from "@/modules/collection-intelligence/domain/recommendations";
import {
  buildCollectionProfile,
  getActiveCollectionItems,
} from "@/modules/collection-intelligence/domain/profile";

export { buildCollectionProfile } from "@/modules/collection-intelligence/domain/profile";
const roleNames: Record<CollectionRole, string> = {
  daily: "на каждый день",
  business: "для работы",
  formal: "для особых случаев",
  travel: "для путешествий",
  sport: "для спорта",
  outdoor: "для активного отдыха",
  weekend: "на выходные",
};

const roleSummaryNames: Record<CollectionRole, string> = {
  daily: "повседневные часы",
  business: "часы для работы",
  formal: "часы для особых случаев",
  travel: "часы для путешествий",
  sport: "спортивные часы",
  outdoor: "часы для активного отдыха",
  weekend: "часы на выходные",
};

const attachmentSummaryPhrases: Record<string, string> = {
  steel_bracelet: "на стальном браслете",
  leather_strap: "на кожаном ремне",
  rubber_strap: "на каучуковом ремне",
  textile_strap: "на текстильном ремне",
  other: "с другим типом крепления",
};

function leadingKnownValue(
  distribution: Record<string, number> | Partial<Record<string, number>>,
): string | null {
  return (
    Object.entries(distribution)
      .filter(([value, count]) => value !== "unknown" && (count ?? 0) > 0)
      .sort(
        (left, right) =>
          (right[1] ?? 0) - (left[1] ?? 0) ||
          (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0),
      )[0]?.[0] ??
    null
  );
}

function buildCollectionSummary(
  profile: CollectionProfile,
  directionTitle: string | null,
): CollectionAnalysisResult["summary"] {
  if (profile.activeCount === 0) return null;

  const role = profile.lowConfidenceDimensions.includes("role")
    ? null
    : leadingKnownValue(profile.roleDistribution) as CollectionRole | null;
  const attachment = profile.lowConfidenceDimensions.includes("attachment_type")
    ? null
    : leadingKnownValue(profile.attachmentDistribution);
  const basis = role
    ? `Основа коллекции — ${roleSummaryNames[role]}${attachment && attachmentSummaryPhrases[attachment] ? ` ${attachmentSummaryPhrases[attachment]}` : ""}.`
    : "Пока характеристик недостаточно для содержательного вывода.";
  const representedRoles = Object.entries(profile.roleDistribution)
    .filter((entry): entry is [CollectionRole, number] => entry[1] > 0)
    .sort(
      (left, right) =>
        right[1] - left[1] || (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0),
    );
  const contrast =
    representedRoles.length >= 2
      ? `В ней уже сочетаются ${roleSummaryNames[representedRoles[0]![0]]} и ${roleSummaryNames[representedRoles[1]![0]]}.`
      : "";

  if (profile.activeCount === 1) {
    return {
      label: "Начальный профиль",
      text: `Профиль строится по одной модели. ${basis} Уточните характеристики, чтобы подборка стала точнее.`,
    };
  }

  const direction = directionTitle
    ? ` Коллекцию логично дополнить: ${directionTitle.toLocaleLowerCase("ru")}.`
    : "";
  return {
    label: profile.activeCount <= 3 ? "Первые закономерности" : "Профиль коллекции",
    text: `${basis}${contrast ? ` ${contrast}` : ""}${direction}`,
  };
}

export function detectCollectionGaps(profile: CollectionProfile): CollectionGap[] {
  if (profile.activeCount === 0) {
    return [];
  }

  const gaps: CollectionGap[] = [];
  const formalCoverage = profile.roleDistribution.business + profile.roleDistribution.formal;
  if (profile.activeCount >= 2 && formalCoverage === 0 && !profile.lowConfidenceDimensions.includes("role")) {
    gaps.push({
      code: "business_or_formal",
      dimension: "role",
      severity: "high",
      title: "Нет часов для деловых и особых случаев",
      explanation: "В коллекции пока нет часов с подтвержденной деловой или формальной ролью.",
    });
  }

  if (
    profile.activeCount >= 2 &&
    profile.roleDistribution.travel === 0 &&
    !profile.lowConfidenceDimensions.includes("role")
  ) {
    gaps.push({
      code: "travel_function",
      dimension: "role",
      severity: "medium",
      title: "Нет часов для путешествий",
      explanation: "Ни одна активная модель не отмечена как подходящая для путешествий, GMT или мирового времени.",
    });
  }

  const darkDialCount =
    (profile.dialDistribution.black ?? 0) + (profile.dialDistribution.blue ?? 0) + (profile.dialDistribution.grey ?? 0);
  if (
    profile.activeCount >= 3 &&
    darkDialCount / profile.activeCount >= 0.67 &&
    !profile.lowConfidenceDimensions.includes("dial_color_family")
  ) {
    gaps.push({
      code: "light_dial_diversity",
      dimension: "dial_color_family",
      severity: "medium",
      title: "Мало светлых циферблатов",
      explanation: "Большинство известных циферблатов темные; светлый вариант расширит визуальный диапазон.",
    });
  }

  const knownMovements = Object.entries(profile.movementDistribution).filter(
    ([movement, count]) => movement !== "unknown" && (count ?? 0) > 0,
  );
  if (
    profile.activeCount >= 2 &&
    knownMovements.length === 1 &&
    !profile.lowConfidenceDimensions.includes("movement_type")
  ) {
    gaps.push({
      code: "mechanism_diversity",
      dimension: "movement_type",
      severity: "low",
      title: "Механизмы мало различаются",
      explanation: "Все известные активные часы сосредоточены вокруг одного типа механизма.",
    });
  }

  const knownSizes = Object.entries(profile.sizeDistribution).filter(
    ([size, count]) => size !== "unknown" && (count ?? 0) > 0,
  );
  if (
    profile.activeCount >= 3 &&
    knownSizes.length === 1 &&
    !profile.lowConfidenceDimensions.includes("size_band")
  ) {
    gaps.push({
      code: "size_diversity",
      dimension: "size_band",
      severity: "low",
      title: "Размерный диапазон узкий",
      explanation: "Все известные активные часы находятся в одной размерной категории.",
    });
  }

  if (profile.activeCount >= 2 && profile.waterReadyCount === 0 && !profile.lowConfidenceDimensions.includes("water_ready")) {
    gaps.push({
      code: "water_ready",
      dimension: "water_ready",
      severity: "medium",
      title: "Нет часов для воды",
      explanation: "Среди известных характеристик нет модели для плавания или более активного контакта с водой.",
    });
  }

  return gaps;
}

export function detectCollectionOverlaps(profile: CollectionProfile): CollectionOverlap[] {
  if (profile.activeCount < 3) {
    return [];
  }

  const overlaps: CollectionOverlap[] = [];
  const repeatedRole = (Object.entries(profile.roleDistribution) as Array<[CollectionRole, number]>)
    .filter(([, count]) => count >= 2 && count / profile.activeCount >= 0.67)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];

  if (repeatedRole) {
    overlaps.push({
      code: `role_overlap_${repeatedRole[0]}`,
      dimension: "role",
      value: repeatedRole[0],
      count: repeatedRole[1],
      title: "Одна роль заметно повторяется",
      explanation: `${repeatedRole[1]} из ${profile.activeCount} активных моделей выполняют одну и ту же роль: ${roleNames[repeatedRole[0]]}.`,
    });
  }

  const repeatedMovement = Object.entries(profile.movementDistribution)
    .filter(([value, count]) => value !== "unknown" && (count ?? 0) >= 2 && (count ?? 0) / profile.activeCount >= 0.67)
    .sort((left, right) => (right[1] ?? 0) - (left[1] ?? 0) || left[0].localeCompare(right[0]))[0];

  if (repeatedMovement) {
    overlaps.push({
      code: `movement_overlap_${repeatedMovement[0]}`,
      dimension: "movement_type",
      value: repeatedMovement[0],
      count: repeatedMovement[1] ?? 0,
      title: "Один механизм заметно преобладает",
      explanation: `${repeatedMovement[1]} из ${profile.activeCount} активных моделей используют один известный тип механизма.`,
    });
  }

  return overlaps;
}

function candidateScore(candidate: CollectionRecommendationCandidate, gap: CollectionGap): number {
  if (gap.code === "business_or_formal") {
    return (candidate.roles.includes("business") ? 50 : 0) + (candidate.roles.includes("formal") ? 40 : 0);
  }
  if (gap.code === "travel_function") {
    return candidate.roles.includes("travel") ? 80 : 0;
  }
  if (gap.code === "light_dial_diversity") {
    return candidate.dialColorFamily === "white" || candidate.dialColorFamily === "silver" || candidate.dialColorFamily === "champagne"
      ? 75
      : 0;
  }
  if (gap.code === "mechanism_diversity") {
    return candidate.movementType === "automatic" || candidate.movementType === "manual" ? 55 : 35;
  }
  if (gap.code === "size_diversity") {
    return candidate.sizeBand === "small" || candidate.sizeBand === "medium" ? 60 : 25;
  }
  if (gap.code === "water_ready") {
    return candidate.waterReady ? 75 : 0;
  }
  return 0;
}

export function chooseCollectionRecommendation(
  items: CollectionAnalysisItem[],
  gaps: CollectionGap[],
  candidates: CollectionRecommendationCandidate[],
): CollectionRecommendation | null {
  if (gaps.length === 0) {
    return null;
  }

  const ownedReferenceIds = new Set(
    getActiveCollectionItems(items)
      .map((item) => item.catalogReferenceId)
      .filter((value): value is string => Boolean(value)),
  );

  for (const gap of gaps) {
    const ranked = candidates
      .filter((candidate) => !ownedReferenceIds.has(candidate.catalogReferenceId))
      .map((candidate) => ({ candidate, score: candidateScore(candidate, gap) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.candidate.displayName.localeCompare(right.candidate.displayName));

    const best = ranked[0];
    if (best) {
      return {
        scenarioCode: gap.code,
        title: gap.title,
        explanation: gap.explanation,
        candidate: best.candidate,
        score: best.score,
        reason: `Chosen because it answers ${gap.dimension} without repeating an owned catalog reference.`,
      };
    }
  }

  return {
    scenarioCode: gaps[0]?.code ?? "no_candidate",
    title: "Направление понятно, но точной модели в каталоге пока нет",
    explanation: gaps[0]?.explanation ?? "В коллекции обнаружена открытая роль.",
    candidate: null,
    score: 0,
    reason: "All matching catalog candidates are already owned or unavailable in the local candidate set.",
  };
}

export function analyzeCollection(
  items: CollectionAnalysisItem[],
  candidates: CollectionRecommendationCandidate[],
): CollectionAnalysisResult {
  const profile = buildCollectionProfile(items);
  const status = profile.activeCount === 0 ? "empty" : "ready";
  const confidence =
    profile.activeCount >= 3 && profile.profileCompleteness >= 0.5
      ? "high"
      : profile.activeCount >= 2 || profile.profileCompleteness >= 0.6
        ? "medium"
        : "initial";
  const gaps = status === "ready" ? detectCollectionGaps(profile) : [];
  const overlaps = status === "ready" ? detectCollectionOverlaps(profile) : [];
  const direction = status === "ready" ? determineNextCollectionDirection(profile) : null;
  const recommendationSet = direction
    ? buildCollectionGrowthRecommendationSet(items, candidates, direction.intent, confidence)
    : null;

  return {
    status,
    confidence,
    statusMessage:
      status === "empty"
        ? "Добавьте первые часы, чтобы начать формировать профиль коллекции."
        : confidence === "initial"
          ? "Начальная подборка опирается только на известные признаки одной модели."
          : confidence === "medium"
            ? "Подборка учитывает подтвержденные сочетания вашей коллекции."
            : "Профиль достаточно полный для точной персональной подборки.",
    profile,
    summary: buildCollectionSummary(profile, direction?.title ?? null),
    overlaps,
    gaps,
    direction,
    recommendationSet,
    recommendation: chooseCollectionRecommendation(items, gaps, candidates),
  };
}
