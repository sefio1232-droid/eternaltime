import type {
  SelectionAnswerKey,
  SelectionAnswers,
  SelectionAttachmentCode,
  SelectionBudgetCode,
  SelectionCharacterCode,
  SelectionFitCode,
  SelectionMovementPreference,
  SelectionPracticalCode,
  SelectionScenarioCode,
  SelectionStepCode,
} from "@/modules/selection/domain/types";

export type SelectionSearchParams = Record<string, string | string[] | undefined>;

const scenarioCodes: SelectionScenarioCode[] = [
  "everyday",
  "work",
  "special",
  "travel",
  "sport",
  "first_mechanical",
  "universal",
  "collection_gap",
];
const characterCodes: SelectionCharacterCode[] = ["quiet", "universal", "expressive", "sporty", "classic", "instrumental"];
const budgetCodes: SelectionBudgetCode[] = [
  "under_15000",
  "range_15000_30000",
  "range_30000_50000",
  "range_50000_100000",
  "over_100000",
  "any",
];
const movementCodes: SelectionMovementPreference[] = [
  "any",
  "quartz",
  "automatic",
  "mechanical",
  "solar",
  "digital",
  "ana_digi",
];
const fitCodes: SelectionFitCode[] = ["compact", "medium", "large", "unknown"];
const attachmentCodes: SelectionAttachmentCode[] = ["bracelet", "leather", "rubber", "any"];
const practicalCodes: SelectionPracticalCode[] = [
  "none",
  "high_water",
  "sapphire",
  "chronograph",
  "date",
  "gmt",
  "lume",
  "shock",
];
const stepCodes: SelectionStepCode[] = [
  "start",
  "scenario",
  "character",
  "budget",
  "movement",
  "fit",
  "attachment",
  "practical",
  "results",
];

const scenarioAliases: Record<string, SelectionScenarioCode> = {
  daily: "everyday",
  everyday: "everyday",
  business: "work",
  work: "work",
  formal: "special",
  special: "special",
};

const budgetAliases: Record<string, SelectionBudgetCode> = {
  under_30000: "range_15000_30000",
  under_70000: "range_50000_100000",
  under_120000: "any",
  over_120000: "over_100000",
};

const movementAliases: Record<string, SelectionMovementPreference> = {
  mechanical: "mechanical",
  automatic: "mechanical",
};

const answerParamKeys: Record<SelectionAnswerKey, string[]> = {
  scenario: ["scenario"],
  character: ["character", "style"],
  budget: ["budget"],
  movement: ["movement"],
  fit: ["fit", "wrist"],
  attachment: ["attachment"],
  practical: ["practical", "water"],
};

const fitAliases: Record<string, SelectionFitCode> = {
  any: "unknown",
  small: "compact",
  medium: "medium",
  large: "large",
};

const characterAliases: Record<string, SelectionCharacterCode> = {
  technical: "instrumental",
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

function option<TCode extends string>(input: {
  value: string | string[] | undefined;
  allowed: readonly TCode[];
  fallback: TCode;
  aliases?: Record<string, TCode>;
}): TCode {
  const raw = firstParam(input.value);
  if (!raw) {
    return input.fallback;
  }

  const normalized = raw.normalize("NFKC").toLowerCase();
  const alias = input.aliases?.[normalized];
  if (alias) {
    return alias;
  }

  return input.allowed.includes(normalized as TCode) ? (normalized as TCode) : input.fallback;
}

export function hasSelectionAnswers(searchParams: SelectionSearchParams): boolean {
  return answeredSelectionKeys(searchParams).length > 0;
}

export function answeredSelectionKeys(searchParams: SelectionSearchParams): SelectionAnswerKey[] {
  return (Object.keys(answerParamKeys) as SelectionAnswerKey[]).filter((answerKey) =>
    answerParamKeys[answerKey].some((paramKey) => firstParam(searchParams[paramKey])),
  );
}

export function parseSelectionAnswers(searchParams: SelectionSearchParams): SelectionAnswers {
  return {
    scenario: option({
      value: searchParams.scenario,
      allowed: scenarioCodes,
      fallback: "everyday",
      aliases: scenarioAliases,
    }),
    character: option({
      value: searchParams.character ?? searchParams.style,
      allowed: characterCodes,
      fallback: "universal",
      aliases: characterAliases,
    }),
    budget: option({
      value: searchParams.budget,
      allowed: budgetCodes,
      fallback: "any",
      aliases: budgetAliases,
    }),
    movement: option({
      value: searchParams.movement,
      allowed: movementCodes,
      fallback: "any",
      aliases: movementAliases,
    }),
    fit: option({
      value: searchParams.fit ?? searchParams.wrist,
      allowed: fitCodes,
      fallback: "unknown",
      aliases: fitAliases,
    }),
    attachment: option({
      value: searchParams.attachment,
      allowed: attachmentCodes,
      fallback: "any",
    }),
    practical: option({
      value: searchParams.practical ?? searchParams.water,
      allowed: practicalCodes,
      fallback: "none",
      aliases: { swim: "high_water", daily: "none", any: "none" },
    }),
  };
}

export function parseSelectionStep(searchParams: SelectionSearchParams): SelectionStepCode {
  return option({
    value: searchParams.step,
    allowed: stepCodes,
    fallback: "start",
  });
}

export function selectionAnswersToSearchParams(
  answers: SelectionAnswers,
  includedKeys?: readonly SelectionAnswerKey[],
): URLSearchParams {
  const params = new URLSearchParams();
  const keys = includedKeys ?? (Object.keys(answerParamKeys) as SelectionAnswerKey[]);
  for (const key of keys) {
    params.set(key, answers[key]);
  }
  return params;
}
