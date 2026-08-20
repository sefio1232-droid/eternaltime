/**
 * Catalog site-import overlay manifest builder ("FINAL_FOR_SITE_DROPIN" batch). Reads the three
 * user-supplied `incoming/*_FINAL_FOR_SITE_DROPIN.xlsx`
 * workbooks (Casio, Orient, Tissot) read-only and matches every row to a real catalog reference by
 * EXACT normalized-reference equality only, brand-scoped (a Casio row can only match a Casio
 * watch) — nothing approximate or family-based. Unmatched rows are recorded, never guessed at.
 *
 * Replaces the earlier two-sheet-per-brand format entirely. Each workbook here is one sheet, one
 * row per reference, four columns: "Артикул", "Название для сайта" (redundant with the existing
 * title composition — not consumed), "SEO-описание" (used as both the overview paragraph and the
 * meta description — the source genuinely only supplies one description, not a separate short/long
 * pair), and "Характеристики" — every specification for that model combined into one
 * "Label: value | Label: value | ..." cell instead of one column per field. `mapCombinedSpecifications`
 * splits and maps each label to the exact same normalized specification keys
 * `preview-catalog-adapter.ts` already understands (never a new parallel taxonomy); a label with no
 * known mapping is skipped and recorded, never guessed at or invented.
 *
 * Run with: npx tsx src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts
 * Output: .tmp/catalog-site-import-overlay/manifest.json (gitignored; never committed).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import {
  CASIO_SITE_IMPORT_XLSX_PATH,
  ORIENT_SITE_IMPORT_XLSX_PATH,
  SITE_IMPORT_OVERLAY_OUTPUT_PATH,
  TISSOT_SITE_IMPORT_XLSX_PATH,
  type CatalogSiteImportOverlayEntry,
  type CatalogSiteImportOverlayManifest,
  type CatalogSiteImportOverlayUnmatchedRow,
} from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

export {
  CASIO_SITE_IMPORT_XLSX_PATH,
  ORIENT_SITE_IMPORT_XLSX_PATH,
  SITE_IMPORT_OVERLAY_OUTPUT_PATH,
  TISSOT_SITE_IMPORT_XLSX_PATH,
  type CatalogSiteImportOverlayEntry,
  type CatalogSiteImportOverlayManifest,
  type CatalogSiteImportOverlayUnmatchedRow,
} from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";

const HEADER_ROW_INDEX = 0;
const DATA_START_ROW_INDEX = 1;

type CatalogReferenceRef = { referenceDisplay: string; referenceNormalized: string; brandSlug: string };

export function buildColumnIndex(headerRow: unknown[]): Map<string, number> {
  const index = new Map<string, number>();
  headerRow.forEach((raw, i) => {
    const name = typeof raw === "string" ? raw.trim() : "";
    if (name) index.set(name, i);
  });
  return index;
}

function cellText(row: unknown[], col: Map<string, number>, name: string): string {
  const i = col.get(name);
  if (i === undefined) return "";
  const value = row[i];
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): { header: unknown[]; data: unknown[][] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { header: [], data: [] };
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  return { header: rows[HEADER_ROW_INDEX] ?? [], data: rows.slice(DATA_START_ROW_INDEX) };
}

function normalizeSpecLabel(label: string): string {
  return label.normalize("NFKC").trim().toLocaleLowerCase("ru").replace(/\s+/g, " ");
}

/**
 * Every label this batch's "Характеристики" cells were seen to use across all three brands (built
 * from a full audit of distinct labels in each workbook), mapped to the shared canonical
 * specification keys. Two labels for the same underlying fact (e.g. "Ремешок" / "Ремешок / Браслет"
 * / "ремешок/браслет") intentionally collapse onto the same key — they are spelling/casing variants
 * from the same generation batch, not distinct facts. "Модель"/"Серия" are deliberately absent —
 * both duplicate data the main catalog import already provides (title, brand collection).
 */
