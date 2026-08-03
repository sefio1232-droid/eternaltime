import type { OwnershipStatus, UserWatchSourceKind } from "@/modules/user-watch-collection/domain/types";

export type CollectionRole =
  | "daily"
  | "business"
  | "formal"
  | "travel"
  | "sport"
  | "outdoor"
  | "weekend";

export type CollectionMovementType = "automatic" | "manual" | "quartz" | "solar" | "smart" | "unknown";

export type CollectionDialColorFamily =
  | "black"
  | "blue"
  | "white"
  | "silver"
  | "green"
  | "grey"
  | "champagne"
  | "other"
  | "unknown";

export type CollectionMaterialFamily =
  | "steel"
  | "titanium"
  | "ceramic"
  | "resin"
  | "leather"
  | "rubber"
  | "textile"
  | "gold"
  | "unknown";

export type CollectionSizeBand = "small" | "medium" | "large" | "oversized" | "unknown";

export type CollectionAttachmentType =
  | "steel_bracelet"
  | "leather_strap"
  | "rubber_strap"
  | "textile_strap"
  | "other"
  | "unknown";

export type CollectionDisplayType = "analog" | "digital" | "hybrid" | "smart" | "unknown";

export type CollectionCaseStyle =
  | "classic"
  | "chronograph"
  | "diver"
  | "field"
  | "digital_sport"
  | "integrated_sport"
  | "other"
  | "unknown";

export type CollectionWearFrequency = "daily" | "weekly" | "occasionally" | "rarely" | "unknown";

export type CollectionCondition = "new" | "excellent" | "good" | "worn" | "needs_service" | "unknown";

export type CollectionAnalysisItem = {
  id: string;
  displayName: string;
  sourceKind: UserWatchSourceKind;
  ownershipStatus: OwnershipStatus;
  catalogReferenceId: string | null;
  catalogHref: string | null;
  brandName: string | null;
  modelName: string | null;
  referenceDisplay: string | null;
  imageUrl: string | null;
  acquiredAt: string | null;
  acquisitionPriceMinor?: number | null;
  acquisitionCurrencyCode?: string | null;
  roles: CollectionRole[];
  movementType: CollectionMovementType;
  dialColorFamily: CollectionDialColorFamily;
  materialFamily: CollectionMaterialFamily;
  sizeBand: CollectionSizeBand;
  attachmentType: CollectionAttachmentType;
  wearFrequency: CollectionWearFrequency;
  condition: CollectionCondition;
  waterReady: boolean | null;
};

export type CollectionRecommendationCandidate = {
  catalogReferenceId: string;
  href: string;
  displayName: string;
  modelName: string;
  familyKey: string;
  brandName: string;
  referenceDisplay: string;
  imageUrl: string | null;
  publicPriceMinor: number | null;
  currencyCode: string | null;
  roles: CollectionRole[];
  movementType: CollectionMovementType;
  dialColorFamily: CollectionDialColorFamily;
  materialFamily: CollectionMaterialFamily;
  sizeBand: CollectionSizeBand;
  attachmentType: CollectionAttachmentType;
  displayType: CollectionDisplayType;
  caseStyle: CollectionCaseStyle;
  waterReady: boolean | null;
  dataCompleteness: number;
};

export type CollectionDimensionCode =
  | "role"
  | "movement_type"
  | "dial_color_family"
  | "material_family"
  | "size_band"
  | "attachment_type"
  | "brand"
  | "wear_frequency"
  | "water_ready";

export type CollectionGap = {
  code: string;
  dimension: CollectionDimensionCode;
  severity: "low" | "medium" | "high";
  title: string;
  explanation: string;
};

export type CollectionOverlap = {
  code: string;
  dimension: CollectionDimensionCode;
  value: string;
  count: number;
  title: string;
  explanation: string;
};

export type CollectionRecommendation = {
  scenarioCode: string;
  title: string;
  explanation: string;
  candidate: CollectionRecommendationCandidate | null;
  reason: string;
  score: number;
};

export type CollectionRecommendationIntent =
  | "travel"
  | "sport"
  | "formal"
  | "first-mechanical"
  | "colorful-accent"
  | "strap-diversity"
  | "everyday-upgrade";

export type CollectionPriceSegment = "rational" | "balanced" | "upper";

export type CollectionDirection = {
  intent: CollectionRecommendationIntent;
  title: string;
  explanation: string;
  evidence: string[];
  score: number;
};

export type CollectionCandidateScore = {
  candidate: CollectionRecommendationCandidate;
  total: number;
  reasons: string[];
  penalties: string[];
  priceSegment: CollectionPriceSegment;
  interpretation: string;
};

export type CollectionRecommendationSet = {
  intent: CollectionRecommendationIntent;
  title: string;
  explanation: string;
  state: "ready" | "no_match";
  candidates: CollectionCandidateScore[];
  priceFloorMinor: number;
  priceBoundaries: {
    p40Minor: number | null;
    p70Minor: number | null;
    p90Minor: number | null;
  };
};

export type CollectionRecommendationPosition = "exact" | "exploratory";

export type CollectionGrowthCandidate = CollectionCandidateScore & {
  intent: CollectionRecommendationIntent;
  position: CollectionRecommendationPosition;
};

export type CollectionGrowthRecommendationSet = {
  primaryIntent: CollectionRecommendationIntent;
  state: "ready" | "no_match";
  confidence: "initial" | "medium" | "high";
  candidates: CollectionGrowthCandidate[];
  priceFloorMinor: number;
};

export type CollectionProfile = {
  activeCount: number;
  archivedCount: number;
  manualCount: number;
  catalogLinkedCount: number;
  profileCompleteness: number;
  lowConfidenceDimensions: CollectionDimensionCode[];
  roleDistribution: Record<CollectionRole, number>;
  movementDistribution: Partial<Record<CollectionMovementType, number>>;
  dialDistribution: Partial<Record<CollectionDialColorFamily, number>>;
  materialDistribution: Partial<Record<CollectionMaterialFamily, number>>;
  sizeDistribution: Partial<Record<CollectionSizeBand, number>>;
  attachmentDistribution: Partial<Record<CollectionAttachmentType, number>>;
  brandDistribution: Record<string, number>;
  wearFrequencyDistribution: Partial<Record<CollectionWearFrequency, number>>;
  knownPurchasePriceCount: number;
  medianPurchasePriceMinor: number | null;
  waterReadyCount: number;
};

export type CollectionSummary = {
  label: "Начальный профиль" | "Первые закономерности" | "Профиль коллекции";
  text: string;
};

export type CollectionAnalysisResult = {
  status: "empty" | "ready";
  confidence: "initial" | "medium" | "high";
  statusMessage: string;
  summary: CollectionSummary | null;
  profile: CollectionProfile;
  overlaps: CollectionOverlap[];
  gaps: CollectionGap[];
  direction: CollectionDirection | null;
  recommendationSet: CollectionGrowthRecommendationSet | null;
  recommendation: CollectionRecommendation | null;
};
