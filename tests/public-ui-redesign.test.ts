import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveArticleMediaVariant } from "@/components/journal/article-media-presentation";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

const root = process.cwd();
const file = (path: string) => readFileSync(join(root, path), "utf8");

const localImage: CatalogImagePresentation = {
  kind: "development_zip",
  imageKey: "fixture",
  src: "/api/catalog/dev-images/fixture",
  alt: "Fixture watch",
};

describe("controlled public UI redesign", () => {
  it("never promotes a local ZIP image to a fullscreen article strategy", () => {
    expect(resolveArticleMediaVariant(localImage, "why-g-shock-became-cult")).toBe("contained");
    expect(resolveArticleMediaVariant(localImage, "orient-bambino-first-mechanical-watch")).toBe("compact");
  });

  it("supports side, landscape and no-image article presentations", () => {
    expect(resolveArticleMediaVariant(localImage, "choose-watch-size-for-wrist")).toBe("side");
    expect(resolveArticleMediaVariant(null, "article-without-image")).toBe("none");
    expect(resolveArticleMediaVariant({ kind: "remote", url: "https://example.test/watch.jpg", src: "https://example.test/watch.jpg", alt: "Watch" }, "remote-story")).toBe("landscape");
  });

  it("keeps catalog controls, results and pagination as separate structural regions", () => {
    const list = file("src/components/catalog/catalog-list-page.tsx");
    const filters = file("src/components/catalog/catalog-filter-panel.tsx");
    const pagination = file("src/components/catalog/catalog-pagination.tsx");

    expect(list).toContain('data-layout="catalog-toolbar"');
    expect(list).toContain('data-layout="catalog-grid"');
    expect(filters).toContain('name="q"');
    expect(filters).toContain('name="sort"');
    expect(filters).toContain('name="priceMin"');
    expect(pagination).toContain('aria-label="Пагинация каталога"');
  });

  it("does not render internal terminology or missing-image placeholder copy", () => {
    const visibleCopyFiles = [
      "src/app/(public)/page.tsx",
      "src/app/(public)/journal/page.tsx",
      "src/app/(public)/collection/page.tsx",
      "src/components/catalog/catalog-watch-detail-page.tsx",
      "src/components/catalog/catalog-image.tsx",
      "src/components/collection/collection-watch-action.tsx",
    ].map(file).join("\n");

    for (const phrase of ["Фото готовится", "recommendation engine", "watch references", "public references", "Эта reference", "Supabase Auth"] ) {
      expect(visibleCopyFiles).not.toContain(phrase);
    }
    expect(visibleCopyFiles).not.toMatch(/>[^<{]*(publicPrice|watch references|recommendation engine)[^<{]*</i);
  });
});
