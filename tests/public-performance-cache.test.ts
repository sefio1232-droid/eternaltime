import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const publicReadOnlyPages = [
  "src/app/(public)/page.tsx",
  "src/app/(public)/journal/page.tsx",
  "src/app/(public)/journal/[slug]/page.tsx",
  "src/app/(shop)/brands/page.tsx",
  "src/app/(shop)/watches/page.tsx",
  "src/app/(shop)/watches/[brandSlug]/page.tsx",
  "src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx",
  "src/app/(shop)/selection/page.tsx",
  "src/app/(shop)/compare/page.tsx",
] as const;

describe("public performance cache", () => {
  it("caches the canonical catalog read model in production without creating a parallel data source", () => {
    const repository = source("src/modules/catalog/infrastructure/catalog-read-repository.server.ts");

    expect(repository).toContain("CATALOG_READ_REVALIDATE_SECONDS = 300");
    expect(repository).toContain("productionCatalogReadCache");
    expect(repository).toContain("productionCatalogReadPending");
    expect(repository).toContain("getProductionCatalogReadDataset");
    expect(repository).toContain('process.env.NODE_ENV !== "production"');
    expect(repository).toContain("return getProductionCatalogReadDataset()");
  });

  it("invalidates the public catalog cache after admin catalog mutations", () => {
    const actions = source("src/modules/admin/application/catalog-actions.ts");

    expect(actions).toContain("invalidateCatalogReadDatasetCache");
    expect(actions.match(/revalidatePublicCatalogReadModel\(\);/g)).toHaveLength(3);
  });

  it("uses ISR for public read-only commerce pages while keeping private flows dynamic", () => {
    for (const page of publicReadOnlyPages) {
      const text = source(page);
      expect(text, page).toContain("export const revalidate = 300");
      expect(text, page).not.toContain('export const dynamic = "force-dynamic"');
    }

    expect(source("src/app/(shop)/checkout/page.tsx")).toContain('export const dynamic = "force-dynamic"');
    expect(source("src/app/(admin)/admin/page.tsx")).toContain('export const dynamic = "force-dynamic"');
  });
});
