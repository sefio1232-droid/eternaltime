import { describe, expect, it } from "vitest";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { createCatalogDevImageKey } from "@/modules/catalog/infrastructure/dev-image-keys";
import { findDevCatalogImagePlanItem } from "@/modules/catalog/infrastructure/dev-image-resolver";
import { resolveCatalogReadSourcePolicy } from "@/modules/catalog/infrastructure/catalog-read-source-policy";
import { parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import {
  getCatalogWatchByRoute,
  listCatalogWatches,
} from "@/modules/catalog/application/catalog-read-service";
import type {
  CatalogImageUploadPlan,
  CatalogImageUploadPlanItem,
} from "@/modules/imports/catalog/domain/database-apply-types";
import type {
  ApplyEligibilityStatus,
  CatalogImportPreview,
  ImageCandidate,
  MergedCatalogCandidate,
  StagedPricing,
} from "@/modules/imports/catalog/domain/types";

function pricing(amountMinor: number | null): StagedPricing {
  return {
    publicPriceCandidate: amountMinor === null ? null : { amountMinor, currencyCode: "RUB" },
    selectedPublicPriceSource:
      amountMinor === null
        ? null
        : {
            rawFieldName: "Цена на сайте",
            sourcePackage: "fixture.xlsx",
            currency: "RUB",
            rawValue: String(amountMinor / 100),
            normalizedAmountMinor: amountMinor,
            intendedVisibility: "public_candidate",
            validationState: "valid",
            provenance: {
              sourceFile: "fixture.xlsx",
              sourceType: "main_catalog_workbook",
              rawColumn: "Цена на сайте",
              rawValue: String(amountMinor / 100),
            },
          },
    rubPriceSources: [],
    nonRubPriceSources: [],
    internalAnalyticalValues: [
      {
        rawFieldName: "Цена ¥",
        sourcePackage: "fixture.xlsx",
        currency: "CNY",
        rawValue: "500",
        normalizedAmountMinor: 50000,
        intendedVisibility: "internal",
        validationState: "valid",
        provenance: {
          sourceFile: "fixture.xlsx",
          sourceType: "main_catalog_workbook",
          rawColumn: "Цена ¥",
          rawValue: "500",
        },
      },
      {
        rawFieldName: "Разница",
        sourcePackage: "fixture.xlsx",
        currency: "RUB",
        rawValue: "1000",
        normalizedAmountMinor: null,
        intendedVisibility: "excluded_from_public",
        validationState: "not_a_price",
        provenance: {
          sourceFile: "fixture.xlsx",
          sourceType: "main_catalog_workbook",
          rawColumn: "Разница",
          rawValue: "1000",
        },
      },
    ],
    allSources: [],
  };
}

function imageCandidate(input: {
  sourcePackage?: string;
  actualZipEntry?: string | null;
  remoteImageUrl?: string | null;
  status?: ImageCandidate["status"];
}): ImageCandidate {
  return {
    sourcePackage: input.sourcePackage ?? "fixture.zip",
    sourceType: "casio_package",
    excelImagePath: null,
    actualZipEntry: input.actualZipEntry ?? "images/Casio/A158WA-1DF/A158WA-1DF_1.jpg",
    remoteImageUrl: input.remoteImageUrl ?? null,
    ordering: 1,
    isPrimaryCandidate: true,
    status: input.status ?? "valid",
    provenance: {
      sourceFile: input.sourcePackage ?? "fixture.zip",
      sourceType: "casio_package",
      rawColumn: "__zip_entry",
      rawValue: input.actualZipEntry ?? "images/Casio/A158WA-1DF/A158WA-1DF_1.jpg",
    },
  };
}

function candidate(input: {
  candidateId: string;
  brand: string;
  title: string;
  referenceRaw: string;
  referenceNormalized: string;
  status?: ApplyEligibilityStatus;
  priceMinor?: number | null;
  brandCollection?: string | null;
  watchModel?: string;
  specs?: Record<string, string>;
  image?: ImageCandidate | null;
}): MergedCatalogCandidate {
  const status = input.status ?? "eligible";

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
      brandCollection: input.brandCollection ?? "Collection",
      brandLine: null,
      watchModelCandidate: input.watchModel ?? input.title,
    },
    specifications: {
      firstClass: {
        movement_raw: "Кварцевый",
        water_resistance_raw: "100 м",
        ...(input.specs ?? {}),
      },
      controlledAttributes: {
        case_material_raw: "Сталь",
        crystal_type_raw: "Минеральное",
      },
      unresolvedAttributes: {
        hidden_import_key: ["should not render"],
      },
    },
    traits: {},
    pricing: pricing(input.priceMinor === undefined ? 1000000 : input.priceMinor),
    contentDrafts: {
      seoDescription: {
        rawDraft: "RAW SEO DRAFT SHOULD NOT BE PUBLIC",
        normalizedText: "RAW SEO DRAFT SHOULD NOT BE PUBLIC",
        length: 34,
        provenance: {
          sourceFile: "fixture.xlsx",
          sourceType: "main_catalog_workbook",
        },
      },
    },
    images: {
      candidates: input.image ? [input.image] : [],
      primaryImageCandidate: input.image ?? null,
    },
    sourceProvenance: [
      {
        sourceFile: "fixture.xlsx",
        sourceType: "main_catalog_workbook",
        rawValue: "PRIVATE PROVENANCE",
      },
    ],
    sourceRows: [],
    sourceRowClassification: {
      kind: "product_candidate",
      indicators: ["fixture product candidate"],
      action: "allow_public_read_and_apply",
    },
    validationIssues: [
      {
        severity: "warning",
        code: "fixture_warning",
        message: "VALIDATION ISSUE SHOULD NOT BE PUBLIC",
      },
    ],
    applyEligibility: {
      status,
      referenceApplyEligible: status === "eligible",
      commercialApplyEligible: status === "eligible" && input.priceMinor !== null,
      reasons: [],
    },
  };
}

