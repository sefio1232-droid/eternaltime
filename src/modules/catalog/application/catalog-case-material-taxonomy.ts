/**
 * Presentation-layer case-material normalization (docs/CATALOG_SHOWROOM_RECOVERY.md
 * "Case-material normalization", Phase 3.3). Raw `case_material_raw` values are often full
 * sentences describing a bezel/case combination in detail (e.g. "Комбинированный: стальной безель
 * + внутренний корпус из усиленной стекловолокном смолы") — never shown to a public user as a raw
 * filter option. A pure read-time classification; raw values are never altered or discarded.
 */

export type CatalogCaseMaterialGroup = "steel" | "polymer" | "carbon" | "titanium" | "steel_polymer" | "other";

export const caseMaterialGroupOrder: CatalogCaseMaterialGroup[] = ["steel", "polymer", "carbon", "titanium", "steel_polymer", "other"];

export const caseMaterialGroupLabels: Record<CatalogCaseMaterialGroup, string> = {
  steel: "Нержавеющая сталь",
  polymer: "Полимер / смола",
  carbon: "Карбон / композит",
  titanium: "Титан",
  steel_polymer: "Сталь + полимер",
  other: "Другой",
};

const carbonPattern = /карбон|carbon/iu;
const titaniumPattern = /титан|titanium/iu;
// Stems (not the nominative "сталь"/"смола"), so declined forms match too — "стали" (genitive:
// "из нержавеющей стали") and "смолы" (genitive: "из смолы") do not contain the nominative form
// as a literal substring, only the shared stem.
const steelPattern = /стал|steel|металл/iu;
const polymerPattern = /полимер|пластик|смол|resin|plastic/iu;

/**
 * Carbon and titanium are checked first — a "Карбон / нержавеющая сталь" combination reads as its
 * own distinct premium-materials story, not a generic steel+polymer case. Never returns `null`
 * (unlike the other taxonomies): every non-empty raw value is a genuine case description, so an
 * unrecognized one still gets a real, honest "Другой" bucket rather than being dropped from
 * faceting entirely — but for an empty/absent value there is no material to classify.
 */
export function normalizeCaseMaterialGroup(rawValue: string | null | undefined): CatalogCaseMaterialGroup | null {
  if (!rawValue) {
    return null;
  }

  const text = rawValue.normalize("NFKC").toLocaleLowerCase("ru").trim();
  if (!text) {
    return null;
  }

  if (carbonPattern.test(text)) {
    return "carbon";
  }

  if (titaniumPattern.test(text)) {
    return "titanium";
  }

  const hasSteel = steelPattern.test(text);
  const hasPolymer = polymerPattern.test(text);

  if (hasSteel && hasPolymer) {
    return "steel_polymer";
  }

  if (hasSteel) {
    return "steel";
  }

  if (hasPolymer) {
    return "polymer";
  }

  return "other";
}
