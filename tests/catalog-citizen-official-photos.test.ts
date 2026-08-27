import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CitizenOfficialPhotoManifest } from "@/modules/catalog/infrastructure/citizen-official-photo-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const projectRoot = path.resolve(__dirname, "..");
const manifestPath = "src/content/catalog/citizen-official-photo-manifest.json";

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readSrc(relativePath)) as T;
}

function normalizeReference(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function referenceTokens(value: string): string[] {
  const matches = decodeURIComponent(value).toUpperCase().match(/[A-Z]{1,3}\d{3,4}-?\d{2}[A-Z0-9]/g) ?? [];
  return [...new Set(matches.map(normalizeReference))];
}

describe("Citizen official photo import", () => {
  it("keeps all Citizen assets local, official and scoped to the exact reference", () => {
    const manifest = readJson<CitizenOfficialPhotoManifest>(manifestPath);

    expect(manifest.officialSource).toBe("Citizen");
    expect(manifest.models).toHaveLength(25);
    expect(manifest.entries).toHaveLength(72);

    for (const entry of manifest.entries) {
      expect(entry.brandSlug).toBe("citizen");
      expect(entry.officialSource).toBe("Citizen");
      expect(entry.publicPath).toMatch(/^\/generated\/catalog\/citizen-official\//);
      expect(entry.storedRelativePath).toMatch(/^public\/generated\/catalog\/citizen-official\//);
      expect(existsSync(path.join(projectRoot, entry.storedRelativePath))).toBe(true);
      expect(entry.sourceAssetUrl).not.toMatch(/(amazon|ebay|chrono24|market|shopify|cdninstagram|pinterest)/i);

      const tokens = referenceTokens(entry.sourceAssetUrl);
      if (tokens.length > 0) {
        expect(tokens, entry.sourceAssetUrl).toContain(entry.referenceNormalized);
      }
    }
  });

  it("leaves the six unverified China AW references in manual review", () => {
    const manifest = readJson<CitizenOfficialPhotoManifest>(manifestPath);
    const chinaCandidateReferences = [
      "AW1818-59L",
      "AW1819-05A",
      "AW1819-13L",
      "AW1819-56A",
      "AW1819-56E",
      "AW1819-56X",
    ];

    for (const reference of chinaCandidateReferences) {
      const model = manifest.models.find((entry) => entry.reference === reference);
      expect(model?.status).toBe("manual_review");
      expect(model?.coverPublicPath).toBeNull();
      expect(model?.uniqueProductImages).toBe(0);
    }
  });

  it("upgrades Citizen catalog read models with local official images only", () => {
    const preview = readJson<CatalogImportPreview>("imports/generated/catalog-import-preview.json");
    const imagePlan = readJson<CatalogImageUploadPlan>("imports/generated/catalog-image-upload-plan.json");
    const citizenOfficialPhotoManifest = readJson<CitizenOfficialPhotoManifest>(manifestPath);
    const dataset = catalogReadDatasetFromPreview({ preview, imagePlan, citizenOfficialPhotoManifest });
    const citizenWatches = dataset.watches.filter((watch) => watch.brandSlug === "citizen");
    const withImages = citizenWatches.filter((watch) => watch.primaryImage.kind !== "none");

    expect(citizenWatches).toHaveLength(25);
    expect(withImages).toHaveLength(17);
    for (const watch of withImages) {
      expect(watch.primaryImage.kind).toBe("remote");
      if (watch.primaryImage.kind === "remote") {
        expect(watch.primaryImage.src).toMatch(/^\/generated\/catalog\/citizen-official\//);
      }
      expect(watch.imageGallery.length).toBeGreaterThan(0);
    }
  });

  it("keeps Citizen primary images as exact-reference official front covers", () => {
    const manifest = readJson<CitizenOfficialPhotoManifest>(manifestPath);
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

      expect(cover?.officialSource).toBe("Citizen");
      expect(cover?.view).toBe("front");
      expect(cover?.referenceNormalized).toBe(model.referenceNormalized);
      expect(entries.every((entry) => entry.referenceNormalized === model.referenceNormalized)).toBe(true);
    }
  });
});
