export const localComparisonSchemaVersion = 1 as const;
export const localComparisonStorageKey = "eternal-time:comparison:v1";
export const comparisonMinimumItems = 2;
export const comparisonMaximumItems = 4;

export type ComparisonReference = {
  brandSlug: string;
  referenceSlug: string;
};

export type LocalComparisonItem = ComparisonReference & {
  identity: string;
  brandName: string;
  displayName: string;
  referenceDisplay: string;
  canonicalHref: string;
  addedAt: string;
};

export type LocalComparison = {
  schemaVersion: typeof localComparisonSchemaVersion;
  items: LocalComparisonItem[];
};

export type ComparisonMutationResult = {
  comparison: LocalComparison;
  outcome: "added" | "removed" | "limit_reached";
};

export const emptyLocalComparison: LocalComparison = {
  schemaVersion: localComparisonSchemaVersion,
  items: [],
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function comparisonIdentity(reference: ComparisonReference): string {
  return `${reference.brandSlug}:${reference.referenceSlug}`;
}

function isComparisonItem(value: unknown): value is LocalComparisonItem {
  if (!isRecord(value)) return false;
  if (typeof value.brandSlug !== "string" || !slugPattern.test(value.brandSlug)) return false;
  if (typeof value.referenceSlug !== "string" || !slugPattern.test(value.referenceSlug)) return false;
  if (value.identity !== comparisonIdentity({ brandSlug: value.brandSlug, referenceSlug: value.referenceSlug })) return false;
  if (typeof value.brandName !== "string" || !value.brandName.trim()) return false;
  if (typeof value.displayName !== "string" || !value.displayName.trim()) return false;
  if (typeof value.referenceDisplay !== "string" || !value.referenceDisplay.trim()) return false;
  if (value.canonicalHref !== `/watches/${value.brandSlug}/${value.referenceSlug}`) return false;
  if (typeof value.addedAt !== "string" || Number.isNaN(Date.parse(value.addedAt))) return false;
  return true;
}

export function parseLocalComparison(raw: string | null): LocalComparison {
  if (!raw) return emptyLocalComparison;

  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schemaVersion !== localComparisonSchemaVersion || !Array.isArray(value.items)) {
      return emptyLocalComparison;
    }

    const items = value.items.filter(isComparisonItem).slice(0, comparisonMaximumItems);
    if (new Set(items.map((item) => item.identity)).size !== items.length) return emptyLocalComparison;
    return { schemaVersion: localComparisonSchemaVersion, items };
  } catch {
    return emptyLocalComparison;
  }
}

export function serializeLocalComparison(comparison: LocalComparison): string {
  return JSON.stringify(comparison);
}

export function toggleLocalComparisonItem(
  comparison: LocalComparison,
  item: LocalComparisonItem,
): ComparisonMutationResult {
  if (comparison.items.some((candidate) => candidate.identity === item.identity)) {
    return {
      comparison: { ...comparison, items: comparison.items.filter((candidate) => candidate.identity !== item.identity) },
      outcome: "removed",
    };
  }

  if (comparison.items.length >= comparisonMaximumItems) {
    return { comparison, outcome: "limit_reached" };
  }

  return {
    comparison: { ...comparison, items: [...comparison.items, item] },
    outcome: "added",
  };
}

export function removeLocalComparisonItem(comparison: LocalComparison, identity: string): LocalComparison {
  return { ...comparison, items: comparison.items.filter((item) => item.identity !== identity) };
}

export function mergeLocalComparisonItems(
  comparison: LocalComparison,
  incoming: LocalComparisonItem[],
): LocalComparison {
  const byIdentity = new Map(comparison.items.map((item) => [item.identity, item]));
  for (const item of incoming) {
    if (!byIdentity.has(item.identity) && byIdentity.size < comparisonMaximumItems) byIdentity.set(item.identity, item);
  }
  return { ...comparison, items: [...byIdentity.values()] };
}

export function parseComparisonReferences(value: string | string[] | undefined): ComparisonReference[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];

  const references: ComparisonReference[] = [];
  const seen = new Set<string>();
  for (const token of raw.split(",")) {
    const [brandSlug, referenceSlug, ...rest] = token.trim().split(":");
    if (rest.length > 0 || !brandSlug || !referenceSlug) continue;
    if (!slugPattern.test(brandSlug) || !slugPattern.test(referenceSlug)) continue;
    const identity = comparisonIdentity({ brandSlug, referenceSlug });
    if (seen.has(identity)) continue;
    seen.add(identity);
    references.push({ brandSlug, referenceSlug });
    if (references.length === comparisonMaximumItems) break;
  }
  return references;
}

export function buildComparisonHref(items: ComparisonReference[]): string {
  const references = items.slice(0, comparisonMaximumItems).map(comparisonIdentity);
  if (references.length === 0) return "/compare";
  const query = new URLSearchParams({ refs: references.join(",") });
  return `/compare?${query.toString()}`;
}
