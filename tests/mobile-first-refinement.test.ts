import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("mobile-first production refinement contracts", () => {
  it("keeps the mobile header compact while exposing search, cart, profile and drawer navigation", () => {
    const nav = readSrc("src/components/shell/mobile-navigation.tsx");
    const globals = readSrc("src/app/globals.css");

    expect(nav).toContain("<SearchDialog compact");
    expect(nav).toContain("<CommerceCartIcon");
    expect(nav).toContain("<ProfileMenu mobile");
    expect(nav).toContain('role="dialog"');
    expect(nav).toContain('aria-modal="true"');
    expect(nav).toContain('event.key !== "Escape"');
    expect(nav).toContain('document.body.style.overflow = "hidden"');
    expect(globals).toContain(".mobile-navigation-drawer");
    expect(globals).toContain(".public-logo");
    expect(globals).toContain("min-height: 44px");
    expect(globals).toContain("min-height: 100dvh");
    expect(globals).toContain("env(safe-area-inset-bottom");
  });

  it("gives mobile search a real dialog, Escape handling, body lock and 44px trigger surface", () => {
    const search = readSrc("src/components/shell/search-dialog.tsx");
    const globals = readSrc("src/app/globals.css");

    expect(search).toContain('role="dialog"');
    expect(search).toContain('aria-modal="true"');
    expect(search).toContain('event.key !== "Escape"');
    expect(search).toContain('document.body.style.overflow = "hidden"');
    expect(globals).toContain(".search-dialog-panel");
    expect(globals).toMatch(/min-height:\s*44px/);
  });

  it("uses a real two-column catalog grid from 360px upward and keeps 320px single-column safe", () => {
    const listStyles = readSrc("src/components/catalog/catalog-list-page.module.css");
    const cardStyles = readSrc("src/components/catalog/catalog-watch-card.module.css");
    const heroStyles = readSrc("src/components/catalog/catalog-hero.module.css");

    expect(listStyles).toContain("@media (min-width: 360px)");
    expect(listStyles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(listStyles).toContain("@media (max-width: 359px)");
    expect(cardStyles).toContain("@media (max-width: 767px)");
    expect(cardStyles).toContain("aspect-ratio: 1 / 1.18");
    expect(heroStyles).toContain("@media (max-width: 767px)");
    expect(heroStyles).toContain(".assistLead");
    expect(heroStyles).toContain("display: none");
    expect(heroStyles).toContain("font-family: var(--font-display)");
  });

  it("keeps catalog filters as a mobile bottom sheet with active controls and safe-area footer", () => {
    const dialog = readSrc("src/components/catalog/catalog-filter-dialog.module.css");
    const fields = readSrc("src/components/catalog/catalog-filter-panel.module.css");

    expect(dialog).toContain("border-radius: 18px 18px 0 0");
    expect(dialog).toContain("calc(0.8rem + env(safe-area-inset-bottom");
    expect(fields).toContain(".chipRow");
    expect(fields).toContain("scroll-snap-type");
    expect(fields).toContain("font-size: 16px");
  });

  it("adds mobile-native sticky purchase/cart/checkout surfaces without changing commerce rules", () => {
    const detail = readSrc("src/components/catalog/watch-detail.module.css");
    const commerce = readSrc("src/components/commerce/commerce.module.css");
    const cart = readSrc("src/components/cart/cart-experience.module.css");

    expect(detail).toContain(".actions");
    expect(detail).toContain("position: sticky");
    expect(detail).toContain("env(safe-area-inset-bottom");
    expect(detail).toContain(".mediaShell");
    expect(detail).toContain("order: -1");
    expect(commerce).toContain(".cdekWidgetShell");
    expect(commerce).toContain("height: 100dvh");
    expect(commerce).toContain(".summaryPanel");
    expect(cart).toContain(".cart aside");
    expect(cart).toContain("position: sticky");
  });

  it("turns mobile comparison and editorial routes into touch-safe card flows rather than desktop tables", () => {
    const compare = readSrc("src/components/comparison/compare-workspace.module.css");
    const compareControls = readSrc("src/components/comparison/comparison-controls.module.css");
    const journal = readSrc("src/app/(public)/journal/journal.module.css");
    const article = readSrc("src/app/(public)/journal/[slug]/article.module.css");

    expect(compare).toContain(".detailValues");
    expect(compare).toContain("display: flex");
    expect(compare).toContain("scroll-snap-type: x mandatory");
    expect(compareControls).toContain('min-width: 44px');
    expect(compareControls).toContain('min-height: 44px');
    expect(journal).toContain(".tableOfContents");
    expect(journal).toContain("overflow-x: visible");
    expect(journal).toContain("grid-template-columns: 1fr");
    expect(journal).toContain(".storyRowCopy");
    expect(journal).toContain("font-size: clamp(1.85rem, 8.5vw, 2.45rem)");
    expect(article).toContain(".inlineToc");
    expect(article).toContain("position: sticky");
    expect(article).toContain(".inlineToc a");
    expect(article).toContain("min-height: 44px");
    expect(article).toContain("grid-template-columns: 1.9rem minmax(0, 1fr)");
  });

  it("keeps mobile home motion intentional and avoids offscreen interactive hero watches", () => {
    const hero = readSrc("src/components/home/home-product-hero.module.css");

    expect(hero).toContain("@media (max-width: 767px), (hover: none) and (pointer: coarse)");
    expect(hero).toContain("--home-hero-x: 0 !important");
    expect(hero).toContain("--orbit-x: 17cqw !important");
    expect(hero).toContain("--orbit-x: 83cqw !important");
    expect(hero).toContain(".leftWatch .watchAction");
    expect(hero).toContain("pointer-events: none");
    expect(hero).toContain("height: clamp(330px, 64svh, 440px)");
  });

  it("uses mobile-native collection recommendation stacks instead of desktop carousel overflow", () => {
    const collection = readSrc("src/components/collection/collection-experience.module.css");

    expect(collection).toMatch(/\.recommendationGrid,\s+\.embeddedRecommendationGrid/);
    expect(collection).toContain("grid-template-columns: 1fr");
    expect(collection).toContain("scroll-snap-type: none");
    expect(collection).toMatch(/\.recommendationCard\s*\{\s*width:\s*100%/);
  });

  it("keeps catalog and commerce touch targets at a production mobile size", () => {
    const filters = readSrc("src/components/catalog/catalog-filter-panel.module.css");
    const tabs = readSrc("src/components/catalog/catalog-tabs.module.css");
    const commerce = readSrc("src/components/commerce/commerce.module.css");
    const globals = readSrc("src/app/globals.css");

    expect(filters).toContain(".searchSubmit");
    expect(filters).toContain("width: 44px");
    expect(filters).toContain("height: 44px");
    expect(tabs).toContain("min-height: 44px");
    expect(tabs).toContain("flex-wrap: wrap");
    expect(tabs).toContain("overflow: visible");
    expect(tabs).toContain("scroll-padding-inline: var(--page-gutter)");
    expect(commerce).toContain(".cardCartButton");
    expect(commerce).toContain("min-width: 44px");
    expect(globals).not.toContain("min-width: 40px");
  });

  it("uses a real SVG cart icon and provides a browser tab favicon", () => {
    const commerceActions = readSrc("src/components/commerce/commerce-actions.tsx");
    const commerceStyles = readSrc("src/components/commerce/commerce.module.css");
    const favicon = readSrc("src/app/icon.svg");

    expect(commerceActions).toContain("<svg className={styles.cartIconGlyph}");
    expect(commerceActions).toContain("viewBox=\"0 0 24 24\"");
    expect(commerceStyles).not.toContain(".cartIconGlyph::before");
    expect(existsSync(path.join(projectRoot, "src/app/icon.svg"))).toBe(true);
    expect(favicon).toContain("<svg");
    expect(favicon).toContain("ET");
  });
});
