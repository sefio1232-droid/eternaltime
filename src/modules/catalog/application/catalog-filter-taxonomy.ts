import { normalizeMechanismGroup } from "@/modules/catalog/application/catalog-mechanism-taxonomy";
import { normalizePositioningGroup } from "@/modules/catalog/application/catalog-positioning-taxonomy";
import { normalizeCrystalGroup } from "@/modules/catalog/application/catalog-crystal-taxonomy";
import { normalizeWaterResistanceGroup } from "@/modules/catalog/application/catalog-water-resistance-taxonomy";
import { normalizeCaseMaterialGroup } from "@/modules/catalog/application/catalog-case-material-taxonomy";
import type { CatalogPublicSpecification, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

export type CatalogGenderGroup = "male" | "female" | "unisex" | "unknown";
export type CatalogCaseSizeGroup = "compact" | "medium" | "large";
export type CatalogDialColorGroup =
  | "black"
  | "white"
  | "silver"
  | "blue"
  | "light_blue"
  | "green"
  | "cream"
  | "gold"
  | "pink"
  | "red"
  | "brown"
  | "gray"
  | "mother_of_pearl"
  | "other";
export type CatalogStrapMaterialGroup =
  | "steel_bracelet"
  | "leather"
  | "rubber"
  | "polymer"
  | "titanium"
  | "textile"
  | "other";

export const genderGroupOrder: CatalogGenderGroup[] = ["male", "female", "unisex"];

export const genderGroupLabels: Record<CatalogGenderGroup, string> = {
  male: "Мужские",
  female: "Женские",
  unisex: "Унисекс",
  unknown: "Не указано",
};

export const caseSizeGroupOrder: CatalogCaseSizeGroup[] = ["compact", "medium", "large"];

export const caseSizeGroupLabels: Record<CatalogCaseSizeGroup, string> = {
  compact: "Компактные",
  medium: "Средние",
  large: "Крупные",
};

export const dialColorGroupOrder: CatalogDialColorGroup[] = [
  "black",
  "white",
  "silver",
  "blue",
  "light_blue",
  "green",
  "cream",
  "gold",
  "pink",
  "red",
  "brown",
  "gray",
  "mother_of_pearl",
  "other",
];

export const dialColorGroupLabels: Record<CatalogDialColorGroup, string> = {
  black: "Черный",
  white: "Белый",
  silver: "Серебристый",
  blue: "Синий",
  light_blue: "Голубой",
  green: "Зеленый",
  cream: "Бежевый / кремовый",
  gold: "Золотистый",
  pink: "Розовый",
  red: "Красный",
  brown: "Коричневый",
  gray: "Серый",
  mother_of_pearl: "Перламутр",
  other: "Другой",
};

export const dialColorSwatches: Record<CatalogDialColorGroup, string> = {
  black: "#111417",
  white: "#f8f5ed",
  silver: "#c8c8bf",
  blue: "#153f70",
  light_blue: "#8ebfd0",
  green: "#42664a",
  cream: "#d9c7a6",
  gold: "#c39a4a",
  pink: "#d9a2aa",
  red: "#8f2733",
  brown: "#6d4a33",
  gray: "#7f8587",
  mother_of_pearl: "linear-gradient(135deg, #f7f0df 0%, #dfe7ed 42%, #f0d6dd 72%, #f9f5e8 100%)",
  other: "linear-gradient(135deg, #e4ded0 0%, #aab3b6 100%)",
};

export const strapMaterialGroupOrder: CatalogStrapMaterialGroup[] = [
  "steel_bracelet",
  "leather",
  "rubber",
  "polymer",
  "titanium",
  "textile",
  "other",
];

export const strapMaterialGroupLabels: Record<CatalogStrapMaterialGroup, string> = {
  steel_bracelet: "Стальной браслет",
  leather: "Кожаный ремешок",
  rubber: "Каучук / резина",
  polymer: "Полимер / смола",
  titanium: "Титан",
  textile: "Текстиль",
  other: "Другое",
};

export type CatalogFacetClassification = {
  gender: CatalogGenderGroup;
  genderProvenance: "source_category:seiko_women" | "watch_type_raw" | "unknown";
  caseSizeMm: number | null;
  caseSize: CatalogCaseSizeGroup | null;
  movement: ReturnType<typeof normalizeMechanismGroup>;
  dialColor: CatalogDialColorGroup | null;
  strapMaterial: CatalogStrapMaterialGroup | null;
  caseMaterial: ReturnType<typeof normalizeCaseMaterialGroup>;
  crystal: ReturnType<typeof normalizeCrystalGroup>;
  waterResistance: ReturnType<typeof normalizeWaterResistanceGroup>;
};

export function findSpecificationValue(
  specifications: CatalogPublicSpecification[],
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = specifications.find((specification) => specification.key === key)?.value.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function parseCaseSizeMm(rawValue: string | null): number | null {
  if (!rawValue) {
    return null;
  }

  const numbers = [...rawValue.normalize("NFKC").replace(/,/g, ".").matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 10 && value <= 80);
  if (numbers.length === 0) {
    return null;
  }

  if (/[×xх]/iu.test(rawValue) && numbers.length >= 2) {
    return Math.min(numbers[0]!, numbers[1]!);
  }

  return numbers[0] ?? null;
}

export function normalizeCaseSizeMm(watch: CatalogWatchDetail): number | null {
  return (
    parseCaseSizeMm(findSpecificationValue(watch.specifications, ["case_width_raw"])) ??
    parseCaseSizeMm(findSpecificationValue(watch.specifications, ["case_diameter_raw"])) ??
    null
  );
}

export function normalizeCaseSizeGroup(caseSizeMm: number | null): CatalogCaseSizeGroup | null {
  if (caseSizeMm === null) {
    return null;
  }

  // MASTER characteristics contract: compact <38 mm, medium 38–42 mm, large >42 mm. The size
  // class is derived only from confirmed case width/diameter fields, never from gender/positioning.
  if (caseSizeMm < 38) {
    return "compact";
  }

  if (caseSizeMm <= 42) {
    return "medium";
  }

  return "large";
}

export function normalizeCatalogGender(watch: CatalogWatchDetail): Pick<CatalogFacetClassification, "gender" | "genderProvenance"> {
  // The Seiko import source is explicitly "Seiko Women 73"; this is stronger provenance than
  // diameter/color inference and does not rewrite any raw spec.
  if (watch.brandSlug === "seiko") {
    return { gender: "female", genderProvenance: "source_category:seiko_women" };
  }

  const rawWatchType = findSpecificationValue(watch.specifications, ["watch_type_raw"]);
  if (!rawWatchType) {
    return { gender: "unknown", genderProvenance: "unknown" };
  }

  return { gender: normalizePositioningGroup(rawWatchType), genderProvenance: "watch_type_raw" };
}

export function normalizeDialColorGroup(rawValue: string | null | undefined): CatalogDialColorGroup | null {
  if (!rawValue) {
    return null;
  }

  const text = rawValue.normalize("NFKC").toLocaleLowerCase("ru").trim();
  if (!text) {
    return null;
  }

  if (/перламутр|mother|pearl/iu.test(text)) return "mother_of_pearl";
  if (/ч[её]рн|black/iu.test(text)) return "black";
  if (/бел|white/iu.test(text)) return "white";
  if (/сереб|silver/iu.test(text)) return "silver";
  if (/голуб|ice\s*blue|light\s*blue|turquoise|aqua/iu.test(text)) return "light_blue";
  if (/син|blue|navy/iu.test(text)) return "blue";
  if (/зел[её]н|green/iu.test(text)) return "green";
  if (/беж|крем|ivory|cream|taupe|champagne/iu.test(text)) return "cream";
  if (/золот|gold/iu.test(text)) return "gold";
  if (/роз|pink|rose|mauve/iu.test(text)) return "pink";
  if (/красн|red|burgundy/iu.test(text)) return "red";
  if (/корич|brown|chocolate/iu.test(text)) return "brown";
  if (/сер[ыо]|grey|gray/iu.test(text)) return "gray";

  return "other";
}

export function normalizeStrapMaterialGroup(rawValue: string | null | undefined): CatalogStrapMaterialGroup | null {
  if (!rawValue) {
    return null;
  }

  const text = rawValue.normalize("NFKC").toLocaleLowerCase("ru").trim();
  if (!text) {
    return null;
  }

  // Ambiguous source descriptions such as Orient's "браслет или ремешок по версии модели" are not
  // a safe public facet value for one concrete reference.
  if (/\bили\b|по\s+версии|зависит|depending|version/iu.test(text)) {
    return null;
  }

  if (/титан|titanium/iu.test(text)) return "titanium";
  if (/стал|steel|металл/iu.test(text)) return "steel_bracelet";
  if (/кож|leather|alcantara/iu.test(text)) return "leather";
  if (/каучук|резин|rubber|urethane|silicone|силикон/iu.test(text)) return "rubber";
  if (/текстил|нейлон|canvas|nylon|fabric|ткан/iu.test(text)) return "textile";
  if (/полимер|смол|resin|plastic|polymer|полиуретан/iu.test(text)) return "polymer";

  return "other";
}

export function classifyCatalogFacets(watch: CatalogWatchDetail): CatalogFacetClassification {
  const caseSizeMm = normalizeCaseSizeMm(watch);
  const gender = normalizeCatalogGender(watch);

  return {
    ...gender,
    caseSizeMm,
    caseSize: normalizeCaseSizeGroup(caseSizeMm),
    movement: normalizeMechanismGroup(findSpecificationValue(watch.specifications, ["movement_type_raw", "movement_family_raw", "movement_raw"])),
    dialColor: normalizeDialColorGroup(findSpecificationValue(watch.specifications, ["dial_color_raw"])),
    strapMaterial: normalizeStrapMaterialGroup(
      findSpecificationValue(watch.specifications, ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"]),
    ),
    caseMaterial: normalizeCaseMaterialGroup(findSpecificationValue(watch.specifications, ["case_material_raw"])),
    crystal: normalizeCrystalGroup(findSpecificationValue(watch.specifications, ["crystal_type_raw"])),
    waterResistance: normalizeWaterResistanceGroup(findSpecificationValue(watch.specifications, ["water_resistance_raw"])),
  };
}
