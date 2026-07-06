import type { ImportApplyPlan, MergedCatalogCandidate } from "../domain/types";

function uniqueByKey<T>(items: T[], keyFor: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function buildImportApplyPlan(candidates: MergedCatalogCandidate[]): ImportApplyPlan {
  const referenceEligible = candidates.filter((candidate) => candidate.applyEligibility.referenceApplyEligible);
  const commercialEligible = candidates.filter((candidate) => candidate.applyEligibility.commercialApplyEligible);

  return {
    proposedBrandChanges: uniqueByKey(
      referenceEligible
        .filter((candidate) => candidate.identity.brand)
        .map((candidate) => ({
          brand: candidate.identity.brand ?? "",
          sourceCandidates: [candidate.candidateId],
        })),
      (item) => item.brand.toLowerCase(),
    ),
    proposedBrandCollectionChanges: uniqueByKey(
      referenceEligible
        .filter((candidate) => candidate.identity.brand && candidate.hierarchy.brandCollection)
        .map((candidate) => ({
          brand: candidate.identity.brand ?? "",
          brandCollection: candidate.hierarchy.brandCollection ?? "",
          sourceCandidates: [candidate.candidateId],
        })),
      (item) => `${item.brand.toLowerCase()}:${item.brandCollection.toLowerCase()}`,
    ),
    proposedWatchModelChanges: uniqueByKey(
      referenceEligible
        .filter((candidate) => candidate.identity.brand && candidate.hierarchy.watchModelCandidate)
        .map((candidate) => ({
          brand: candidate.identity.brand ?? "",
          watchModel: candidate.hierarchy.watchModelCandidate ?? "",
          sourceCandidates: [candidate.candidateId],
        })),
      (item) => `${item.brand.toLowerCase()}:${item.watchModel.toLowerCase()}`,
    ),
    proposedWatchReferenceChanges: referenceEligible.map((candidate) => ({
      brand: candidate.identity.brand ?? "",
      reference: candidate.identity.referenceNormalized ?? "",
      displayName: candidate.identity.title ?? "",
      sourceCandidate: candidate.candidateId,
    })),
    proposedCatalogOfferChanges: commercialEligible.map((candidate) => ({
      brand: candidate.identity.brand ?? "",
      reference: candidate.identity.referenceNormalized ?? "",
      publicPriceMinor: candidate.pricing.publicPriceCandidate?.amountMinor ?? 0,
      currencyCode: "RUB",
    })),
    proposedPublicPriceChanges: commercialEligible.map((candidate) => ({
      brand: candidate.identity.brand ?? "",
      reference: candidate.identity.referenceNormalized ?? "",
      priceMinor: candidate.pricing.publicPriceCandidate?.amountMinor ?? 0,
      currencyCode: "RUB",
    })),
    proposedImageUploadCandidates: referenceEligible.flatMap((candidate) =>
      candidate.images.candidates.filter((image) => image.status === "valid"),
    ),
  };
}