const combinedSpecLabelMap: Record<string, string> = {
  "диаметр корпуса": "case_diameter_raw",
  "толщина корпуса": "case_thickness_raw",
  "материал корпуса": "case_material_raw",
  "материал корпуса/безеля": "case_material_raw",
  "корпус/безель": "case_material_raw",
  безель: "bezel_material_raw",
  "материал безеля": "bezel_material_raw",
  "функция безеля": "bezel_raw",
  "задняя крышка": "caseback_raw",
  "особенности корпуса": "caseback_raw",
  "заводная головка": "crown_raw",
  стекло: "crystal_type_raw",
  механизм: "movement_raw",
  "тип механизма": "movement_type_raw",
  "запас хода": "power_reserve_raw",
  "срок службы / запас хода": "power_reserve_raw",
  питание: "power_source_raw",
  "тип батарейки": "power_source_raw",
  "срок службы батареи": "power_source_raw",
  автономность: "power_source_raw",
  "точность хода": "accuracy_raw",
  точность: "accuracy_raw",
  сертификация: "certification_raw",
  функции: "functions_raw",
  связь: "functions_raw",
  назначение: "purpose_raw",
  водозащита: "water_resistance_raw",
  водонепроницаемость: "water_resistance_raw",
  циферблат: "dial_color_raw",
  индексы: "dial_markers_raw",
  "драгоценные камни": "gemstones_raw",
  "материал ремешка/браслета": "attachment_material_raw",
  ремешок: "attachment_material_raw",
  "ремешок / браслет": "attachment_material_raw",
  "ремешок/браслет": "attachment_material_raw",
  браслет: "attachment_material_raw",
  "цвет ремешка/браслета": "strap_color_raw",
  "покрытие браслета": "strap_coating_raw",
  покрытие: "case_coating_raw",
  "особенности браслета": "strap_features_raw",
  "ширина ремешка": "strap_width_raw",
  "ширина ушек": "strap_width_raw",
  застёжка: "clasp_raw",
  застежка: "clasp_raw",
  вес: "weight_raw",
  размер: "case_dimensions_raw",
  "размер корпуса": "case_dimensions_raw",
  "размер корпуса (д × ш × т)": "case_dimensions_raw",
  "размер корпуса (ш × в × т)": "case_dimensions_raw",
  "размер корпуса (ш × д × т)": "case_dimensions_raw",
  дисплей: "display_raw",
  индикация: "display_raw",
  "тип индикации": "display_raw",
  конструкция: "construction_raw",
  "люминесцентное покрытие стрелок": "luminescence_raw",
  "страна производства": "brand_country_raw",
  комплектация: "package_contents_raw",
  комплект: "package_contents_raw",
  "g-shock в комплекте": "package_contents_raw",
  "baby-g в комплекте": "package_contents_raw",
};

/**
 * Splits one "Label: value | Label: value | ..." cell into the shared canonical specification
 * keys. An unrecognized label is skipped (never guessed at) and reported via `onUnknownLabel` for
 * a visible, honest audit trail — it never silently disappears. When two labels in the same row map
 * to the same canonical key (spelling variants), their values are combined rather than one
 * overwriting the other, so no real data is ever dropped.
 */
export function mapCombinedSpecifications(specText: string, onUnknownLabel?: (label: string) => void): Record<string, string> {
  const collected = new Map<string, string[]>();

  for (const part of specText.split("|")) {
    const separatorIndex = part.indexOf(":");
    if (separatorIndex === -1) continue;

    const rawLabel = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();
    if (!rawLabel || !rawValue) continue;

    const key = combinedSpecLabelMap[normalizeSpecLabel(rawLabel)];
    if (!key) {
      onUnknownLabel?.(rawLabel);
      continue;
    }

    const values = collected.get(key) ?? [];
    if (!values.includes(rawValue)) {
      values.push(rawValue);
    }
    collected.set(key, values);
  }

  const specs: Record<string, string> = {};
  for (const [key, values] of collected) {
    specs[key] = values.join(", ");
  }
  return specs;
}

function matchReference(rawReference: string, catalogByNormalized: Map<string, CatalogReferenceRef>): CatalogReferenceRef | null {
  if (!rawReference) return null;
  const normalized = normalizeManufacturerReference(rawReference);
  return catalogByNormalized.get(normalized) ?? null;
}

