import { describe, expect, it } from "vitest";
import { buildImportApplyPlan } from "@/modules/imports/catalog/application/apply-plan";
import { mergeNormalizedCatalogRows } from "@/modules/imports/catalog/application/merge-sources";
import { normalizeCatalogRow } from "@/modules/imports/catalog/application/normalize-row";
import { buildCatalogReviewQueue } from "@/modules/imports/catalog/application/review-queue";
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

function normalized(input: Parameters<typeof row>[0], zipEntries: string[] = []) {
  return normalizeCatalogRow(row(input), zipEntries);
}

describe("catalog source merge and apply eligibility", () => {
  it("merges sources by brand/reference, applies package priority, and keeps identity conflicts manual", () => {
    const main = normalized({
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
    });
    const packageRow = normalized(
      {
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
      },
      ["images/Casio/A158WA-1DF/A158WA-1DF_1.webp"],
    );
    const [candidate] = mergeNormalizedCatalogRows([main, packageRow]);

    expect(candidate.identity.title).toBe("Casio Package Title");
    expect(candidate.hierarchy.brandCollection).toBe("Vintage");
    expect(candidate.pricing.publicPriceCandidate).toEqual({ amountMinor: 6700000, currencyCode: "RUB" });
    expect(candidate.pricing.internalAnalyticalValues.some((source) => source.rawFieldName === "Разница")).toBe(true);
    expect(candidate.validationIssues.some((issue) => issue.code === "identity_source_conflict")).toBe(true);
    expect(candidate.validationIssues.some((issue) => issue.code === "unsupported_characteristic_key")).toBe(true);
    expect(candidate.images.primaryImageCandidate?.actualZipEntry).toBe("images/Casio/A158WA-1DF/A158WA-1DF_1.webp");
    expect(candidate.applyEligibility.status).toBe("manual_review");
  });

  it("does not make content-draft conflicts block informational reference apply", () => {
    const main = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Casio",
      rowNumber: 2,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio A158WA-1DF",
        "Артикул": "A158WA-1DF",
        "Цена ₽": "10 000",
        "SEO-описание": "Short draft",
      },
    });
    const packageRow = normalized({
      sourceFile: "casio.zip",
      sourceType: "casio_package",
      sheet: "Casio_для_IT",
      rowNumber: 2,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio A158WA-1DF",
        "Артикул": "A158WA-1DF",
        "Цена на сайте": "11 000",
        "Подробное SEO-описание": "Longer source draft",
      },
    });
    const [candidate] = mergeNormalizedCatalogRows([main, packageRow]);

    expect(candidate.validationIssues.some((issue) => issue.code === "content_draft_conflict")).toBe(true);
    expect(candidate.applyEligibility.status).toBe("eligible");
  });

  it("blocks critical identity issues and excludes blocked rows from commercial apply plan", () => {
    const badRow = normalized({
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
    });
    const [candidate] = mergeNormalizedCatalogRows([badRow]);
    const plan = buildImportApplyPlan([candidate]);

    expect(candidate.applyEligibility.status).toBe("blocked");
    expect(candidate.validationIssues.some((issue) => issue.code === "suspicious_reference")).toBe(true);
    expect(plan.proposedCatalogOfferChanges).toHaveLength(0);
  });

  it("allows informational reference staging without public price but blocks commercial apply", () => {
    const infoRow = normalized({
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
    });
    const [candidate] = mergeNormalizedCatalogRows([infoRow]);
    const plan = buildImportApplyPlan([candidate]);

    expect(candidate.applyEligibility.status).toBe("eligible");
    expect(candidate.applyEligibility.referenceApplyEligible).toBe(true);
    expect(candidate.applyEligibility.commercialApplyEligible).toBe(false);
    expect(plan.proposedWatchReferenceChanges).toHaveLength(1);
    expect(plan.proposedCatalogOfferChanges).toHaveLength(0);
  });

  it("does not let image absence block an informational reference", () => {
    const imageLess = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Citizen",
      rowNumber: 3,
      values: {
        "Бренд": "Citizen",
        "Название для сайта": "Citizen BN0151-09L",
        "Артикул": "BN0151-09L",
        "Цена ₽": "20 000",
      },
    });
    const [candidate] = mergeNormalizedCatalogRows([imageLess]);

    expect(candidate.images.candidates).toHaveLength(0);
    expect(candidate.applyEligibility.status).toBe("eligible");
  });

  it("preserves unresolved optional attributes without forcing manual review", () => {
    const unknownSpec = normalized({
      sourceFile: "casio.zip",
      sourceType: "casio_package",
      sheet: "Casio_для_IT",
      rowNumber: 4,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio A168WA-1",
        "Артикул": "A168WA-1",
        "Цена на сайте": "12 000",
        "Характеристики": "Неизвестный ключ: value",
      },
    });
    const [candidate] = mergeNormalizedCatalogRows([unknownSpec]);

    expect(candidate.validationIssues.some((issue) => issue.code === "unsupported_characteristic_key")).toBe(true);
    expect(candidate.specifications.unresolvedAttributes.неизвестныйключ).toEqual(["value"]);
    expect(candidate.applyEligibility.status).toBe("eligible");
  });

  it("keeps identity metadata out of unresolved arbitrary characteristics", () => {
    const metadata = normalized({
      sourceFile: "casio.zip",
      sourceType: "casio_package",
      sheet: "Casio_для_IT",
      rowNumber: 5,
      values: {
        "Бренд": "Casio",
        "Серия": "Vintage",
        "Название для сайта": "Casio A158WA-1DF",
        "Артикул": "A158WA-1DF",
        "Цена на сайте": "10 000",
        "Характеристики": "Артикул: A158WA-1DF | Бренд: Casio | Серия: Vintage",
      },
    });
    const [candidate] = mergeNormalizedCatalogRows([metadata]);

    expect(candidate.specifications.unresolvedAttributes).toEqual({});
    expect(candidate.validationIssues.some((issue) => issue.code === "unsupported_characteristic_key")).toBe(false);
    expect(candidate.applyEligibility.status).toBe("eligible");
  });

  it("classifies compatible duplicate rows inside one source as the same identity and scopes identity by brand", () => {
    const duplicateRows = [
      normalized({
        sourceFile: "main.xlsx",
        sourceType: "main_catalog_workbook",
        sheet: "Casio",
        rowNumber: 2,
        values: {
          "Бренд": "Casio",
          "Название для сайта": "Casio ABC-123",
          "Артикул": "ABC-123",
          "Цена ₽": "10000",
        },
      }),
      normalized({
        sourceFile: "main.xlsx",
        sourceType: "main_catalog_workbook",
        sheet: "Casio",
        rowNumber: 3,
        values: {
          "Бренд": "Casio",
          "Название для сайта": "Casio ABC-123 duplicate note",
          "Артикул": "ABC123",
          "Цена ₽": "10000",
        },
      }),
      normalized({
        sourceFile: "main.xlsx",
        sourceType: "main_catalog_workbook",
        sheet: "Citizen",
        rowNumber: 4,
        values: {
          "Бренд": "Citizen",
          "Название для сайта": "Citizen ABC123",
          "Артикул": "ABC123",
          "Цена ₽": "10000",
        },
      }),
    ];
    const candidates = mergeNormalizedCatalogRows(duplicateRows);
    const casioCandidate = candidates.find((candidate) => candidate.identity.brand === "Casio");

    expect(candidates).toHaveLength(2);
    expect(casioCandidate?.validationIssues.some((issue) => issue.code === "duplicate_reference_same_identity")).toBe(true);
    expect(casioCandidate?.applyEligibility.status).toBe("eligible");
  });

  it("keeps conflicting duplicate identities in manual review", () => {
    const duplicateRows = [
      normalized({
        sourceFile: "main.xlsx",
        sourceType: "main_catalog_workbook",
        sheet: "Casio",
        rowNumber: 2,
        values: {
          "Бренд": "Casio",
          "Название для сайта": "Casio Diver ABC-123",
          "Артикул": "ABC-123",
          "Цена ₽": "10000",
        },
      }),
      normalized({
        sourceFile: "main.xlsx",
        sourceType: "main_catalog_workbook",
        sheet: "Casio",
        rowNumber: 3,
        values: {
          "Бренд": "Casio",
          "Название для сайта": "Casio Dress ABC-123",
          "Артикул": "ABC123",
          "Цена ₽": "10000",
        },
      }),
    ];
    const [candidate] = mergeNormalizedCatalogRows(duplicateRows);

    expect(candidate.validationIssues.some((issue) => issue.code === "duplicate_reference_conflict")).toBe(true);
    expect(candidate.applyEligibility.status).toBe("manual_review");
  });

  it("recovers a missing reference only through exact title and shared source URL", () => {
    const missingReference = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Casio",
      rowNumber: 2,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio A158WA-1DF",
        "Артикул": "",
        "Ссылка": "https://example.test/watch/a158",
        "Цена ₽": "10000",
      },
    });
    const validReference = normalized({
      sourceFile: "casio.zip",
      sourceType: "casio_package",
      sheet: "Casio_для_IT",
      rowNumber: 2,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio A158WA-1DF",
        "Артикул": "A158WA-1DF",
        "Ссылка": "https://example.test/watch/a158",
        "Цена на сайте": "11000",
      },
    });
    const [candidate] = mergeNormalizedCatalogRows([missingReference, validReference]);

    expect(candidate.identity.referenceNormalized).toBe("A158WA1DF");
    expect(candidate.validationIssues.some((issue) => issue.code === "reference_recovered_from_cross_source")).toBe(true);
    expect(candidate.applyEligibility.status).toBe("eligible");
  });

  it("rejects ambiguous cross-source reference recovery", () => {
    const missingReference = normalized({
      sourceFile: "main.xlsx",
      sourceType: "main_catalog_workbook",
      sheet: "Casio",
      rowNumber: 2,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio Shared",
        "Артикул": "",
        "Ссылка": "https://example.test/watch/shared",
        "Цена ₽": "10000",
      },
    });
    const validReferenceA = normalized({
      sourceFile: "casio-a.zip",
      sourceType: "casio_package",
      sheet: "Casio_для_IT",
      rowNumber: 2,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio Shared",
        "Артикул": "A111",
        "Ссылка": "https://example.test/watch/shared",
        "Цена на сайте": "11000",
      },
    });
    const validReferenceB = normalized({
      sourceFile: "casio-b.zip",
      sourceType: "casio_package",
      sheet: "Casio_для_IT",
      rowNumber: 3,
      values: {
        "Бренд": "Casio",
        "Название для сайта": "Casio Shared",
        "Артикул": "B222",
        "Ссылка": "https://example.test/watch/shared",
        "Цена на сайте": "12000",
      },
    });
    const candidates = mergeNormalizedCatalogRows([missingReference, validReferenceA, validReferenceB]);
    const unresolved = candidates.find((candidate) => candidate.identity.referenceNormalized === null);

    expect(unresolved?.validationIssues.some((issue) => issue.code === "reference_recovery_ambiguous")).toBe(true);
    expect(unresolved?.applyEligibility.status).toBe("blocked");
  });

  it("generates a compact review queue for non-eligible records", () => {
    const badRow = normalized({
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
    });
    const [candidate] = mergeNormalizedCatalogRows([badRow]);
    const queue = buildCatalogReviewQueue({ generatedAt: "2026-01-01T00:00:00.000Z", candidates: [candidate] });

    expect(queue.recordCount).toBe(1);
    expect(queue.entries[0]?.candidateId).toBe(candidate.candidateId);
    expect(queue.entries[0]?.suggestedReviewActionType).toBe("confirm_reference");
  });
});