function imagePlanItem(input: {
  candidateId: string;
  brand?: string;
  actualZipEntry?: string | null;
  remoteImageUrl?: string | null;
  status?: ImageCandidate["status"];
  sourcePackage?: string;
}): CatalogImageUploadPlanItem {
  const sourceImageCandidate = imageCandidate({
    sourcePackage: input.sourcePackage,
    actualZipEntry: input.actualZipEntry ?? null,
    remoteImageUrl: input.remoteImageUrl ?? null,
    status: input.status,
  });

  return {
    candidateId: input.candidateId,
    brand: input.brand ?? "Casio",
    brandSlug: (input.brand ?? "Casio").toLowerCase(),
    referenceNormalized: "A158WA1DF",
    referenceSlug: "a158wa1df",
    databaseWatchReferenceId: null,
    sourceImageCandidate,
    sourcePackage: input.sourcePackage ?? "fixture.zip",
    actualZipEntry: input.actualZipEntry ?? null,
    remoteImageUrl: input.remoteImageUrl ?? null,
    intendedOrder: 1,
    isPrimaryCandidate: true,
    imageValidationState: input.status ?? "valid",
    proposedStorageObjectPath: "catalog/watches/casio/a158wa1df/01-image.jpg",
  };
}

function fixture() {
  const eligibleLocalImage = imageCandidate({
    actualZipEntry: "images/Casio/A158WA-1DF/A158WA-1DF_1.jpg",
  });
  const preview: CatalogImportPreview = {
    generatedAt: "2026-07-06T00:00:00.000Z",
    sources: [],
    records: [
      candidate({
        candidateId: "casio:A158WA1DF",
        brand: "Casio",
        title: "Casio A158WA-1DF",
        referenceRaw: "A158WA-1DF",
        referenceNormalized: "A158WA1DF",
        brandCollection: "Casio Vintage",
        priceMinor: 1200000,
        image: eligibleLocalImage,
      }),
      candidate({
        candidateId: "tissot:T1374071104100",
        brand: "Tissot",
        title: "Tissot PRX Powermatic 80 Blue",
        referenceRaw: "T137.407.11.041.00",
        referenceNormalized: "T1374071104100",
        brandCollection: "PRX",
        watchModel: "PRX Powermatic 80",
        priceMinor: 6700000,
        specs: { movement_raw: "Автоматический" },
        image: imageCandidate({
          sourcePackage: "tissot.zip",
          actualZipEntry: null,
          remoteImageUrl: "https://example.com/tissot.webp",
        }),
      }),
      candidate({
        candidateId: "tissot:T1374071105100",
        brand: "Tissot",
        title: "Tissot PRX Powermatic 80 Black",
        referenceRaw: "T137.407.11.051.00",
        referenceNormalized: "T1374071105100",
        brandCollection: "PRX",
        watchModel: "PRX Powermatic 80",
        priceMinor: 6900000,
        specs: { movement_raw: "Автоматический" },
        image: null,
      }),
      candidate({
        candidateId: "orient:7",
        brand: "Orient",
        title: "Orient unknown",
        referenceRaw: "7",
        referenceNormalized: "7",
        status: "intentionally_skipped_missing_reference",
        image: imageCandidate({ sourcePackage: "orient.zip", actualZipEntry: "images/Orient/7/7.jpg" }),
      }),
      candidate({
        candidateId: "orient:MANUAL",
        brand: "Orient",
        title: "Orient Manual Review",
        referenceRaw: "RE-AU0306L00B",
        referenceNormalized: "REAU0306L00B",
        status: "manual_review",
        image: imageCandidate({ sourcePackage: "orient.zip", actualZipEntry: "images/Orient/manual.jpg" }),
      }),
    ],
    applyPlan: {
      proposedBrandChanges: [],
      proposedBrandCollectionChanges: [],
      proposedWatchModelChanges: [],
      proposedWatchReferenceChanges: [],
      proposedCatalogOfferChanges: [],
      proposedPublicPriceChanges: [],
      proposedImageUploadCandidates: [],
    },
  };
  const validLocalItem = imagePlanItem({
    candidateId: "casio:A158WA1DF",
    actualZipEntry: "images/Casio/A158WA-1DF/A158WA-1DF_1.jpg",
  });
  const manualItem = imagePlanItem({
    candidateId: "orient:MANUAL",
    brand: "Orient",
    actualZipEntry: "images/Orient/manual.jpg",
    sourcePackage: "orient.zip",
  });
  const skippedItem = imagePlanItem({
    candidateId: "orient:7",
    brand: "Orient",
    actualZipEntry: "images/Orient/7/7.jpg",
    sourcePackage: "orient.zip",
  });
  const brokenItem = imagePlanItem({
    candidateId: "casio:A158WA1DF",
    actualZipEntry: "images/Casio/A158WA-1DF/missing.jpg",
    status: "broken",
  });
  const traversalItem = imagePlanItem({
    candidateId: "casio:A158WA1DF",
    actualZipEntry: "../secret.jpg",
  });
  const imagePlan: CatalogImageUploadPlan = {
    generatedAt: "2026-07-06T00:00:00.000Z",
    previewGeneratedAt: preview.generatedAt,
    itemCount: 5,
    items: [validLocalItem, manualItem, skippedItem, brokenItem, traversalItem],
  };

  return {
    preview,
    imagePlan,
    dataset: catalogReadDatasetFromPreview({ preview, imagePlan }),
    validLocalItem,
    manualItem,
    skippedItem,
    brokenItem,
    traversalItem,
  };
}

