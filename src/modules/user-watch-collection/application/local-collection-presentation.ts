import type {
  CollectionProfile,
  CollectionRecommendationCandidate,
} from "@/modules/collection-intelligence/domain/types";
import type { LocalCollectionWatch } from "@/modules/user-watch-collection/application/local-collection";

export type CollectionShelfLayout = "empty" | "single" | "split" | "triad" | "standard" | "many";

export type CollectionWatchMediaPresentation = "compact" | "standard" | "large" | "wide";

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
    { code: "roles", label: "Сценарии", values: knownDistributionValues(profile.roleDistribution, profileMatrixLabels.roles) },
    { code: "movements", label: "Механизмы", values: knownDistributionValues(profile.movementDistribution, profileMatrixLabels.movements) },
    { code: "attachments", label: "Ремень и браслет", values: knownDistributionValues(profile.attachmentDistribution, profileMatrixLabels.attachments) },
    { code: "sizes", label: "Размер", values: knownDistributionValues(profile.sizeDistribution, profileMatrixLabels.sizes) },
    { code: "colors", label: "Цвет", values: knownDistributionValues(profile.dialDistribution, profileMatrixLabels.colors) },
    { code: "wear", label: "Частота ношения", values: knownDistributionValues(profile.wearFrequencyDistribution, profileMatrixLabels.wear) },
    { code: "brands", label: "Бренды", values: Object.entries(profile.brandDistribution).flatMap(([brand, count]) => count > 0 ? [`${brand} — ${count}`] : []) },
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
  const text = `${watch.displayName} ${watch.modelName ?? ""} ${watch.referenceDisplay ?? ""}`;
  if (isRectangularWatch(text)) return "wide";
  if (watch.sizeBand === "oversized" || watch.materialFamily === "resin" || watch.movementType === "smart") return "compact";
  if (/(digital|ana.?digi|g-shock|pro trek|цифров|электронн)/i.test(text)) return "compact";
  if (watch.attachmentType === "leather_strap" || watch.attachmentType === "textile_strap" || watch.sourceKind === "manual") return "large";
  return "standard";
}

export function collectionCandidateMediaPresentation(
  candidate: CollectionRecommendationCandidate,
): CollectionWatchMediaPresentation {
  if (isRectangularWatch(`${candidate.displayName} ${candidate.modelName} ${candidate.referenceDisplay}`)) return "wide";
  if (candidate.caseStyle === "digital_sport" || candidate.sizeBand === "oversized" || candidate.displayType === "digital" || candidate.displayType === "hybrid") return "compact";
  if (candidate.attachmentType === "leather_strap" || candidate.attachmentType === "textile_strap") return "large";
  return "standard";
}
