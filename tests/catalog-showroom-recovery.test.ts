import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import { normalizeMechanismGroup } from "@/modules/catalog/application/catalog-mechanism-taxonomy";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

/**
 * Phase 3.2 checks (docs/CATALOG_SHOWROOM_RECOVERY.md). Supersedes the Phase 3.1 hard-floor
 * design this file previously tested — Recommended is now a pure ranking (see
 * `isRecommendedViewActive`/`rankRecommendedWatches` in catalog-read-service.ts): every watch a
 * query matches is always present, in every count and every page, just reordered. Real-data
 * checks load the actual production preview/image-plan files; everything else uses a small
 * synthetic fixture for speed and determinism.
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function realDataset(): CatalogReadDataset {
  const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
  const imagePlan = JSON.parse(
    readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
  ) as CatalogImageUploadPlan;
  return catalogReadDatasetFromPreview({ preview, imagePlan });
}

function devImage(imageKey: string): CatalogImagePresentation {
  return { kind: "development_zip", imageKey, src: `/api/catalog/dev-images/${imageKey}`, alt: "фото 1" };
}

function watch(input: {
  brandSlug: string;
  brandName: string;
  ref: string;
  priceMinor: number | null;
  hasImage?: boolean;
  collection?: string;
  movementRaw?: string;
}): CatalogWatchDetail {
  const id = `${input.brandSlug}/${input.ref.toLowerCase()}`;
  const movement = input.movementRaw ?? "Кварцевый";
  return {
    id,
    href: `/watches/${id}`,
    brandName: input.brandName,
    brandSlug: input.brandSlug,
    title: `${input.brandName} ${input.ref}`,
    officialName: null,
    referenceDisplay: input.ref,
    referenceNormalized: input.ref.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
    referenceSlug: input.ref.toLowerCase(),
    brandCollectionName: input.collection ?? null,
    watchModelName: `${input.brandName} ${input.ref}`,
    publicPrice: input.priceMinor === null ? null : { amountMinor: input.priceMinor, currencyCode: "RUB" },
    primaryImage: input.hasImage === false ? { kind: "none", alt: "нет фото" } : devImage(`key-${id}`),
    keySpecifications: [{ key: "movement_raw", label: "Механизм", value: movement, group: "mechanism" }],
    brandLineName: null,
    imageGallery: [],
    specifications: [{ key: "movement_raw", label: "Механизм", value: movement, group: "mechanism" }],
    siblingReferences: [],
  };
}

/** 4 brands, 40 watches, a realistic spread of prices (some well under 15 000 ₽) and a handful of
 * missing-image/dark watches — enough to exercise ranking, diversity caps, and "nothing excluded"
 * all at once. */
function buildMultiBrandDataset(): CatalogReadDataset {
  const brands = [
    { slug: "tissot", name: "Tissot" },
    { slug: "casio", name: "Casio" },
    { slug: "orient", name: "Orient" },
    { slug: "citizen", name: "Citizen" },
  ];
  const watches: CatalogWatchDetail[] = [];
  for (const brand of brands) {
    for (let index = 0; index < 10; index += 1) {
      watches.push(
        watch({
          brandSlug: brand.slug,
          brandName: brand.name,
          ref: `${brand.slug.toUpperCase()}-${index}`,
          // A real spread: some cheap (below the old 15 000 ₽ floor), some mid, some high.
          priceMinor: 300_000 + index * 400_000,
          hasImage: index !== 9, // one image-less watch per brand
          collection: `Line ${index % 3}`,
        }),
      );
    }
  }
  return { source: "preview", generatedAt: "2026-01-01T00:00:00.000Z", watches, brands: brands.map((b) => ({ ...b, watchCount: 10 })) };
}

