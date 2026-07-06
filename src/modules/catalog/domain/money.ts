import { CatalogDomainError } from "@/modules/catalog/domain/errors";

const currencyCodePattern = /^[A-Z]{3}$/;

export type Money = {
  amountMinor: number;
  currencyCode: string;
};

export function createMoney(amountMinor: number, currencyCode: string): Money {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new CatalogDomainError("Money amount must be a non-negative integer in minor units.");
  }

  if (!currencyCodePattern.test(currencyCode)) {
    throw new CatalogDomainError("Currency code must be an uppercase ISO-like three-letter code.");
  }

  return { amountMinor, currencyCode };
}
