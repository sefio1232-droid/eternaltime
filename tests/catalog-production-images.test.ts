import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import { resolveCasioArchiveImage } from "@/modules/catalog/infrastructure/casio-photo-archive-resolver";
import type { CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import { createOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import { resolveOrientArchiveImage } from "@/modules/catalog/infrastructure/orient-photo-archive-resolver";
import type { OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import { createTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import { resolveTissotArchiveImage } from "@/modules/catalog/infrastructure/tissot-photo-archive-resolver";
import type { TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readSrc(relativePath)) as T;
}

describe("production catalog image assets", () => {
  it("keeps production image serving fail-closed unless a shared asset root is configured", () => {
    const helper = readSrc("src/modules/catalog/infrastructure/catalog-image-asset-root.ts");
    const route = readSrc("src/app/api/catalog/dev-images/[imageKey]/route.ts");

    expect(helper).toContain("CATALOG_IMAGE_ASSET_ROOT");
    expect(helper).toContain("if (nodeEnv === \"production\") return null");
    expect(route).not.toContain('process.env.NODE_ENV === "production"');
  });

  it("deploys all catalog photo asset sources required by archive and import-plan image keys", () => {
    const deploy = readSrc("scripts/deploy-production.ps1");

    expect(deploy).toContain("CATALOG_IMAGE_ASSET_ROOT=$RemoteAppDir/shared/catalog-image-assets");
    expect(deploy).toContain("incoming/casio_for_it_all_photos_UPDATED.zip");
    expect(deploy).toContain("incoming/orient_catalog_FULL_001-079.zip");
    expect(deploy).toContain("incoming/tissot_FULL_CATALOG_1-193.zip");
    expect(deploy).toContain("imports/raw/catalog");
    expect(deploy).toContain("imports/raw/home-hero/final");
    expect(deploy).toContain(".tmp/casio-photo-import/manifest.json");
    expect(deploy).toContain(".tmp/orient-photo-import/manifest.json");
    expect(deploy).toContain(".tmp/tissot-photo-import/manifest.json");
    expect(deploy).toContain(".tmp/catalog-site-import-overlay/manifest.json");
  });

  it("has local manifests and archives for all three public catalog brands", () => {
    const requiredPaths = [
      "incoming/casio_for_it_all_photos_UPDATED.zip",
      "incoming/orient_catalog_FULL_001-079.zip",
      "incoming/tissot_FULL_CATALOG_1-193.zip",
      ".tmp/casio-photo-import/manifest.json",
      ".tmp/orient-photo-import/manifest.json",
      ".tmp/tissot-photo-import/manifest.json",
    ];

    for (const relativePath of requiredPaths) {
      expect(existsSync(path.join(projectRoot, relativePath)), relativePath).toBe(true);
    }
  });

  it(
    "serves representative Casio, Orient and Tissot archive-backed catalog images from the local asset root",
    async () => {
      const casioManifest = readJson<CasioPhotoArchiveManifest>(".tmp/casio-photo-import/manifest.json");
      const orientManifest = readJson<OrientPhotoArchiveManifest>(".tmp/orient-photo-import/manifest.json");
      const tissotManifest = readJson<TissotPhotoArchiveManifest>(".tmp/tissot-photo-import/manifest.json");

      const casioEntry = casioManifest.entries.find((entry) => entry.position === "primary") ?? casioManifest.entries[0];
      const orientEntry = orientManifest.entries.find((entry) => entry.position === "primary") ?? orientManifest.entries[0];
      const tissotEntry = tissotManifest.entries.find((entry) => entry.position === "primary") ?? tissotManifest.entries[0];

      expect(casioEntry).toBeDefined();
      expect(orientEntry).toBeDefined();
      expect(tissotEntry).toBeDefined();

      const casio = await resolveCasioArchiveImage({
        imageKey: createCasioArchiveImageKey(casioEntry!.zipEntry),
        rootDir: projectRoot,
        nodeEnv: "test",
      });
      const orient = await resolveOrientArchiveImage({
        imageKey: createOrientArchiveImageKey(orientEntry!.zipEntry),
        rootDir: projectRoot,
        nodeEnv: "test",
      });
      const tissot = await resolveTissotArchiveImage({
        imageKey: createTissotArchiveImageKey(tissotEntry!.archiveFile, tissotEntry!.zipEntry),
        rootDir: projectRoot,
        nodeEnv: "test",
      });

      for (const result of [casio, orient, tissot]) {
        expect(result.status).toBe("found");
        if (result.status === "found") {
          expect(result.contentType).toMatch(/^image\//);
          expect(result.bytes.length).toBeGreaterThan(0);
        }
      }
    },
    60_000,
  );

  it(
    "serves representative archive-backed images in production when CATALOG_IMAGE_ASSET_ROOT points to the shared asset root",
    async () => {
      const previousAssetRoot = process.env.CATALOG_IMAGE_ASSET_ROOT;
      process.env.CATALOG_IMAGE_ASSET_ROOT = projectRoot;

      try {
        const casioManifest = readJson<CasioPhotoArchiveManifest>(".tmp/casio-photo-import/manifest.json");
        const orientManifest = readJson<OrientPhotoArchiveManifest>(".tmp/orient-photo-import/manifest.json");
        const tissotManifest = readJson<TissotPhotoArchiveManifest>(".tmp/tissot-photo-import/manifest.json");

        const casioEntry = casioManifest.entries.find((entry) => entry.position === "primary") ?? casioManifest.entries[0];
        const orientEntry = orientManifest.entries.find((entry) => entry.position === "primary") ?? orientManifest.entries[0];
        const tissotEntry = tissotManifest.entries.find((entry) => entry.position === "primary") ?? tissotManifest.entries[0];

        const casio = await resolveCasioArchiveImage({
          imageKey: createCasioArchiveImageKey(casioEntry!.zipEntry),
          nodeEnv: "production",
        });
        const orient = await resolveOrientArchiveImage({
          imageKey: createOrientArchiveImageKey(orientEntry!.zipEntry),
          nodeEnv: "production",
        });
        const tissot = await resolveTissotArchiveImage({
          imageKey: createTissotArchiveImageKey(tissotEntry!.archiveFile, tissotEntry!.zipEntry),
          nodeEnv: "production",
        });

        for (const result of [casio, orient, tissot]) {
          expect(result.status).toBe("found");
          if (result.status === "found") {
            expect(result.contentType).toMatch(/^image\//);
            expect(result.bytes.length).toBeGreaterThan(0);
          }
        }
      } finally {
        if (previousAssetRoot === undefined) {
          delete process.env.CATALOG_IMAGE_ASSET_ROOT;
        } else {
          process.env.CATALOG_IMAGE_ASSET_ROOT = previousAssetRoot;
        }
      }
    },
    60_000,
  );

  it("upgrades database read-model hotlink images to local archive-backed catalog images", () => {
    const adapter = readSrc("src/modules/catalog/infrastructure/database-catalog-adapter.server.ts");

    expect(adapter).toContain("loadPhotoManifests");
    expect(adapter).toContain("createCasioArchiveImageKey");
    expect(adapter).toContain("createOrientArchiveImageKey");
    expect(adapter).toContain("createTissotArchiveImageKey");
    expect(adapter).toContain("applyProductionImagePolicy");
    expect(adapter).toContain("resolveCatalogImageAssetRoot");
    expect(adapter).toContain("readOptionalJsonFromCandidates");
    expect(adapter).toContain("image.kind === \"remote\" ? missingImage(title) : image");
    expect(adapter).toContain("src: `/api/catalog/dev-images/${imageKey}`");
  });

  it("loads the site-import SEO overlay from the production shared catalog asset root", () => {
    const repository = readSrc("src/modules/catalog/infrastructure/catalog-read-repository.server.ts");
    const deploy = readSrc("scripts/deploy-production.ps1");

    expect(repository).toContain("resolveCatalogImageAssetRoot");
    expect(repository).toContain("catalogAssetCandidatePaths(SITE_IMPORT_OVERLAY_OUTPUT_PATH)");
    expect(deploy).toContain(".tmp/catalog-site-import-overlay/manifest.json");
    expect(deploy).toContain('$ASSET_DIR/.tmp/catalog-site-import-overlay');
  });
});
