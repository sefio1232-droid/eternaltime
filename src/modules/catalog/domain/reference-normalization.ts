import { CatalogDomainError } from "@/modules/catalog/domain/errors";

const referenceCharacterPattern = /[^\p{Letter}\p{Number}]/gu;
const asciiSlugCharacterPattern = /[^a-z0-9]+/g;

export function normalizeManufacturerReference(input: string): string {
  const normalized = input
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(referenceCharacterPattern, "");

  if (!normalized) {
    throw new CatalogDomainError("Manufacturer reference normalization produced an empty value.");
  }

  return normalized;
}

export function referenceSlugFromNormalized(normalizedReference: string): string {
  const slug = normalizedReference
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(asciiSlugCharacterPattern, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new CatalogDomainError("Manufacturer reference slug produced an empty value.");
  }

  return slug;
}

export function referenceSlugFromDisplay(referenceDisplay: string): string {
  return referenceSlugFromNormalized(normalizeManufacturerReference(referenceDisplay));
}
