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

function referenceAlias(input: {
  brandSlug: string;
  fromReferenceDisplay: string;
  toReferenceDisplay: string;
  reason: string;
}): CatalogReferenceAlias {
  const fromReferenceNormalized = normalizeManufacturerReference(input.fromReferenceDisplay);
  const toReferenceNormalized = normalizeManufacturerReference(input.toReferenceDisplay);
  return {
    brandSlug: input.brandSlug,
    fromReferenceDisplay: input.fromReferenceDisplay,
    fromReferenceNormalized,
    fromReferenceSlug: referenceSlugFromNormalized(fromReferenceNormalized),
    toReferenceDisplay: input.toReferenceDisplay,
    toReferenceNormalized,
    toReferenceSlug: referenceSlugFromNormalized(toReferenceNormalized),
    reason: input.reason,
  };
}

export const catalogReferenceAliases: CatalogReferenceAlias[] = [
  referenceAlias({
    brandSlug: "orient",
    fromReferenceDisplay: "RA-AK0803S10B",
    toReferenceDisplay: "RA-AK0803Y10B",
    reason: "Orient MASTER v2 P0 reference correction",
  }),
  referenceAlias({
    brandSlug: "casio",
    fromReferenceDisplay: "NWA-300H-1AVD",
    toReferenceDisplay: "MWA-300H-1AVD",
    reason: "Casio MASTER FINAL 215 reference_live correction",
  }),
  referenceAlias({
    brandSlug: "casio",
    fromReferenceDisplay: "GA-2210SU-3ADR",
    toReferenceDisplay: "GA-2110SU-3A",
    reason: "Casio MASTER FINAL 215 reference_live correction",
  }),
  referenceAlias({
    brandSlug: "casio",
    fromReferenceDisplay: "GW-B56000-BC1B",
    toReferenceDisplay: "GW-B5600BC-1B",
    reason: "Casio MASTER FINAL 215 reference_live correction",
  }),
  referenceAlias({
    brandSlug: "casio",
    fromReferenceDisplay: "GM-21000MWG-1A",
    toReferenceDisplay: "GM-2100MWG-1A",
    reason: "Casio MASTER FINAL 215 reference_live correction",
  }),
  referenceAlias({
    brandSlug: "casio",
    fromReferenceDisplay: "GA-B001AH-6",
    toReferenceDisplay: "GA-B001AH-6A",
    reason: "Casio MASTER FINAL 215 reference_live correction",
  }),
  referenceAlias({
    brandSlug: "casio",
    fromReferenceDisplay: "GWF-A1000BRT",
    toReferenceDisplay: "GWF-A1000BRT-1A",
    reason: "Casio MASTER FINAL 215 reference_live correction",
  }),
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
