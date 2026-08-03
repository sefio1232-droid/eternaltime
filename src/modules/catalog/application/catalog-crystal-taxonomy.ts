/**
 * Presentation-layer crystal-type normalization (docs/CATALOG_SHOWROOM_RECOVERY.md "Crystal
 * normalization", Phase 3.3). Raw `crystal_type_raw` values mix manufacturer wording/casing and
 * occasionally state two possible types for the same reference ("минеральное или сапфировое
 * стекло в зависимости от версии") — never shown to a public user as a raw filter option. A pure
 * read-time classification; raw values are never altered or discarded.
 */

export type CatalogCrystalGroup = "sapphire" | "mineral" | "acrylic" | "other";

export const crystalGroupOrder: CatalogCrystalGroup[] = ["sapphire", "mineral", "acrylic", "other"];

export const crystalGroupLabels: Record<CatalogCrystalGroup, string> = {
  sapphire: "Сапфировое",
  mineral: "Минеральное",
  acrylic: "Акриловое / полимерное",
  other: "Другое",
};

const ambiguousEitherPattern = /или/iu;
const sapphirePattern = /сапфир|sapphire/iu;
const mineralPattern = /минерал|mineral/iu;
const acrylicPattern = /акрил|resin|пластик|acrylic/iu;

/**
 * Returns `null` when the source text names two possible crystal types for the same reference
 * without saying which ("...в зависимости от версии") — asserting either one would overstate what
 * the data actually says, so this is treated the same as no data rather than guessed.
 */
export function normalizeCrystalGroup(rawValue: string | null | undefined): CatalogCrystalGroup | null {
  if (!rawValue) {
    return null;
  }

  const text = rawValue.normalize("NFKC").toLocaleLowerCase("ru").trim();
  if (!text) {
    return null;
  }

  if (ambiguousEitherPattern.test(text) && sapphirePattern.test(text) && mineralPattern.test(text)) {
    return null;
  }

  if (sapphirePattern.test(text)) {
    return "sapphire";
  }

  if (acrylicPattern.test(text)) {
    return "acrylic";
  }

  if (mineralPattern.test(text)) {
    return "mineral";
  }

  return "other";
}
