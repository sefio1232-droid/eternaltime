import type {
  CollectionAnalysisItem,
  CollectionAttachmentType,
  CollectionDialColorFamily,
  CollectionDimensionCode,
  CollectionMaterialFamily,
  CollectionMovementType,
  CollectionProfile,
  CollectionRole,
  CollectionSizeBand,
  CollectionWearFrequency,
} from "@/modules/collection-intelligence/domain/types";

const completeDimensionCount = 8;

function emptyRoleDistribution(): Record<CollectionRole, number> {
  return {
    daily: 0,
    business: 0,
    formal: 0,
    travel: 0,
    sport: 0,
    outdoor: 0,
    weekend: 0,
  };
}

function increment<T extends string>(distribution: Partial<Record<T, number>>, value: T): void {
  distribution[value] = (distribution[value] ?? 0) + 1;
}

function isKnown(value: string): boolean {
  return value !== "unknown";
}

export function getActiveCollectionItems(items: CollectionAnalysisItem[]): CollectionAnalysisItem[] {
  return items.filter((item) => item.ownershipStatus === "owned");
}

function completenessForItem(item: CollectionAnalysisItem): number {
  let known = 0;
  if (item.roles.length > 0) known += 1;
  if (isKnown(item.movementType)) known += 1;
  if (isKnown(item.dialColorFamily)) known += 1;
  if (isKnown(item.materialFamily)) known += 1;
  if (isKnown(item.sizeBand)) known += 1;
  if (isKnown(item.attachmentType)) known += 1;
  if (isKnown(item.wearFrequency)) known += 1;
  if (item.waterReady !== null) known += 1;
  return known / completeDimensionCount;
}

function findLowConfidenceDimensions(items: CollectionAnalysisItem[]): CollectionDimensionCode[] {
  if (items.length === 0) {
    return [
      "role",
      "movement_type",
      "dial_color_family",
      "material_family",
      "size_band",
      "attachment_type",
      "brand",
      "wear_frequency",
      "water_ready",
    ];
  }

  const knownCounts: Record<CollectionDimensionCode, number> = {
    role: 0,
    movement_type: 0,
    dial_color_family: 0,
    material_family: 0,
    size_band: 0,
    attachment_type: 0,
    brand: 0,
    wear_frequency: 0,
    water_ready: 0,
  };

  for (const item of items) {
    if (item.roles.length > 0) knownCounts.role += 1;
    if (isKnown(item.movementType)) knownCounts.movement_type += 1;
    if (isKnown(item.dialColorFamily)) knownCounts.dial_color_family += 1;
    if (isKnown(item.materialFamily)) knownCounts.material_family += 1;
    if (isKnown(item.sizeBand)) knownCounts.size_band += 1;
    if (isKnown(item.attachmentType)) knownCounts.attachment_type += 1;
    if (item.brandName?.trim()) knownCounts.brand += 1;
    if (isKnown(item.wearFrequency)) knownCounts.wear_frequency += 1;
    if (item.waterReady !== null) knownCounts.water_ready += 1;
  }

  return (Object.entries(knownCounts) as Array<[CollectionDimensionCode, number]>)
    .filter(([, count]) => count / items.length < 0.5)
    .map(([dimension]) => dimension);
}

export function buildCollectionProfile(items: CollectionAnalysisItem[]): CollectionProfile {
  const active = getActiveCollectionItems(items);
  const roleDistribution = emptyRoleDistribution();
  const movementDistribution: Partial<Record<CollectionMovementType, number>> = {};
  const dialDistribution: Partial<Record<CollectionDialColorFamily, number>> = {};
  const materialDistribution: Partial<Record<CollectionMaterialFamily, number>> = {};
  const sizeDistribution: Partial<Record<CollectionSizeBand, number>> = {};
  const attachmentDistribution: Partial<Record<CollectionAttachmentType, number>> = {};
  const brandDistribution: Record<string, number> = {};
  const wearFrequencyDistribution: Partial<Record<CollectionWearFrequency, number>> = {};

  for (const item of active) {
    for (const role of item.roles) roleDistribution[role] += 1;
    if (isKnown(item.movementType)) increment(movementDistribution, item.movementType);
    if (isKnown(item.dialColorFamily)) increment(dialDistribution, item.dialColorFamily);
    if (isKnown(item.materialFamily)) increment(materialDistribution, item.materialFamily);
    if (isKnown(item.sizeBand)) increment(sizeDistribution, item.sizeBand);
    if (isKnown(item.attachmentType)) increment(attachmentDistribution, item.attachmentType);
    if (item.brandName?.trim()) increment(brandDistribution, item.brandName.trim());
    if (isKnown(item.wearFrequency)) increment(wearFrequencyDistribution, item.wearFrequency);
  }

  const purchasePrices = active
    .filter(
      (item) =>
        item.acquisitionCurrencyCode === "RUB" &&
        typeof item.acquisitionPriceMinor === "number" &&
        item.acquisitionPriceMinor > 0,
    )
    .map((item) => item.acquisitionPriceMinor as number)
    .sort((left, right) => left - right);
  const middle = Math.floor(purchasePrices.length / 2);
  const medianPurchasePriceMinor =
    purchasePrices.length === 0
      ? null
      : purchasePrices.length % 2 === 1
        ? purchasePrices[middle] ?? null
        : Math.round(((purchasePrices[middle - 1] ?? 0) + (purchasePrices[middle] ?? 0)) / 2);

  const completeness =
    active.length === 0
      ? 0
      : active.reduce((sum, item) => sum + completenessForItem(item), 0) / active.length;

  return {
    activeCount: active.length,
    archivedCount: items.length - active.length,
    manualCount: active.filter((item) => item.sourceKind === "manual").length,
    catalogLinkedCount: active.filter((item) => item.sourceKind === "catalog").length,
    profileCompleteness: Number(completeness.toFixed(2)),
    lowConfidenceDimensions: findLowConfidenceDimensions(active),
    roleDistribution,
    movementDistribution,
    dialDistribution,
    materialDistribution,
    sizeDistribution,
    attachmentDistribution,
    brandDistribution,
    wearFrequencyDistribution,
    knownPurchasePriceCount: purchasePrices.length,
    medianPurchasePriceMinor,
    waterReadyCount: active.filter((item) => item.waterReady === true).length,
  };
}
