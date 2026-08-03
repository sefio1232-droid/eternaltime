import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogQueryHref, parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { isRecommendedViewActive, listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import { isLikelyTechnicalAngle } from "@/modules/catalog/application/catalog-image-presentation-policy";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

/**
 * Phase 3 catalog visual reset checks (docs/CATALOG_VISUAL_RESET.md). Source-content assertions
 * never depend on hashed CSS Module class names. Data-layer assertions use a small synthetic
 * multi-brand fixture (fast, deterministic) rather than the 24MB real preview file, except where
 * a check is specifically about real, already-diagnosed references (AE-1200WH-1BV).
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
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
}): CatalogWatchDetail {
  const id = `${input.brandSlug}/${input.ref.toLowerCase()}`;
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
    keySpecifications: [{ key: "movement_raw", label: "Механизм", value: "Кварцевый", group: "mechanism" }],
    brandLineName: null,
    imageGallery: [],
    specifications: [{ key: "movement_raw", label: "Механизм", value: "Кварцевый", group: "mechanism" }],
    siblingReferences: [],
  };
}

/** 4 brands, 10 watches each, a realistic price spread — enough to exercise a real 24-item page
 * boundary (40 total > pageSize 24). */
function buildMultiBrandDataset(): CatalogReadDataset {
  const brands: Array<{ slug: string; name: string }> = [
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
          priceMinor: 300_000 + index * 400_000,
          collection: `Line ${index % 3}`,
        }),
      );
    }
  }

  return { source: "preview", generatedAt: "2026-01-01T00:00:00.000Z", watches, brands: brands.map((b) => ({ ...b, watchCount: 10 })) };
}

