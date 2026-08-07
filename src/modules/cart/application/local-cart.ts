export const localCartSchemaVersion = 1 as const;
export const localCartStorageKey = "eternal-time:cart:v1";

export type LocalCartItemSource = "catalog" | "selection" | "journal";
export type LocalCartPriceSnapshot = { amountMinor: number; currencyCode: "RUB" };
export type LocalCartItem = {
  identity: string;
  brand: string;
  brandSlug: string;
  reference: string;
  referenceSlug: string;
  canonicalHref: string;
  publicPriceSnapshot: LocalCartPriceSnapshot | null;
  quantity: number;
  addedAt: string;
  source: LocalCartItemSource;
};
export type LocalCart = { schemaVersion: typeof localCartSchemaVersion; items: LocalCartItem[] };

export const emptyLocalCart: LocalCart = { schemaVersion: localCartSchemaVersion, items: [] };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isItem(value: unknown): value is LocalCartItem {
  if (!isRecord(value)) return false;
  if (typeof value.brand !== "string" || !value.brand.trim()) return false;
  if (typeof value.reference !== "string" || !value.reference.trim()) return false;
  if (typeof value.brandSlug !== "string" || !slugPattern.test(value.brandSlug)) return false;
  if (typeof value.referenceSlug !== "string" || !slugPattern.test(value.referenceSlug)) return false;
  if (value.identity !== `${value.brandSlug}:${value.referenceSlug}`) return false;
  if (value.canonicalHref !== `/watches/${value.brandSlug}/${value.referenceSlug}`) return false;
  if (!Number.isInteger(value.quantity) || Number(value.quantity) < 1 || Number(value.quantity) > 9) return false;
  if (typeof value.addedAt !== "string" || Number.isNaN(Date.parse(value.addedAt))) return false;
  if (!(["catalog", "selection", "journal"] as unknown[]).includes(value.source)) return false;
  if (value.publicPriceSnapshot !== null) {
    if (!isRecord(value.publicPriceSnapshot)) return false;
    if (!Number.isInteger(value.publicPriceSnapshot.amountMinor) || Number(value.publicPriceSnapshot.amountMinor) < 0) return false;
    if (value.publicPriceSnapshot.currencyCode !== "RUB") return false;
  }
  return true;
}

export function parseLocalCart(raw: string | null): LocalCart {
  if (!raw) return emptyLocalCart;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schemaVersion !== localCartSchemaVersion || !Array.isArray(value.items)) return emptyLocalCart;
    const items = value.items.filter(isItem);
    if (new Set(items.map((item) => item.identity)).size !== items.length) return emptyLocalCart;
    return { schemaVersion: localCartSchemaVersion, items };
  } catch { return emptyLocalCart; }
}

export function serializeLocalCart(cart: LocalCart): string { return JSON.stringify(cart); }
export function removeLocalCartItem(cart: LocalCart, identity: string): LocalCart { return { ...cart, items: cart.items.filter((item) => item.identity !== identity) }; }
export function updateLocalCartQuantity(cart: LocalCart, identity: string, quantity: number): LocalCart {
  const safeQuantity = Math.max(1, Math.min(9, Math.trunc(quantity)));
  return { ...cart, items: cart.items.map((item) => item.identity === identity ? { ...item, quantity: safeQuantity } : item) };
}
export function clearLocalCart(): LocalCart { return emptyLocalCart; }
export function summarizeLocalCart(cart: LocalCart) {
  return cart.items.reduce((summary, item) => ({
    itemCount: summary.itemCount + item.quantity,
    knownTotalMinor: summary.knownTotalMinor + (item.publicPriceSnapshot?.amountMinor ?? 0) * item.quantity,
    unknownPriceCount: summary.unknownPriceCount + (item.publicPriceSnapshot ? 0 : item.quantity),
  }), { itemCount: 0, knownTotalMinor: 0, unknownPriceCount: 0 });
}
