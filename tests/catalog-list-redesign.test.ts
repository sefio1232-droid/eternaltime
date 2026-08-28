import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogQueryHref, catalogQueryToSearchParams, parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

/**
 * Phase 2 catalog list redesign checks (docs/CATALOG_LIST_ART_DIRECTION.md).
 * Assertions avoid hashed CSS Module class names; they check source contracts, real
 * behavior of the untouched data layer, and structural facts about the new markup instead.
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function existsAt(relativePath: string): boolean {
  return existsSync(path.join(projectRoot, relativePath));
}

function watch(overrides: Partial<CatalogWatchDetail> = {}): CatalogWatchDetail {
  return {
    id: "tissot/t1374071104100",
    href: "/watches/tissot/t1374071104100",
    brandName: "Tissot",
    brandSlug: "tissot",
    title: "Tissot PRX Powermatic 80 Blue",
    officialName: null,
    referenceDisplay: "T137.407.11.041.00",
    referenceNormalized: "T1374071104100",
    referenceSlug: "t1374071104100",
    brandCollectionName: "PRX",
    brandLineName: null,
    watchModelName: "PRX Powermatic 80",
    publicPrice: { amountMinor: 6970000, currencyCode: "RUB" },
    primaryImage: { kind: "none", alt: "Tissot PRX: изображение пока недоступно" },
    imageGallery: [],
    keySpecifications: [{ key: "movement_type_raw", label: "Тип механизма", value: "Автоматический", group: "mechanism" }],
    specifications: [{ key: "movement_type_raw", label: "Тип механизма", value: "Автоматический", group: "mechanism" }],
    siblingReferences: [],
    ...overrides,
  };
}

function fixtureDataset(): CatalogReadDataset {
  return {
    source: "preview",
    generatedAt: "2026-07-18T00:00:00.000Z",
    watches: [
      watch(),
      watch({
        id: "casio/a158wa1df",
        href: "/watches/casio/a158wa1df",
        brandName: "Casio",
        brandSlug: "casio",
        title: "Casio A158WA-1DF",
        referenceDisplay: "A158WA-1DF",
        referenceNormalized: "A158WA1DF",
        referenceSlug: "a158wa1df",
        brandCollectionName: "Casio Vintage",
        watchModelName: "A158WA-1DF",
        publicPrice: { amountMinor: 1250000, currencyCode: "RUB" },
        keySpecifications: [],
        specifications: [],
      }),
    ],
    brands: [
      { slug: "tissot", name: "Tissot", watchCount: 1 },
      { slug: "casio", name: "Casio", watchCount: 1 },
    ],
  };
}

describe("catalog list Phase 2 redesign", () => {
  it("1. catalog list uses catalog CSS Modules", () => {
    expect(readSrc("src/components/catalog/catalog-list-page.tsx")).toContain(".module.css");
    expect(readSrc("src/components/catalog/catalog-watch-card.tsx")).toContain(".module.css");
    expect(readSrc("src/components/catalog/catalog-filter-panel.tsx")).toContain(".module.css");
  });

  it("2. homepage files were not touched by this phase", () => {
    const homeHero = readSrc("src/components/home/home-product-hero.tsx");
    expect(homeHero).toContain('data-testid="homepage-product-stage"');
  });

  it("3. no permanent desktop sidebar remains in the list page or its module", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    expect(listPage).not.toContain("aside");
    expect(listStyles).not.toMatch(/\.sidebar\s*\{/);
  });

  it("4. brand facets still exist and are computed from the dataset", () => {
    // view: "all" — these fixture watches are priced below the Phase 3.1 Recommended floor
    // (15 000 ₽), and this test is about facet computation, not curation.
    const dataset = fixtureDataset();
    const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
    expect(result.facets.brands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "tissot", label: "Tissot", count: 1 }),
        expect.objectContaining({ value: "casio", label: "Casio", count: 1 }),
      ]),
    );
  });

  it("5. search query serialization is unchanged", () => {
    const query = parseCatalogReadQuery({ searchParams: { q: "PRX Powermatic" } });
    expect(query.search).toBe("PRX Powermatic");
    const params = catalogQueryToSearchParams(query);
    expect(params.get("q")).toBe("PRX Powermatic");
  });

  it("6. filter serialization (brand/movement/price/water/material/crystal) is unchanged", () => {
    const query = parseCatalogReadQuery({
      searchParams: {
        brand: "tissot",
        movement: "Автоматический",
        priceMin: "10000",
        priceMax: "50000",
        water: "100 м",
        caseMaterial: "Сталь",
        crystal: "Сапфировое",
      },
    });
    const params = catalogQueryToSearchParams(query);
    expect(params.get("brand")).toBe("tissot");
    expect(params.get("movement")).toBe("Автоматический");
    expect(params.get("priceMin")).toBe("10000");
    expect(params.get("priceMax")).toBe("50000");
    expect(params.get("water")).toBe("100 м");
    expect(params.get("caseMaterial")).toBe("Сталь");
    expect(params.get("crystal")).toBe("Сапфировое");
  });

  it("7. sort serialization is unchanged", () => {
    const query = parseCatalogReadQuery({ searchParams: { sort: "price_desc" } });
    expect(query.sort).toBe("price_desc");
    expect(catalogQueryToSearchParams(query).get("sort")).toBe("price_desc");
    expect(catalogQueryToSearchParams(parseCatalogReadQuery({ searchParams: {} })).get("sort")).toBeNull();
  });

  it("8. pagination URLs are unchanged", () => {
    const query = parseCatalogReadQuery({ searchParams: { page: "3" } });
    expect(query.page).toBe(3);
    expect(catalogQueryHref("/watches", query)).toBe("/watches?page=3");
    expect(catalogQueryHref("/watches", query, { page: 1 })).toBe("/watches");
  });

  it("9. canonical card URLs are unchanged (watch.href drives the card link)", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    expect(card).toContain("href={watch.href}");
  });

  it("10. card no longer renders a misleading favorites link", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    const shell = readSrc("src/components/shell/public-shell.tsx");
    expect(card).not.toContain("/account/favorites");
    expect(card).not.toContain("Открыть избранное");
    // The shared header icon is a separate, pre-existing, out-of-scope concern (see
    // docs/CATALOG_CLAUDE_AUDIT.md "Shared problems not to edit") — only the card is in scope.
    expect(shell).toContain("/account/favorites");
  });

  it("11. catalog list/card/filter/pagination remain Server Components", () => {
    for (const file of [
      "src/components/catalog/catalog-list-page.tsx",
      "src/components/catalog/catalog-watch-card.tsx",
      "src/components/catalog/catalog-filter-panel.tsx",
      "src/components/catalog/catalog-pagination.tsx",
    ]) {
      expect(readSrc(file).trimStart().startsWith('"use client"')).toBe(false);
    }
    // The unified responsive filter dialog and review drawer are the intentional Client Components.
    expect(readSrc("src/components/catalog/catalog-filter-dialog.tsx").trimStart().startsWith('"use client"')).toBe(true);
    expect(readSrc("src/components/catalog/catalog-review-drawer.tsx").trimStart().startsWith('"use client"')).toBe(true);
  });

  it("12. responsive filter dialog uses real dialog semantics", () => {
    const sheet = readSrc("src/components/catalog/catalog-filter-dialog.tsx");
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain("aria-labelledby=");
    expect(sheet).toContain('aria-haspopup="dialog"');
    expect(sheet).toContain("aria-expanded={isOpen}");
  });

  it("13. responsive filter dialog has a real Escape-handling contract", () => {
    const sheet = readSrc("src/components/catalog/catalog-filter-dialog.tsx");
    expect(sheet).toContain('event.key === "Escape"');
    expect(sheet).toContain("close()");
  });

  it("14. responsive filter dialog has a real focus-trap and focus-return contract", () => {
    const sheet = readSrc("src/components/catalog/catalog-filter-dialog.tsx");
    expect(sheet).toContain('event.key !== "Tab"');
    expect(sheet).toContain("previouslyFocused");
    expect(sheet).toContain("document.body.style.overflow");
  });

  it("15. results count is computed from the real dataset, not hardcoded", () => {
    const dataset = fixtureDataset();
    const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
    expect(result.totalRecords).toBe(2);
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    expect(listPage).toContain("formatCatalogCount(result.totalRecords)");
  });

  it("16. empty state exists with a real reset link", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    expect(listPage).toContain("По выбранным параметрам моделей не нашлось");
    expect(listPage).toContain("resetHref");
    expect(listPage).toContain("catalogFilterResetHref");
  });

  it("17. curatorial module receives real canonical watch paths", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    const curatorialModule = readSrc("src/components/catalog/catalog-curatorial-module.tsx");
    expect(listPage).toContain("<CatalogCuratorialModule paths={curatorialPaths}");
    expect(curatorialModule).toContain("href={path.watch.href}");
  });

  it("18. no placeholder hrefs anywhere in the redesigned catalog list surface", () => {
    for (const file of [
      "src/components/catalog/catalog-list-page.tsx",
      "src/components/catalog/catalog-watch-card.tsx",
      "src/components/catalog/catalog-filter-panel.tsx",
      "src/components/catalog/catalog-filter-dialog.tsx",
      "src/components/catalog/catalog-pagination.tsx",
    ]) {
      expect(readSrc(file)).not.toMatch(/href=["'{]*#["'}]?/);
    }
  });

  it("19. the review drawer never renders in production and is not part of the default DOM", () => {
    const watchesPage = readSrc("src/app/(shop)/watches/page.tsx");
    const brandPage = readSrc("src/app/(shop)/watches/[brandSlug]/page.tsx");
    for (const source of [watchesPage, brandPage]) {
      expect(source).toContain('process.env.NODE_ENV !== "production"');
      expect(source).toContain('catalogReview === "1"');
    }
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    expect(listPage).toContain("reviewMode = false");
    expect(listPage).toContain("reviewData ? <CatalogReviewDrawer");
    // The generated contact sheet is a standalone public/ static file, never imported by app code.
    for (const source of [watchesPage, brandPage, listPage]) {
      expect(source).not.toContain("contact-sheet");
    }
  });

  it("20. the watch detail route was not touched by this phase", () => {
    const detail = readSrc("src/components/catalog/catalog-watch-detail-page.tsx");
    expect(detail).not.toContain("catalog-list-page.module.css");
    expect(detail).not.toContain("CatalogReviewDrawer");
    expect(detail).not.toContain("catalog-review-drawer");
  });

  it("21. the Catalog Read Repository / read-model contracts were not touched", () => {
    const readModels = readSrc("src/modules/catalog/domain/read-models.ts");
    // Same public fields as before this phase — additive-only would still contain these.
    for (const field of [
      "publicPrice: Money | null;",
      "primaryImage: CatalogImagePresentation;",
      "keySpecifications: CatalogPublicSpecification[];",
    ]) {
      expect(readModels).toContain(field);
    }
    const repository = readSrc("src/modules/catalog/infrastructure/catalog-read-repository.server.ts");
    expect(repository).toContain("export async function listPublicCatalogWatches");
    expect(repository).toContain("export async function getPublicCatalogWatch");
  });

  it("22. the grid has a real responsive breakpoint structure", () => {
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    for (const breakpoint of ["600px", "900px", "1200px", "1800px"]) {
      expect(listStyles).toContain(`@media (min-width: ${breakpoint})`);
    }
  });

  it("23. review mode is dev-only and never enabled by default", () => {
    const watchesPage = readSrc("src/app/(shop)/watches/page.tsx");
    expect(watchesPage).toMatch(/process\.env\.NODE_ENV !== "production" && resolvedSearchParams\.catalogReview === "1"/);
  });

  it("24. loading boundaries exist for the catalog list routes", () => {
    expect(existsAt("src/app/(shop)/watches/loading.tsx")).toBe(true);
    expect(existsAt("src/app/(shop)/watches/[brandSlug]/loading.tsx")).toBe(true);
  });

  it("25. error boundaries exist for the catalog list routes", () => {
    expect(existsAt("src/app/(shop)/watches/error.tsx")).toBe(true);
    expect(existsAt("src/app/(shop)/watches/[brandSlug]/error.tsx")).toBe(true);
    expect(readSrc("src/app/(shop)/watches/error.tsx")).toContain('"use client"');
  });
});