describe("catalog Phase 3 visual reset", () => {
  it("1. opening composition is absent from the list page source", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    expect(listPage).not.toContain("openingGrid");
    expect(listPage).not.toContain("OPENING_COMPOSITION_COUNT");
    expect(listPage).not.toContain("OPENING_ROLE_ATTRIBUTE");
  });

  it("2. data-opening-role is absent from both the list page and its stylesheet", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    expect(listPage).not.toContain("data-opening-role");
    expect(listStyles).not.toContain("data-opening-role");
    expect(listStyles).not.toContain("openingGrid");
  });

  it("3. the All tab imposes no extra filtering beyond the normal query (real dataset size preserved)", () => {
    const dataset = buildMultiBrandDataset();
    const all = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
    expect(all.totalRecords).toBe(dataset.watches.length);
  });

  it("4. Recommended applies no hard price floor — every watch stays included", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    expect(recommended.totalRecords).toBe(dataset.watches.length);
  });

  it("5. Recommended first page can include watches priced under 10 000 ₽ when they score well", () => {
    // Not a hard requirement that one appears (ranking is score-driven), but the ranking must not
    // structurally exclude them — verified via the full un-paginated ranking containing every id.
    const dataset = buildMultiBrandDataset();
    const fullyRanked = listCatalogWatches(dataset, { ...parseCatalogReadQuery({ searchParams: {} }), pageSize: dataset.watches.length });
    expect(new Set(fullyRanked.items.map((item) => item.id)).size).toBe(dataset.watches.length);
  });

  it("6. Recommended first page contains at least 3 brands when the data supports it", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const brandsOnPage = new Set(recommended.items.map((item) => item.brandSlug));
    expect(brandsOnPage.size).toBeGreaterThanOrEqual(3);
  });

  it("7. Recommended first page returns a full 24-item page when enough watches exist", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    expect(recommended.totalRecords).toBe(dataset.watches.length);
    expect(recommended.items.length).toBe(24);
  });

  it("8. no single brand dominates the Recommended first page (diversity cap)", () => {
    const dataset = buildMultiBrandDataset();
    const recommended = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const counts = new Map<string, number>();
    for (const item of recommended.items) counts.set(item.brandSlug, (counts.get(item.brandSlug) ?? 0) + 1);
    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(9);
    }
  });

  it("9. Recommended ranking is deterministic across repeated calls", () => {
    const dataset = buildMultiBrandDataset();
    const first = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    const second = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {} }));
    expect(first.items.map((item) => item.id)).toEqual(second.items.map((item) => item.id));
  });

  it("10. an explicit price_asc sort surfaces the cheapest watch first regardless of tab", () => {
    const dataset = buildMultiBrandDataset();
    const all = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all", sort: "price_asc" } }));
    const cheapestOverall = Math.min(...dataset.watches.map((w) => w.publicPrice?.amountMinor ?? Infinity));
    expect(all.items[0]?.publicPrice?.amountMinor).toBe(cheapestOverall);
  });

  it("11. a manual price filter narrows results the same way under any view", () => {
    const dataset = buildMultiBrandDataset();
    const filtered = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { priceMin: "5000" } }));
    for (const item of filtered.items) {
      expect(item.publicPrice?.amountMinor ?? 0).toBeGreaterThanOrEqual(500_000);
    }
    expect(filtered.totalRecords).toBeLessThan(dataset.watches.length);
  });

  it("12. brand tabs always show the full brand catalog (never affected by Recommended ranking)", () => {
    const dataset = buildMultiBrandDataset();
    const casioTab = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: {}, brandSlug: "casio" }));
    expect(casioTab.totalRecords).toBe(10);
    expect(isRecommendedViewActive(casioTab.query)).toBe(false);
    const tabsSource = readSrc("src/components/catalog/catalog-tabs.tsx");
    expect(tabsSource).toContain("brandSlug: brand.value");
  });

  it("13. the product grid reaches 4 columns at the 1200px breakpoint", () => {
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    expect(listStyles).toMatch(/@media \(min-width: 1200px\) \{\s*\.grid \{\s*grid-template-columns: repeat\(4,/);
  });

  it("14. the curatorial module is spliced in addition to product records, never replacing one", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    // Every iterated watch always gets its own feed push; the curatorial item is an extra,
    // conditional push alongside it, not a substitute.
    expect(listPage).toMatch(/items\.forEach\(\(watch, index\) => \{[\s\S]*?feed\.push\(\{ type: "curatorial"[\s\S]*?feed\.push\(\{ type: "watch"/);
  });

  it("15. curatorial paths carry real catalog watches and canonical links", () => {
    const service = readSrc("src/modules/catalog/application/catalog-read-service.ts");
    const curatorialModule = readSrc("src/components/catalog/catalog-curatorial-module.tsx");
    expect(service).toContain("watch: everyday");
    expect(service).toContain("watch: firstMechanical");
    expect(curatorialModule).toContain("href={path.watch.href}");
  });

  it("16. AE-1200WH-1BV's known caseback image is excluded from primary selection", () => {
    const policy = readSrc("src/modules/catalog/application/catalog-image-presentation-policy.ts");
    expect(policy).toContain("18ed5922d050fad407b9b2ddc9fe3cc8");
    const caseback = devImage("18ed5922d050fad407b9b2ddc9fe3cc8");
    expect(isLikelyTechnicalAngle(caseback, 0)).toBe(true);
  });

  it("17. A130WE-7ADF (and every other watch) renders through the single regular card — no size variant exists", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    expect(card).not.toContain("variant");
    expect(card).not.toContain("cardLead");
    const cardStyles = readSrc("src/components/catalog/catalog-watch-card.module.css");
    expect(cardStyles).not.toContain(".cardLead");
  });

  it("18. canonical card links are unchanged (still watch.href)", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    expect(card).toContain("href={watch.href}");
  });

  it("19. pagination hrefs preserve the rest of the query state, including view", () => {
    const query = parseCatalogReadQuery({ searchParams: { view: "all", sort: "price_asc" } });
    const pageTwoHref = catalogQueryHref("/watches", query, { page: 2 });
    expect(pageTwoHref).toContain("view=all");
    expect(pageTwoHref).toContain("sort=price_asc");
    expect(pageTwoHref).toContain("page=2");
  });

  it("20. the card has no nested interactive elements inside its single Link", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    const linkOpen = card.indexOf("<Link href={watch.href}");
    const linkClose = card.lastIndexOf("</Link>");
    const linkBody = card.slice(linkOpen, linkClose);
    const innerLinkOrButton = linkBody.slice(linkBody.indexOf(">") + 1);
    expect(innerLinkOrButton).not.toMatch(/<Link\s|<a\s|<button/);
  });
});
