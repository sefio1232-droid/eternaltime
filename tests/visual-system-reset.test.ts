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

    for (const href of ["/watches", "/selection", "/journal", "/collection", "/account"]) {
      expect(navigation).toContain(`href: "${href}"`);
    }
    expect(navigation.split("export const utilityNavigation")[0]).not.toContain('href: "/brands"');
    expect(searchDialog).toContain('action="/watches"');
    expect(searchDialog).toContain('name="q"');
    expect(searchDialog).toContain("Искать в каталоге");
  });

  it("separates catalog toolbar from grid and keeps intended card fields compact", () => {
    const listPage = file("src/components/catalog/catalog-list-page.tsx");
    const card = file("src/components/catalog/catalog-watch-card.tsx");
    const filters = file("src/components/catalog/catalog-filter-panel.tsx");
    const filterDialog = file("src/components/catalog/catalog-filter-dialog.tsx");

    expect(listPage).toContain('data-layout="catalog-toolbar"');
    expect(listPage).toContain('data-layout="catalog-grid"');
    expect(listPage).toContain("catalog-toolbar");
    expect(listPage).toContain("styles.grid");
    expect(filters).toContain('name="water"');
    expect(listPage).toContain("CatalogFilterDialog");
    expect(filterDialog).toContain('role="dialog"');
    expect(filters).toContain("buildActiveChips");
    expect(card).toContain("watch.brandName");
    expect(card).toContain("{watch.referenceDisplay}");
    expect(card).not.toContain("Код {watch.referenceDisplay}");
    expect(card).toContain("styles.card");
    expect(card).toContain("styles.media");
    expect(card).toContain("styles.price");
    expect(card).toContain("formatCatalogMoney(watch.publicPrice)");
    expect(card).not.toContain("keySpecifications.map");
    expect(card).not.toContain("/account/favorites");
  });

  it("uses product-grade stage surfaces on home and watch detail pages", () => {
    const home = file("src/app/(public)/page.tsx");
    const detail = file("src/components/catalog/catalog-watch-detail-page.tsx");
    const styles = file("src/app/globals.css");

    expect(home).toContain("HomeProductHero");
    expect(home).toContain("HomeEcosystemPath");
    expect(home).toContain("HomeSelection");
    expect(home).toContain("HomeComparisonPurchase");
    expect(home).toContain("HomeCollectionIntelligencePanel");
    expect(home).not.toContain("HomeSelectionStory");
    expect(home).not.toContain("HomeScenarioOverview");
    expect(home).not.toContain("home-route-list");
    expect(home).not.toContain("home-service-strip");
    expect(detail).toContain("product-stage-detail");
    expect(detail).toContain("styles.hero");
    expect(detail).toContain("resolveCatalogImageQualityPresentation");
    expect(detail).toContain("price-plate");
    expect(styles).toContain(".site-frame");
    expect(styles).toContain(".public-heading");
    expect(styles).toContain(".catalog-image--guarded");
  });

  it("defines Journal as an editorial magazine surface without placeholder image copy", () => {
    const journal = file("src/app/(public)/journal/page.tsx");

    expect(journal).toContain("issueSlugs");
    expect(journal).toContain("styles.lead");
    expect(journal).toContain("styles.guide");
    expect(journal).toContain("styles.investment");
    expect(journal).toContain("TypographicCover");
    expect(journal).toContain("JournalWatchComposition");
    expect(journal).toContain("EditorialWatchVisual");
    expect(journal).toContain("brandRail");
    expect(journal).not.toContain("styles.categories");
    expect(journal).not.toContain("journal-sidebar");
    expect(journal).not.toContain("editorial-quote");
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
    const collectionAction = file("src/components/collection/collection-watch-action.tsx");

    expect(detail).toContain("Код модели");
    expect(detail).not.toContain("Manufacturer Reference");
    expect(detail).not.toContain("watch reference");
    expect(detail).toContain("CollectionWatchAction");
    expect(collectionAction).toContain("Добавить в коллекцию");
    expect(collectionAction).toContain('href="/collection"');
    expect(detail).not.toContain('href="/compare"');
    expect(detail).not.toContain("localStorage");
    expect(detail).not.toContain("useState");
  });

  it("uses exact catalog editorial media with typographic fallback", () => {
    const articlePage = file("src/app/(public)/journal/[slug]/page.tsx");
    const mediaPolicy = file("src/components/journal/article-media-presentation.ts");
    const styles = file("src/app/globals.css");

    expect(articlePage).toContain('data-media-presentation="catalog-editorial"');
    expect(articlePage).toContain("EditorialWatchPlate");
    expect(articlePage).toContain("resolveJournalArticleEditorialWatches");
    expect(articlePage).toContain("JournalTypographicCover");
    for (const variant of ["none", "landscape", "contained", "side", "compact"]) {
      expect(mediaPolicy).toContain(`\"${variant}\"`);
    }
    expect(mediaPolicy).toContain('image.kind === "development_zip"');
    expect(mediaPolicy).toContain('return "contained"');
    expect(styles).toContain('[data-media-variant="compact"]');
    expect(styles).toContain('[data-media-variant="side"]');
  });

  it("keeps public layouts bounded on small screens and uses a compact missing-image state", () => {
    const styles = file("src/app/globals.css");
    const card = file("src/components/catalog/catalog-watch-card.tsx");
    const media = file("src/components/catalog/catalog-image.tsx");

    expect(styles).toContain("@media (max-width: 767px)");
    expect(styles).toContain("min-width: 0");
    expect(card).toContain('watch.primaryImage.kind === "none"');
    expect(card).toContain("CatalogMissingImage");
    expect(media).not.toContain("Фото готовится");
  });

  it("renders variant article related blocks through explicit factual relations", () => {
    const articlePage = file("src/app/(public)/journal/[slug]/page.tsx");
    const relations = file("src/modules/journal/application/journal-catalog-relations.ts");

    expect(articlePage).toContain("data-article-layout={article.layoutVariant}");
    expect(articlePage).not.toContain('data-article-section="recommended-watches"');
    expect(articlePage).toContain('data-article-section="related-materials"');
    expect(articlePage).toContain('data-related-kind="explicit"');
    expect(articlePage).toContain("article.relatedArticleSlugs");
    expect(articlePage).not.toContain("candidate.category === article.category");
    expect(relations).toContain("article.relatedWatchRefs");
    expect(relations).toContain("watch.brandSlug === reference.brandSlug");
    expect(relations).toContain('watch.primaryImage.kind !== "none"');
    expect(articlePage).not.toContain("Math.random");
  });

  it("does not expose raw selection criteria grammar through editorial selection labels", () => {
    const selections = file("src/modules/editorial-selections/application/editorial-selection-service.ts");

    expect(selections).not.toContain("publicPrice <=");
    expect(selections).not.toContain("brand in");
    expect(selections).toContain("criteriaLabel");
  });
});
