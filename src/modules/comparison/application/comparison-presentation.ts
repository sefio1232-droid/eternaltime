import { displayWatchModelHeading, formatCatalogDisplayValue } from "@/modules/catalog/application/catalog-display";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import type { CatalogImagePresentation, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import { comparisonIdentity, type LocalComparisonItem } from "@/modules/comparison/domain/local-comparison";

export type ComparisonValue = {
  value: string;
  unknown: boolean;
};

export type ComparisonRow = {
  key: string;
  label: string;
  group: "commercial" | "mechanism" | "case" | "dimensions" | "glass" | "wear" | "functions";
  values: ComparisonValue[];
  different: boolean;
};

export type ComparisonWatchPresentation = {
  identity: string;
  brandName: string;
  displayName: string;
  referenceDisplay: string;
  href: string;
  image: CatalogImagePresentation;
  localItem: LocalComparisonItem;
};

export type ComparisonPresentation = {
  watches: ComparisonWatchPresentation[];
  rows: ComparisonRow[];
};

type RowDefinition = {
  key: string;
  label: string;
  group: ComparisonRow["group"];
  specificationKeys?: string[];
  value?: (watch: CatalogWatchDetail) => string | null;
};

const rowDefinitions: RowDefinition[] = [
  { key: "price", label: "Цена", group: "commercial", value: (watch) => watch.publicPrice ? formatCatalogMoney(watch.publicPrice) : null },
  { key: "movement", label: "Механизм", group: "mechanism", specificationKeys: ["movement_type_raw", "movement_family_raw", "movement_raw"] },
  { key: "case-material", label: "Материал корпуса", group: "case", specificationKeys: ["case_material_raw"] },
  { key: "case-size", label: "Размер корпуса", group: "dimensions", specificationKeys: ["case_width_raw", "case_diameter_raw", "case_dimensions_raw"] },
  { key: "case-thickness", label: "Толщина", group: "dimensions", specificationKeys: ["case_thickness_raw"] },
  { key: "weight", label: "Вес", group: "dimensions", specificationKeys: ["weight_raw"] },
  { key: "crystal", label: "Стекло", group: "glass", specificationKeys: ["crystal_type_raw"] },
  { key: "attachment", label: "Ремешок или браслет", group: "wear", specificationKeys: ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"] },
  { key: "water-resistance", label: "Водозащита", group: "wear", specificationKeys: ["water_resistance_raw"] },
  { key: "dial", label: "Циферблат", group: "wear", specificationKeys: ["dial_color_raw", "dial_raw"] },
  { key: "functions", label: "Функции", group: "functions", specificationKeys: ["functions_raw"] },
  { key: "watch-type", label: "Тип часов", group: "functions", specificationKeys: ["watch_type_raw"] },
  { key: "brand-country", label: "Страна бренда", group: "functions", specificationKeys: ["brand_country_raw"] },
];

function specificationValue(watch: CatalogWatchDetail, keys: string[]): string | null {
  for (const key of keys) {
    const specification = watch.specifications.find((candidate) => candidate.key === key && candidate.value.trim());
    if (specification) return formatCatalogDisplayValue(specification.value);
  }
  return null;
}

function normalizedComparisonValue(value: ComparisonValue): string {
  return value.unknown ? "__unknown__" : value.value.normalize("NFKC").trim().toLocaleLowerCase("ru");
}

export function buildComparisonPresentation(watches: CatalogWatchDetail[]): ComparisonPresentation {
  const presentedWatches = watches.map((watch): ComparisonWatchPresentation => {
    const displayName = displayWatchModelHeading({
      brandName: watch.brandName,
      title: watch.title,
      referenceDisplay: watch.referenceDisplay,
    });
    const identity = comparisonIdentity(watch);
    return {
      identity,
      brandName: watch.brandName,
      displayName,
      referenceDisplay: watch.referenceDisplay,
      href: watch.href,
      image: watch.primaryImage.kind === "development_zip" ? { kind: "none", alt: `Изображение ${watch.brandName} ${watch.referenceDisplay} недоступно` } : watch.primaryImage,
      localItem: {
        identity,
        brandName: watch.brandName,
        brandSlug: watch.brandSlug,
        displayName,
        referenceDisplay: watch.referenceDisplay,
        referenceSlug: watch.referenceSlug,
        canonicalHref: watch.href,
        addedAt: new Date(0).toISOString(),
      },
    };
  });

  const rows = rowDefinitions.map((definition): ComparisonRow => {
    const values = watches.map((watch): ComparisonValue => {
      const value = definition.value?.(watch) ?? (definition.specificationKeys ? specificationValue(watch, definition.specificationKeys) : null);
      return value ? { value, unknown: false } : { value: "Нет данных", unknown: true };
    });
    return {
      key: definition.key,
      label: definition.label,
      group: definition.group,
      values,
      different: new Set(values.map(normalizedComparisonValue)).size > 1,
    };
  });

  return { watches: presentedWatches, rows };
}
