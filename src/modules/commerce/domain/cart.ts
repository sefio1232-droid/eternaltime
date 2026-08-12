import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import {
  commerceCartMaxQuantity,
  type CommerceCartItemInput,
  type CommerceCartSource,
  type CommerceCartStorage,
} from "@/modules/commerce/domain/types";

const sourceSet = new Set<CommerceCartSource>(["catalog", "selection", "journal", "buy_now"]);

export function normalizeCommerceCartQuantity(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(commerceCartMaxQuantity, Math.max(1, Math.trunc(parsed)));
}

export function normalizeCommerceCartItem(input: unknown): CommerceCartItemInput | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const brandSlug = typeof record.brandSlug === "string" ? record.brandSlug.trim() : "";
  const rawReference =
    typeof record.referenceNormalized === "string"
      ? record.referenceNormalized
      : typeof record.normalizedReference === "string"
        ? record.normalizedReference
        : "";
  const source = sourceSet.has(record.source as CommerceCartSource)
    ? (record.source as CommerceCartSource)
    : "catalog";

  if (!brandSlug || !rawReference) {
    return null;
  }

  try {
    return {
      brandSlug,
      referenceNormalized: normalizeManufacturerReference(rawReference),
      quantity: normalizeCommerceCartQuantity(record.quantity),
      source,
      addedAt:
        typeof record.addedAt === "string" && !Number.isNaN(Date.parse(record.addedAt))
          ? record.addedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function parseCommerceCartStorage(raw: string | null): CommerceCartStorage {
  if (!raw) {
    return { schemaVersion: 2, items: [] };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { schemaVersion: 2, items: [] };
    }

    const record = parsed as Record<string, unknown>;
    const rawItems = Array.isArray(record.items) ? record.items : [];
    const merged = mergeCommerceCartItems(rawItems.map(normalizeCommerceCartItem).filter(Boolean) as CommerceCartItemInput[]);

    return { schemaVersion: 2, items: merged };
  } catch {
    return { schemaVersion: 2, items: [] };
  }
}

export function mergeCommerceCartItems(items: CommerceCartItemInput[]): CommerceCartItemInput[] {
  const byIdentity = new Map<string, CommerceCartItemInput>();

  for (const item of items) {
    const normalized = normalizeCommerceCartItem(item);
    if (!normalized) {
      continue;
    }

    const key = `${normalized.brandSlug}:${normalized.referenceNormalized}`;
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, normalized);
      continue;
    }

    byIdentity.set(key, {
      ...existing,
      quantity: normalizeCommerceCartQuantity(existing.quantity + normalized.quantity),
      addedAt: existing.addedAt <= normalized.addedAt ? existing.addedAt : normalized.addedAt,
    });
  }

  return [...byIdentity.values()].sort((left, right) => left.addedAt.localeCompare(right.addedAt));
}

export function serializeCommerceCartStorage(items: CommerceCartItemInput[]): string {
  return JSON.stringify({ schemaVersion: 2, items: mergeCommerceCartItems(items) } satisfies CommerceCartStorage);
}
