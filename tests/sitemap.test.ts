import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/public-env", () => ({
  getPublicEnv: () => ({
    appUrl: "https://eternaltime.shop",
    supabase: { isConfigured: false },
    issues: [],
  }),
}));
vi.mock("@/modules/journal/application/journal-repository", () => ({
  listPublishedJournalArticles: () => [
    {
      slug: "why-mechanical-watches-endure",
      featured: true,
      publishedAt: "2026-08-01",
      updatedAt: null,
    },
  ],
}));
vi.mock("@/modules/catalog/infrastructure/catalog-read-repository.server", () => ({
  getCatalogReadDataset: async () => ({
    source: "database",
    generatedAt: "2026-09-10T12:00:00.000Z",
    brands: [
      { name: "Casio", slug: "casio", watchCount: 1 },
      { name: "Orient", slug: "orient", watchCount: 1 },
    ],
    watches: [
      {
        id: "casio-a168",
        href: "/watches/casio/a168wa1",
        brandName: "Casio",
        brandSlug: "casio",
        title: "Casio A168WA-1",
        officialName: null,
        referenceDisplay: "A168WA-1",
        referenceNormalized: "A168WA1",
        referenceSlug: "a168wa1",
        brandCollectionName: null,
        watchModelName: "A168",
        publicPrice: null,
        primaryImage: { kind: "none", alt: "Casio A168WA-1" },
        keySpecifications: [],
        brandLineName: null,
        imageGallery: [],
        specifications: [],
        siblingReferences: [],
      },
      {
        id: "orient-bambino",
        href: "/watches/orient/raac0m04y",
        brandName: "Orient",
        brandSlug: "orient",
        title: "Orient Bambino",
        officialName: null,
        referenceDisplay: "RA-AC0M04Y",
        referenceNormalized: "RAAC0M04Y",
        referenceSlug: "raac0m04y",
        brandCollectionName: null,
        watchModelName: "Bambino",
        publicPrice: null,
        primaryImage: { kind: "none", alt: "Orient Bambino" },
        keySpecifications: [],
        brandLineName: null,
        imageGallery: [],
        specifications: [],
        siblingReferences: [],
      },
    ],
  }),
}));

describe("public sitemap", () => {
  it("includes public catalog brand and product routes without exposing private commerce/admin routes", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://eternaltime.shop/watches");
    expect(urls).toContain("https://eternaltime.shop/watches/casio");
    expect(urls).toContain("https://eternaltime.shop/watches/orient");
    expect(urls).toContain("https://eternaltime.shop/watches/casio/a168wa1");
    expect(urls).toContain("https://eternaltime.shop/watches/orient/raac0m04y");
    expect(urls).toContain("https://eternaltime.shop/journal/why-mechanical-watches-endure");

    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(urls.some((url) => url.includes("/account"))).toBe(false);
    expect(urls.some((url) => url.includes("/checkout"))).toBe(false);
    expect(urls.some((url) => url.includes("/api"))).toBe(false);
  });
});
