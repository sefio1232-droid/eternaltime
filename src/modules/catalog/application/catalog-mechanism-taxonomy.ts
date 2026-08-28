/**
 * Presentation-layer mechanism normalization (docs/CATALOG_SHOWROOM_RECOVERY.md "Mechanism
 * normalization"). Raw `movement_raw`/`movement_type_raw` import values are messy — brand
 * descriptions ("автоматический механический механизм Orient"), jewel counts, beat rates,
 * feature mentions (Bluetooth, chronograph, radio-sync), and inconsistent casing all appear as
 * literal strings today. Never shown to a public user as a raw filter option; grouped into a
 * small, stable taxonomy instead. Raw values themselves are never altered or discarded — this is
 * a pure read-time classification, same pattern as sanitizeCatalogPublicText/
 * classifyCatalogImageRejection elsewhere in this module.
 */

export type CatalogMechanismGroup = "quartz" | "automatic" | "hand_wound" | "solar" | "digital" | "analog_digital" | "other";

export const mechanismGroupOrder: CatalogMechanismGroup[] = [
  "quartz",
  "automatic",
  "solar",
  "hand_wound",
  "digital",
  "analog_digital",
  "other",
];

export const mechanismGroupLabels: Record<CatalogMechanismGroup, string> = {
  quartz: "Кварц",
  automatic: "Автоматическая механика",
  hand_wound: "Ручной завод",
  solar: "Солнечные / Eco-Drive",
  digital: "Цифровые",
  analog_digital: "Аналого-цифровые",
  other: "Другое",
};

/** Short forms for the one-line card trait chip (the filter panel keeps the fuller
 * `mechanismGroupLabels` wording — a card has room for one or two words, not a full phrase). */
export const mechanismGroupCardLabels: Record<CatalogMechanismGroup, string> = {
  quartz: "Кварц",
  automatic: "Автомат",
  hand_wound: "Механика",
  solar: "Solar",
  digital: "Цифровые",
  analog_digital: "Аналого-цифровые",
  other: "Другое",
};

/**
 * Classifies one raw mechanism string into a stable group. Order matters: solar/analog-digital
 * are checked before the plain "quartz" pattern because values like "солнечный кварцевый
 * механизм Orient" or "Кварцевый аналогово-цифровой" contain "кварц" but describe a more
 * specific category. Returns `null` for an empty/unspecified value — callers should treat that as
 * "no mechanism data," never as its own user-facing filter option (see
 * buildMechanismFacet below).
 */
export function normalizeMechanismGroup(rawValue: string | null | undefined): CatalogMechanismGroup | null {
  if (!rawValue) {
    return null;
  }

  const text = rawValue.normalize("NFKC").toLocaleLowerCase("ru").trim();
  if (!text) {
    return null;
  }

  if (/tough\s*solar|\bsolar\b|eco-?drive|солнечн/iu.test(text)) {
    return "solar";
  }

  // "аналого-цифровой", "аналогово-цифровой", "аналогово-цифровая", etc. — Cyrillic
  // morphological variants of the stem "аналог", not a fixed-length prefix.
  if (/аналог[а-яё]*-?\s*цифров/iu.test(text)) {
    return "analog_digital";
  }

  if (/automatic|автоматич|автоподзавод/iu.test(text)) {
    return "automatic";
  }

  if (/hand[-\s]?wound|ручн(?:ой|ым|ого)\s+завод/iu.test(text)) {
    return "hand_wound";
  }

  if (/quartz|кварц/iu.test(text)) {
    return "quartz";
  }

  if (/цифров/iu.test(text)) {
    return "digital";
  }

  return "other";
}
