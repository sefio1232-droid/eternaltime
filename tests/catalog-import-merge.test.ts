import { describe, expect, it } from "vitest";
import { buildImportApplyPlan } from "@/modules/imports/catalog/application/apply-plan";
import { mergeNormalizedCatalogRows } from "@/modules/imports/catalog/application/merge-sources";
import { normalizeCatalogRow } from "@/modules/imports/catalog/application/normalize-row";
import type { RawCatalogRow } from "@/modules/imports/catalog/domain/types";

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

describe("catalog source merge and apply eligibility", () => {
  it("merges sources by brand/reference, applies package priority, and reports conflicts", () => {
    const main = normalizeCatalogRow(
      row({
        sourceFile: "main.xlsx",
        sourceType: "main_catalog_workbook",
        sheet: "Casio",
        rowNumber: 2,
        values: {
          "Бренд": "Casio",
          "Серия": "Vintage",
          "Название для сайта": "Casio Main Title",
          "Артикул": "A158WA-1DF",
          "Цена ₽ (¥×12)": "44 000",
          "Цена в России": "67 000",
          "Разница": "23 000",
        },
      }),
      [],
    );
    const packageRow = normalizeCatalogRow(
      row({
        sourceFile: "casio.zip",
        sourceType: "casio_package",
        sheet: "Casio_для_IT",
        rowNumber: 2,
        values: {
          "Бренд": "Casio",
          "Название для сайта": "Casio Package Title",
          "Артикул": "A158WA-1DF",
          "Цена на сайте": "59 000",
          "Подробное SEO-описание": "Detailed source draft",
          "Характеристики": "Размер: 36 мм | неизвестно: value",
        },
      }),
      ["images/Casio/A158WA-1DF/A158WA-1DF_1.webp"],
    );
    const [candidate] = mergeNormalizedCatalogRows([main, packageRow]);

    expect(candidate.identity.title).toBe("Casio Package Title");
    expect(candidate.hierarchy.brandCollection).toBe("Vintage");
    expect(candidate.pricing.publicPriceCandidate).toEqual({ amountMinor: 6700000, currencyCode: "RUB" });
    expect(candidate.pricing.internalAnalyticalValues.some((source) => source.rawFieldName === "Разница")).toBe(true);
    expect(candidate.validationIssues.some((issue) => issue.code === "source_conflict")).toBe(true);
    expect(candidate.validationIssues.some((issue) => issue.code === "unsupported_characteristic_key")).toBe(true);
    expect(candidate.images.primaryImageCandidate?.actualZipEntry).toBe("images/Casio/A158WA-1DF/A158WA-1DF_1.webp");
    expect(candidate.applyEligibility.status).toBe("manual_review");
  });

  it("blocks critical identity issues and excludes blocked rows from commercial apply plan", () => {
    const badRow = normalizeCatalogRow(
      row({
        sourceFile: "orient.zip",
        sourceType: "orient_package",
        sheet: "Orient_для_IT",
        rowNumber: 5,
        values: {
          "Бренд": "Orient",
          "Название для сайта": "Orient Suspicious",
          "Артикул": "7",
          "Цена ₽": "10000",
        },
      }),
      [],
    );
    const [candidate] = mergeNormalizedCatalogRows([badRow]);
    const plan = buildImportApplyPlan([candidate]);

    expect(candidate.applyEligibility.status).toBe("blocked");
    expect(candidate.validationIssues.some((issue) => issue.code === "suspicious_reference")).toBe(true);
    expect(plan.proposedCatalogOfferChanges).toHaveLength(0);
  });

  it("allows informational reference staging without public price but blocks commercial apply", () => {
    const infoRow = normalizeCatalogRow(
      row({
        sourceFile: "main.xlsx",
        sourceType: "main_catalog_workbook",
        sheet: "Citizen",
        rowNumber: 2,
        values: {
          "Бренд": "Citizen",
          "Название для сайта": "Citizen Promaster",
          "Артикул": "BN0151-09L",
          "Цена ¥": "1000",
        },
      }),
      [],
    );
    const [candidate] = mergeNormalizedCatalogRows([infoRow]);
    const plan = buildImportApplyPlan([candidate]);

    expect(candidate.applyEligibility.status).toBe("eligible");
    expect(candidate.applyEligibility.referenceApplyEligible).toBe(true);
    expect(candidate.applyEligibility.commercialApplyEligible).toBe(false);
    expect(plan.proposedWatchReferenceChanges).toHaveLength(1);
    expect(plan.proposedCatalogOfferChanges).toHaveLength(0);
  });

  it("detects duplicate references within one brand/source but permits same reference across brands", () => {
    const duplicateRows = [
      normalizeCatalogRow(
        row({
          sourceFile: "main.xlsx",
          sourceType: "main_catalog_workbook",
          sheet: "Casio",
          rowNumber: 2,
          values: {
            "Бренд": "Casio",
            "Название для сайта": "Casio A",
            "Артикул": "ABC-123",
            "Цена ₽": "10000",
          },
        }),
        [],
      ),
      normalizeCatalogRow(
        row({
          sourceFile: "main.xlsx",
          sourceType: "main_catalog_workbook",
          sheet: "Casio",
          rowNumber: 3,
          values: {
            "Бренд": "Casio",
            "Название для сайта": "Casio A",
            "Артикул": "ABC123",
            "Цена ₽": "10000",
          },
        }),
        [],
      ),
      normalizeCatalogRow(
        row({
          sourceFile: "main.xlsx",
          sourceType: "main_catalog_workbook",
          sheet: "Citizen",
          rowNumber: 4,
          values: {
            "Бренд": "Citizen",
            "Название для сайта": "Citizen A",
            "Артикул": "ABC123",
            "Цена ₽": "10000",
          },
        }),
        [],
      ),
    ];
    const candidates = mergeNormalizedCatalogRows(duplicateRows);
    const casioCandidate = candidates.find((candidate) => candidate.identity.brand === "Casio");

    expect(candidates).toHaveLength(2);
    expect(casioCandidate?.validationIssues.some((issue) => issue.code === "duplicate_reference_within_brand")).toBe(true);
  });
});
