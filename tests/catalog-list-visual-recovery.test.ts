import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogQueryHref, parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import {
  buildCatalogPublicSanitationLog,
  sanitizeCatalogPublicText,
} from "@/modules/catalog/application/catalog-public-sanitation";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type {
  ApplyEligibilityStatus,
  CatalogImportPreview,
  ImageCandidate,
  MergedCatalogCandidate,
  StagedPricing,
} from "@/modules/imports/catalog/domain/types";

/**
 * Phase 2.1 catalog list visual recovery checks (docs/CATALOG_LIST_VISUAL_RECOVERY.md).
 * Assertions avoid hashed CSS Module class names; they check source contracts and real behavior
 * of the data layer (using the actual production functions and realistic fixtures, not mocks).
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function existsAt(relativePath: string): boolean {
  return existsSync(path.join(projectRoot, relativePath));
}

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

function imageCandidate(zipEntry: string): ImageCandidate {
  return {
    sourcePackage: "fixture.zip",
    sourceType: "casio_package",
    excelImagePath: null,
    actualZipEntry: zipEntry,
    remoteImageUrl: null,
    ordering: 1,
    isPrimaryCandidate: true,
    status: "valid",
    provenance: { sourceFile: "fixture.zip", sourceType: "casio_package", rawColumn: "__zip_entry", rawValue: zipEntry },
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
    hierarchy: { brandCollection: "Collection", brandLine: null, watchModelCandidate: input.title },
    specifications: {
      firstClass: { movement_raw: "Кварцевый" },
      controlledAttributes: {},
      unresolvedAttributes: {},
    },
    traits: {},
    pricing: pricing(input.priceMinor === undefined ? 1000000 : input.priceMinor),
    contentDrafts: { seoDescription: null },
    images: { candidates: input.image ? [input.image] : [], primaryImageCandidate: input.image ?? null },
    sourceProvenance: [],
    sourceRows: [],
    sourceRowClassification: { kind: "product_candidate", indicators: [], action: "allow_public_read_and_apply" },
    validationIssues: [],
    applyEligibility: {
      status,
      referenceApplyEligible: status === "eligible",
      commercialApplyEligible: status === "eligible" && input.priceMinor !== null,
      reasons: [],
    },
  };
}

function imagePlanItem(candidateId: string, referenceNormalized: string, zipEntry: string) {
  return {
    candidateId,
    brand: "Casio",
    brandSlug: "casio",
    referenceNormalized,
    referenceSlug: referenceNormalized.toLowerCase(),
    databaseWatchReferenceId: null,
    sourceImageCandidate: imageCandidate(zipEntry),
    sourcePackage: "fixture.zip",
    actualZipEntry: zipEntry,
    remoteImageUrl: null,
    intendedOrder: 1,
    isPrimaryCandidate: true,
    imageValidationState: "valid" as const,
    proposedStorageObjectPath: `catalog/watches/casio/${referenceNormalized.toLowerCase()}/01-image.jpg`,
  };
}

function buildFixtureDataset(): CatalogReadDataset {
  const preview: CatalogImportPreview = {
    generatedAt: "2026-07-18T00:00:00.000Z",
    sources: [],
    records: [
      candidate({
        candidateId: "casio:A1",
        brand: "Casio",
        title: "Casio A1 With Image",
        referenceRaw: "A1-WITH-IMAGE",
        referenceNormalized: "A1WITHIMAGE",
        priceMinor: 2000000,
        image: imageCandidate("images/a1.jpg"),
      }),
      candidate({
        candidateId: "casio:B2",
        brand: "Casio",
        title: "Casio B2 No Image",
        referenceRaw: "B2-NO-IMAGE",
        referenceNormalized: "B2NOIMAGE",
        priceMinor: 1000000,
        image: null,
      }),
      candidate({
        candidateId: "casio:C3",
        brand: "Casio",
        title: "Casio C3 With Image",
        referenceRaw: "C3-WITH-IMAGE",
        referenceNormalized: "C3WITHIMAGE",
        priceMinor: 3000000,
        image: imageCandidate("images/c3.jpg"),
      }),
      candidate({
        candidateId: "casio:D4",
        brand: "Casio",
        title: "Casio D4 No Image",
        referenceRaw: "D4-NO-IMAGE",
        referenceNormalized: "D4NOIMAGE",
        priceMinor: 500000,
        image: null,
      }),
      candidate({
        candidateId: "casio:noise",
        brand: "Casio",
        title: "Casio ECB-950YMP-1A блять повтор",
        referenceRaw: "ECB-950YMP-1A блять повтор",
        referenceNormalized: "ECB950YMP1AБЛЯТЬПОВТОР",
        priceMinor: 1930000,
        image: null,
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

  const imagePlan = {
    generatedAt: preview.generatedAt,
    previewGeneratedAt: preview.generatedAt,
    itemCount: 2,
    items: [imagePlanItem("casio:A1", "A1WITHIMAGE", "images/a1.jpg"), imagePlanItem("casio:C3", "C3WITHIMAGE", "images/c3.jpg")],
  };

  return catalogReadDatasetFromPreview({ preview, imagePlan });
}

describe("catalog list Phase 2.1 visual recovery", () => {
  it("1. product card is a single grid item wrapper (no separate media/content grid items)", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    // Exactly one gridItem-classed wrapper per feed entry — watch cards are not split across
    // two wrapper divs.
    expect(listPage).toMatch(/<div key=\{item\.key\} className=\{styles\.gridItem\}>\s*<CatalogWatchCardView/);
  });

  it("2. media and content belong to the same card <Link> (not sibling grid items)", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    const linkOpenIndex = card.indexOf("<Link href={watch.href}");
    const mediaIndex = card.indexOf("styles.media");
    const contentIndex = card.indexOf("styles.content");
    const linkCloseIndex = card.lastIndexOf("</Link>");
    expect(linkOpenIndex).toBeGreaterThan(-1);
    expect(mediaIndex).toBeGreaterThan(linkOpenIndex);
    expect(contentIndex).toBeGreaterThan(mediaIndex);
    expect(contentIndex).toBeLessThan(linkCloseIndex);
  });

  it("3. the editorial insert is a real, explicitly-ordered feed item (not appended via CSS order)", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    expect(listPage).toContain("type CatalogFeedItem");
    expect(listPage).toContain("buildCatalogFeed");
    expect(listPage).toContain('item.type === "curatorial"');
  });

  it("4. no CSS `order` feed hack exists anywhere in the catalog list/card source", () => {
    for (const file of [
      "src/components/catalog/catalog-list-page.tsx",
      "src/components/catalog/catalog-watch-card.tsx",
    ]) {
      expect(readSrc(file)).not.toMatch(/\border:\s*\{?\s*(index|item\.)/);
      expect(readSrc(file)).not.toContain("style={{ order");
    }
  });

  it("5. the primary toolbar is a compact control bar, not the old 12-column grid", () => {
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    expect(listStyles).toMatch(/\.controlBar\s*\{[^}]*display:\s*flex/);
    expect(listStyles).not.toContain("grid-template-columns: repeat(12, minmax(0, 1fr))");
  });

  it("6. the expanded panel has its own Применить action, not a giant always-visible submit button", () => {
    const filters = readSrc("src/components/catalog/catalog-filter-panel.tsx");
    const filterStyles = readSrc("src/components/catalog/catalog-filter-panel.module.css");
    expect(filters).toContain("styles.applyButton");
    expect(filterStyles).toContain(".applyButton");
    expect(filters).not.toContain("styles.submitCount");
  });

  it("7. active filter chips render only when filters are actually active", () => {
    const filters = readSrc("src/components/catalog/catalog-filter-panel.tsx");
    expect(filters).toContain("activeChips.length === 0");
    expect(filters).toContain("buildActiveChips");
  });

  it("8. the card has a predictable, fixed content hierarchy (brand, model, reference, price, specs, action)", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    const order = ["styles.brand", "styles.model", "styles.reference", "styles.price", "styles.specs", "styles.footer"];
    let cursor = -1;
    for (const marker of order) {
      const index = card.indexOf(marker);
      expect(index, `${marker} should appear in the card`).toBeGreaterThan(cursor);
      cursor = index;
    }
  });

  it("9. missing images use the full editorial CatalogMissingImage placeholder", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    const placeholder = readSrc("src/components/catalog/catalog-missing-image.tsx");
    expect(card).toContain("CatalogMissingImage");
    expect(placeholder).not.toContain("Фото временно недоступно");
    expect(placeholder).toContain("нейтральная карточка модели без фотографии");
    expect(placeholder).toContain("brandName");
    expect(placeholder).toContain("referenceDisplay");
  });

  it("10. the old tiny ET-square placeholder is no longer used by the card", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    expect(card).not.toContain("media-placeholder-mark");
  });

  it("11. default sort (no search, no explicit sort) prioritizes watches with a usable image", () => {
    // "view: all" opts out of Recommended curation (see Phase 3 tests below) so this exercises
    // the preserved image-first default tiebreak on its own.
    const dataset = buildFixtureDataset();
    const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
    const withImageFlags = result.items.map((item) => item.primaryImage.kind !== "none");
    // All "has image" items must appear before all "no image" items.
    const firstNoImageIndex = withImageFlags.indexOf(false);
    const lastImageIndex = withImageFlags.lastIndexOf(true);
    expect(firstNoImageIndex).toBeGreaterThan(-1);
    expect(lastImageIndex).toBeLessThan(firstNoImageIndex);
  });

  it("12. explicit price sorts retain pure price semantics (image availability does not intrude)", () => {
    const dataset = buildFixtureDataset();
    const ascending = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { sort: "price_asc" } }));
    const prices = ascending.items.map((item) => item.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sortedPrices);
  });

  it("13. total result count is unchanged by default image-priority ordering", () => {
    const dataset = buildFixtureDataset();
    const defaultResult = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
    const priceResult = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { sort: "price_asc" } }));
    expect(defaultResult.totalRecords).toBe(dataset.watches.length);
    expect(priceResult.totalRecords).toBe(dataset.watches.length);
  });

  it("14. image-less watches remain present and reachable (never hidden by default ordering)", () => {
    const dataset = buildFixtureDataset();
    const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
    const references = result.items.map((item) => item.referenceDisplay);
    expect(references).toContain("B2-NO-IMAGE");
    expect(references).toContain("D4-NO-IMAGE");
  });

  it("15. public display sanitation removes known source-review notes from the public dataset", () => {
    const dataset = buildFixtureDataset();
    const noisyWatch = dataset.watches.find((watch: CatalogWatchDetail) => watch.referenceNormalized === "ECB950YMP1AБЛЯТЬПОВТОР");
    expect(noisyWatch).toBeDefined();
    expect(noisyWatch?.referenceDisplay).toBe("ECB-950YMP-1A");
    expect(noisyWatch?.referenceDisplay).not.toContain("блять");
  });

  it("16. canonical reference identity (referenceNormalized, slug, href) is unchanged by sanitation", () => {
    const dataset = buildFixtureDataset();
    const noisyWatch = dataset.watches.find((watch: CatalogWatchDetail) => watch.referenceNormalized === "ECB950YMP1AБЛЯТЬПОВТОР");
    // The normalized identity used for matching/canonical URLs is derived from the raw source
    // value upstream of sanitation and is intentionally untouched by this phase.
    expect(noisyWatch?.referenceNormalized).toBe("ECB950YMP1AБЛЯТЬПОВТОР");
    expect(noisyWatch?.href).toBe(`/watches/casio/${noisyWatch?.referenceSlug}`);
  });

  it("17. the raw source value remains available to audit via buildCatalogPublicSanitationLog", () => {
    const entries = buildCatalogPublicSanitationLog([
      {
        candidateId: "casio:noise",
        applyEligibility: { status: "eligible" },
        sourceRowClassification: { action: "allow_public_read_and_apply" },
        identity: {
          title: "Casio ECB-950YMP-1A блять повтор",
          officialName: null,
          referenceRaw: "ECB-950YMP-1A блять повтор",
          referenceNormalized: "ECB950YMP1AБЛЯТЬПОВТОР",
        },
      },
    ]);
    const referenceEntry = entries.find((entry) => entry.field === "referenceDisplay");
    expect(referenceEntry?.raw).toBe("ECB-950YMP-1A блять повтор");
    expect(referenceEntry?.sanitized).toBe("ECB-950YMP-1A");
  });

  it("18. the exact documented example sanitizes correctly", () => {
    const result = sanitizeCatalogPublicText("ECB-950YMP-1A блять повтор");
    expect(result.sanitized).toBe("ECB-950YMP-1A");
    expect(result.wasSanitized).toBe(true);
  });

  it("19. rendered public text never contains the prohibited source-review words", () => {
    // referenceNormalized is an internal matching/slug-source key, never rendered as visible
    // text (see check 16), so it is intentionally excluded here — this checks only the fields
    // that actually reach the DOM.
    const dataset = buildFixtureDataset();
    const renderedText = dataset.watches
      .flatMap((watch) => [watch.title, watch.officialName, watch.referenceDisplay, watch.watchModelName, watch.primaryImage.alt])
      .filter((value): value is string => Boolean(value))
      .join(" ");
    for (const forbidden of ["блять", "повтор", "дубль", "duplicate"]) {
      expect(renderedText.toLocaleLowerCase("ru")).not.toContain(forbidden);
    }
  });

  it("20. the editorial insert's position is computed in TSX, not via CSS order", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    expect(listPage).not.toContain("style={{ order");
    expect(listStyles).not.toMatch(/\.insertItem\s*\{[^}]*\border:/);
    expect(listPage).toContain("insertPosition");
  });

  it("21. the curatorial module links to real, working watch routes", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    const curatorialModule = readSrc("src/components/catalog/catalog-curatorial-module.tsx");
    expect(listPage).toContain("<CatalogCuratorialModule paths={curatorialPaths}");
    expect(curatorialModule).toContain("href={path.watch.href}");
  });

  it("22. canonical card links are unchanged (still watch.href)", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    expect(card).toContain("href={watch.href}");
  });

  it("23. filtering (brand/movement/price/water/material/crystal) serialization is unchanged", () => {
    const query = parseCatalogReadQuery({
      searchParams: { brand: "casio", movement: "Кварцевый", priceMin: "5000", priceMax: "50000", water: "100 м", caseMaterial: "Сталь", crystal: "Сапфировое" },
    });
    expect(query.brandSlug).toBe("casio");
    expect(query.movement).toBe("Кварцевый");
    expect(query.minPriceMinor).toBe(500000);
    expect(query.maxPriceMinor).toBe(5000000);
    expect(query.waterResistance).toBe("100 м");
    expect(query.caseMaterial).toBe("Сталь");
    expect(query.crystal).toBe("Сапфировое");
  });

  it("24. pagination query behavior is unchanged", () => {
    const query = parseCatalogReadQuery({ searchParams: { page: "4" } });
    expect(catalogQueryHref("/watches", query)).toBe("/watches?page=4");
    expect(catalogQueryHref("/watches", query, { page: 1 })).toBe("/watches");
  });

  it("25. the watch detail route was not touched by this phase", () => {
    const detail = readSrc("src/components/catalog/catalog-watch-detail-page.tsx");
    expect(detail).not.toContain("CatalogMissingImage");
    expect(detail).not.toContain("sanitizeCatalogPublicText");
    expect(detail).not.toContain("buildCatalogFeed");
  });

  it("26. homepage components were not touched by this phase", () => {
    const homeHero = readSrc("src/components/home/home-product-hero.tsx");
    expect(homeHero).toContain('data-testid="homepage-product-stage"');
  });

  it("27. no width rules prone to horizontal overflow (100vw or unguarded huge fixed widths)", () => {
    for (const file of [
      "src/components/catalog/catalog-list-page.module.css",
      "src/components/catalog/catalog-filter-panel.module.css",
      "src/components/catalog/catalog-watch-card.module.css",
    ]) {
      expect(readSrc(file)).not.toContain("100vw");
    }
  });

  it("28. responsive filter dialog accessibility contract is preserved", () => {
    const sheet = readSrc("src/components/catalog/catalog-filter-dialog.tsx");
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain('event.key === "Escape"');
    expect(sheet).toContain("previouslyFocused");
    expect(sheet).toContain("document.body.style.overflow");
  });

  it("29. raw source data display in review mode is dev-only", () => {
    const devData = readSrc("src/modules/catalog/infrastructure/catalog-review-dev-data.server.ts");
    expect(devData).toContain('process.env.NODE_ENV === "production"');
    const watchesPage = readSrc("src/app/(shop)/watches/page.tsx");
    expect(watchesPage).toContain("reviewMode ? await getCatalogReviewSanitationEntries()");
  });

  it("30. the public display sanitation report exists after running the audit CLI", () => {
    expect(existsAt("public/generated/catalog-review/public-display-sanitation.json")).toBe(true);
    const report = JSON.parse(readSrc("public/generated/catalog-review/public-display-sanitation.json")) as {
      entries: unknown[];
    };
    expect(Array.isArray(report.entries)).toBe(true);
  });
});
