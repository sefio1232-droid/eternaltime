import type {
  CollectionProfile,
  CollectionRecommendationCandidate,
} from "@/modules/collection-intelligence/domain/types";
import type { LocalCollectionWatch } from "@/modules/user-watch-collection/application/local-collection";

export type CollectionShelfLayout = "empty" | "single" | "split" | "triad" | "standard" | "many";

export type CollectionWatchMediaPresentation =
  | "compact-digital"
  | "standard-digital"
  | "analog-bracelet"
  | "analog-strap"
  | "diver"
  | "oversized-sport"
  | "rectangular"
  | "manual-watch"
  | "missing-image";

export type CollectionProfileMatrixGroup = {
  code: "roles" | "movements" | "attachments" | "sizes" | "colors" | "wear" | "brands";
  label: string;
  values: string[];
};

const profileMatrixLabels = {
  roles: {
    daily: "На каждый день",
    business: "Для работы",
    formal: "Для особых случаев",
    travel: "Для путешествий",
    sport: "Для спорта",
    outdoor: "Для активного отдыха",
    weekend: "На выходные",
  },
  movements: {
    automatic: "Автоматический",
    manual: "С ручным заводом",
    quartz: "Кварцевый",
    solar: "Солнечный",
    smart: "Цифровой / смарт",
  },
  attachments: {
    steel_bracelet: "Стальной браслет",
    leather_strap: "Кожаный ремень",
    rubber_strap: "Каучуковый ремень",
    textile_strap: "Текстильный ремень",
    other: "Другой",
  },
  sizes: {
    small: "До 36 мм",
    medium: "37–41 мм",
    large: "42–44 мм",
    oversized: "От 45 мм",
  },
  colors: {
    black: "Черный",
    blue: "Синий",
    white: "Белый",
    silver: "Серебристый",
    green: "Зеленый",
    grey: "Серый",
    champagne: "Шампань",
    other: "Другой",
  },
  wear: {
    daily: "Часто",
    weekly: "Несколько раз в неделю",
    occasionally: "Иногда",
    rarely: "Редко",
  },
} as const;

function knownDistributionValues(
  distribution: Readonly<Record<string, number | undefined>>,
  labels: Readonly<Record<string, string>>,
): string[] {
  return Object.entries(labels).flatMap(([key, label]) => {
    const count = distribution[key] ?? 0;
    return count > 0 ? [`${label} — ${count}`] : [];
  });
}

export function buildCollectionProfileMatrix(profile: CollectionProfile): CollectionProfileMatrixGroup[] {
  const groups: CollectionProfileMatrixGroup[] = [
    {
      code: "roles",
      label: "Сценарии",
      values: knownDistributionValues(profile.roleDistribution, profileMatrixLabels.roles),
    },
    {
      code: "movements",
      label: "Механизмы",
      values: knownDistributionValues(profile.movementDistribution, profileMatrixLabels.movements),
    },
    {
      code: "attachments",
      label: "Ремень и браслет",
      values: knownDistributionValues(profile.attachmentDistribution, profileMatrixLabels.attachments),
    },
    {
      code: "sizes",
      label: "Размер",
      values: knownDistributionValues(profile.sizeDistribution, profileMatrixLabels.sizes),
    },
    {
      code: "colors",
      label: "Цвет",
      values: knownDistributionValues(profile.dialDistribution, profileMatrixLabels.colors),
    },
    {
      code: "wear",
      label: "Частота ношения",
      values: knownDistributionValues(profile.wearFrequencyDistribution, profileMatrixLabels.wear),
    },
    {
      code: "brands",
      label: "Бренды",
      values: Object.entries(profile.brandDistribution).flatMap(([brand, count]) =>
        count > 0 ? [`${brand} — ${count}`] : [],
      ),
    },
  ];

  return groups.filter((group) => group.values.length > 0);
}

const russianPluralRules = new Intl.PluralRules("ru-RU");

export function russianPluralForm(
  count: number,
  forms: Readonly<{ one: string; few: string; many: string }>,
): string {
  const category = russianPluralRules.select(count);
  if (category === "one") return forms.one;
  if (category === "few") return forms.few;
  return forms.many;
}

export function collectionShelfLayoutForCount(count: number): CollectionShelfLayout {
  if (count <= 0) return "empty";
  if (count === 1) return "single";
  if (count === 2) return "split";
  if (count === 3) return "triad";
  if (count === 4) return "standard";
  return "many";
}

function isRectangularWatch(text: string): boolean {
  return /(rectangular|rectangle|square|tank|carree|каре|прямоугольн|квадратн)/i.test(text);
}

export function collectionWatchMediaPresentation(
  watch: LocalCollectionWatch,
): CollectionWatchMediaPresentation {
  const imageUrl = watch.photoDataUrl ?? watch.imageUrl;
  if (!imageUrl) return "missing-image";
  if (watch.sourceKind === "manual") return "manual-watch";
  if (isRectangularWatch(`${watch.displayName} ${watch.modelName ?? ""} ${watch.referenceDisplay ?? ""}`)) {
    return "rectangular";
  }
  if (watch.sizeBand === "oversized" || (watch.roles.includes("sport") && watch.materialFamily === "resin")) {
    return "oversized-sport";
  }
  if (watch.roles.includes("sport") && watch.waterReady) return "diver";
  if (
    watch.movementType === "smart" ||
    /(digital|ana.?digi|g-shock|pro trek|цифров|электронн)/i.test(
      `${watch.displayName} ${watch.modelName ?? ""}`,
    )
  ) {
    return watch.sizeBand === "small" ? "compact-digital" : "standard-digital";
  }
  if (watch.attachmentType === "steel_bracelet") return "analog-bracelet";
  return "analog-strap";
}

export function collectionCandidateMediaPresentation(
  candidate: CollectionRecommendationCandidate,
): CollectionWatchMediaPresentation {
  if (!candidate.imageUrl) return "missing-image";
  if (isRectangularWatch(`${candidate.displayName} ${candidate.modelName} ${candidate.referenceDisplay}`)) {
    return "rectangular";
  }
  if (candidate.caseStyle === "digital_sport" && candidate.sizeBand === "small") return "compact-digital";
  if (candidate.caseStyle === "digital_sport" || candidate.sizeBand === "oversized") return "oversized-sport";
  if (candidate.caseStyle === "diver") return "diver";
  if (candidate.displayType === "digital" || candidate.displayType === "hybrid") return "standard-digital";
  if (candidate.attachmentType === "steel_bracelet") return "analog-bracelet";
  return "analog-strap";
}
