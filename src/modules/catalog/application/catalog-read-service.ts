import {
  normalizeCatalogSearchText,
  normalizeReferenceSearchText,
} from "@/modules/catalog/application/catalog-read-query";
import type {
  CatalogFilterFacets,
  CatalogFilterOption,
  CatalogBrandDiscovery,
  CatalogListResult,
  CatalogPublicSpecification,
  CatalogReadDataset,
  CatalogReadQuery,
  CatalogWatchCard,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";

const filterSpecKeys = {
  movement: ["movement_type_raw", "movement_raw"],
  waterResistance: ["water_resistance_raw"],
  caseMaterial: ["case_material_raw"],
  crystal: ["crystal_type_raw"],
} as const;

function findSpecificationValue(watch: CatalogWatchDetail, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = watch.specifications.find((specification) => specification.key === key)?.value.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function matchesSearch(watch: CatalogWatchDetail, search: string): boolean {
  if (!search) {
    return true;
  }

  const normalizedSearch = normalizeCatalogSearchText(search);
  const normalizedReferenceSearch = normalizeReferenceSearchText(search);
  const publicIdentityText = normalizeCatalogSearchText(
    [
      watch.brandName,
      watch.title,
      watch.officialName,
      watch.watchModelName,
      watch.referenceDisplay,
      watch.referenceNormalized,
      watch.brandCollectionName,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return (
    (!!normalizedSearch && publicIdentityText.includes(normalizedSearch)) ||
    (!!normalizedReferenceSearch && watch.referenceNormalized.includes(normalizedReferenceSearch))
  );
}

function matchesQuery(watch: CatalogWatchDetail, query: CatalogReadQuery): boolean {
  if (query.brandSlug && watch.brandSlug !== query.brandSlug) {
    return false;
  }

  if (query.brandCollection && watch.brandCollectionName !== query.brandCollection) {
    return false;
  }

  if (query.movement && findSpecificationValue(watch, filterSpecKeys.movement) !== query.movement) {
    return false;
  }

  if (query.waterResistance && findSpecificationValue(watch, filterSpecKeys.waterResistance) !== query.waterResistance) {
    return false;
  }

  if (query.caseMaterial && findSpecificationValue(watch, filterSpecKeys.caseMaterial) !== query.caseMaterial) {
    return false;
  }

  if (query.crystal && findSpecificationValue(watch, filterSpecKeys.crystal) !== query.crystal) {
    return false;
  }

  const priceMinor = watch.publicPrice?.amountMinor ?? null;
  if (query.minPriceMinor !== null && (priceMinor === null || priceMinor < query.minPriceMinor)) {
    return false;
  }

  if (query.maxPriceMinor !== null && (priceMinor === null || priceMinor > query.maxPriceMinor)) {
    return false;
  }

  return matchesSearch(watch, query.search);
}

function searchRank(watch: CatalogWatchDetail, search: string): number {
  if (!search) {
    return 0;
  }

  const normalizedSearch = normalizeCatalogSearchText(search);
  const normalizedReferenceSearch = normalizeReferenceSearchText(search);

  if (normalizedReferenceSearch && watch.referenceNormalized === normalizedReferenceSearch) {
    return 0;
  }

  if (normalizedReferenceSearch && watch.referenceNormalized.startsWith(normalizedReferenceSearch)) {
    return 1;
  }

  if (normalizeCatalogSearchText(watch.title).startsWith(normalizedSearch)) {
    return 2;
  }

  if (normalizeCatalogSearchText(watch.brandName) === normalizedSearch) {
    return 3;
  }

  return 4;
}

function sortWatches(watches: CatalogWatchDetail[], query: CatalogReadQuery): CatalogWatchDetail[] {
  return watches
    .map((watch, sourceOrder) => ({ watch, sourceOrder }))
    .sort((left, right) => {
      if (query.sort === "price_asc") {
        const leftPrice = left.watch.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY;
        const rightPrice = right.watch.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY;
        return leftPrice - rightPrice || left.watch.title.localeCompare(right.watch.title, "ru");
      }

      if (query.sort === "price_desc") {
        const leftPrice = left.watch.publicPrice?.amountMinor ?? Number.NEGATIVE_INFINITY;
        const rightPrice = right.watch.publicPrice?.amountMinor ?? Number.NEGATIVE_INFINITY;
        return rightPrice - leftPrice || left.watch.title.localeCompare(right.watch.title, "ru");
      }

      if (query.sort === "name_asc") {
        return left.watch.title.localeCompare(right.watch.title, "ru") || left.sourceOrder - right.sourceOrder;
      }

      if (query.search) {
        return (
          searchRank(left.watch, query.search) - searchRank(right.watch, query.search) ||
          left.watch.brandName.localeCompare(right.watch.brandName, "ru") ||
          left.watch.title.localeCompare(right.watch.title, "ru") ||
          left.sourceOrder - right.sourceOrder
        );
      }

      return left.sourceOrder - right.sourceOrder;
    })
    .map((entry) => entry.watch);
}

function optionFromCounts(counts: Map<string, number>): CatalogFilterOption[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ru"));
}

function increment(counts: Map<string, number>, value: string | null): void {
  if (!value) {
    return;
  }

  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function buildFacets(watches: CatalogWatchDetail[]): CatalogFilterFacets {
  const brands = new Map<string, { label: string; count: number }>();
  const brandCollections = new Map<string, number>();
  const movements = new Map<string, number>();
  const waterResistance = new Map<string, number>();
  const caseMaterials = new Map<string, number>();
  const crystalTypes = new Map<string, number>();
  let minMinor: number | null = null;
  let maxMinor: number | null = null;
  let pricedRecordCount = 0;

  for (const watch of watches) {
    const brand = brands.get(watch.brandSlug);
    brands.set(watch.brandSlug, {
      label: watch.brandName,
      count: (brand?.count ?? 0) + 1,
    });
    increment(brandCollections, watch.brandCollectionName);
    increment(movements, findSpecificationValue(watch, filterSpecKeys.movement));
    increment(waterResistance, findSpecificationValue(watch, filterSpecKeys.waterResistance));
    increment(caseMaterials, findSpecificationValue(watch, filterSpecKeys.caseMaterial));
    increment(crystalTypes, findSpecificationValue(watch, filterSpecKeys.crystal));

    if (watch.publicPrice) {
      pricedRecordCount += 1;
      minMinor = minMinor === null ? watch.publicPrice.amountMinor : Math.min(minMinor, watch.publicPrice.amountMinor);
      maxMinor = maxMinor === null ? watch.publicPrice.amountMinor : Math.max(maxMinor, watch.publicPrice.amountMinor);
    }
  }

  return {
    brands: [...brands.entries()]
      .map(([value, entry]) => ({ value, label: entry.label, count: entry.count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ru")),
    brandCollections: optionFromCounts(brandCollections),
    movements: optionFromCounts(movements),
    waterResistance: optionFromCounts(waterResistance),
    caseMaterials: optionFromCounts(caseMaterials),
    crystalTypes: optionFromCounts(crystalTypes),
    price: {
      minMinor,
      maxMinor,
      currencyCode: "RUB",
      pricedRecordCount,
    },
  };
}

export function toCatalogWatchCard(watch: CatalogWatchDetail): CatalogWatchCard {
  return {
    id: watch.id,
    href: watch.href,
    brandName: watch.brandName,
    brandSlug: watch.brandSlug,
    title: watch.title,
    officialName: watch.officialName,
    referenceDisplay: watch.referenceDisplay,
    referenceNormalized: watch.referenceNormalized,
    referenceSlug: watch.referenceSlug,
    brandCollectionName: watch.brandCollectionName,
    watchModelName: watch.watchModelName,
    publicPrice: watch.publicPrice,
    primaryImage: watch.primaryImage,
    keySpecifications: watch.keySpecifications,
  };
}

export function listCatalogWatches(dataset: CatalogReadDataset, query: CatalogReadQuery): CatalogListResult {
  const filtered = dataset.watches.filter((watch) => matchesQuery(watch, query));
  const sorted = sortWatches(filtered, query);
  const pageCount = Math.max(1, Math.ceil(sorted.length / query.pageSize));
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * query.pageSize;
  const items = sorted.slice(offset, offset + query.pageSize).map(toCatalogWatchCard);

  return {
    source: dataset.source,
    totalRecords: sorted.length,
    items,
    query: { ...query, page },
    facets: buildFacets(filtered),
    page,
    pageSize: query.pageSize,
    pageCount,
  };
}

export function getCatalogBrandBySlug(dataset: CatalogReadDataset, brandSlug: string) {
  return dataset.brands.find((brand) => brand.slug === brandSlug) ?? null;
}

export function listCatalogBrands(dataset: CatalogReadDataset): CatalogBrandDiscovery[] {
  return dataset.brands.map((brand) => {
    const watches = dataset.watches.filter((watch) => watch.brandSlug === brand.slug);
    const collectionNames = [...new Set(watches.map((watch) => watch.brandCollectionName).filter(Boolean) as string[])]
      .sort((left, right) => left.localeCompare(right, "ru"))
      .slice(0, 10);

    return {
      ...brand,
      collectionNames,
      representativeWatches: watches.slice(0, 4).map(toCatalogWatchCard),
    };
  });
}

export function getCatalogWatchByRoute(
  dataset: CatalogReadDataset,
  input: { brandSlug: string; referenceSlug: string },
): CatalogWatchDetail | null {
  return dataset.watches.find(
    (watch) => watch.brandSlug === input.brandSlug && watch.referenceSlug === input.referenceSlug,
  ) ?? null;
}

export function groupSpecificationsByPublicSection(specifications: CatalogPublicSpecification[]) {
  return specifications.reduce<Record<string, CatalogPublicSpecification[]>>((groups, specification) => {
    groups[specification.group] ??= [];
    groups[specification.group]?.push(specification);
    return groups;
  }, {});
}
