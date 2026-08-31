import { normalizeManufacturerReference, referenceSlugFromNormalized } from "@/modules/catalog/domain/reference-normalization";

export type CatalogReferenceAlias = {
  brandSlug: string;
  fromReferenceDisplay: string;
  fromReferenceNormalized: string;
  fromReferenceSlug: string;
  toReferenceDisplay: string;
  toReferenceNormalized: string;
  toReferenceSlug: string;
  reason: string;
};

export const catalogReferenceAliases: CatalogReferenceAlias[] = [
  {
    brandSlug: "orient",
    fromReferenceDisplay: "RA-AK0803S10B",
    fromReferenceNormalized: normalizeManufacturerReference("RA-AK0803S10B"),
    fromReferenceSlug: referenceSlugFromNormalized(normalizeManufacturerReference("RA-AK0803S10B")),
    toReferenceDisplay: "RA-AK0803Y10B",
    toReferenceNormalized: normalizeManufacturerReference("RA-AK0803Y10B"),
    toReferenceSlug: referenceSlugFromNormalized(normalizeManufacturerReference("RA-AK0803Y10B")),
    reason: "Orient MASTER v2 P0 reference correction",
  },
];

export function resolveCatalogReferenceAlias(input: {
  brandSlug: string;
  referenceSlug?: string | null;
  referenceNormalized?: string | null;
}): CatalogReferenceAlias | null {
  const normalized = input.referenceNormalized ? normalizeManufacturerReference(input.referenceNormalized) : null;

  return (
    catalogReferenceAliases.find(
      (alias) =>
        alias.brandSlug === input.brandSlug &&
        ((input.referenceSlug && alias.fromReferenceSlug === input.referenceSlug) ||
          (normalized && alias.fromReferenceNormalized === normalized)),
    ) ?? null
  );
}
