import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function file(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function publicSurfaceText() {
  return [
    "src/app/(public)/page.tsx",
    "src/app/(public)/collection/page.tsx",
    "src/app/(public)/journal/page.tsx",
    "src/app/(public)/journal/[slug]/page.tsx",
    "src/app/(shop)/watches/page.tsx",
    "src/app/(shop)/watches/[brandSlug]/page.tsx",
    "src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx",
    "src/app/(shop)/brands/page.tsx",
    "src/app/(shop)/selection/page.tsx",
    "src/components/shell/public-shell.tsx",
    "src/components/shell/search-dialog.tsx",
    "src/components/catalog/catalog-list-page.tsx",
    "src/components/catalog/catalog-watch-card.tsx",
    "src/components/catalog/catalog-watch-detail-page.tsx",
    "src/components/catalog/catalog-image.tsx",
  ]
    .map(file)
    .join("\n");
}

describe("editorial art direction and layout refinement", () => {
  it("keeps public copy free from internal import and recommendation terminology", () => {
    const text = publicSurfaceText();

    for (const phrase of [
      "preview-source",
      "staged preview",
      "watch references",
      "public references",
      "publicPrice <=",
      "brand in",
      "recommendation engine",
      "quiz results",
      "fake user data",
      "референс",
      "публичные поля",
    ]) {
      expect(text).not.toContain(phrase);
    }
  });

  it("uses the reset header navigation and catalog search dialog", () => {
    const navigation = file("src/config/navigation.ts");
    const searchDialog = file("src/components/shell/search-dialog.tsx");

    for (const href of ["/watches", "/selection", "/journal", "/brands", "/collection", "/account"]) {
      expect(navigation).toContain(`href: "${href}"`);
    }
    expect(searchDialog).toContain('action="/watches"');
    expect(searchDialog).toContain('name="q"');
    expect(searchDialog).toContain("Искать в каталоге");
  });

  it("separates catalog toolbar from grid and keeps intended card fields compact", () => {
    const listPage = file("src/components/catalog/catalog-list-page.tsx");
    const card = file("src/components/catalog/catalog-watch-card.tsx");
    const filters = file("src/components/catalog/catalog-filter-panel.tsx");

    expect(listPage).toContain('data-layout="catalog-toolbar"');
    expect(listPage).toContain('data-layout="catalog-grid"');
    expect(listPage).toContain("2xl:grid-cols-4");
    expect(filters).toContain('name="water"');
    expect(card).toContain("watch.brandName");
    expect(card).toContain("Код {watch.referenceDisplay}");
    expect(card).toContain("formatCatalogMoney(watch.publicPrice)");
    expect(card).not.toContain("keySpecifications.map");
  });

  it("defines Journal featured, secondary, and compact layout groups without placeholder image copy", () => {
    const journal = file("src/app/(public)/journal/page.tsx");

    expect(journal).toContain('data-journal-layout="featured"');
    expect(journal).toContain('data-journal-layout="secondary"');
    expect(journal).toContain('data-journal-layout="compact"');
    expect(journal).not.toContain("Фото готовится");
  });

  it("keeps brand and media components free from placeholder image text", () => {
    const brands = file("src/app/(shop)/brands/page.tsx");
    const media = file("src/components/catalog/catalog-image.tsx");

    expect(brands).not.toContain("Фото готовится");
    expect(media).not.toContain("Фото готовится");
    expect(media).toContain("media-placeholder-mark");
  });

  it("labels watch identity as an article/code instead of reference wording", () => {
    const detail = file("src/components/catalog/catalog-watch-detail-page.tsx");

    expect(detail).toContain("Артикул {watch.referenceDisplay}");
    expect(detail).not.toContain("Manufacturer Reference");
    expect(detail).not.toContain("watch reference");
    expect(detail).toContain('href="/collection"');
    expect(detail).toContain('href="/compare"');
    expect(detail).not.toContain("localStorage");
    expect(detail).not.toContain("useState");
  });

  it("renders article related blocks only through factual same-category relation", () => {
    const articlePage = file("src/app/(public)/journal/[slug]/page.tsx");

    expect(articlePage).toContain('data-related-kind="same-category"');
    expect(articlePage).toContain("candidate.category === article.category");
    expect(articlePage).not.toContain("Math.random");
  });

  it("does not expose raw selection criteria grammar through editorial selection labels", () => {
    const selections = file("src/modules/editorial-selections/application/editorial-selection-service.ts");

    expect(selections).not.toContain("publicPrice <=");
    expect(selections).not.toContain("brand in");
    expect(selections).toContain("criteriaLabel");
  });
});
