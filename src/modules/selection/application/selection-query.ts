import type {
  SelectionAnswerKey,
  SelectionAnswers,
  SelectionBudgetCode,
  SelectionCharacterCode,
  SelectionDialColorPreference,
  SelectionFeatureCode,
  SelectionFitCode,
  SelectionMovementPreference,
  SelectionScenarioCode,
  SelectionStepCode,
} from "@/modules/selection/domain/types";

export type SelectionSearchParams = Record<string, string | string[] | undefined>;

const scenarioCodes: SelectionScenarioCode[] = [
  "daily",
  "work",
  "occasion",
  "sport",
  "travel",
  "first-mechanical",
  "universal",
];
const fitCodes: SelectionFitCode[] = ["compact", "medium", "large", "unknown"];
const characterCodes: SelectionCharacterCode[] = ["classic", "modern", "sporty", "expressive", "neutral"];
const movementCodes: SelectionMovementPreference[] = ["mechanical", "quartz", "solar", "neutral"];
const dialColorCodes: SelectionDialColorPreference[] = ["light", "dark", "blue", "green", "other", "neutral"];
const featureCodes: SelectionFeatureCode[] = [
  "sapphire",
  "water-resistance",
  "steel-bracelet",
  "leather",
  "thin",
  "chronograph",
  "date",
  "functions",
  "none",
];
const budgetCodes: SelectionBudgetCode[] = [
  "under_15000",
  "range_15000_30000",
  "range_30000_50000",
  "range_50000_100000",
  "over_100000",
  "unknown",
];
const stepCodes: SelectionStepCode[] = [
  "start",
  "scenario",
  "fit",
  "character",
  "movement",
  "dial-color",
  "features",
  "budget",
  "results",
];

const scenarioAliases: Record<string, SelectionScenarioCode> = {
  daily: "daily",
  everyday: "daily",
  business: "work",
  work: "work",
  formal: "occasion",
  special: "occasion",
  occasion: "occasion",
  first_mechanical: "first-mechanical",
  "first-mechanical": "first-mechanical",
  collection_gap: "universal",
};

const characterAliases: Record<string, SelectionCharacterCode> = {
  quiet: "classic",
  universal: "modern",
  instrumental: "sporty",
  technical: "sporty",
  classic: "classic",
  expressive: "expressive",
  sporty: "sporty",
  neutral: "neutral",
};

const movementAliases: Record<string, SelectionMovementPreference> = {
  any: "neutral",
  automatic: "mechanical",
  mechanical: "mechanical",
  hand_wound: "mechanical",
  manual: "mechanical",
  quartz: "quartz",
  digital: "quartz",
  ana_digi: "quartz",
  "analog-digital": "quartz",
  analog_digital: "quartz",
  solar: "solar",
  "eco-drive": "solar",
  ecodrive: "solar",
};

const budgetAliases: Record<string, SelectionBudgetCode> = {
  any: "unknown",
  under_30000: "range_15000_30000",
  under_70000: "range_50000_100000",
  under_120000: "unknown",
  over_120000: "over_100000",
};

const dialColorAliases: Record<string, SelectionDialColorPreference> = {
  any: "neutral",
  indifferent: "neutral",
  neutral: "neutral",
  none: "neutral",
  white: "light",
  silver: "light",
  champagne: "light",
  cream: "light",
  ivory: "light",
  beige: "light",
  mop: "light",
  mother_of_pearl: "light",
  black: "dark",
  charcoal: "dark",
  grey: "dark",
  gray: "dark",
  blue: "blue",
  navy: "blue",
  green: "green",
};

const fitAliases: Record<string, SelectionFitCode> = {
  any: "unknown",
  small: "compact",
  medium: "medium",
  large: "large",
};

const featureAliases: Record<string, SelectionFeatureCode> = {
  high_water: "water-resistance",
  water: "water-resistance",
  swim: "water-resistance",
  bracelet: "steel-bracelet",
  steel: "steel-bracelet",
  steel_bracelet: "steel-bracelet",
  gmt: "functions",
  lume: "functions",
  shock: "functions",
  any: "none",
};

