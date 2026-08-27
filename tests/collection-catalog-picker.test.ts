import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CollectionRecommendationCandidate } from "@/modules/collection-intelligence/domain/types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";
import { buildLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection";
import {
  listLocalCollectionPickerPage,
  localCollectionPickerPageSize,
  type LocalCollectionPickerQuery,
} from "@/modules/user-watch-collection/application/local-collection-picker";

function currentCatalogCandidates(): CollectionRecommendationCandidate[] {
  const preview = JSON.parse(
    readFileSync("imports/generated/catalog-import-preview.json", "utf8"),
  ) as CatalogImportPreview;
  const imagePlan = JSON.parse(
    readFileSync("imports/generated/catalog-image-upload-plan.json", "utf8"),
  ) as CatalogImageUploadPlan;
  const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
  return buildLocalCollectionCatalogCandidates(dataset.watches);
}

function pickerQuery(overrides: Partial<LocalCollectionPickerQuery> = {}): LocalCollectionPickerQuery {
  return {
    search: "",
    brand: "all",
    movement: "all",
    sort: "quality",
    page: 1,
    ...overrides,
  };
}

describe("local collection catalog picker", () => {
  const candidates = currentCatalogCandidates();

  it("exposes the complete current Catalog Read Repository snapshot without the former 160 limit", () => {
    const firstPage = listLocalCollectionPickerPage(candidates, pickerQuery());

    expect(candidates).toHaveLength(620);
    expect(candidates).not.toHaveLength(160);
    expect(firstPage.total).toBe(candidates.length);
    expect(firstPage.items).toHaveLength(localCollectionPickerPageSize);
    expect(firstPage.from).toBe(1);
    expect(firstPage.to).toBe(24);
  });

  it("paginates the full snapshot and clamps a filtered result to a valid page", () => {
    const secondPage = listLocalCollectionPickerPage(candidates, pickerQuery({ page: 2 }));
    const filtered = listLocalCollectionPickerPage(
      candidates,
      pickerQuery({ search: candidates[0]?.referenceDisplay ?? "", page: 99 }),
    );

    expect(secondPage.from).toBe(25);
    expect(secondPage.to).toBe(48);
    expect(secondPage.items).toHaveLength(24);
    expect(filtered.page).toBe(1);
    expect(filtered.total).toBeGreaterThan(0);
  });

  it("keeps every repository brand and missing-image model reachable", () => {
    const brands = new Set(candidates.map((candidate) => candidate.brandName));
    for (const brand of brands) {
      const result = listLocalCollectionPickerPage(candidates, pickerQuery({ brand }));
      expect(result.total).toBe(candidates.filter((candidate) => candidate.brandName === brand).length);
    }

    const missingImage = candidates.find((candidate) => candidate.imageUrl === null);
    expect(missingImage).toBeDefined();
    const result = listLocalCollectionPickerPage(
      candidates,
      pickerQuery({ search: missingImage?.referenceDisplay ?? "" }),
    );
    expect(result.items.some((candidate) => candidate.catalogReferenceId === missingImage?.catalogReferenceId)).toBe(true);
  });

  it("publishes the front AE-1200WH-1BV frame through the current repository snapshot", () => {
    const candidate = candidates.find(
      (entry) => entry.referenceDisplay === "AE-1200WH-1BV",
    );

    expect(candidate?.imageUrl).toBe(
      "/api/catalog/dev-images/9cef68de91f996e8a7d01c5da945aa04",
    );
    expect(candidate?.imageUrl).not.toContain("18ed5922d050fad407b9b2ddc9fe3cc8");
  });

  it("keeps the SSR snapshot and first client snapshot identical after serialization", () => {
    const clientSnapshot = JSON.parse(JSON.stringify(candidates)) as CollectionRecommendationCandidate[];
    const serverPage = listLocalCollectionPickerPage(candidates, pickerQuery());
    const clientPage = listLocalCollectionPickerPage(clientSnapshot, pickerQuery());

    expect(clientPage.items.map((candidate) => candidate.catalogReferenceId)).toEqual(
      serverPage.items.map((candidate) => candidate.catalogReferenceId),
    );
    expect(clientPage.items[0]?.referenceDisplay).toBe(serverPage.items[0]?.referenceDisplay);
    expect(clientPage.items[0]?.href).toBe(serverPage.items[0]?.href);
  });
});
