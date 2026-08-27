import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import {
  buildControlledCatalogApplyPlan,
  writeCatalogImageUploadPlan,
} from "@/modules/imports/catalog/application/database-apply-plan";
import { buildImportApplyPlan } from "@/modules/imports/catalog/application/apply-plan";
import { buildStagedPricing, parseMoneyToMinorUnits } from "@/modules/imports/catalog/domain/pricing";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview, PriceSource, SourceProvenance } from "@/modules/imports/catalog/domain/types";

const rootDir = process.cwd();
const priceWorkbookPath =
  process.env.SEIKO_WOMEN_PRICE_WORKBOOK ??
  "c:/Users/Sergey/Downloads/Seiko_Women_73_prices_RUB.xlsx";
const previewPath = path.join(rootDir, "imports/generated/catalog-import-preview.json");
const imagePlanPath = path.join(rootDir, "imports/generated/catalog-image-upload-plan.json");

type SeikoPriceRow = {
  rowNumber: number;
  reference: string;
  priceCny: string;
  purchaseRub: string;
  publicRub: string;
  differenceRub: string;
};

function readPriceRows(): SeikoPriceRow[] {
  const workbook = XLSX.readFile(priceWorkbookPath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) {
    throw new Error(`Seiko price workbook has no readable sheets: ${priceWorkbookPath}`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[sheetName]!, {
    defval: "",
    raw: false,
  });

  return rows.map((row, index) => ({
    rowNumber: index + 2,
    reference: String(row["Артикул"] ?? "").trim(),
    priceCny: String(row["Цена в юанях (CNY)"] ?? "").trim(),
    purchaseRub: String(row["Закуп в рублях"] ?? "").trim(),
    publicRub: String(row["Моя цена в рублях"] ?? "").trim(),
    differenceRub: String(row["Разница, руб."] ?? "").trim(),
  })).filter((row) => row.reference);
}

function provenance(row: SeikoPriceRow, rawColumn?: string, rawValue?: string): SourceProvenance {
  return {
    sourceFile: path.basename(priceWorkbookPath),
    sourceType: "main_catalog_workbook",
    workbook: path.basename(priceWorkbookPath),
    sheet: "Seiko Women — цены",
    rowNumber: row.rowNumber,
    rawColumn,
    rawValue,
  };
}

function priceSources(row: SeikoPriceRow): PriceSource[] {
  const publicRubMinor = parseMoneyToMinorUnits(row.publicRub);
  const purchaseRubMinor = parseMoneyToMinorUnits(row.purchaseRub);
  const differenceMinor = parseMoneyToMinorUnits(row.differenceRub);
  const priceCnyMinor = parseMoneyToMinorUnits(row.priceCny);

  return [
    {
      rawFieldName: "Моя цена в рублях",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "RUB",
      rawValue: row.publicRub,
      normalizedAmountMinor: publicRubMinor,
      intendedVisibility: "public_candidate",
      validationState: publicRubMinor === null ? "invalid" : "valid",
      reason: "User-provided Seiko selling price in RUB; selected as the only public website price.",
      provenance: provenance(row, "Моя цена в рублях", row.publicRub),
    },
    {
      rawFieldName: "Закуп в рублях",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "RUB",
      rawValue: row.purchaseRub,
      normalizedAmountMinor: purchaseRubMinor,
      intendedVisibility: "internal",
      validationState: purchaseRubMinor === null ? "invalid" : "valid",
      reason: "Purchase cost is internal provenance and must never be displayed as a public price.",
      provenance: provenance(row, "Закуп в рублях", row.purchaseRub),
    },
    {
      rawFieldName: "Разница, руб.",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "RUB",
      rawValue: row.differenceRub,
      normalizedAmountMinor: differenceMinor,
      intendedVisibility: "excluded_from_public",
      validationState: "not_a_price",
      reason: "Difference is analytical source data, not a product price.",
      provenance: provenance(row, "Разница, руб.", row.differenceRub),
    },
    {
      rawFieldName: "Цена в юанях (CNY)",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "CNY",
      rawValue: row.priceCny,
      normalizedAmountMinor: priceCnyMinor,
      intendedVisibility: "internal",
      validationState: priceCnyMinor === null ? "invalid" : "valid",
      reason: "CNY source value is internal provenance only; public catalog uses RUB selling price.",
      provenance: provenance(row, "Цена в юанях (CNY)", row.priceCny),
    },
  ];
}

function assertPriceCoverage(preview: CatalogImportPreview, priceRows: SeikoPriceRow[]): void {
  const seikoRefs = new Set(
    preview.records
      .filter((record) => record.candidateId.startsWith("seiko-women:"))
      .map((record) => {
        if (!record.identity.referenceRaw) {
          throw new Error(`Seiko candidate ${record.candidateId} is missing referenceRaw.`);
        }
        return normalizeManufacturerReference(record.identity.referenceRaw);
      }),
  );
  const priceRefs = new Set(priceRows.map((row) => normalizeManufacturerReference(row.reference)));
  const missing = [...seikoRefs].filter((reference) => !priceRefs.has(reference)).sort();
  const extra = [...priceRefs].filter((reference) => !seikoRefs.has(reference)).sort();
  const invalidPublicPrices = priceRows
    .filter((row) => parseMoneyToMinorUnits(row.publicRub) === null)
    .map((row) => row.reference)
    .sort();

  if (seikoRefs.size !== 73 || priceRows.length !== 73 || missing.length > 0 || extra.length > 0 || invalidPublicPrices.length > 0) {
    throw new Error(
      [
        "Seiko price workbook does not exactly match the staged Seiko catalog.",
        `Seiko records: ${seikoRefs.size}`,
        `Price rows: ${priceRows.length}`,
        missing.length ? `Missing prices: ${missing.join(", ")}` : null,
        extra.length ? `Extra price rows: ${extra.join(", ")}` : null,
        invalidPublicPrices.length ? `Invalid public RUB prices: ${invalidPublicPrices.join(", ")}` : null,
      ].filter(Boolean).join(" "),
    );
  }
}

async function main() {
  const preview = JSON.parse(await readFile(previewPath, "utf8")) as CatalogImportPreview;
  const priceRows = readPriceRows();
  assertPriceCoverage(preview, priceRows);

  const priceByReference = new Map(priceRows.map((row) => [normalizeManufacturerReference(row.reference), row]));
  let updated = 0;
  let minPublicRub = Number.POSITIVE_INFINITY;
  let maxPublicRub = 0;

  preview.records = preview.records.map((record) => {
    if (!record.candidateId.startsWith("seiko-women:")) return record;

    if (!record.identity.referenceRaw) {
      throw new Error(`Seiko candidate ${record.candidateId} is missing referenceRaw.`);
    }
    const priceRow = priceByReference.get(normalizeManufacturerReference(record.identity.referenceRaw));
    if (!priceRow) return record;

    const pricing = buildStagedPricing(priceSources(priceRow));
    if (!pricing.publicPriceCandidate) {
      throw new Error(`Missing valid public RUB price for ${record.identity.referenceRaw}`);
    }

    const publicRub = pricing.publicPriceCandidate.amountMinor / 100;
    minPublicRub = Math.min(minPublicRub, publicRub);
    maxPublicRub = Math.max(maxPublicRub, publicRub);
    updated += 1;

    return {
      ...record,
      pricing,
      validationIssues: record.validationIssues.filter((issue) => issue.code !== "rub_price_intentionally_blank"),
      applyEligibility: {
        ...record.applyEligibility,
        commercialApplyEligible: true,
        reasons: ["Seiko women 73 staged import with user-provided RUB selling prices."],
      },
    };
  });

  preview.sources = [
    ...preview.sources.filter((source) => source.filename !== path.basename(priceWorkbookPath)),
    {
      filename: path.basename(priceWorkbookPath),
      sourceType: "main_catalog_workbook",
      reasons: ["Seiko Women 73 public RUB selling prices from user-provided price workbook."],
      workbookSheets: ["Seiko Women — цены", "Параметры"],
      rawRowCount: priceRows.length,
    },
  ];
  preview.generatedAt = new Date().toISOString();

  const plan = buildControlledCatalogApplyPlan({ preview, previewPath, generatedAt: preview.generatedAt });
  preview.applyPlan = buildImportApplyPlan(preview.records);

  await writeFile(previewPath, `${JSON.stringify(preview, null, 2)}\n`, "utf8");
  await writeCatalogImageUploadPlan({ imagePlanPath, imageUploadPlan: plan.imageUploadPlan as CatalogImageUploadPlan });

  console.log(`SEIKO_PRICE_ROWS=${priceRows.length}`);
  console.log(`SEIKO_PRICE_RECORDS_UPDATED=${updated}`);
  console.log(`SEIKO_PUBLIC_RUB_MIN=${minPublicRub}`);
  console.log(`SEIKO_PUBLIC_RUB_MAX=${maxPublicRub}`);
  console.log("SEIKO_PURCHASE_RUB_PUBLIC=NO");
  console.log("SEIKO_CNY_PUBLIC=NO");
}

main().catch((error: unknown) => {
  console.error(`Seiko Women price import failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
