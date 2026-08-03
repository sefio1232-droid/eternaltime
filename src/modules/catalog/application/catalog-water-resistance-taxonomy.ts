/**
 * Presentation-layer water-resistance normalization (docs/CATALOG_SHOWROOM_RECOVERY.md
 * "Water-resistance normalization", Phase 3.3). Raw `water_resistance_raw` values mix units
 * (meters/ATM/bar), languages, and vague marketing phrasing ("водозащита зависит от серии") —
 * never shown to a public user as a raw filter option. A pure read-time classification, same
 * pattern as catalog-mechanism-taxonomy.ts; raw values are never altered or discarded.
 */

export type CatalogWaterResistanceGroup = "splash" | "30m" | "50m" | "100m" | "200m" | "300m_plus";

export const waterResistanceGroupOrder: CatalogWaterResistanceGroup[] = ["splash", "30m", "50m", "100m", "200m", "300m_plus"];

export const waterResistanceGroupLabels: Record<CatalogWaterResistanceGroup, string> = {
  splash: "Защита от брызг / WR",
  "30m": "30 м",
  "50m": "50 м",
  "100m": "100 м",
  "200m": "200 м",
  "300m_plus": "300 м и выше",
};

function metersFromNumber(meters: number): CatalogWaterResistanceGroup {
  if (meters <= 30) return "30m";
  if (meters <= 50) return "50m";
  if (meters <= 100) return "100m";
  if (meters <= 200) return "200m";
  return "300m_plus";
}

// Real data always gives meters directly ("200 метров", "100 м") alongside an ATM/bar figure, but
// this still handles an ATM/bar-only value using the standard depth-rating equivalence (1 ATM ≈
// 10 m) in case a future source row omits the meter figure.
const meterPattern = /(\d+)\s*(?:м(?![а-яё])|метр)/iu;
const atmOrBarPattern = /(\d+)\s*(?:atm|bar|бар)/iu;

/**
 * Returns `null` for genuinely unreliable/vague source text ("водозащита зависит от серии",
 * "повышенная водозащита для спортивной серии", "повседневная водозащита") rather than guessing a
 * depth figure that isn't actually stated — callers must treat `null` as "no reliable water-
 * resistance data," never its own user-facing filter option.
 */
export function normalizeWaterResistanceGroup(rawValue: string | null | undefined): CatalogWaterResistanceGroup | null {
  if (!rawValue) {
    return null;
  }

  const text = rawValue.normalize("NFKC").toLocaleLowerCase("ru").trim();
  if (!text) {
    return null;
  }

  const meterMatch = meterPattern.exec(text);
  if (meterMatch) {
    return metersFromNumber(Number(meterMatch[1]));
  }

  const atmMatch = atmOrBarPattern.exec(text);
  if (atmMatch) {
    return metersFromNumber(Number(atmMatch[1]) * 10);
  }

  if (/защита\s+от\s+брызг|^wr$|^wr\s|\swr$|\swr\s/iu.test(text)) {
    return "splash";
  }

  return null;
}
