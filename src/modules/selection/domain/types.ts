import type { CatalogImagePresentation, CatalogWatchCard } from "@/modules/catalog/domain/read-models";

export type SelectionScenarioCode =
  | "daily"
  | "work"
  | "occasion"
  | "sport"
  | "travel"
  | "first-mechanical"
  | "universal";

export type SelectionFitCode = "compact" | "medium" | "large" | "unknown";

export type SelectionCharacterCode = "classic" | "modern" | "sporty" | "expressive" | "neutral";

export type SelectionMovementPreference = "mechanical" | "quartz" | "solar" | "neutral";

export type SelectionFeatureCode =
  | "sapphire"
  | "water-resistance"
  | "steel-bracelet"
  | "leather"
  | "thin"
  | "chronograph"
  | "date"
  | "functions"
  | "none";

export type SelectionBudgetCode =
  | "under_15000"
  | "range_15000_30000"
  | "range_30000_50000"
  | "range_50000_100000"
  | "over_100000"
  | "unknown";

export type SelectionBudgetFitStatus =
  | "ideal"
  | "acceptable_low"
  | "acceptable_high"
  | "too_cheap"
  | "too_expensive"
  | "unknown";

export type SelectionBudgetFallbackTier =
  | "exact_budget_band"
  | "slightly_below"
  | "slightly_above"
  | "broader_below"
  | "broader_above"
  | "unknown_price"
  | "budget_neutral";

export type SelectionBudgetFit = {
  status: SelectionBudgetFitStatus;
  criterionStatus: SelectionCriterionStatus;
  score: number;
  distance: number;
  tier: SelectionBudgetFallbackTier;
  reason: string;
};

export type SelectionStepCode =
  | "start"
  | "scenario"
  | "fit"
  | "character"
  | "movement"
  | "features"
  | "budget"
  | "results";

export type SelectionAnswerKey = "scenario" | "fit" | "character" | "movement" | "features" | "budget";

export type SelectionAnswers = {
  scenario: SelectionScenarioCode;
  fit: SelectionFitCode;
  character: SelectionCharacterCode;
  movement: SelectionMovementPreference;
  features: SelectionFeatureCode[];
  budget: SelectionBudgetCode;
};

export type SelectionOption<TCode extends string> = {
  code: TCode;
  label: string;
  description: string;
};

export type SelectionStepDefinition<TCode extends string = string> = {
  code: Exclude<SelectionStepCode, "start" | "results">;
  answerKey: SelectionAnswerKey;
  eyebrow: string;
  title: string;
  deck: string;
  optional: boolean;
  multiple?: boolean;
  options: SelectionOption<TCode>[];
};

export type SelectionFormDefinition = {
  steps: SelectionStepDefinition[];
};

export type SelectionCriterionStatus = "match" | "unknown" | "conflict" | "neutral";

export type SelectionCriterionEvaluation = {
  key: string;
  label: string;
  status: SelectionCriterionStatus;
  score: number;
  reason: string;
};

export type SelectionScoreBreakdown = {
  scenarioFit: number;
  fitFit: number;
  characterFit: number;
  movementFit: number;
  featureFit: number;
  budgetFit: number;
  dataConfidence: number;
};

export type SelectionRecommendationRole =
  | "main"
  | "rational_alternative"
  | "expressive_variant"
  | "alternative_direction";

export type SelectionActualMovementKey =
  | "mechanical"
  | "quartz"
  | "solar"
  | "digital"
  | "analog-digital"
  | "other"
  | "unknown";

export type SelectionStrapKey =
  | "steel-bracelet"
  | "leather"
  | "rubber"
  | "polymer"
  | "textile"
  | "titanium"
  | "other"
  | "unknown";

export type SelectionRecommendation = {
  watch: CatalogWatchCard;
  imageCandidates: Array<Exclude<CatalogImagePresentation, { kind: "none" }>>;
  score: number;
  matchLabel: string;
  role: SelectionRecommendationRole;
  roleLabel: string;
  roleDescription: string;
  confidenceLabel: string;
  isPreliminary: boolean;
  familyKey: string;
  movementKey: SelectionActualMovementKey;
  caseSizeMm: number | null;
  strapKey: SelectionStrapKey;
  breakdown: SelectionScoreBreakdown;
  criteria: SelectionCriterionEvaluation[];
  reasons: string[];
  compromises: string[];
};

export type SelectionCatalogDiagnostics = {
  totalRecords: number;
  withCanonicalHref: number;
  withPrice: number;
  withCleanPrimaryImage: number;
  byBrand: Array<{ brandName: string; count: number }>;
  scorableRecords: number;
  exclusions: {
    missingIdentity: number;
    missingCanonicalHref: number;
    missingSpecifications: number;
    duplicateIdentity: number;
  };
};
