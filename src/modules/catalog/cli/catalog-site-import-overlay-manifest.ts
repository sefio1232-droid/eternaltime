/**
 * Catalog site-import overlay manifest builder — reads the two user-supplied
 * `incoming/*_catalog_site_import_*.xlsx` workbooks (specifications + SEO copy) read-only and
 * matches every row to a real catalog reference by EXACT normalized-reference equality only,
 * brand-scoped (a Casio row can only match a Casio watch, an Orient row only an Orient watch) —
 * nothing approximate or family-based. Unmatched rows are recorded, never guessed at.
 *
 * Each workbook has two relevant sheets sharing an "Артикул" column: "Характеристики" (one
 * normalized specification per column — mapped onto the SAME specification keys
 * `preview-catalog-adapter.ts` already understands, never a new parallel taxonomy) and
 * "Импорт_на_сайт" (SEO Title / Meta Description / short + long description). Price columns in
 * "Импорт_на_сайт" are intentionally never read here — price/inventory belong to catalog_offers,
 * not this overlay.
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
  type CatalogSiteImportOverlayEntry,
  type CatalogSiteImportOverlayManifest,
  type CatalogSiteImportOverlayUnmatchedRow,
} from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";

// Both workbooks share the same layout: 2 title/note rows, header on row index 2, data from row 3.
const HEADER_ROW_INDEX = 2;
const DATA_START_ROW_INDEX = 3;

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

/** Russian-locale decimal comma, matching the source workbook's own combined-dimension columns. */
function millimeters(value: string): string {
  return value ? `${value.replace(".", ",")} мм` : "";
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): { header: unknown[]; data: unknown[][] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { header: [], data: [] };
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  return { header: rows[HEADER_ROW_INDEX] ?? [], data: rows.slice(DATA_START_ROW_INDEX) };
}

/**
 * Casio's "Характеристики" sheet already combines L×W×T into one ready "Размер корпуса" string —
 * the separate Длина/Ширина/Толщина columns are redundant with it and deliberately not mapped
 * (avoids surfacing the same measurement twice, per the "no unnecessary information" instruction).
 */
export function mapCasioSpecifications(row: unknown[], col: Map<string, number>): Record<string, string> {
  const specs: Record<string, string> = {};
  const set = (key: string, value: string) => {
    if (value) specs[key] = value;
  };

  set("movement_type_raw", cellText(row, col, "Тип механизма"));
  set("movement_raw", cellText(row, col, "Механизм"));
  set("display_raw", cellText(row, col, "Индикация / дисплей"));
  set("case_material_raw", cellText(row, col, "Материал корпуса"));
  set("bezel_material_raw", cellText(row, col, "Материал безеля"));
  set("crystal_type_raw", cellText(row, col, "Стекло"));
  set("attachment_material_raw", cellText(row, col, "Ремешок / браслет"));
  set("water_resistance_raw", cellText(row, col, "Водозащита"));
  set("construction_raw", cellText(row, col, "Конструкция"));
  set("power_reserve_raw", cellText(row, col, "Запас хода"));
  set("accuracy_raw", cellText(row, col, "Точность"));
  set("functions_raw", cellText(row, col, "Функции"));
  set("purpose_raw", cellText(row, col, "Назначение"));
  set("caseback_raw", cellText(row, col, "Задняя крышка"));

  const caseSize = cellText(row, col, "Размер корпуса");
  if (caseSize) specs.case_dimensions_raw = caseSize;

  const diameter = cellText(row, col, "Диаметр корпуса, мм");
  if (diameter) specs.case_diameter_raw = millimeters(diameter);

  const strapWidth = cellText(row, col, "Ширина ремешка, мм");
  if (strapWidth) specs.strap_width_raw = millimeters(strapWidth);

  const weight = cellText(row, col, "Вес, г");
  if (weight) specs.weight_raw = `${weight} г`;

  const batteryType = cellText(row, col, "Тип батарейки");
  const batteryLife = cellText(row, col, "Срок службы батареи");
  const power = [batteryType, batteryLife].filter(Boolean).join(", ");
  if (power) specs.power_source_raw = power;

  return specs;
}

