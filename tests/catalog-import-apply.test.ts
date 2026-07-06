import { describe, expect, it } from "vitest";
import { buildImportApplyPlan } from "@/modules/imports/catalog/application/apply-plan";
import { buildCatalogApplyDryRun } from "@/modules/imports/catalog/application/database-apply-dry-run";
import { executeControlledCatalogApply } from "@/modules/imports/catalog/application/database-apply-executor";
import { buildControlledCatalogApplyPlan } from "@/modules/imports/catalog/application/database-apply-plan";
import { mergeNormalizedCatalogRows } from "@/modules/imports/catalog/application/merge-sources";
import { normalizeCatalogRow } from "@/modules/imports/catalog/application/normalize-row";
import { catalogImportApplyConfirmationPhrase } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview, MergedCatalogCandidate, RawCatalogRow } from "@/modules/imports/catalog/domain/types";

function row(input: {
  sourceFile: string;
  sourceType: RawCatalogRow["sourceType"];
  sheet: string;
  rowNumber: number;
  values: Record<string, string>;
}): RawCatalogRow {
  return {
    sourceFile: input.sourceFile,
    sourceType: input.sourceType,
    workbook: input.sourceFile.replace(/\.zip$/, ".xlsx"),
    sheet: input.sheet,
    rowNumber: input.rowNumber,
    values: input.values,
  };
}

function normalized(input: Parameters<typeof row>[0], zipEntries: string[] = []) {
  return normalizeCatalogRow(row(input), zipEntries);
}

function preview(records: MergedCatalogCandidate[]): CatalogImportPreview {
  return {
    generatedAt: "2026-07-06T00:00:00.000Z",
    sources: [],
    records,
    applyPlan: buildImportApplyPlan(records),
  };
}

