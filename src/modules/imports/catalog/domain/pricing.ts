import { createMoney } from "../../../catalog/domain/money";
import type { PriceSource, SourceProvenance, StagedPricing } from "./types";
import { mapCatalogHeader } from "./headers";

const nonDigitPrefixPattern = /^[^\d-]+/;

export function parseMoneyToMinorUnits(rawValue: string): number | null {
  const trimmed = rawValue.normalize("NFKC").trim();

  if (!trimmed || /^[-—–]+$/.test(trimmed)) {
    return null;
  }

  const numeric = trimmed
    .replace(nonDigitPrefixPattern, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\s+/g, "");

  if (!numeric || numeric.includes("-")) {
    return null;
  }

  const decimalSeparatorMatch = numeric.match(/[,.](\d{1,2})$/);
  const cents = decimalSeparatorMatch ? decimalSeparatorMatch[1].padEnd(2, "0") : "00";
  const integerPart = decimalSeparatorMatch
    ? numeric.slice(0, decimalSeparatorMatch.index).replace(/[^\d]/g, "")
    : numeric.replace(/[^\d]/g, "");

  if (!integerPart) {
    return null;
  }

  const amountMinor = Number(`${integerPart}${cents}`);

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return null;
  }

  return amountMinor;
}

export function classifyPriceHeader(rawFieldName: string): {
  currency: string | null;
  visibility: PriceSource["intendedVisibility"];
  isPriceLike: boolean;
  reason?: string;
} {
  const canonical = mapCatalogHeader(rawFieldName);

  if (canonical === "difference") {
    return {
      currency: "RUB",
      visibility: "excluded_from_public",
      isPriceLike: false,
      reason: "Разница is analytical source data, not a public price.",
    };
  }

  if (canonical === "priceCny") {
    return {
      currency: "CNY",
      visibility: "internal",
      isPriceLike: true,
      reason: "Non-RUB price source is internal provenance only.",
    };
  }

  if (
    canonical === "priceRubCalculated" ||
    canonical === "sitePriceRub" ||
    canonical === "marketPriceRub" ||
    canonical === "publicSitePriceRub"
  ) {
    return {
      currency: "RUB",
      visibility: "public_candidate",
      isPriceLike: true,
    };
  }

  return {
    currency: null,
    visibility: "internal",
    isPriceLike: false,
  };
}

export function priceSourceFromField(input: {
  rawFieldName: string;
  rawValue: string;
  sourcePackage: string;
  provenance: SourceProvenance;
}): PriceSource | null {
  const classification = classifyPriceHeader(input.rawFieldName);

  if (!classification.isPriceLike && classification.visibility !== "excluded_from_public") {
    return null;
  }

  const normalizedAmountMinor = parseMoneyToMinorUnits(input.rawValue);

  return {
    rawFieldName: input.rawFieldName,
    sourcePackage: input.sourcePackage,
    currency: classification.currency,
    rawValue: input.rawValue,
    normalizedAmountMinor,
    intendedVisibility: classification.visibility,
    validationState:
      classification.visibility === "excluded_from_public"
        ? "not_a_price"
        : normalizedAmountMinor === null
          ? "invalid"
          : "valid",
    reason: classification.reason,
    provenance: input.provenance,
  };
}

export function buildStagedPricing(priceSources: PriceSource[]): StagedPricing {
  const rubPriceSources = priceSources.filter(
    (source) =>
      source.currency === "RUB" &&
      source.intendedVisibility === "public_candidate" &&
      source.validationState === "valid" &&
      source.normalizedAmountMinor !== null,
  );
  const selectedPublicPriceSource = rubPriceSources.reduce<PriceSource | null>((selected, source) => {
    if (!selected) {
      return source;
    }

    return (source.normalizedAmountMinor ?? 0) > (selected.normalizedAmountMinor ?? 0) ? source : selected;
  }, null);

  return {
    publicPriceCandidate:
      selectedPublicPriceSource?.normalizedAmountMinor !== undefined &&
      selectedPublicPriceSource.normalizedAmountMinor !== null
        ? createMoney(selectedPublicPriceSource.normalizedAmountMinor, "RUB")
        : null,
    selectedPublicPriceSource,
    rubPriceSources,
    nonRubPriceSources: priceSources.filter((source) => source.currency !== "RUB" && source.validationState === "valid"),
    internalAnalyticalValues: priceSources.filter(
      (source) => source.intendedVisibility === "internal" || source.intendedVisibility === "excluded_from_public",
    ),
    allSources: priceSources,
  };
}