describe("catalog read experience", () => {
  it("allows preview source in development and fails closed in production", () => {
    expect(resolveCatalogReadSourcePolicy({ nodeEnv: "development", catalogReadSource: "preview" })).toEqual({
      allowed: true,
      source: "preview",
    });
    expect(resolveCatalogReadSourcePolicy({ nodeEnv: "production", catalogReadSource: "preview" })).toMatchObject({
      allowed: false,
      code: "catalog_source_not_configured",
    });
    expect(resolveCatalogReadSourcePolicy({ nodeEnv: "production", catalogReadSource: "database" })).toEqual({
      allowed: true,
      source: "database",
    });
  });

  it("maps only eligible records into public catalog read models", () => {
    const { dataset } = fixture();

    expect(dataset.watches).toHaveLength(3);
    expect(dataset.watches.map((watch) => watch.referenceDisplay)).not.toContain("7");
    expect(dataset.watches.some((watch) => watch.title.includes("Manual Review"))).toBe(false);
  });

  it("does not expose internal import data through read models", () => {
    const { dataset } = fixture();
    const publicJson = JSON.stringify(dataset);

    expect(publicJson).toContain("publicPrice");
    expect(publicJson).not.toContain("Цена ¥");
    expect(publicJson).not.toContain("Разница");
    expect(publicJson).not.toContain("PRIVATE PROVENANCE");
    expect(publicJson).not.toContain("VALIDATION ISSUE SHOULD NOT BE PUBLIC");
    expect(publicJson).not.toContain("RAW SEO DRAFT SHOULD NOT BE PUBLIC");
    expect(publicJson).not.toContain("sourceProvenance");
    expect(publicJson).not.toContain("validationIssues");
  });

  it("supports deterministic search by brand, title, and normalized reference", () => {
    const { dataset } = fixture();

    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { q: "Casio" } })).items).toHaveLength(1);
    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { q: "Blue" } })).items[0]?.brandName).toBe(
      "Tissot",
    );
    expect(
      listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { q: "T137 407 11 041 00" } })).items[0]
        ?.referenceNormalized,
    ).toBe("T1374071104100");
  });

  it("supports brand, specification, and price filtering", () => {
    const { dataset } = fixture();

    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { brand: "tissot" } })).items).toHaveLength(2);
    expect(
      listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { movement: "Автоматический" } })).items,
    ).toHaveLength(2);
    expect(listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { priceMin: "60000" } })).items).toHaveLength(2);
  });

  it("supports price sorting, pagination, and invalid query normalization", () => {
    const { dataset } = fixture();
    const ascending = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { sort: "price_asc" } }));
    const descending = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { sort: "price_desc" } }));
    const paged = listCatalogWatches(
      dataset,
      parseCatalogReadQuery({ searchParams: { page: "2", sort: "bad", priceMin: "oops" } }),
    );

    expect(ascending.items[0]?.referenceDisplay).toBe("A158WA-1DF");
    expect(descending.items[0]?.referenceDisplay).toBe("T137.407.11.051.00");
    expect(paged.query.sort).toBe("default");
    expect(paged.query.minPriceMinor).toBeNull();
    expect(paged.page).toBe(1);
  });

  it("resolves canonical detail route and groups sibling references by Watch Model", () => {
    const { dataset } = fixture();
    const watch = getCatalogWatchByRoute(dataset, { brandSlug: "tissot", referenceSlug: "t1374071104100" });

    expect(watch?.title).toContain("Blue");
    expect(watch?.siblingReferences).toHaveLength(1);
    expect(watch?.siblingReferences[0]?.referenceSlug).toBe("t1374071105100");
    expect(getCatalogWatchByRoute(dataset, { brandSlug: "casio", referenceSlug: "7" })).toBeNull();
  });

  it("resolves only validated eligible dev image keys and rejects unsafe keys", () => {
    const { preview, imagePlan, validLocalItem, manualItem, skippedItem, brokenItem, traversalItem } = fixture();
    const validKey = createCatalogDevImageKey(validLocalItem);

    expect(findDevCatalogImagePlanItem({ imageKey: validKey, preview, imagePlan, nodeEnv: "development" }).status).toBe(
      "found",
    );
    expect(
      findDevCatalogImagePlanItem({ imageKey: "C:\\secret.jpg", preview, imagePlan, nodeEnv: "development" }).status,
    ).toBe("not_found");
    expect(findDevCatalogImagePlanItem({ imageKey: "../secret", preview, imagePlan, nodeEnv: "development" }).status).toBe(
      "not_found",
    );
    expect(
      findDevCatalogImagePlanItem({
        imageKey: createCatalogDevImageKey(manualItem),
        preview,
        imagePlan,
        nodeEnv: "development",
      }).status,
    ).toBe("not_found");
    expect(
      findDevCatalogImagePlanItem({
        imageKey: createCatalogDevImageKey(skippedItem),
        preview,
        imagePlan,
        nodeEnv: "development",
      }).status,
    ).toBe("not_found");
    expect(
      findDevCatalogImagePlanItem({
        imageKey: createCatalogDevImageKey(brokenItem),
        preview,
        imagePlan,
        nodeEnv: "development",
      }).status,
    ).toBe("not_found");
    expect(
      findDevCatalogImagePlanItem({
        imageKey: createCatalogDevImageKey(traversalItem),
        preview,
        imagePlan,
        nodeEnv: "development",
      }).status,
    ).toBe("not_found");
    expect(findDevCatalogImagePlanItem({ imageKey: validKey, preview, imagePlan, nodeEnv: "production" }).status).toBe(
      "disabled",
    );
  });
});
