import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildComparisonPresentation } from "@/modules/comparison/application/comparison-presentation";
import {
  buildComparisonHref,
  emptyLocalComparison,
  localComparisonSchemaVersion,
  mergeLocalComparisonItems,
  parseComparisonReferences,
  parseLocalComparison,
  toggleLocalComparisonItem,
  type LocalComparisonItem,
} from "@/modules/comparison/domain/local-comparison";
import { upcomingEditorialStories } from "@/modules/journal/content/upcoming-stories";
import type { CatalogImagePresentation, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function comparisonItem(brandSlug: string, referenceSlug: string): LocalComparisonItem {
  return {
    identity: `${brandSlug}:${referenceSlug}`,
    brandName: brandSlug,
    brandSlug,
    displayName: referenceSlug,
    referenceDisplay: referenceSlug.toUpperCase(),
    referenceSlug,
    canonicalHref: `/watches/${brandSlug}/${referenceSlug}`,
    addedAt: "2026-08-05T00:00:00.000Z",
  };
}

function watch(input: {
  brandSlug: string;
  referenceSlug: string;
  movement?: string;
  image?: CatalogImagePresentation;
}): CatalogWatchDetail {
  const image = input.image ?? { kind: "remote", url: "https://example.test/watch.png", src: "https://example.test/watch.png", alt: "Watch" };
  return {
    id: `${input.brandSlug}:${input.referenceSlug}`,
    href: `/watches/${input.brandSlug}/${input.referenceSlug}`,
    brandName: input.brandSlug,
    brandSlug: input.brandSlug,
    title: input.referenceSlug,
    officialName: null,
    referenceDisplay: input.referenceSlug.toUpperCase(),
    referenceNormalized: input.referenceSlug.toUpperCase(),
    referenceSlug: input.referenceSlug,
    brandCollectionName: null,
    watchModelName: input.referenceSlug,
    publicPrice: null,
    primaryImage: image,
    keySpecifications: [],
    brandLineName: null,
    imageGallery: image.kind === "none" ? [] : [image],
    specifications: input.movement ? [{ key: "movement_raw", label: "Механизм", value: input.movement, group: "mechanism" }] : [],
    siblingReferences: [],
  };
}

describe("final product experience", () => {
  it("keeps comparison versioned, bounded to four exact references and shareable", () => {
    expect(emptyLocalComparison).toEqual({ schemaVersion: localComparisonSchemaVersion, items: [] });
    const items = [comparisonItem("orient", "one"), comparisonItem("tissot", "two"), comparisonItem("casio", "three"), comparisonItem("citizen", "four")];
    const merged = mergeLocalComparisonItems(emptyLocalComparison, items);
    expect(merged.items).toHaveLength(4);
    expect(toggleLocalComparisonItem(merged, comparisonItem("orient", "five")).outcome).toBe("limit_reached");
    expect(buildComparisonHref(items)).toBe("/compare?refs=orient%3Aone%2Ctissot%3Atwo%2Ccasio%3Athree%2Ccitizen%3Afour");
    expect(parseComparisonReferences("orient:one,orient:one,bad,UPPER:bad,tissot:two")).toEqual([
      { brandSlug: "orient", referenceSlug: "one" },
      { brandSlug: "tissot", referenceSlug: "two" },
    ]);
    expect(parseLocalComparison(JSON.stringify(merged))).toEqual(merged);
    expect(parseLocalComparison('{"schemaVersion":2,"items":[]}')).toEqual(emptyLocalComparison);
  });

  it("builds a difference-first factual table and exposes unknown values explicitly", () => {
    const developmentImage: CatalogImagePresentation = { kind: "development_zip", imageKey: "missing", src: "/api/catalog/dev-images/missing", alt: "Local" };
    const presentation = buildComparisonPresentation([
      watch({ brandSlug: "orient", referenceSlug: "one", movement: "Автоматический" }),
      watch({ brandSlug: "casio", referenceSlug: "two", image: developmentImage }),
    ]);
    const movement = presentation.rows.find((row) => row.key === "movement");
    expect(movement?.different).toBe(true);
    expect(movement?.values[1]).toEqual({ value: "Нет данных", unknown: true });
    expect(presentation.watches[1]?.image.kind).toBe("none");
  });

  it("keeps upcoming stories non-routable and separate from published Journal inventory", () => {
    expect(upcomingEditorialStories).toHaveLength(3);
    expect(upcomingEditorialStories.every((story) => story.status === "upcoming")).toBe(true);
    expect(upcomingEditorialStories.map((story) => story.title)).toEqual([
      "Как выбрать размер часов под запястье",
      "Сапфировое или минеральное стекло",
      "Кварц, механика или солнечное питание",
    ]);
    const journal = source("src/app/(public)/journal/page.tsx");
    const sitemap = source("src/app/sitemap.ts");
    expect(journal).toContain("upcomingEditorialStories.map");
    expect(sitemap).not.toContain("upcomingEditorialStories");
  });

  it("mounts the compare tray and isolated catalog entry points without redesigning catalog data", () => {
    expect(source("src/components/shell/public-shell.tsx")).toContain("<CompareTray />");
    expect(source("src/components/catalog/catalog-watch-card.tsx")).toContain("<CompareToggle");
    expect(source("src/components/catalog/catalog-watch-detail-page.tsx")).toContain('variant="detail"');
    const comparePage = source("src/app/(shop)/compare/page.tsx");
    const compareWorkspace = source("src/components/comparison/compare-workspace.tsx");
    expect(comparePage).toContain("robots: { index: false, follow: true }");
    expect(comparePage).toContain("parseComparisonReferences(query.refs)");
    expect(compareWorkspace).toContain("detailChapters");
    expect(compareWorkspace).not.toContain("<table");
  });

  it("uses a bounded wide homepage container without 100vw overflow", () => {
    const home = source("src/app/(public)/page.tsx");
    const globals = source("src/app/globals.css");
    expect(home).toContain("<EditorialWideContainer>");
    expect(globals).toContain("--wide-page-gutter: clamp(16px, 2.2vw, 40px)");
    expect(globals).toContain("--wide-content-max: 1800px");
    expect(globals).toContain("width: min(calc(100% - 2 * var(--wide-page-gutter)), var(--wide-content-max))");
    expect(globals).not.toMatch(/\.editorial-wide-container\s*\{[\s\S]*?100vw/);
  });
});