export function mapOrientSpecifications(row: unknown[], col: Map<string, number>): Record<string, string> {
  const specs: Record<string, string> = {};
  const set = (key: string, value: string) => {
    if (value) specs[key] = value;
  };

  set("movement_type_raw", cellText(row, col, "Тип механизма"));
  set("caliber_raw", cellText(row, col, "Калибр"));
  set("power_reserve_raw", cellText(row, col, "Запас хода / питание"));
  set("accuracy_raw", cellText(row, col, "Точность"));
  set("functions_raw", cellText(row, col, "Функции"));
  set("dial_color_raw", cellText(row, col, "Цвет циферблата"));
  set("case_material_raw", cellText(row, col, "Материал корпуса"));
  set("crystal_type_raw", cellText(row, col, "Стекло"));
  set("attachment_material_raw", cellText(row, col, "Материал ремешка/браслета"));
  set("clasp_raw", cellText(row, col, "Застежка"));
  set("water_resistance_raw", cellText(row, col, "Водозащита"));
  set("caseback_raw", cellText(row, col, "Задняя крышка"));
  set("luminescence_raw", cellText(row, col, "Люминесценция"));
  set("crown_raw", cellText(row, col, "Заводная головка"));
  set("bezel_raw", cellText(row, col, "Безель"));
  set("jewel_count_raw", cellText(row, col, "Количество камней"));

  const strapWidth = cellText(row, col, "Ширина ремешка, мм");
  if (strapWidth) specs.strap_width_raw = millimeters(strapWidth);

  const weight = cellText(row, col, "Вес, г");
  if (weight) specs.weight_raw = `${weight} г`;

  // Only combined when every dimension is present — a partial "13 мм" alone would misrepresent a
  // three-axis case size, so an incomplete row simply contributes no combined-dimensions value.
  const width = cellText(row, col, "Ширина корпуса, мм");
  const height = cellText(row, col, "Высота корпуса, мм");
  const thickness = cellText(row, col, "Толщина корпуса, мм");
  if (width && height && thickness) {
    specs.case_dimensions_raw = `${width.replace(".", ",")} × ${height.replace(".", ",")} × ${thickness.replace(".", ",")} мм`;
  }

  return specs;
}

function extractSeoFields(row: unknown[], col: Map<string, number>) {
  const value = (name: string) => cellText(row, col, name) || null;
  return {
    seoTitle: value("SEO Title"),
    metaDescription: value("Meta Description"),
    shortDescription: value("Короткое описание"),
    longDescription: value("Подробное SEO-описание"),
  };
}

function matchReference(rawReference: string, catalogByNormalized: Map<string, CatalogReferenceRef>): CatalogReferenceRef | null {
  if (!rawReference) return null;
  const normalized = normalizeManufacturerReference(rawReference);
  return catalogByNormalized.get(normalized) ?? null;
}

function emptyEntry(match: CatalogReferenceRef): CatalogSiteImportOverlayEntry {
  return {
    catalogReference: match.referenceDisplay,
    referenceNormalized: match.referenceNormalized,
    brandSlug: match.brandSlug,
    specifications: {},
    seoTitle: null,
    metaDescription: null,
    shortDescription: null,
    longDescription: null,
  };
}

