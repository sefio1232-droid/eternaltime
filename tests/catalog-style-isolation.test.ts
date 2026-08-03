import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogQueryHref, parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";

/**
 * Durable catalog style isolation checks, introduced in Phase 1 and still true after the
 * Phase 2 visual redesign. Per-component implementation details (exact CSS Module class names,
 * exact markup) are covered by tests/catalog-list-redesign.test.ts instead, since those
 * legitimately change across redesign phases. This file only asserts invariants that must hold
 * regardless of how the catalog looks:
 * - catalog components still use their own CSS Modules, not the shared globals.css classes that
 *   were migrated out in Phase 1;
 * - the shared/cross-surface classes (.product-stage, .catalog-image, .icon-heart, etc.) that
 *   both the catalog and the homepage depend on are still defined in globals.css, unmoved;
 * - the homepage was not touched;
 * - catalog data-layer contracts (query serialization, canonical hrefs) are unchanged.
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("catalog style isolation", () => {
  it("gives each catalog component its own CSS Module import", () => {
    expect(readSrc("src/components/catalog/catalog-list-page.tsx")).toContain(
      'import styles from "@/components/catalog/catalog-list-page.module.css"',
    );
    expect(readSrc("src/components/catalog/catalog-filter-panel.tsx")).toContain(
      'import styles from "@/components/catalog/catalog-filter-panel.module.css"',
    );
    expect(readSrc("src/components/catalog/catalog-watch-card.tsx")).toContain(
      'import styles from "@/components/catalog/catalog-watch-card.module.css"',
    );
    expect(readSrc("src/components/catalog/catalog-watch-detail-page.tsx")).toContain(
      'import styles from "@/components/catalog/watch-detail.module.css"',
    );
    expect(readSrc("src/components/catalog/catalog-filter-dialog.tsx")).toContain(
      'import styles from "@/components/catalog/catalog-filter-dialog.module.css"',
    );
    expect(readSrc("src/components/catalog/catalog-pagination.tsx")).toContain(
      'import styles from "@/components/catalog/catalog-pagination.module.css"',
    );
  });

  it("never reintroduces the Phase-1-migrated unscoped global class names in catalog components", () => {
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");
    const detail = readSrc("src/components/catalog/catalog-watch-detail-page.tsx");
    const filterPanel = readSrc("src/components/catalog/catalog-filter-panel.tsx");

    for (const legacyClass of [
      'className="catalog-page-head',
      'className="catalog-toolbar',
      'className="catalog-results-layout',
      'className="catalog-sidebar',
      'className="catalog-feature-strip',
    ]) {
      expect(listPage).not.toContain(legacyClass);
    }
    for (const legacyClass of ['className="catalog-product-card', 'className="catalog-card-favorite']) {
      expect(card).not.toContain(legacyClass);
    }
    for (const legacyClass of ['className="watch-detail-page', 'className="watch-detail-hero']) {
      expect(detail).not.toContain(legacyClass);
    }
    expect(filterPanel).not.toContain('className="catalog-filter-bar');
  });

  it("watch detail (untouched this phase) still references shared cross-surface classes as plain global strings", () => {
    const detail = readSrc("src/components/catalog/catalog-watch-detail-page.tsx");
    const listPage = readSrc("src/components/catalog/catalog-list-page.tsx");

    // These are consumed elsewhere (home hero, header, journal) and must stay global.
    expect(detail).toContain("product-stage");
    expect(detail).toContain("price-plate");
    expect(detail).toContain("type-label");
    expect(listPage).toContain("public-page");
  });

  it("the Phase 2 watch card is fully catalog-owned and depends on no shared global design-primitive classes", () => {
    const card = readSrc("src/components/catalog/catalog-watch-card.tsx");

    for (const sharedClass of ["product-stage", "price-plate", "type-meta", "type-price", "type-reference"]) {
      expect(card).not.toContain(sharedClass);
    }
  });

  it("globals.css still defines the shared and home-owned selectors that must not move", () => {
    const css = readSrc("src/app/globals.css");

    // Shared image system consumed by both catalog and the homepage hero/scenario media.
    expect(css).toContain(".catalog-image {");
    expect(css).toContain(".catalog-image--composed {");
    // Home-rooted selectors that style the shared .catalog-image class for the homepage.
    expect(css).toContain(".home-hero-watch .catalog-image {");
    expect(css).toContain(".home-scenario-overview-media .catalog-image {");
    expect(css).toContain(".homepage-stage-watch .catalog-image {");
    expect(css).toContain(".home-catalog-grid {");
    // Shared typography/surface primitives.
    expect(css).toContain(".product-stage {");
    expect(css).toContain(".price-plate {");
    expect(css).toContain(".type-price {");
    expect(css).toContain(".icon-heart,");
    expect(css).toContain(".icon-account {");
  });

  it("homepage components were not touched by this phase", () => {
    const homeHero = readSrc("src/components/home/home-product-hero.tsx");
    // Sentinel string proving the file content is intact and not accidentally modified.
    expect(homeHero).toContain('data-testid="homepage-product-stage"');
  });

  it("catalog query serialization and canonical hrefs are unchanged (data layer was not touched)", () => {
    const query = parseCatalogReadQuery({
      searchParams: { brand: "casio", sort: "price_asc", page: "2" },
    });

    expect(query.brandSlug).toBe("casio");
    expect(query.sort).toBe("price_asc");
    expect(query.page).toBe(2);
    expect(catalogQueryHref("/watches", query)).toBe("/watches?brand=casio&sort=price_asc&page=2");
    expect(catalogQueryHref("/watches", query, { page: 1 })).toBe("/watches?brand=casio&sort=price_asc");
  });
});
