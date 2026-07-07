import { describe, expect, it } from "vitest";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { listEditorialSelections } from "@/modules/editorial-selections/application/editorial-selection-service";
import {
  calculateReadingTimeMinutes,
  getJournalInventory,
  getPublishedJournalArticle,
  listPublishedJournalArticles,
} from "@/modules/journal/application/journal-repository";
import { journalArticleSources } from "@/modules/journal/content/articles";
import type { CatalogImportPreview, MergedCatalogCandidate, StagedPricing } from "@/modules/imports/catalog/domain/types";

function pricing(amountMinor: number): StagedPricing {
  return {
    publicPriceCandidate: { amountMinor, currencyCode: "RUB" },
    selectedPublicPriceSource: null,
    rubPriceSources: [],
    nonRubPriceSources: [],
    internalAnalyticalValues: [],
    allSources: [],
  };
}

function candidate(input: {
  candidateId: string;
  brand: string;
  referenceRaw: string;
  referenceNormalized: string;
  priceMinor: number;
  movement?: string;
  status?: MergedCatalogCandidate["applyEligibility"]["status"];
}): MergedCatalogCandidate {
  return {
    candidateId: input.candidateId,
    identity: {
      brand: input.brand,
      brandNormalized: input.brand.toLowerCase(),
      title: `${input.brand} ${input.referenceRaw}`,
      officialName: `${input.brand} ${input.referenceRaw}`,
      referenceRaw: input.referenceRaw,
      referenceNormalized: input.referenceNormalized,
    },
    hierarchy: {
      brandCollection: "Collection",
      brandLine: null,
      watchModelCandidate: `${input.brand} ${input.referenceRaw}`,
    },
    specifications: {
      firstClass: input.movement ? { movement_raw: input.movement } : {},
      controlledAttributes: {},
      unresolvedAttributes: {},
    },
    traits: {},
    pricing: pricing(input.priceMinor),
    contentDrafts: {
      seoDescription: null,
    },
    images: {
      candidates: [],
      primaryImageCandidate: null,
    },
    sourceProvenance: [],
    sourceRows: [],
    sourceRowClassification: {
      kind: "product_candidate",
      indicators: ["fixture product"],
      action: "allow_public_read_and_apply",
    },
    validationIssues: [],
    applyEligibility: {
      status: input.status ?? "eligible",
      referenceApplyEligible: (input.status ?? "eligible") === "eligible",
      commercialApplyEligible: (input.status ?? "eligible") === "eligible",
      reasons: [],
    },
  };
}

function preview(records: MergedCatalogCandidate[]): CatalogImportPreview {
  return {
    generatedAt: "2026-07-07T00:00:00.000Z",
    sources: [],
    records,
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
}

describe("journal and editorial selections", () => {
  it("excludes unpublished Journal drafts from public models and resolves published articles", () => {
    const articles = listPublishedJournalArticles();
    const publicJson = JSON.stringify(articles);

    expect(articles.length).toBeGreaterThanOrEqual(8);
    expect(getJournalInventory().unpublishedDraftCount).toBeGreaterThan(0);
    expect(getPublishedJournalArticle("why-g-shock-became-cult")?.title).toContain("G-Shock");
    expect(getPublishedJournalArticle("draft-diving-watch-history")).toBeNull();
    expect(getPublishedJournalArticle("unknown-slug")).toBeNull();
    expect(publicJson).not.toContain("draft");
    expect(publicJson).not.toContain("status");
  });

  it("calculates reading time from actual article content", () => {
    const article = journalArticleSources.find((source) => source.slug === "quartz-vs-mechanical-real-difference");

    expect(article).toBeDefined();
    expect(calculateReadingTimeMinutes(article!)).toBeGreaterThanOrEqual(1);
  });

  it("builds editorial selections only from eligible public watches", () => {
    const valid = candidate({
      candidateId: "casio:A158WA1DF",
      brand: "Casio",
      referenceRaw: "A158WA-1DF",
      referenceNormalized: "A158WA1DF",
      priceMinor: 1200000,
      movement: "Кварцевый",
    });
    const mechanical = candidate({
      candidateId: "orient:RAAC0M04Y10B",
      brand: "Orient",
      referenceRaw: "RA-AC0M04Y10B",
      referenceNormalized: "RAAC0M04Y10B",
      priceMinor: 2800000,
      movement: "Автоматический",
    });
    const invalid = candidate({
      candidateId: "orient:MANUAL",
      brand: "Orient",
      referenceRaw: "MANUAL",
      referenceNormalized: "MANUAL",
      priceMinor: 1000000,
      status: "manual_review",
    });
    const dataset = catalogReadDatasetFromPreview({ preview: preview([valid, mechanical, invalid]), imagePlan: null });
    const selections = listEditorialSelections(dataset);
    const selectionJson = JSON.stringify(selections);

    expect(selections.length).toBeGreaterThan(0);
    expect(selectionJson).toContain("A158WA-1DF");
    expect(selectionJson).toContain("RA-AC0M04Y10B");
    expect(selectionJson).not.toContain("MANUAL");
    expect(selectionJson).not.toContain("publicPrice <=");
    expect(selectionJson).not.toContain("brand in");
  });
});
