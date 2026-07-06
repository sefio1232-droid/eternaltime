import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

type CoverageDimension = {
  label: string;
  keys: string[];
};

export type CatalogReadCoverageRow = {
  label: string;
  recordsWithValue: number;
  distinctValues: number;
  coveragePercent: number;
  topValues: Array<{ value: string; count: number }>;
};

export type CatalogReadCoverageReport = {
  generatedAt: string;
  eligibleRecordCount: number;
  rows: CatalogReadCoverageRow[];
  chosenFilters: string[];
};

const dimensions: CoverageDimension[] = [
  { label: "Brand", keys: ["__brand"] },
  { label: "Brand Collection", keys: ["__brand_collection"] },
  { label: "Public price", keys: ["__public_price"] },
  { label: "Image", keys: ["__image"] },
  { label: "Movement", keys: ["movement_type_raw", "movement_raw"] },
  { label: "Water resistance", keys: ["water_resistance_raw"] },
  { label: "Case material", keys: ["case_material_raw"] },
  { label: "Case diameter/size", keys: ["case_diameter_raw", "case_dimensions_raw"] },
  { label: "Case shape", keys: ["case_shape_raw"] },
  { label: "Strap/bracelet", keys: ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"] },
  { label: "Glass", keys: ["crystal_type_raw"] },
];

function specificationValue(watch: CatalogWatchDetail, keys: string[]): string | null {
  for (const key of keys) {
    const value = watch.specifications.find((specification) => specification.key === key)?.value.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function dimensionValue(watch: CatalogWatchDetail, dimension: CoverageDimension): string | null {
  if (dimension.keys.includes("__brand")) {
    return watch.brandName;
  }

  if (dimension.keys.includes("__brand_collection")) {
    return watch.brandCollectionName;
  }

  if (dimension.keys.includes("__public_price")) {
    return watch.publicPrice ? "priced" : null;
  }

  if (dimension.keys.includes("__image")) {
    return watch.primaryImage.kind === "none" ? null : watch.primaryImage.kind;
  }

  return specificationValue(watch, dimension.keys);
}

export function buildCatalogReadCoverage(dataset: CatalogReadDataset, generatedAt = new Date().toISOString()): CatalogReadCoverageReport {
  const rows = dimensions.map((dimension) => {
    const counts = new Map<string, number>();

    for (const watch of dataset.watches) {
      const value = dimensionValue(watch, dimension);
      if (!value) {
        continue;
      }

      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const recordsWithValue = [...counts.values()].reduce((sum, count) => sum + count, 0);

    return {
      label: dimension.label,
      recordsWithValue,
      distinctValues: counts.size,
      coveragePercent: dataset.watches.length === 0 ? 0 : Math.round((recordsWithValue / dataset.watches.length) * 1000) / 10,
      topValues: [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "ru"))
        .slice(0, 12),
    };
  });

  return {
    generatedAt,
    eligibleRecordCount: dataset.watches.length,
    rows,
    chosenFilters: [
      "Brand",
      "Brand Collection",
      "Public price",
      "Movement",
      "Water resistance",
      "Case material",
      "Glass",
    ],
  };
}

export function renderCatalogReadCoverageMarkdown(report: CatalogReadCoverageReport): string {
  const lines: string[] = [
    "# Catalog Read Coverage",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    `Eligible public read records: ${report.eligibleRecordCount}`,
    "",
    "## Coverage",
    "",
    "| Dimension | Records with value | Distinct values | Coverage |",
    "| --- | ---: | ---: | ---: |",
    ...report.rows.map(
      (row) =>
        `| ${row.label} | ${row.recordsWithValue} | ${row.distinctValues} | ${row.coveragePercent.toFixed(1)}% |`,
    ),
    "",
    "## Chosen Initial Public Filters",
    "",
    ...report.chosenFilters.map((filter) => `- ${filter}`),
    "",
    "Case diameter/size and strap/bracelet are kept as specifications for now: they are present in the data, but the current source values are not normalized enough for stable public facets.",
    "",
    "## Top Values By Dimension",
    "",
  ];

  for (const row of report.rows) {
    lines.push(`### ${row.label}`, "");
    if (row.topValues.length === 0) {
      lines.push("No values.", "");
      continue;
    }

    lines.push("| Value | Count |", "| --- | ---: |");
    for (const value of row.topValues) {
      lines.push(`| ${value.value.replaceAll("|", "\\|")} | ${value.count} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
