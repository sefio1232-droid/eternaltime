/**
 * Presentation-layer positioning ("who this watch is marketed for") normalization (docs/
 * CATALOG_SHOWROOM_RECOVERY.md "Positioning filter"). Never inferred from diameter, color, price,
 * or visual style — only from an explicit source field (`watch_type_raw`). Real-data audit: only
 * Tissot's source carries this field at all (Casio/Citizen/Orient have none), and even Tissot's own
 * values are coarser than the four public buckets — "мужские / унисекс" names two categories at
 * once, and "парный комплект" (a matching his-and-hers pair) doesn't correspond to a single
 * positioning bucket. Both are mapped to `unknown` rather than guessed apart; `male` is therefore
 * never produced by this mapping today; whether it will be produced in the future depends entirely
 * on which values genuinely appear in `watch_type_raw` across all brands.
 */

export type CatalogPositioningGroup = "male" | "female" | "unisex" | "unknown";

export const positioningGroupOrder: CatalogPositioningGroup[] = ["male", "female", "unisex", "unknown"];

export const positioningGroupLabels: Record<CatalogPositioningGroup, string> = {
  male: "Мужские",
  female: "Женские",
  unisex: "Унисекс",
  unknown: "Не указано",
};

/**
 * Classifies one raw `watch_type_raw` string into a stable group, or `unknown` for anything that
 * doesn't unambiguously mean exactly one of male/female/unisex. Never returns `null` (unlike the
 * mechanism/water-resistance taxonomies) — "unknown" is itself a real, explicit, user-facing filter
 * value here (docs/CATALOG_SHOWROOM_RECOVERY.md "Positioning filter" §19: "Не указано").
 */
export function normalizePositioningGroup(rawValue: string | null | undefined): CatalogPositioningGroup {
  if (!rawValue) {
    return "unknown";
  }

  const text = rawValue.normalize("NFKC").toLocaleLowerCase("ru").trim();
  if (!text) {
    return "unknown";
  }

  // Ambiguous combined/paired wording — never split apart without a real per-item signal.
  if (/парн|комплект|set\b/iu.test(text)) {
    return "unknown";
  }

  if (/унисекс|unisex/iu.test(text)) {
    // "мужские / унисекс" and similar hedged combinations name unisex as an explicit possibility —
    // the inclusive bucket is the one this data actually supports asserting.
    return "unisex";
  }

  if (/женск|female|women/iu.test(text)) {
    return "female";
  }

  if (/мужск|male|men\b/iu.test(text)) {
    return "male";
  }

  return "unknown";
}