const stepAliases: Record<string, SelectionStepCode> = {
  attachment: "features",
  practical: "features",
  dial: "dial-color",
  color: "dial-color",
  dial_color: "dial-color",
  dialcolor: "dial-color",
};

export const answerParamKeys: Record<SelectionAnswerKey, string[]> = {
  scenario: ["scenario"],
  fit: ["fit", "wrist"],
  character: ["character", "style"],
  movement: ["movement"],
  dialColor: ["dialColor", "dial", "dial_color"],
  features: ["features", "feature", "practical", "water", "attachment"],
  budget: ["budget"],
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

function valuesFromParam(value: string | string[] | undefined): string[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];
  return rawValues
    .flatMap((raw) => raw.split(","))
    .map((raw) => raw.normalize("NFKC").toLowerCase().trim())
    .filter(Boolean);
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

export function normalizeSelectionFeatures(values: readonly string[]): SelectionFeatureCode[] {
  const selected = values
    .map((value) => value.normalize("NFKC").toLowerCase().trim())
    .map((value) => featureAliases[value] ?? value)
    .filter((value): value is SelectionFeatureCode => featureCodes.includes(value as SelectionFeatureCode));

  const unique = [...new Set(selected)];
  if (unique.length === 0) {
    return ["none"];
  }

  const ordered = featureCodes.filter((feature) => unique.includes(feature));

  if (ordered.includes("none")) {
    const realFeatures = ordered.filter((feature) => feature !== "none");
    return realFeatures.length > 0 ? realFeatures : ["none"];
  }

  return ordered;
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
  const featureValues = [
    ...valuesFromParam(searchParams.features),
    ...valuesFromParam(searchParams.feature),
    ...valuesFromParam(searchParams.practical),
    ...valuesFromParam(searchParams.water),
    ...valuesFromParam(searchParams.attachment),
  ];

  return {
    scenario: option({
      value: searchParams.scenario,
      allowed: scenarioCodes,
      fallback: "daily",
      aliases: scenarioAliases,
    }),
    fit: option({
      value: searchParams.fit ?? searchParams.wrist,
      allowed: fitCodes,
      fallback: "unknown",
      aliases: fitAliases,
    }),
    character: option({
      value: searchParams.character ?? searchParams.style,
      allowed: characterCodes,
      fallback: "neutral",
      aliases: characterAliases,
    }),
    movement: option({
      value: searchParams.movement,
      allowed: movementCodes,
      fallback: "neutral",
      aliases: movementAliases,
    }),
    dialColor: option({
      value: searchParams.dialColor ?? searchParams.dial_color ?? searchParams.dial,
      allowed: dialColorCodes,
      fallback: "neutral",
      aliases: dialColorAliases,
    }),
    features: normalizeSelectionFeatures(featureValues),
    budget: option({
      value: searchParams.budget,
      allowed: budgetCodes,
      fallback: "unknown",
      aliases: budgetAliases,
    }),
  };
}

export function parseSelectionStep(searchParams: SelectionSearchParams): SelectionStepCode {
  return option({
    value: searchParams.step,
    allowed: stepCodes,
    fallback: "start",
    aliases: stepAliases,
  });
}

function setSelectionParam(params: URLSearchParams, key: SelectionAnswerKey, value: SelectionAnswers[SelectionAnswerKey]) {
  if (key === "features") {
    params.set(key, normalizeSelectionFeatures(value as string[]).join(","));
    return;
  }

  params.set(key, String(value));
}

export function selectionAnswersToSearchParams(
  answers: SelectionAnswers,
  includedKeys?: readonly SelectionAnswerKey[],
): URLSearchParams {
  const params = new URLSearchParams();
  const keys = includedKeys ?? (Object.keys(answerParamKeys) as SelectionAnswerKey[]);
  for (const key of keys) {
    setSelectionParam(params, key, answers[key]);
  }
  return params;
}
