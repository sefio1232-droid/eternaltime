import type { CatalogImagePresentation, CatalogWatchCard } from "@/modules/catalog/domain/read-models";

export type SelectionScenarioCode =
  | "everyday"
  | "work"
  | "special"
  | "travel"
  | "sport"
  | "first_mechanical"
  | "universal"
  | "collection_gap";

export type SelectionCharacterCode =
  | "quiet"
  | "universal"
  | "expressive"
  | "sporty"
  | "classic"
  | "instrumental";

export type SelectionBudgetCode =
  | "under_15000"
  | "range_15000_30000"
  | "range_30000_50000"
  | "range_50000_100000"
  | "over_100000"
  | "any";

export type SelectionMovementPreference =
  | "any"
  | "quartz"
  | "automatic"
  | "mechanical"
  | "solar"
  | "digital"
  | "ana_digi";

export type SelectionFitCode = "compact" | "medium" | "large" | "unknown";

export type SelectionAttachmentCode = "bracelet" | "leather" | "rubber" | "any";

export type SelectionPracticalCode =
  | "none"
  | "high_water"
  | "sapphire"
  | "chronograph"
  | "date"
  | "gmt"
  | "lume"
  | "shock";

export type SelectionStepCode =
  | "start"
  | "scenario"
  | "character"
  | "budget"
  | "movement"
  | "fit"
  | "attachment"
  | "practical"
  | "results";

export type SelectionAnswerKey =
  | "scenario"
  | "character"
  | "budget"
  | "movement"
  | "fit"
  | "attachment"
  | "practical";

export type SelectionAnswers = {
  scenario: SelectionScenarioCode;
  character: SelectionCharacterCode;
  budget: SelectionBudgetCode;
  movement: SelectionMovementPreference;
  fit: SelectionFitCode;
  attachment: SelectionAttachmentCode;
  practical: SelectionPracticalCode;
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
  characterFit: number;
  budgetFit: number;
  movementFit: number;
  fitFit: number;
  attachmentFit: number;
  practicalFit: number;
  dataConfidence: number;
};

export type SelectionRecommendationRole =
  | "main"
  | "rational_alternative"
  | "expressive_variant"
  | "alternative_direction";

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
  movementKey: string;
  caseDiameterMm: number | null;
  attachmentKey: SelectionAttachmentCode | "unknown";
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