export function processSiteImportWorkbook(input: {
  sourceFile: string;
  workbook: XLSX.WorkBook;
  catalogByNormalized: Map<string, CatalogReferenceRef>;
  mapSpecifications: (row: unknown[], col: Map<string, number>) => Record<string, string>;
}): { entries: Map<string, CatalogSiteImportOverlayEntry>; unmatched: CatalogSiteImportOverlayUnmatchedRow[] } {
  const entries = new Map<string, CatalogSiteImportOverlayEntry>();
  const unmatched: CatalogSiteImportOverlayUnmatchedRow[] = [];

  const specSheet = sheetRows(input.workbook, "Характеристики");
  const specCol = buildColumnIndex(specSheet.header);
  for (const row of specSheet.data) {
    const referenceRaw = cellText(row, specCol, "Артикул");
    if (!referenceRaw) continue;
    const match = matchReference(referenceRaw, input.catalogByNormalized);
    if (!match) {
      unmatched.push({ sourceFile: `${input.sourceFile}#Характеристики`, referenceRaw, reason: "unmatched" });
      continue;
    }
    const entry = entries.get(match.referenceNormalized) ?? emptyEntry(match);
    entry.specifications = { ...entry.specifications, ...input.mapSpecifications(row, specCol) };
    entries.set(match.referenceNormalized, entry);
  }

  const seoSheet = sheetRows(input.workbook, "Импорт_на_сайт");
  const seoCol = buildColumnIndex(seoSheet.header);
  for (const row of seoSheet.data) {
    const referenceRaw = cellText(row, seoCol, "Артикул");
    if (!referenceRaw) continue;
    const match = matchReference(referenceRaw, input.catalogByNormalized);
    if (!match) {
      unmatched.push({ sourceFile: `${input.sourceFile}#Импорт_на_сайт`, referenceRaw, reason: "unmatched" });
      continue;
    }
    const entry = entries.get(match.referenceNormalized) ?? emptyEntry(match);
    Object.assign(entry, extractSeoFields(row, seoCol));
    entries.set(match.referenceNormalized, entry);
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

  const casioByNormalized = new Map<string, CatalogReferenceRef>(
    dataset.watches.filter((watch) => watch.brandSlug === "casio").map((watch) => [watch.referenceNormalized, watch]),
  );
  const orientByNormalized = new Map<string, CatalogReferenceRef>(
    dataset.watches.filter((watch) => watch.brandSlug === "orient").map((watch) => [watch.referenceNormalized, watch]),
  );

  const casioWorkbook = XLSX.read(await readFile(path.join(rootDir, CASIO_SITE_IMPORT_XLSX_PATH)), { type: "buffer" });
  const orientWorkbook = XLSX.read(await readFile(path.join(rootDir, ORIENT_SITE_IMPORT_XLSX_PATH)), { type: "buffer" });

  const casioResult = processSiteImportWorkbook({
    sourceFile: CASIO_SITE_IMPORT_XLSX_PATH,
    workbook: casioWorkbook,
    catalogByNormalized: casioByNormalized,
    mapSpecifications: mapCasioSpecifications,
  });
  const orientResult = processSiteImportWorkbook({
    sourceFile: ORIENT_SITE_IMPORT_XLSX_PATH,
    workbook: orientWorkbook,
    catalogByNormalized: orientByNormalized,
    mapSpecifications: mapOrientSpecifications,
  });

  const manifest: CatalogSiteImportOverlayManifest = {
    generatedAt: new Date().toISOString(),
    sourceFiles: [CASIO_SITE_IMPORT_XLSX_PATH, ORIENT_SITE_IMPORT_XLSX_PATH],
    entries: [...casioResult.entries.values(), ...orientResult.entries.values()],
    unmatchedRows: [...casioResult.unmatched, ...orientResult.unmatched],
  };

  const outputPath = path.join(rootDir, SITE_IMPORT_OVERLAY_OUTPUT_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log("Site-import overlay manifest written to", SITE_IMPORT_OVERLAY_OUTPUT_PATH);
  console.log("Casio: catalog refs", casioByNormalized.size, "| matched", casioResult.entries.size, "| unmatched rows", casioResult.unmatched.length);
  console.log("Orient: catalog refs", orientByNormalized.size, "| matched", orientResult.entries.size, "| unmatched rows", orientResult.unmatched.length);
  if (manifest.unmatchedRows.length > 0) {
    console.log("Unmatched rows:", manifest.unmatchedRows);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown catalog site-import overlay manifest error.";
  console.error(`Catalog site-import overlay manifest failed: ${message}`);
  process.exitCode = 1;
});
