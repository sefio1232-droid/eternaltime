import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { displayWatchTitle, formatCatalogDisplayValue } from "@/modules/catalog/application/catalog-display";
import {
  isProminentCatalogImage,
  resolveCatalogImagePresentation,
  resolveCatalogImageQualityPresentation,
  selectBestCatalogHeroImage,
} from "@/modules/catalog/application/catalog-image-presentation-policy";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

const root = process.cwd();

function file(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const localImage: CatalogImagePresentation = {
  kind: "development_zip",
  imageKey: "fixture",
  src: "/api/catalog/dev-images/fixture",
  alt: "Fixture watch",
};

const remoteImage: CatalogImagePresentation = {
  kind: "remote",
  url: "https://example.test/watch.jpg",
  src: "https://example.test/watch.jpg",
  alt: "Remote watch",
};

const technicalImage: CatalogImagePresentation = {
  kind: "development_zip",
  imageKey: "caseback",
  src: "/api/catalog/dev-images/caseback",
  alt: "Fixture watch, CASEBACK, фото 4",
};

describe("approved visual direction", () => {
  it("keeps the four approved design references available in the repository", () => {
    for (const path of [
      "docs/design-references/homepage-reference.jpg",
      "docs/design-references/journal-reference.jpg",
      "docs/design-references/catalog-reference.jpg",
      "docs/design-references/watch-detail-reference.jpg",
    ]) {
      expect(existsSync(join(root, path)), path).toBe(true);
    }
  });

  it("renders a product-led homepage hero from scenario watches, not abstract geometry", () => {
    const home = file("src/app/(public)/page.tsx");
    const hero = file("src/components/home/home-product-hero.tsx");
    const model = file("src/components/home/home-scenario-model.ts");

    expect(home).toContain("buildHomeScenarios(dataset)");
    expect(home).toContain("buildHomeOrbitWatches(scenarios)");
    expect(home).toContain("<HomeProductHero scenarios={scenarios} orbitWatches={orbitWatches} />");
    expect(hero).toContain("next/image");
    expect(hero).toContain("slot.watch.imageSrc");
    expect(hero).toContain("activeWatch");
    expect(hero).toContain("visibleOrbitIndexes");
    expect(hero).toContain("onPointerMove={updatePointer}");
    expect(hero).toContain("requestAnimationFrame");
    expect(hero).toContain("orbitPosition");
    expect(hero).toContain("setOrbitPosition");
    expect(hero).toContain("data-home-layout=\"production-single-24-watch-orbit\"");
    expect(hero).toContain('data-testid="homepage-hero"');
    expect(model).toContain("T150.417.11.041.00");
    expect(model).toContain("T137.407.33.051.00");
    expect(hero).not.toContain("Math.random");
    expect(hero).not.toContain("homepage-stage-plane");
    expect(hero).not.toContain("homepage-stage-arc");
  });

  it("uses the Catalog Read Repository boundary on public data surfaces", () => {
    const home = file("src/app/(public)/page.tsx");
    const journal = file("src/app/(public)/journal/page.tsx");

    expect(home).toContain("getCatalogReadDataset");
    expect(journal).toContain("getCatalogReadDataset");
    expect(home).not.toContain("catalog-import-preview");
    expect(journal).not.toContain("catalog-import-preview");
  });

  it("keeps catalog filters/search/sort/pagination while adding the premium selection layout", () => {
    const list = file("src/components/catalog/catalog-list-page.tsx");
    const filters = file("src/components/catalog/catalog-filter-panel.tsx");

    expect(list).toContain("catalog-page-head");
    expect(list).toContain("catalog-sidebar");
    expect(list).toContain("catalog-feature-strip");
    expect(list).toContain('data-layout="catalog-grid"');
    expect(filters).toContain('name="q"');
    expect(filters).toContain('name="sort"');
    expect(filters).toContain('name="priceMin"');
  });

  it("keeps watch detail focused on one product above the fold and limits first-screen facts", () => {
    const detail = file("src/components/catalog/catalog-watch-detail-page.tsx");

    expect(detail).toContain("watch-detail-hero");
    expect(detail).toContain("watch-key-specs");
    expect(detail).toContain("if (picked.length === 4)");
    expect(detail.indexOf("watch-detail-hero")).toBeLessThan(detail.indexOf("siblingReferences.length"));
    expect(detail).toContain("resolveCatalogImageQualityPresentation");
  });

  it("does not promote technical or missing catalog images to premium scenes", () => {
    expect(resolveCatalogImageQualityPresentation({ primaryImage: { kind: "none", alt: "Missing" }, galleryCount: 0 })).toBe(
      "missing",
    );
    expect(resolveCatalogImageQualityPresentation({ primaryImage: localImage, galleryCount: 1 })).toBe("detail-hero");
    expect(resolveCatalogImageQualityPresentation({ primaryImage: localImage, galleryCount: 2 })).toBe("detail-hero");
    expect(resolveCatalogImageQualityPresentation({ primaryImage: remoteImage, galleryCount: 2 })).toBe("detail-hero");
    expect(resolveCatalogImagePresentation({ image: technicalImage, slot: "detail-hero", imageIndex: 3 }).mode).toBe(
      "technical-angle",
    );
    expect(isProminentCatalogImage(technicalImage, 3)).toBe(false);
    expect(selectBestCatalogHeroImage([technicalImage, localImage])).toBe(localImage);
  });

  it("adds composition hooks and per-slot presentation modes to public image surfaces", () => {
    const image = file("src/components/catalog/catalog-image.tsx");
    const card = file("src/components/catalog/catalog-watch-card.tsx");
    const detail = file("src/components/catalog/catalog-watch-detail-page.tsx");
    const journal = file("src/app/(public)/journal/page.tsx");
    const styles = file("src/app/globals.css");

    for (const hook of [
      "data-image-presentation-mode",
      "data-image-focal-x",
      "data-image-focal-y",
      "data-image-scale",
      "data-image-source-quality",
    ]) {
      expect(image).toContain(hook);
    }
    expect(card).toContain('compositionSlot="catalog-card"');
    expect(detail).toContain('compositionSlot="detail-hero"');
    expect(detail).toContain("selectBestCatalogHeroImage");
    expect(journal).toContain('data-journal-layout={hasLeadImage ? "lead-image" : "lead-text"}');
    expect(styles).toContain('[data-image-presentation-mode="product-contained"]');
    expect(styles).toContain('[data-image-presentation-mode="technical-angle"]');
    expect(styles).toContain(".journal-issue-grid-text-led");
  });

  it("normalizes public display titles and slash-separated values without mutating catalog data", () => {
    expect(displayWatchTitle({ brandName: "Tissot", title: "Tissot PR 100 40mm Chronograph" })).toBe(
      "Tissot PR 100 40mm Chronograph",
    );
    expect(displayWatchTitle({ brandName: "Casio", title: "ECB-900YDB-1A" })).toBe("Casio ECB-900YDB-1A");
    expect(formatCatalogDisplayValue("мужские / унисекс")).toBe("Мужские, унисекс");
  });

  it("keeps reduced motion and mobile overflow guards in the visual system", () => {
    const styles = file("src/app/globals.css");

    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".home-hero-watch");
    expect(styles).toContain("@media (max-width: 767px)");
    expect(styles).toContain("min-width: 0");
  });
});
