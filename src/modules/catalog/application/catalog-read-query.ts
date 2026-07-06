import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import type { CatalogReadQuery, CatalogSortKey } from "@/modules/catalog/domain/read-models";

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export const catalogPageSize = 24;

const sortKeys: CatalogSortKey[] = ["default", "price_asc", "price_desc", "name_asc"];
const nonDigitPattern = /[^\d]/g;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

function cleanTextParam(value: string | string[] | undefined, maxLength = 120): string {
  return (firstParam(value) ?? "").normalize("NFKC").slice(0, maxLength).trim();
}

function cleanOptionalParam(value: string | string[] | undefined, maxLength = 120): string | null {
  const cleaned = cleanTextParam(value, maxLength);
  return cleaned || null;
}

function parsePage(value: string | string[] | undefined): number {
  const raw = firstParam(value);
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseRubToMinor(value: string | string[] | undefined): number | null {
  const raw = firstParam(value);
  if (!raw) {
    return null;
  }

  const digits = raw.normalize("NFKC").replace(nonDigitPattern, "");
  if (!digits) {
    return null;
  }

  const amountRub = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(amountRub) || amountRub < 0) {
    return null;
  }

  return amountRub * 100;
}

function parseSort(value: string | string[] | undefined): CatalogSortKey {
  const raw = firstParam(value);
  return sortKeys.includes(raw as CatalogSortKey) ? (raw as CatalogSortKey) : "default";
}

export function parseCatalogReadQuery(input: {
  searchParams?: CatalogSearchParams;
  brandSlug?: string | null;
}): CatalogReadQuery {
  const params = input.searchParams ?? {};
  const minPriceMinor = parseRubToMinor(params.priceMin);
  const maxPriceMinor = parseRubToMinor(params.priceMax);

  return {
    search: cleanTextParam(params.q),
    brandSlug: input.brandSlug ?? cleanOptionalParam(params.brand, 80),
    brandCollection: cleanOptionalParam(params.collection),
    movement: cleanOptionalParam(params.movement),
    waterResistance: cleanOptionalParam(params.water),
    caseMaterial: cleanOptionalParam(params.caseMaterial),
    crystal: cleanOptionalParam(params.crystal),
    minPriceMinor,
    maxPriceMinor,
    sort: parseSort(params.sort),
    page: parsePage(params.page),
    pageSize: catalogPageSize,
  };
}

export function normalizeCatalogSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeReferenceSearchText(value: string): string | null {
  try {
    return normalizeManufacturerReference(value);
  } catch {
    return null;
  }
}

export function rubMinorToQueryValue(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  return String(Math.floor(value / 100));
}

export function catalogQueryToSearchParams(
  query: CatalogReadQuery,
  overrides: Partial<CatalogReadQuery> = {},
): URLSearchParams {
  const nextQuery = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (nextQuery.search) params.set("q", nextQuery.search);
  if (nextQuery.brandSlug) params.set("brand", nextQuery.brandSlug);
  if (nextQuery.brandCollection) params.set("collection", nextQuery.brandCollection);
  if (nextQuery.movement) params.set("movement", nextQuery.movement);
  if (nextQuery.waterResistance) params.set("water", nextQuery.waterResistance);
  if (nextQuery.caseMaterial) params.set("caseMaterial", nextQuery.caseMaterial);
  if (nextQuery.crystal) params.set("crystal", nextQuery.crystal);
  if (nextQuery.minPriceMinor !== null) params.set("priceMin", rubMinorToQueryValue(nextQuery.minPriceMinor) ?? "");
  if (nextQuery.maxPriceMinor !== null) params.set("priceMax", rubMinorToQueryValue(nextQuery.maxPriceMinor) ?? "");
  if (nextQuery.sort !== "default") params.set("sort", nextQuery.sort);
  if (nextQuery.page > 1) params.set("page", String(nextQuery.page));

  return params;
}

export function catalogQueryHref(
  pathname: string,
  query: CatalogReadQuery,
  overrides: Partial<CatalogReadQuery> = {},
): string {
  const params = catalogQueryToSearchParams(query, overrides);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