export function processSeoFinalWorkbook(input: {
  sourceFile: string;
  workbook: XLSX.WorkBook;
  sheetName: string;
  catalogByNormalized: Map<string, CatalogReferenceRef>;
  onUnknownLabel?: (label: string) => void;
}): { entries: Map<string, CatalogSiteImportOverlayEntry>; unmatched: CatalogSiteImportOverlayUnmatchedRow[] } {
  const entries = new Map<string, CatalogSiteImportOverlayEntry>();
  const unmatched: CatalogSiteImportOverlayUnmatchedRow[] = [];

  const { header, data } = sheetRows(input.workbook, input.sheetName);
  const col = buildColumnIndex(header);

  for (const row of data) {
    const referenceRaw = cellText(row, col, "Артикул");
    if (!referenceRaw) continue;

    const match = matchReference(referenceRaw, input.catalogByNormalized);
    if (!match) {
      unmatched.push({ sourceFile: input.sourceFile, referenceRaw, reason: "unmatched" });
      continue;
    }

    const seoDescription = cellText(row, col, "SEO-описание") || null;
    const specText = cellText(row, col, "Характеристики");

    entries.set(match.referenceNormalized, {
      catalogReference: match.referenceDisplay,
      referenceNormalized: match.referenceNormalized,
      brandSlug: match.brandSlug,
      specifications: specText ? mapCombinedSpecifications(specText, input.onUnknownLabel) : {},
      seoTitle: null,
      // The source supplies exactly one description field — used for both the meta description
      // and the detail page's "Обзор" paragraph rather than inventing a distinct short/long pair.
      metaDescription: seoDescription,
      shortDescription: null,
      longDescription: seoDescription,
    });
  }

  return { entries, unmatched };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function main() {
  const rootDir = process.cwd();

  const preview = await readJsonFile<CatalogImportPreview>(path.join(rootDir, "imports/generated/catalog-import-preview.json"));
  const imagePlan = await readJsonFile<CatalogImageUploadPlan>(path.join(rootDir, "imports/generated/catalog-image-upload-plan.json"));
  const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });

  const byBrand = (brandSlug: string) =>
    new Map<string, CatalogReferenceRef>(dataset.watches.filter((watch) => watch.brandSlug === brandSlug).map((watch) => [watch.referenceNormalized, watch]));

  const brands = [
    { brandSlug: "casio", sourceFile: CASIO_SITE_IMPORT_XLSX_PATH, sheetName: "Casio" },
    { brandSlug: "orient", sourceFile: ORIENT_SITE_IMPORT_XLSX_PATH, sheetName: "Orient" },
    { brandSlug: "tissot", sourceFile: TISSOT_SITE_IMPORT_XLSX_PATH, sheetName: "Tissot" },
  ] as const;

  const unknownLabels = new Set<string>();
  const results = await Promise.all(
    brands.map(async ({ brandSlug, sourceFile, sheetName }) => {
      const workbook = XLSX.read(await readFile(path.join(rootDir, sourceFile)), { type: "buffer" });
      const catalogByNormalized = byBrand(brandSlug);
      const result = processSeoFinalWorkbook({
        sourceFile,
        workbook,
        sheetName,
        catalogByNormalized,
        onUnknownLabel: (label) => unknownLabels.add(label),
      });
      return { brandSlug, sourceFile, catalogRefCount: catalogByNormalized.size, ...result };
    }),
  );

  const manifest: CatalogSiteImportOverlayManifest = {
    generatedAt: new Date().toISOString(),
    sourceFiles: brands.map((brand) => brand.sourceFile),
    entries: results.flatMap((result) => [...result.entries.values()]),
    unmatchedRows: results.flatMap((result) => result.unmatched),
  };

  const outputPath = path.join(rootDir, SITE_IMPORT_OVERLAY_OUTPUT_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log("Site-import overlay manifest written to", SITE_IMPORT_OVERLAY_OUTPUT_PATH);
  for (const result of results) {
    console.log(
      `${result.brandSlug}: catalog refs ${result.catalogRefCount} | matched ${result.entries.size} | unmatched rows ${result.unmatched.length}`,
    );
  }
  if (manifest.unmatchedRows.length > 0) {
    console.log("Unmatched rows:", manifest.unmatchedRows);
  }
  if (unknownLabels.size > 0) {
    console.log("Unrecognized specification labels (skipped, never guessed):", [...unknownLabels].sort());
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown catalog site-import overlay manifest error.";
  console.error(`Catalog site-import overlay manifest failed: ${message}`);
  process.exitCode = 1;
});
