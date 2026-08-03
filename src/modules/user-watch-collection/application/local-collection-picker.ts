import type {
  CollectionMovementType,
  CollectionRecommendationCandidate,
} from "@/modules/collection-intelligence/domain/types";

export const localCollectionPickerPageSize = 24;

export type LocalCollectionPickerSort = "quality" | "name" | "price_asc" | "price_desc";

export type LocalCollectionPickerQuery = {
  search: string;
  brand: string;
  movement: "all" | CollectionMovementType;
  sort: LocalCollectionPickerSort;
  page: number;
};

export type LocalCollectionPickerPage = {
  items: CollectionRecommendationCandidate[];
  total: number;
  page: number;
  pageCount: number;
  from: number;
  to: number;
};

function comparableText(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

export function compareCollectionText(left: string, right: string): number {
  const normalizedLeft = comparableText(left);
  const normalizedRight = comparableText(right);
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
}

function stableIdentityCompare(
  left: CollectionRecommendationCandidate,
  right: CollectionRecommendationCandidate,
): number {
  return (
    compareCollectionText(left.brandName, right.brandName) ||
    compareCollectionText(left.displayName, right.displayName) ||
    compareCollectionText(left.referenceDisplay, right.referenceDisplay) ||
    compareCollectionText(left.catalogReferenceId, right.catalogReferenceId)
  );
}

export function listLocalCollectionPickerPage(
  candidates: readonly CollectionRecommendationCandidate[],
  query: LocalCollectionPickerQuery,
): LocalCollectionPickerPage {
  const search = comparableText(query.search.trim());
  const filtered = candidates.filter((candidate) => {
    const matchesSearch =
      !search ||
      comparableText(
        [candidate.displayName, candidate.modelName, candidate.brandName, candidate.referenceDisplay].join(" "),
      ).includes(search);
    const matchesBrand = query.brand === "all" || candidate.brandName === query.brand;
    const matchesMovement = query.movement === "all" || candidate.movementType === query.movement;
    return matchesSearch && matchesBrand && matchesMovement;
  });

  const ordered = filtered.map((candidate, index) => ({ candidate, index }));
  if (query.sort !== "quality") {
    ordered.sort((left, right) => {
      if (query.sort === "name") return stableIdentityCompare(left.candidate, right.candidate);
      const leftPrice = left.candidate.publicPriceMinor;
      const rightPrice = right.candidate.publicPriceMinor;
      if (leftPrice === null && rightPrice !== null) return 1;
      if (leftPrice !== null && rightPrice === null) return -1;
      if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
        return query.sort === "price_asc" ? leftPrice - rightPrice : rightPrice - leftPrice;
      }
      return stableIdentityCompare(left.candidate, right.candidate);
    });
  }

  const total = ordered.length;
  const pageCount = Math.max(1, Math.ceil(total / localCollectionPickerPageSize));
  const page = Math.min(Math.max(1, Math.trunc(query.page) || 1), pageCount);
  const fromIndex = (page - 1) * localCollectionPickerPageSize;
  const items = ordered
    .slice(fromIndex, fromIndex + localCollectionPickerPageSize)
    .map((entry) => entry.candidate);

  return {
    items,
    total,
    page,
    pageCount,
    from: total === 0 ? 0 : fromIndex + 1,
    to: Math.min(total, fromIndex + items.length),
  };
}
