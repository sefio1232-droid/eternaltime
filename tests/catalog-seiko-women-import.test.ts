import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { SeikoOfficialPhotoManifest } from "@/modules/catalog/infrastructure/seiko-official-photo-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readSrc(relativePath)) as T;
}

describe("Seiko Women 73 staged import", () => {
  it("stores official Seiko images locally and leaves unresolved models explicit", () => {
    const manifest = readJson<SeikoOfficialPhotoManifest>("src/content/catalog/seiko-official-photo-manifest.json");
    const counts = manifest.models.reduce<Record<string, number>>((acc, model) => {
      acc[model.status] = (acc[model.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(manifest.targetModels).toBe(73);
    expect(manifest.models).toHaveLength(73);
    expect(manifest.entries).toHaveLength(122);
    expect(counts).toMatchObject({
      success: 13,
      success_with_limited_images: 46,
      official_source_not_found: 14,
    });

    for (const entry of manifest.entries) {
      expect(entry.brandSlug).toBe("seiko");
      expect(entry.officialSource).toBe("Seiko");
      expect(entry.publicPath).toMatch(/^\/generated\/catalog\/seiko-official\//);
      expect(entry.storedRelativePath).toMatch(/^public\/generated\/catalog\/seiko-official\//);
      expect(existsSync(path.join(projectRoot, entry.storedRelativePath))).toBe(true);
      expect(entry.sourceAssetUrl).not.toMatch(/(taobao|tmall|amazon|ebay|chrono24|rakuten|biccamera|jomashop|watchcharts|pinterest|reddit)/i);
    }
  });

  it("adds all 73 Seiko watches to the staged read model with blank RUB prices", () => {
    const preview = readJson<CatalogImportPreview>("imports/generated/catalog-import-preview.json");
    const imagePlan = readJson<CatalogImageUploadPlan>("imports/generated/catalog-image-upload-plan.json");
    const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
    const seiko = dataset.watches.filter((watch) => watch.brandSlug === "seiko");
    const brandScopedReferenceKeys = dataset.watches.map((watch) => `${watch.brandSlug}:${watch.referenceNormalized}`);

    expect(seiko).toHaveLength(73);
    expect(seiko.filter((watch) => watch.publicPrice !== null)).toHaveLength(0);
    expect(seiko.some((watch) => watch.publicPrice?.amountMinor === 0)).toBe(false);
    expect(seiko.filter((watch) => watch.primaryImage.kind !== "none")).toHaveLength(59);
    expect(imagePlan.items.filter((item) => item.brandSlug === "seiko")).toHaveLength(122);
    expect(new Set(brandScopedReferenceKeys).size).toBe(brandScopedReferenceKeys.length);
    expect(dataset.brands.find((brand) => brand.slug === "seiko")).toMatchObject({ name: "Seiko", watchCount: 73 });
    expect(dataset.brands.find((brand) => brand.slug === "casio")?.watchCount).toBe(222);
    expect(dataset.brands.find((brand) => brand.slug === "orient")?.watchCount).toBe(82);
    expect(dataset.brands.find((brand) => brand.slug === "tissot")?.watchCount).toBe(218);
  });

  it("keeps official Seiko cover images front-scoped with no cross-model contamination", () => {
    const manifest = readJson<SeikoOfficialPhotoManifest>("src/content/catalog/seiko-official-photo-manifest.json");
    const entriesByReference = new Map(
      manifest.models.map((model) => [
        model.referenceNormalized,
        manifest.entries.filter((entry) => entry.referenceNormalized === model.referenceNormalized),
      ]),
    );

    for (const model of manifest.models) {
      const entries = entriesByReference.get(model.referenceNormalized) ?? [];
      const cover = entries.find((entry) => entry.isCover) ?? null;
      if (model.uniqueProductImages === 0) {
        expect(cover).toBeNull();
        continue;
      }

      expect(cover?.officialSource).toBe("Seiko");
      expect(cover?.view).toBe("front");
      expect(cover?.referenceNormalized).toBe(model.referenceNormalized);
      expect(entries.every((entry) => entry.referenceNormalized === model.referenceNormalized)).toBe(true);
    }
  });

  it("keeps SSQW094 manual for images but preserves limited-edition metadata", () => {
    const preview = readJson<CatalogImportPreview>("imports/generated/catalog-import-preview.json");
    const imagePlan = readJson<CatalogImageUploadPlan>("imports/generated/catalog-image-upload-plan.json");
    const manifest = readJson<SeikoOfficialPhotoManifest>("src/content/catalog/seiko-official-photo-manifest.json");
    const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
    const watch = dataset.watches.find((candidate) => candidate.brandSlug === "seiko" && candidate.referenceDisplay === "SSQW094");
    const model = manifest.models.find((candidate) => candidate.reference === "SSQW094");

    expect(model?.status).toBe("official_source_not_found");
    expect(model?.uniqueProductImages).toBe(0);
    expect(watch?.primaryImage.kind).toBe("none");
    expect(watch?.specifications.find((spec) => spec.key === "lifecycle_status_raw")?.value).toBe("Limited edition");
  });

  it("keeps SSVW196 discontinued status in the existing specification model", () => {
    const preview = readJson<CatalogImportPreview>("imports/generated/catalog-import-preview.json");
    const imagePlan = readJson<CatalogImageUploadPlan>("imports/generated/catalog-image-upload-plan.json");
    const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
    const watch = dataset.watches.find((candidate) => candidate.brandSlug === "seiko" && candidate.referenceDisplay === "SSVW196");

    expect(watch?.publicPrice).toBeNull();
    expect(watch?.specifications.find((spec) => spec.key === "lifecycle_status_raw")?.value).toBe("Discontinued");
  });

  it("keeps no-price Seiko models out of checkout and structured-data offers", () => {
    const detailPageSource = readSrc("src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx");
    const commerceActionsSource = readSrc("src/components/commerce/commerce-actions.tsx");
    const commerceResolverSource = readSrc("src/modules/commerce/application/catalog-product-resolver.server.ts");

    expect(detailPageSource).toContain("if (watch.publicPrice)");
    expect(detailPageSource).toContain("data.offers");
    expect(commerceActionsSource).toContain("if (!product.purchasable)");
    expect(commerceResolverSource).toContain('issue: "not_found" | "not_purchasable" | null');
    expect(commerceResolverSource).toContain("totalAmountMinor = purchasable ? productSubtotalMinor + delivery.amountMinor : null");
  });
});