function buildSingleBrandFamilyDataset(): CatalogReadDataset {
  const watches: CatalogWatchDetail[] = [];
  for (let index = 0; index < 12; index += 1) {
    watches.push(
      watch({
        brandSlug: "tissot",
        brandName: "Tissot",
        ref: `SEASTAR-${index}`,
        priceMinor: 2_000_000 + index * 10_000,
        collection: index < 6 ? "Seastar 1000" : `Other ${index}`,
      }),
    );
  }
  return { source: "preview", generatedAt: "2026-01-01T00:00:00.000Z", watches, brands: [{ slug: "tissot", name: "Tissot", watchCount: 12 }] };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

describe("catalog Phase 3.2 showroom recovery", () => {
  it("1. Recommended includes every watch a query matches — no hard price floor", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const all = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
    expect(recommended.totalRecords).toBe(dataset.watches.length);
    expect(recommended.totalRecords).toBe(all.totalRecords);
  });

  it("2. Recommended pagination covers the full unfiltered set", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    expect(recommended.pageCount).toBe(Math.ceil(dataset.watches.length / recommended.pageSize));
  });

  it("3. the result header never mentions a price floor", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    expect(listPage).not.toContain("От 15 000");
    expect(listPage).not.toContain("RECOMMENDED_PRICE_FLOOR");
    expect(readSrc("src/modules/catalog/application/catalog-read-service.ts")).not.toContain("RECOMMENDED_PRICE_FLOOR_MINOR");
  });

  it("4. watches priced under 15 000 ₽ remain reachable in Recommended", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const cheapIds = dataset.watches.filter((w) => (w.publicPrice?.amountMinor ?? 0) < 1_500_000).map((w) => w.id);
    const recommendedIds = new Set(recommended.items.map((item) => item.id));
    // Not necessarily on page 1, but present somewhere across the full ranking.
    const fullRanking = listCatalogWatches(dataset, { ...parseCatalogReadQuery({ searchParams: {} }), pageSize: dataset.watches.length });
    const fullIds = new Set(fullRanking.items.map((item) => item.id));
    for (const id of cheapIds) expect(fullIds.has(id)).toBe(true);
    expect(recommendedIds.size).toBeGreaterThan(0);
  });

  it("5. Recommended first-page median price is not below the overall median when data permits", () => {
    const dataset = buildMultiBrandDataset();
    const overallMedian = median(dataset.watches.map((w) => w.publicPrice?.amountMinor ?? 0));
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const frontMedian = median(recommended.items.map((item) => item.publicPrice?.amountMinor ?? 0));
    expect(frontMedian).toBeGreaterThanOrEqual(overallMedian);
  });

  it("6. Recommended first page remains diversified (not dominated by one brand or family)", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    expect(new Set(recommended.items.map((item) => item.brandSlug)).size).toBeGreaterThanOrEqual(3);
  });

  it("7. no brand exceeds 9 models on the Recommended first page", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const counts = new Map<string, number>();
    for (const item of recommended.items) counts.set(item.brandSlug, (counts.get(item.brandSlug) ?? 0) + 1);
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(9);
  });

  it("8. no normalized family exceeds 2 entries on the Recommended first page", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const counts = new Map<string, number>();
    for (const item of recommended.items) {
      const key = `${item.brandSlug}:${item.brandCollectionName ?? item.watchModelName}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it("9. Recommended order is deterministic across repeated calls", () => {
    const dataset = buildMultiBrandDataset();
    const first = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const second = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    expect(first.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));
  });

  // 559 raw eligible rows minus 12 rows that are not real distinct products, all Casio (Phase
  // 3.3): 6 rows carry literal Cyrillic text where a manufacturer reference must be (either the
  // whole reference is a leftover spreadsheet note, or sanitization can't fully clean it — see
  // preview-catalog-adapter.ts's Cyrillic-reference-display guard), and 6 more are verbatim
  // duplicates of an already-present clean-reference row where sanitization *does* fully clean the
  // text, leaving two rows with the identical public reference (see deduplicateByCleanReference).
  // 620 is the real, verified count after adding the 73-row Seiko Women staged import.
  it("10. the All tab preserves the real catalog's full 620 legitimate records", () => {
    const all = listCatalogWatches(realDataset(), parseCatalogReadQuery({ searchParams: { view: "all" } }));
    expect(all.totalRecords).toBe(620);
  });

  it("11. the Casio brand tab preserves all 222 real records (234 raw minus 12 non-product/duplicate rows)", () => {
    const casio = listCatalogWatches(realDataset(), parseCatalogReadQuery({ searchParams: {}, brandSlug: "casio" }));
    expect(casio.totalRecords).toBe(222);
  });

  it("12. the Tissot brand tab preserves all 218 real records", () => {
    const tissot = listCatalogWatches(realDataset(), parseCatalogReadQuery({ searchParams: {}, brandSlug: "tissot" }));
    expect(tissot.totalRecords).toBe(218);
  });

  it("13. the Citizen brand tab preserves all 25 real records", () => {
    const citizen = listCatalogWatches(realDataset(), parseCatalogReadQuery({ searchParams: {}, brandSlug: "citizen" }));
    expect(citizen.totalRecords).toBe(25);
  });

  it("14. the main toolbar contains search, sort, and the expanded-filter toggle", () => {
    const panel = readSrc("src/components/catalog/catalog-filter-panel.tsx");
    const dialog = readSrc("src/components/catalog/catalog-filter-dialog.tsx");
    expect(panel).toContain('name="q"');
    expect(panel).toContain('name="sort"');
    expect(dialog).toContain("aria-expanded");
  });

  it("15. mechanism is not permanently exposed in the primary toolbar", () => {
    const panel = readSrc("src/components/catalog/catalog-filter-panel.tsx");
    const primaryRowSource = panel.slice(0, panel.indexOf("expandedPanel"));
    expect(primaryRowSource).not.toContain('name="movement"');
  });

  it("16. the expanded panel renders normalized mechanism groups, not raw values", () => {
    const panel = readSrc("src/components/catalog/catalog-filter-panel.tsx");
    expect(panel).toContain("mechanismGroupLabels");
  });

  it("17. raw Orient/Casio mechanism strings are never user-facing filter options", () => {
    const dataset = buildMultiBrandDataset();
    dataset.watches.push(
      watch({ brandSlug: "orient", brandName: "Orient", ref: "ORIENT-RAW", priceMinor: 3_000_000, movementRaw: "автоматический механический механизм Orient" }),
    );
    const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const movementLabels = result.facets.movements.map((option) => option.label);
    expect(movementLabels).not.toContain("автоматический механический механизм Orient");
    expect(movementLabels).not.toContain("механический с автоподзаводом");
  });

  it("18. case variants of quartz collapse into one normalized group", () => {
    expect(normalizeMechanismGroup("кварцевый")).toBe("quartz");
    expect(normalizeMechanismGroup("Кварцевый")).toBe("quartz");
    expect(normalizeMechanismGroup("КВАРЦЕВЫЙ")).toBe("quartz");
  });

  it("19. Tough Solar maps to Solar", () => {
    expect(normalizeMechanismGroup("Tough Solar / радиосинхронизация Multi Band 6")).toBe("solar");
    expect(normalizeMechanismGroup("солнечный кварцевый механизм Orient")).toBe("solar");
  });

  it("20. automatic variants map to Автомат", () => {
    expect(normalizeMechanismGroup("автоматический механический механизм Orient")).toBe("automatic");
    expect(normalizeMechanismGroup("механический с автоподзаводом")).toBe("automatic");
    expect(normalizeMechanismGroup("Механический с автоподзаводом (24 камня, 21 600 п/ч)")).toBe("automatic");
  });

  it("21. active filters render and can be removed via a real href", () => {
    const panel = readSrc("src/components/catalog/catalog-filter-panel.tsx");
    expect(panel).toContain("buildActiveChips");
    expect(panel).toContain("removeHref");
  });

  it("22. price is never silently initialized to 15 000 ₽", () => {
    const query = parseCatalogReadQuery({ searchParams: {} });
    expect(query.minPriceMinor).toBeNull();
    expect(query.maxPriceMinor).toBeNull();
  });

  it("23. the editorial insert's image classifier accounts for low-contrast/dark sources", () => {
    const policy = readSrc("src/modules/catalog/application/catalog-image-presentation-policy.ts");
    expect(policy).toContain("low-contrast");
    expect(policy).toContain("knownLowContrastPatterns");
  });

  it("24. Orient photo-archive mapping only assigns exact-reference matches", () => {
    const manifestScript = readSrc("src/modules/catalog/cli/orient-photo-archive-manifest.ts");
    expect(manifestScript).toContain("exact");
    expect(manifestScript).not.toMatch(/fuzzy|similar|closest|levenshtein/i);
  });

  it("25. ambiguous/unmatched Orient archive files are not assigned to any catalog reference", () => {
    const manifestScript = readSrc("src/modules/catalog/cli/orient-photo-archive-manifest.ts");
    expect(manifestScript).toContain("unmatched");
  });

  it("26. a single Orient archive file is never assigned to more than one catalog reference", () => {
    const manifestScript = readSrc("src/modules/catalog/cli/orient-photo-archive-manifest.ts");
    expect(manifestScript).toMatch(/Map<string,/);
  });

  it("27. canonical card links are unchanged (still watch.href)", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    expect(card).toContain("href={watch.href}");
  });

  it("28. the card has no nested interactive elements inside its single Link", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    const linkOpen = card.indexOf("<Link href={watch.href}");
    const linkClose = card.lastIndexOf("</Link>");
    const linkBody = card.slice(linkOpen, linkClose);
    const innerLinkOrButton = linkBody.slice(linkBody.indexOf(">") + 1);
    expect(innerLinkOrButton).not.toMatch(/<Link\s|<a\s|<button/);
  });

  it("29. a brand's default listing never shows 4 same-family records in a row", () => {
    const dataset = buildSingleBrandFamilyDataset();
    const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {}, brandSlug: "tissot" }));
    const families = result.items.map((item) => item.brandCollectionName ?? item.watchModelName);
    let streak = 1;
    for (let index = 1; index < families.length; index += 1) {
      streak = families[index] === families[index - 1] ? streak + 1 : 1;
      expect(streak).toBeLessThan(4);
    }
  });

  it("30. an explicit sort bypasses brand-page family diversification", () => {
    const dataset = buildSingleBrandFamilyDataset();
    const diversified = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {}, brandSlug: "tissot" }));
    const explicitSort = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { sort: "price_asc" }, brandSlug: "tissot" }));
    const explicitPrices = explicitSort.items.map((item) => item.publicPrice?.amountMinor ?? 0);
    expect(explicitPrices).toEqual([...explicitPrices].sort((a, b) => a - b));
    expect(diversified.items.map((item) => item.id)).not.toEqual(explicitSort.items.map((item) => item.id));
  });

  it("31. no opening composition exists anywhere in the catalog source", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    const cardStyles = readSrc("src/components/catalog/catalog-watch-card.module.css");
    for (const source of [listPage, listStyles, cardStyles]) {
      expect(source).not.toContain("openingGrid");
      expect(source).not.toContain("data-opening-role");
      expect(source).not.toContain("cardLead");
    }
  });

  it("32. the curatorial paths only ever pick clean-image watches", () => {
    const service = readSrc("src/modules/catalog/application/catalog-read-service.ts");
    expect(service).toContain("dataset.watches.filter((watch) => classifyCatalogImageRejection(watch.primaryImage, 0) === null)");
  });
});
