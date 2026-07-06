import { describe, expect, it } from "vitest";
import { listCatalogBrands, listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import { parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { buildImportApplyPlan } from "@/modules/imports/catalog/application/apply-plan";
import { buildCatalogPublicHygieneReport } from "@/modules/imports/catalog/application/public-hygiene-report";
import { applySourceRowClassification } from "@/modules/imports/catalog/domain/source-row-classification";
import type {
  CatalogImportPreview,
  MergedCatalogCandidate,
  SourceRowClassification,
  StagedPricing,
} from "@/modules/imports/catalog/domain/types";

function pricing(amountMinor: number | null): StagedPricing {
  return {
    publicPriceCandidate: amountMinor === null ? null : { amountMinor, currencyCode: "RUB" },
    selectedPublicPriceSource: null,
    rubPriceSources: [],
    nonRubPriceSources: [],
    internalAnalyticalValues: [],
    allSources: [],
  };
}

const productClassification: SourceRowClassification = {
  kind: "product_candidate",
  indicators: ["fixture product"],
  action: "allow_public_read_and_apply",
};

function candidate(input: {
  candidateId: string;
  brand: string;
  title: string;
  referenceRaw: string;
  referenceNormalized: string;
  priceMinor?: number | null;
  specs?: Record<string, string>;
  classification?: SourceRowClassification;
}): MergedCatalogCandidate {
  return {
    candidateId: input.candidateId,
    identity: {
      brand: input.brand,
      brandNormalized: input.brand.toLowerCase(),
      title: input.title,
      officialName: input.title,
      referenceRaw: input.referenceRaw,
      referenceNormalized: input.referenceNormalized,
    },
    hierarchy: {
      brandCollection: "Collection",
      brandLine: null,
      watchModelCandidate: input.title,
    },
    specifications: {
      firstClass: input.specs ?? {},
      controlledAttributes: {},
      unresolvedAttributes: {},
    },
    traits: {},
    pricing: pricing(input.priceMinor === undefined ? 1000000 : input.priceMinor),
    contentDrafts: {
      seoDescription: null,
    },
    images: {
      candidates: [],
      primaryImageCandidate: null,
    },
    sourceProvenance: [],
    sourceRows: [
      {
        sourceFile: "fixture.xlsx",
        sourceType: "main_catalog_workbook",
        workbook: "fixture.xlsx",
        sheet: "Casio",
        rowNumber: 12,
        values: {
          Бренд: input.brand,
          Артикул: input.referenceRaw,
          "Название для сайта": input.title,
        },
      },
    ],
    sourceRowClassification: input.classification ?? productClassification,
    validationIssues: [],
    applyEligibility: {
      status: "eligible",
      referenceApplyEligible: true,
      commercialApplyEligible: input.priceMinor !== null,
      reasons: [],
    },
  };
}

function preview(records: MergedCatalogCandidate[]): CatalogImportPreview {
  return {
    generatedAt: "2026-07-07T00:00:00.000Z",
    sources: [],
    records,
    applyPlan: buildImportApplyPlan(records),
  };
}

describe("catalog public hygiene", () => {
  it("deterministically excludes detected source markers from public catalog and apply plan", () => {
    const marker = applySourceRowClassification(
      candidate({
        candidateId: "casio:marker",
        brand: "Casio",
        title: "Casio г шоки ниже будут",
        referenceRaw: "г шоки ниже будут",
        referenceNormalized: "ГШОКИНИЖЕБУДУТ",
        priceMinor: null,
      }),
    );
    const product = candidate({
      candidateId: "casio:A158WA1DF",
      brand: "Casio",
      title: "Casio A158WA-1DF",
      referenceRaw: "A158WA-1DF",
      referenceNormalized: "A158WA1DF",
    });
    const dataset = catalogReadDatasetFromPreview({ preview: preview([product, marker]), imagePlan: null });
    const plan = buildImportApplyPlan([product, marker]);

    expect(marker.sourceRowClassification.kind).toBe("source_marker");
    expect(marker.applyEligibility.status).toBe("blocked");
    expect(dataset.watches.map((watch) => watch.referenceDisplay)).toEqual(["A158WA-1DF"]);
    expect(plan.proposedWatchReferenceChanges).toHaveLength(1);
    expect(plan.proposedWatchReferenceChanges[0]?.reference).toBe("A158WA1DF");
  });

  it("excludes non-product source notes but keeps incomplete valid watches", () => {
    const note = applySourceRowClassification(
      candidate({
        candidateId: "casio:note",
        brand: "Casio",
        title: "Casio тут хз странный нейм пытаюсь угадать правильный ниже 8 штук",
        referenceRaw: "тут хз странный нейм пытаюсь угадать правильный ниже 8 штук",
        referenceNormalized: "ТУТХЗСТРАННЫЙНЕЙМ",
        priceMinor: null,
      }),
    );
    const incompleteValid = applySourceRowClassification(
      candidate({
        candidateId: "citizen:BN015109L",
        brand: "Citizen",
        title: "Citizen BN0151-09L",
        referenceRaw: "BN0151-09L",
        referenceNormalized: "BN015109L",
        priceMinor: null,
      }),
    );

    expect(note.sourceRowClassification.action).toBe("exclude_from_public_read_and_apply");
    expect(incompleteValid.sourceRowClassification.kind).toBe("product_candidate");
    expect(incompleteValid.applyEligibility.status).toBe("eligible");
  });

  it("public catalog count, search, filters, sorting, pagination, and brands reflect hygiene filtering", () => {
    const marker = applySourceRowClassification(
      candidate({
        candidateId: "casio:marker",
        brand: "Casio",
        title: "Casio г шоки ниже будут",
        referenceRaw: "г шоки ниже будут",
        referenceNormalized: "ГШОКИНИЖЕБУДУТ",
        priceMinor: null,
      }),
    );
    const productA = candidate({
      candidateId: "casio:A158WA1DF",
      brand: "Casio",
      title: "Casio A158WA-1DF",
      referenceRaw: "A158WA-1DF",
      referenceNormalized: "A158WA1DF",
      priceMinor: 1200000,
      specs: { movement_raw: "Кварцевый" },
    });
    const productB = candidate({
      candidateId: "tissot:T1374071104100",
      brand: "Tissot",
      title: "Tissot PRX Powermatic",
      referenceRaw: "T137.407.11.041.00",
      referenceNormalized: "T1374071104100",
      priceMinor: 6700000,
      specs: { movement_raw: "Автоматический" },
    });
    const dataset = catalogReadDatasetFromPreview({ preview: preview([marker, productB, productA]), imagePlan: null });

    expect(dataset.watches).toHaveLength(2);
    expect(listCatalogBrands(dataset).map((brand) => brand.name)).toEqual(["Casio", "Tissot"]);
    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { q: "ниже" } })).totalRecords).toBe(0);
    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { movement: "Кварцевый" } })).totalRecords).toBe(1);
    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { sort: "price_desc" } })).items[0]?.brandName).toBe("Tissot");
    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { page: "2" } })).page).toBe(1);
  });

  it("renders a public hygiene report with only detected non-product issues", () => {
    const marker = applySourceRowClassification(
      candidate({
        candidateId: "casio:marker",
        brand: "Casio",
        title: "Casio г шоки ниже будут",
        referenceRaw: "г шоки ниже будут",
        referenceNormalized: "ГШОКИНИЖЕБУДУТ",
        priceMinor: null,
      }),
    );
    const report = buildCatalogPublicHygieneReport(preview([marker]));

    expect(report.currentPublicCandidateCount).toBe(0);
    expect(report.nonProductRows).toHaveLength(1);
  });
});
