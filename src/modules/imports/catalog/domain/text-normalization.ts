import { normalizeManufacturerReference } from "../../../catalog/domain/reference-normalization";

export function normalizeComparableText(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—―-]+/g, " ")
    .replace(/[_/\\]+/g, " ")
    .replace(/[!"#$%&'()*+,.:;<=>?@[\\\]^`{|}~«»№]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCompactedText(input: string): string {
  return normalizeComparableText(input).replace(/\s+/g, "");
}

export function areTextValuesEquivalent(values: string[]): boolean {
  const normalized = new Set(values.map(normalizeComparableText).filter(Boolean));
  return normalized.size <= 1;
}

export function valueContainsNormalizedReference(value: string, normalizedReference: string): boolean {
  if (!normalizedReference) {
    return false;
  }

  return normalizeCompactedText(value).includes(normalizedReference.toLowerCase());
}

export function tryNormalizeReferenceText(value: string): string | null {
  try {
    return normalizeManufacturerReference(value.normalize("NFKC").trim());
  } catch {
    return null;
  }
}
