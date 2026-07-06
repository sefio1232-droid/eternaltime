import { CatalogDomainError } from "@/modules/catalog/domain/errors";

export function assertScoreRange(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new CatalogDomainError(`${label} must be between 0 and 1.`);
  }

  return value;
}