describe("controlled catalog database apply planning", () => {
  it("classifies eligible, manual-review, and intentionally skipped records before database apply", () => {
    const eligible = normalized(
      {
        sourceFile: "casio.zip",
        sourceType: "casio_package",
        sheet: "Casio_для_IT",
        rowNumber: 2,
        values: {
          "Бренд": "Casio",
          "Серия": "Vintage",
          "Название для сайта": "Casio A158WA-1DF",
          "Артикул": "A158WA-1DF",
          "Цена ₽ (¥×12)": "44 000",
          "Цена в России": "67 000",
          "Разница": "23 000",
          "Фото 1": "images/Casio/A158WA-1DF/A158WA-1DF_1.webp",
        },
      },
      ["images/Casio/A158WA-1DF/A158WA-1DF_1.webp"],
    );
    const skipped = normalized({
      sourceFile: "orient.zip",
      sourceType: "orient_package",
      sheet: "Orient_для_IT",
      rowNumber: 3,
      values: {
        "Бренд": "Orient",
        "Название для сайта": "Orient Suspicious",
        "Артикул": "7",
        "Цена ₽": "10 000",
      },
    });
    const manualA = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Orient",
      rowNumber: 4,
      values: {
        "Бренд": "Orient Star",
        "Название для сайта": "Orient Star RE-AU0306L00B",
        "Артикул": "RE-AU0306L00B",
        "Цена ₽": "100 000",
      },
    });
    const manualB = normalized({
      sourceFile: "orient.zip",
      sourceType: "orient_package",
      sheet: "Orient_для_IT",
      rowNumber: 4,
      values: {
        "Бренд": "Orient Star",
        "Название для сайта": "Orient Star RE-AU0306L00B",
        "Артикул": "RE-AU0306L00B",
        "Цена ₽": "100 000",
        "Характеристики": "Бренд: Orient",
      },
    });
    const records = mergeNormalizedCatalogRows([eligible, skipped, manualA, manualB]);
    const plan = buildControlledCatalogApplyPlan({
      preview: preview(records),
      previewPath: "imports/generated/catalog-import-preview.json",
      generatedAt: "2026-07-06T01:00:00.000Z",
    });

    expect(plan.statusBreakdown.eligible).toBe(1);
    expect(plan.statusBreakdown.manual_review).toBe(1);
    expect(plan.statusBreakdown.intentionally_skipped_missing_reference).toBe(1);
    expect(plan.eligibleRecords).toHaveLength(1);
    expect(plan.eligibleRecords[0]?.publicPriceMinor).toBe(6700000);
    expect(plan.manualReviewCandidateIds).toHaveLength(1);
    expect(plan.intentionallySkippedCandidateIds).toHaveLength(1);
  });

  it("does not create commercial offer or price items without a public price candidate", () => {
    const infoOnly = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Citizen",
      rowNumber: 2,
      values: {
        "Бренд": "Citizen",
        "Название для сайта": "Citizen BN0151-09L",
        "Артикул": "BN0151-09L",
        "Цена ¥": "1000",
      },
    });
    const records = mergeNormalizedCatalogRows([infoOnly]);
    const plan = buildControlledCatalogApplyPlan({
      preview: preview(records),
      previewPath: "imports/generated/catalog-import-preview.json",
      generatedAt: "2026-07-06T01:00:00.000Z",
    });

    expect(plan.eligibleRecords).toHaveLength(1);
    expect(plan.eligibleRecords[0]?.publicPriceMinor).toBeNull();
  });

  it("generates deterministic image upload plan items only for eligible valid image candidates", () => {
    const eligible = normalized(
      {
        sourceFile: "casio.zip",
        sourceType: "casio_package",
        sheet: "Casio_для_IT",
        rowNumber: 2,
        values: {
          "Бренд": "Casio",
          "Название для сайта": "Casio A158WA-1DF",
          "Артикул": "A158WA-1DF",
          "Цена на сайте": "10 000",
          "Фото 1": "images/Casio/A158WA-1DF/A158WA-1DF_1.webp",
        },
      },
      ["images/Casio/A158WA-1DF/A158WA-1DF_1.webp"],
    );
    const skipped = normalized({
      sourceFile: "orient.zip",
      sourceType: "orient_package",
      sheet: "Orient_для_IT",
      rowNumber: 3,
      values: {
        "Бренд": "Orient",
        "Название для сайта": "Orient Suspicious",
        "Артикул": "7",
        "Цена ₽": "10 000",
        "Фото 1": "images/Orient/7/7_1.jpg",
      },
    });
    const records = mergeNormalizedCatalogRows([eligible, skipped]);
    const plan = buildControlledCatalogApplyPlan({
      preview: preview(records),
      previewPath: "imports/generated/catalog-import-preview.json",
      generatedAt: "2026-07-06T01:00:00.000Z",
    });

    expect(plan.imageUploadPlan.itemCount).toBe(1);
    expect(plan.imageUploadPlan.items[0]?.proposedStorageObjectPath).toBe(
      "catalog/watches/casio/a158wa1df/01-a158wa-1df-1.webp",
    );
  });

  it("dry-run separates generated plan counts from unavailable database comparison", async () => {
    const eligible = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Citizen",
      rowNumber: 2,
      values: {
        "Бренд": "Citizen",
        "Название для сайта": "Citizen BN0151-09L",
        "Артикул": "BN0151-09L",
        "Цена ₽": "20 000",
      },
    });
    const records = mergeNormalizedCatalogRows([eligible]);
    const plan = buildControlledCatalogApplyPlan({
      preview: preview(records),
      previewPath: "imports/generated/catalog-import-preview.json",
      generatedAt: "2026-07-06T01:00:00.000Z",
    });
    const dryRun = await buildCatalogApplyDryRun({ rootDir: process.cwd(), plan, client: null });

    expect(dryRun.databaseComparisonStatus).toBe("unavailable");
    expect(dryRun.planCounts.watchReferences).toBe(1);
    expect(dryRun.planCounts.catalogOffers).toBe(1);
    expect(dryRun.proposedChanges.watchReferences.inserts).toBe(0);
    expect(dryRun.inventoryAvailability.sourceContainsConfirmedAvailability).toBe(false);
    expect(dryRun.inventoryAvailability.proposedInventoryStateChanges).toBe(0);
    expect(dryRun.actualApplyAllowed).toBe(false);
  });

  it("requires exact apply confirmation before execution", async () => {
    const eligible = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Citizen",
      rowNumber: 2,
      values: {
        "Бренд": "Citizen",
        "Название для сайта": "Citizen BN0151-09L",
        "Артикул": "BN0151-09L",
        "Цена ₽": "20 000",
      },
    });
    const records = mergeNormalizedCatalogRows([eligible]);
    const plan = buildControlledCatalogApplyPlan({
      preview: preview(records),
      previewPath: "imports/generated/catalog-import-preview.json",
      generatedAt: "2026-07-06T01:00:00.000Z",
    });
    const result = await executeControlledCatalogApply({
      rootDir: process.cwd(),
      plan,
      confirmationPhrase: null,
      client: null,
    });

    expect(result.executed).toBe(false);
    expect(result.blockers).toContain("Exact apply confirmation phrase was not provided.");
    expect(catalogImportApplyConfirmationPhrase).toBe("APPLY_ETERNAL_TIME_CATALOG_IMPORT");
  });
});
