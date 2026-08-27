import {
  normalizeCatalogSearchText,
  normalizeReferenceSearchText,
} from "@/modules/catalog/application/catalog-read-query";
import { classifyCatalogImageRejection } from "@/modules/catalog/application/catalog-image-presentation-policy";
import { mechanismGroupLabels, normalizeMechanismGroup } from "@/modules/catalog/application/catalog-mechanism-taxonomy";
import { waterResistanceGroupLabels, normalizeWaterResistanceGroup } from "@/modules/catalog/application/catalog-water-resistance-taxonomy";
import { caseMaterialGroupLabels, normalizeCaseMaterialGroup } from "@/modules/catalog/application/catalog-case-material-taxonomy";
import { crystalGroupLabels, normalizeCrystalGroup } from "@/modules/catalog/application/catalog-crystal-taxonomy";
import { positioningGroupLabels, normalizePositioningGroup } from "@/modules/catalog/application/catalog-positioning-taxonomy";
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
  positioning: ["watch_type_raw"],
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

  if (query.movement && normalizeMechanismGroup(findSpecificationValue(watch, filterSpecKeys.movement)) !== query.movement) {
    return false;
  }

  if (
    query.waterResistance &&
    normalizeWaterResistanceGroup(findSpecificationValue(watch, filterSpecKeys.waterResistance)) !== query.waterResistance
  ) {
    return false;
  }

  if (query.caseMaterial && normalizeCaseMaterialGroup(findSpecificationValue(watch, filterSpecKeys.caseMaterial)) !== query.caseMaterial) {
    return false;
  }

  if (query.crystal && normalizeCrystalGroup(findSpecificationValue(watch, filterSpecKeys.crystal)) !== query.crystal) {
    return false;
  }

  if (query.positioning && normalizePositioningGroup(findSpecificationValue(watch, filterSpecKeys.positioning)) !== query.positioning) {
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

function hasUsableImage(watch: CatalogWatchDetail): boolean {
  return watch.primaryImage.kind !== "none";
}

/**
 * The "Рекомендуемые" tab's editorial ranking only replaces plain default ordering when the user
 * hasn't already taken explicit control: no search, no explicit sort. A brand tab still uses
 * Recommended's `view` value by default, but ranks with the simpler single-brand
 * `diversifyBrandDefaultOrder` instead of the cross-brand score (see `sortWatches` below) — the
 * score's brand/price-mix signals only make sense when comparing across brands. Recommended is a
 * *ranking*, never a filter: it never changes which watches match, only their order (see
 * `recommendedScore` below) — docs/CATALOG_SHOWROOM_RECOVERY.md "Recommended is a sort".
 */
export function isRecommendedViewActive(query: CatalogReadQuery): boolean {
  return query.view === "recommended" && !query.brandSlug && !query.search && query.sort === "default";
}

const RECOMMENDED_FRONT_SIZE = 24;
const RECOMMENDED_MAX_PER_BRAND = 9;
const RECOMMENDED_MAX_PER_FAMILY = 2;

// Calibrated against the real catalog's own price distribution (p25 ≈ 15 800 ₽, p90 ≈ 90 000 ₽,
// p95 ≈ 120 000 ₽ — see docs/CATALOG_SHOWROOM_RECOVERY.md) — not arbitrary numbers. These are
// *scoring* thresholds, not eligibility gates: every watch is scored and ranked, none excluded.
const RECOMMENDED_SWEET_SPOT_MIN_MINOR = 1_500_000; // ~15 800 ₽
const RECOMMENDED_SWEET_SPOT_MAX_MINOR = 9_000_000; // ~90 000 ₽
const RECOMMENDED_HIGH_OUTLIER_MINOR = 12_000_000; // ~120 000 ₽ (≈ P95)
const RECOMMENDED_LOW_END_MINOR = 1_000_000; // 10 000 ₽ — soft down-rank signal only

/**
 * Per-watch editorial quality score for the Recommended ranking. Deterministic, no
 * Math.random/Date.now, no fake popularity/rating/bestseller signal — every factor is derived
 * from real, already-public data. Diversity (brand/family variety, avoiding consecutive
 * near-duplicates) is deliberately *not* part of this score — a single watch has no "diversity"
 * property in isolation; that's handled afterward by `applyFrontPageDiversityCaps`, which reorders
 * this score-sorted list without ever dropping a watch.
 */
function recommendedScore(watch: CatalogWatchDetail): number {
  let score = 0;

  // Image quality dominates: this is a visual showroom, and a bad/missing photo is the single
  // biggest reason a watch shouldn't lead the page.
  const rejection = classifyCatalogImageRejection(watch.primaryImage, 0);
  if (rejection === "missing") {
    score -= 50;
  } else if (rejection === "contaminated-ui") {
    score -= 40;
  } else if (rejection === "caseback" || rejection === "technical-angle") {
    score -= 30;
  } else if (rejection === "low-contrast") {
    score -= 15;
  } else {
    score += 25;
  }

  // Data completeness.
  const priceMinor = watch.publicPrice?.amountMinor ?? null;
  score += priceMinor !== null ? 10 : -20;
  if (normalizeMechanismGroup(findSpecificationValue(watch, filterSpecKeys.movement))) {
    score += 8;
  }
  score += watch.keySpecifications.length >= 2 ? 6 : watch.keySpecifications.length === 0 ? -6 : 0;

  // Price positioning — a soft signal only, calibrated to the real catalog's own distribution.
  // Mid/upper-mid watches (roughly the real P25–P90 band) get a bonus; extreme top-end outliers
  // get a small penalty unless their other scores already carry them; very low-end watches get a
  // gentle down-rank, never an exclusion — they still appear, just later.
  if (priceMinor !== null) {
    if (priceMinor >= RECOMMENDED_SWEET_SPOT_MIN_MINOR && priceMinor <= RECOMMENDED_SWEET_SPOT_MAX_MINOR) {
      score += 14;
    } else if (priceMinor > RECOMMENDED_HIGH_OUTLIER_MINOR) {
      score -= 6;
    } else if (priceMinor < RECOMMENDED_LOW_END_MINOR) {
      score -= 8;
    }
  }

  return score;
}

/**
 * Reorders a score-sorted list so the first `frontSize` results respect per-brand/per-family caps
 * and avoid immediately repeating the previous pick's brand or family — without ever dropping a
 * watch. Two passes: the first honors the anti-repeat-with-immediate-predecessor rule too (best
 * effort); if that alone can't fill `frontSize` (rare — only when inventory is very concentrated),
 * a second pass relaxes just that rule while still enforcing the hard caps, so the front reaches
 * `frontSize` whenever enough cap-compliant inventory exists at all. Anything left over keeps its
 * relative score order and simply lands on a later page — this is a *reordering*, the full input
 * list is always returned.
 */
// Greedy "best available" selection: at each front-page slot, take the highest-scored remaining
// watch (the input is already score-sorted) that satisfies brand/family caps and the anti-
// immediate-repeat rule, falling back to relaxing only anti-repeat if nothing else qualifies. A
// single forward scan (take-or-defer-forever) is wrong here: once a same-score tier is exhausted
// per brand, it would fall through into a strictly lower-scored tier instead of coming back for
// the next-best remaining item from that same top tier — this re-scans the remaining pool at
// every slot instead, so higher-scored items are never skipped in favor of lower-scored ones.
function applyFrontPageDiversityCaps(sorted: CatalogWatchDetail[], frontSize: number, maxPerBrand: number, maxPerFamily: number): CatalogWatchDetail[] {
  const front: CatalogWatchDetail[] = [];
  const remaining = [...sorted];
  const brandCount = new Map<string, number>();
  const familyCount = new Map<string, number>();
  let lastBrand: string | null = null;
  let lastFamily: string | null = null;

  while (front.length < frontSize && remaining.length > 0) {
    let pickIndex = -1;
    let relaxedPickIndex = -1;

    for (let i = 0; i < remaining.length; i += 1) {
      const watch = remaining[i]!;
      const brand = watch.brandSlug;
      const family = recommendedFamilyKey(watch);
      const brandOk = (brandCount.get(brand) ?? 0) < maxPerBrand;
      const familyOk = (familyCount.get(family) ?? 0) < maxPerFamily;
      if (!brandOk || !familyOk) continue;

      if (relaxedPickIndex === -1) relaxedPickIndex = i;
      const antiRepeatOk = brand !== lastBrand && family !== lastFamily;
      if (antiRepeatOk) {
        pickIndex = i;
        break;
      }
    }

    const chosenIndex = pickIndex !== -1 ? pickIndex : relaxedPickIndex;
    if (chosenIndex === -1) break;

    const [watch] = remaining.splice(chosenIndex, 1);
    front.push(watch!);
    const brand = watch!.brandSlug;
    const family = recommendedFamilyKey(watch!);
    brandCount.set(brand, (brandCount.get(brand) ?? 0) + 1);
    familyCount.set(family, (familyCount.get(family) ?? 0) + 1);
    lastBrand = brand;
    lastFamily = family;
  }

  return [...front, ...remaining];
}

// Brand-scoped: two different brands' collections/models must never collide into the same
// "family" bucket just because they happen to share a label.
function recommendedFamilyKey(watch: CatalogWatchDetail): string {
  return `${watch.brandSlug}:${watch.brandCollectionName ?? watch.watchModelName}`;
}

/**
 * Interleaves a list by a grouping key so consecutive items rarely share a group — e.g. four
 * near-identical Seastar variants no longer cluster together. Uses a largest-remaining-group-
 * first greedy (the standard "reorganize string" scheduling strategy): at each step, picks the
 * group with the most items left that isn't the group just placed, falling back to a repeat only
 * when every other group is exhausted. A naive "column-wise" interleave (round-robin across
 * groups by index) still clusters the tail of a dominant group once smaller groups run out —
 * this doesn't, because it keeps re-evaluating which group is largest after every pick. Stable/
 * deterministic: Map iteration order follows first-insertion order, which follows the input
 * array's own order, so ties break consistently.
 */
function interleaveByFamily<T>(list: T[], familyKey: (item: T) => string): T[] {
  const byFamily = new Map<string, T[]>();
  for (const item of list) {
    const key = familyKey(item);
    const bucket = byFamily.get(key) ?? [];
    bucket.push(item);
    byFamily.set(key, bucket);
  }

  type FamilyGroup = { key: string; items: T[]; cursor: number };
  const groups: FamilyGroup[] = [...byFamily.entries()].map(([key, items]) => ({ key, items, cursor: 0 }));
  const interleaved: T[] = [];
  let lastKey: string | null = null;

  function pickLargest(excludeKey: string | null): FamilyGroup | null {
    let best: FamilyGroup | null = null;
    let bestRemaining = -1;
    for (const group of groups) {
      const remaining = group.items.length - group.cursor;
      if (remaining <= 0 || group.key === excludeKey) {
        continue;
      }
      if (remaining > bestRemaining) {
        best = group;
        bestRemaining = remaining;
      }
    }
    return best;
  }

  while (interleaved.length < list.length) {
    const chosen: FamilyGroup | null = pickLargest(lastKey) ?? pickLargest(null);
    if (!chosen) {
      break;
    }
    interleaved.push(chosen.items[chosen.cursor]);
    chosen.cursor += 1;
    lastKey = chosen.key;
  }

  return interleaved;
}

/**
 * Brand-tab default order: same image-first grouping as the generic default order, but each
 * group (has-image, then image-less) is family-interleaved so a brand's default listing doesn't
 * lead with several near-identical variants of the same line in a row. Pure reordering — never
 * filters, so the brand's full record count is always preserved. Explicit sort/search bypass this
 * entirely (see the `sortWatches` branch order above where this is invoked).
 */
function diversifyBrandDefaultOrder(watches: CatalogWatchDetail[]): CatalogWatchDetail[] {
  const withImage = watches.filter(hasUsableImage);
  const withoutImage = watches.filter((watch) => !hasUsableImage(watch));
  return [...interleaveByFamily(withImage, recommendedFamilyKey), ...interleaveByFamily(withoutImage, recommendedFamilyKey)];
}

/**
 * Recommended ranking: score every watch (see `recommendedScore`), sort by score descending
 * (stable — ties keep their original source order for determinism), then reorder the front of
 * that list for brand/family diversity (see `applyFrontPageDiversityCaps`). Every watch in the
 * input is present in the output — this only ever reorders, never filters.
 */
function rankRecommendedWatches(watches: CatalogWatchDetail[]): CatalogWatchDetail[] {
  const scored = watches
    .map((watch, sourceOrder) => ({ watch, sourceOrder, score: recommendedScore(watch) }))
    .sort((left, right) => right.score - left.score || left.sourceOrder - right.sourceOrder)
    .map((entry) => entry.watch);

  return applyFrontPageDiversityCaps(scored, RECOMMENDED_FRONT_SIZE, RECOMMENDED_MAX_PER_BRAND, RECOMMENDED_MAX_PER_FAMILY);
}

function sortWatches(watches: CatalogWatchDetail[], query: CatalogReadQuery): CatalogWatchDetail[] {
  // Brand-tab default order gets editorial family diversification instead of plain source order
  // (see diversifyBrandDefaultOrder) — an explicit sort or a search query still bypasses this
  // entirely via the branches below, which run first in the underlying comparator when they
  // don't take this early-return path at all.
  if (query.sort === "default" && !query.search && query.brandSlug) {
    return diversifyBrandDefaultOrder(watches);
  }

  return watches
    .map((watch, sourceOrder) => ({ watch, sourceOrder }))
    .sort((left, right) => {
      if (query.sort === "price_asc") {
        const leftPrice = left.watch.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY;
        const rightPrice = right.watch.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY;
        return (
          leftPrice - rightPrice ||
          left.watch.title.localeCompare(right.watch.title, "ru") ||
          left.sourceOrder - right.sourceOrder
        );
      }

      if (query.sort === "price_desc") {
        const leftPrice = left.watch.publicPrice?.amountMinor ?? Number.NEGATIVE_INFINITY;
        const rightPrice = right.watch.publicPrice?.amountMinor ?? Number.NEGATIVE_INFINITY;
        return (
          rightPrice - leftPrice ||
          left.watch.title.localeCompare(right.watch.title, "ru") ||
          left.sourceOrder - right.sourceOrder
        );
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

      // Default order (no explicit sort, no search): a premium catalog's first page should not
      // lead with empty media stages. Watches with a usable primary image sort first; within
      // each group, the original stable source order is preserved. This never removes,
      // re-filters, or hides image-less watches — it only reorders the default view. Explicit
      // price/name sorts above are untouched, and this branch never runs while `query.search`
      // is set (search relevance stays the sole ranking signal for search results).
      const leftHasImage = hasUsableImage(left.watch) ? 0 : 1;
      const rightHasImage = hasUsableImage(right.watch) ? 0 : 1;
      return leftHasImage - rightHasImage || left.sourceOrder - right.sourceOrder;
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
  // Keyed by normalized mechanism group id ("quartz", "automatic", ...), never the raw import
  // string — a user must never see "автоматический механический механизм Orient" as a filter
  // option. Watches with no recognizable mechanism data are simply not counted here (no
  // "unspecified" option is ever shown), per docs/CATALOG_SHOWROOM_RECOVERY.md.
  const movementGroups = new Map<string, number>();
  const waterResistance = new Map<string, number>();
  const caseMaterials = new Map<string, number>();
  const crystalTypes = new Map<string, number>();
  const positioning = new Map<string, number>();
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
    const mechanismGroup = normalizeMechanismGroup(findSpecificationValue(watch, filterSpecKeys.movement));
    increment(movementGroups, mechanismGroup);
    increment(waterResistance, normalizeWaterResistanceGroup(findSpecificationValue(watch, filterSpecKeys.waterResistance)));
    increment(caseMaterials, normalizeCaseMaterialGroup(findSpecificationValue(watch, filterSpecKeys.caseMaterial)));
    increment(crystalTypes, normalizeCrystalGroup(findSpecificationValue(watch, filterSpecKeys.crystal)));
    increment(positioning, normalizePositioningGroup(findSpecificationValue(watch, filterSpecKeys.positioning)));

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
    movements: [...movementGroups.entries()]
      .map(([group, count]) => ({ value: group, label: mechanismGroupLabels[group as keyof typeof mechanismGroupLabels], count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ru")),
    waterResistance: [...waterResistance.entries()]
      .map(([group, count]) => ({ value: group, label: waterResistanceGroupLabels[group as keyof typeof waterResistanceGroupLabels], count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ru")),
    caseMaterials: [...caseMaterials.entries()]
      .map(([group, count]) => ({ value: group, label: caseMaterialGroupLabels[group as keyof typeof caseMaterialGroupLabels], count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ru")),
    crystalTypes: [...crystalTypes.entries()]
      .map(([group, count]) => ({ value: group, label: crystalGroupLabels[group as keyof typeof crystalGroupLabels], count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ru")),
    positioning: [...positioning.entries()]
      .map(([group, count]) => ({ value: group, label: positioningGroupLabels[group as keyof typeof positioningGroupLabels], count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ru")),
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
  // `filtered` reflects only the user's own explicit filters (brand/movement/price/search/etc) —
  // Recommended never removes a watch from this set, it only reorders it (see
  // isRecommendedViewActive/rankRecommendedWatches above). totalRecords, pagination, and facets
  // are all computed from this same set regardless of which tab/sort is active.
  const filtered = dataset.watches.filter((watch) => matchesQuery(watch, query));
  const sorted = isRecommendedViewActive(query) ? rankRecommendedWatches(filtered) : sortWatches(filtered, query);
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
  const normalizedReference = normalizeReferenceSearchText(input.referenceSlug);
  return dataset.watches.find(
    (watch) =>
      watch.brandSlug === input.brandSlug &&
      (watch.referenceSlug === input.referenceSlug ||
        (normalizedReference !== null && watch.referenceNormalized === normalizedReference)),
  ) ?? null;
}

// A stable reading order for specification rows *within* one group (docs/CATALOG_SHOWROOM_
// RECOVERY.md "Specifications ordering") — without this, rows appear in whatever order the raw
// import workbook's columns happened to be in, which varies unpredictably per source package and
// reads as unordered ("характеристики выглядят хорошо, но надо упорядочить" — real user feedback).
// Mirrors the semantic key order already established for labels/groups; a key not listed here
// keeps its original relative position, appended after every known key in its group.
const specificationKeyOrder: string[] = [
  "movement_raw",
  "movement_type_raw",
  "caliber_raw",
  "display_raw",
  "power_source_raw",
  "power_reserve_raw",
  "accuracy_raw",
  "certification_raw",
  "jewel_count_raw",
  "case_material_raw",
  "case_shape_raw",
  "bezel_material_raw",
  "bezel_raw",
  "construction_raw",
  "caseback_raw",
  "crown_raw",
  "case_diameter_raw",
  "case_thickness_raw",
  "case_dimensions_raw",
  "weight_raw",
  "crystal_type_raw",
  "dial_raw",
  "dial_color_raw",
  "dial_markers_raw",
  "gemstones_raw",
  "attachment_material_raw",
  "strap_material_raw",
  "bracelet_material_raw",
  "strap_color_raw",
  "strap_coating_raw",
  "strap_width_raw",
  "clasp_raw",
  "strap_features_raw",
  "water_resistance_raw",
  "functions_raw",
  "watch_type_raw",
  "purpose_raw",
  "luminescence_raw",
  "brand_country_raw",
];

export function groupSpecificationsByPublicSection(specifications: CatalogPublicSpecification[]) {
  const groups = specifications.reduce<Record<string, CatalogPublicSpecification[]>>((acc, specification) => {
    acc[specification.group] ??= [];
    acc[specification.group]?.push(specification);
    return acc;
  }, {});

  for (const group of Object.values(groups)) {
    group.sort((left, right) => {
      const leftOrder = specificationKeyOrder.indexOf(left.key);
      const rightOrder = specificationKeyOrder.indexOf(right.key);
      if (leftOrder === -1 && rightOrder === -1) return 0;
      if (leftOrder === -1) return 1;
      if (rightOrder === -1) return -1;
      return leftOrder - rightOrder;
    });
  }

  return groups;
}

function movementGroupOf(specifications: CatalogPublicSpecification[]): string | null {
  const spec = specifications.find((entry) => entry.key === "movement_type_raw" || entry.key === "movement_raw");
  return spec ? normalizeMechanismGroup(spec.value) : null;
}

/**
 * A simple, transparent "related models" rule for the end of the detail page — a plain scoring
 * formula, not a bespoke ranking model: same brand scores highest, a matching mechanism group adds
 * a smaller boost, and closer price adds a smaller boost still, each independent and easy to
 * explain. Excludes the current watch and anything already shown in "Другие исполнения"
 * (siblingReferences) so the ending never repeats a card the page already showed. Ties break on
 * id for determinism.
 */
export function pickRelatedCatalogWatches(dataset: CatalogReadDataset, watch: CatalogWatchDetail, limit = 4): CatalogWatchCard[] {
  const excludedIds = new Set([watch.id, ...watch.siblingReferences.map((sibling) => sibling.id)]);
  const candidates = dataset.watches.filter((candidate) => !excludedIds.has(candidate.id));
  const watchMovementGroup = movementGroupOf(watch.specifications);
  const watchPriceMinor = watch.publicPrice?.amountMinor ?? null;

  const scored = candidates.map((candidate) => {
    let score = 0;
    if (candidate.brandSlug === watch.brandSlug) {
      score += 100;
    }
    if (watchMovementGroup && movementGroupOf(candidate.keySpecifications) === watchMovementGroup) {
      score += 40;
    }
    if (watchPriceMinor !== null && candidate.publicPrice) {
      const relativeDiff = Math.abs(candidate.publicPrice.amountMinor - watchPriceMinor) / Math.max(watchPriceMinor, 1);
      score += Math.max(0, 30 - relativeDiff * 30);
    }
    return { candidate, score };
  });

  return scored
    .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id, "en"))
    .slice(0, limit)
    .map((entry) => toCatalogWatchCard(entry.candidate));
}

export type CatalogCuratorialPath = {
  key: "everyday" | "first-mechanical" | "travel";
  number: string;
  label: string;
  description: string;
  watch: CatalogWatchCard;
};

/**
 * Picks up to three real watches for the catalog's curatorial module (docs/CATALOG_SHOWROOM_
 * RECOVERY.md "Phase 4 curatorial module") — replaces the old single-watch editorial insert.
 * Three simple, transparent, independent rules (never a recommendation model): an automatic
 * mechanism for "first mechanical", 100m+ water resistance for "travel", and any remaining
 * clean-image watch for "everyday" — each restricted to clean front images (never a caseback/
 * technical/contaminated pick — see `classifyCatalogImageRejection`) and never repeating a watch
 * across paths. A path is
 * simply omitted if the catalog has no qualifying watch left for it — never invented or
 * substituted with an unrelated pick.
 */
export function pickCatalogCuratorialPaths(dataset: CatalogReadDataset): CatalogCuratorialPath[] {
  const clean = dataset.watches.filter((watch) => classifyCatalogImageRejection(watch.primaryImage, 0) === null);
  const used = new Set<string>();

  // Picks the highest-priced qualifying watch, not merely the first one in source order — the
  // curatorial module is meant to showcase something worth featuring, and source order has no
  // relationship to that (real user feedback: the first-match rule kept surfacing whatever
  // inexpensive watch happened to sit early in the source file). Price is the only real,
  // structured "worth featuring" signal the data actually has — never a fabricated one.
  function take(predicate: (watch: CatalogWatchDetail) => boolean): CatalogWatchDetail | null {
    const matches = clean.filter((watch) => !used.has(watch.id) && predicate(watch));
    matches.sort((left, right) => (right.publicPrice?.amountMinor ?? 0) - (left.publicPrice?.amountMinor ?? 0));
    const match = matches[0] ?? null;
    if (match) {
      used.add(match.id);
    }
    return match;
  }

  const firstMechanical = take((watch) => {
    const spec = watch.specifications.find((entry) => entry.key === "movement_type_raw" || entry.key === "movement_raw");
    return spec ? normalizeMechanismGroup(spec.value) === "automatic" : false;
  });

  const travelReadyGroups = new Set(["100m", "200m", "300m_plus"]);
  const travel = take((watch) => {
    const spec = watch.specifications.find((entry) => entry.key === "water_resistance_raw");
    if (!spec) return false;
    const group = normalizeWaterResistanceGroup(spec.value);
    return group !== null && travelReadyGroups.has(group);
  });

  const everyday = take(() => true);

  const candidates: Array<{ key: CatalogCuratorialPath["key"]; number: string; label: string; description: string; watch: CatalogWatchDetail | null }> = [
    { key: "everyday", number: "01", label: "На каждый день", description: "Спокойная модель без узкой роли.", watch: everyday },
    { key: "first-mechanical", number: "02", label: "Первая механика", description: "Понятный автоматический калибр.", watch: firstMechanical },
    { key: "travel", number: "03", label: "Для путешествий", description: "Прочность, водозащита и практичные функции.", watch: travel },
  ];

  return candidates
    .filter((candidate): candidate is typeof candidate & { watch: CatalogWatchDetail } => candidate.watch !== null)
    .map((candidate) => ({ ...candidate, watch: toCatalogWatchCard(candidate.watch) }));
}
