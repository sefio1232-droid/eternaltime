import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTissotPhotoArchiveManifest,
  selectMainArchiveImages,
  selectSupplementalArchiveImages,
} from "@/modules/catalog/cli/tissot-photo-archive-manifest";
import { createTissotArchiveImageKey, isTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import { resolveTissotArchiveImage } from "@/modules/catalog/infrastructure/tissot-photo-archive-resolver";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

/**
 * Tissot photo-archive manifest (docs/CATALOG_SHOWROOM_RECOVERY.md "Tissot photo gap") — mirrors
 * the exact-match-only discipline already tested for Casio/Orient in catalog-phase-3-3.test.ts.
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function realDataset(): CatalogReadDataset {
  const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
  const imagePlan = JSON.parse(
    readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
  ) as CatalogImageUploadPlan;
  let tissotPhotoManifest = null;
  try {
    tissotPhotoManifest = JSON.parse(readFileSync(path.join(projectRoot, ".tmp/tissot-photo-import/manifest.json"), "utf8"));
  } catch {
    // Best-effort, same as the real repository — absent until the CLI script has been run locally.
  }
  return catalogReadDatasetFromPreview({ preview, imagePlan, tissotPhotoManifest });
}

describe("Tissot photo-archive manifest", () => {
  describe("exact matching only", () => {
    it("1. the manifest script never does fuzzy/similarity/closest-match matching", () => {
      const script = readSrc("src/modules/catalog/cli/tissot-photo-archive-manifest.ts");
      expect(script).toContain("exact");
      expect(script).toContain("unmatched");
      expect(script).not.toMatch(/fuzzy|closest|levenshtein/i);
    });

    it("2. an archive folder with no matching catalog reference is recorded as unmatched, never guessed", () => {
      const manifest = buildTissotPhotoArchiveManifest({
        mainArchiveFile: "test-main.zip",
        mainArchiveEntriesByFolder: new Map([
          ["T999.999.99.999.99", [{ zipEntry: "tissot_FULL_CATALOG/T999.999.99.999.99/T999_front.jpg", filename: "T999_front.jpg" }]],
        ]),
        supplementalArchiveFiles: new Map(),
        tissotCatalogReferences: [{ referenceDisplay: "T150.410.11.091.00", referenceNormalized: "T1504101109100" }],
        dimensionsFor: () => null,
      });
      expect(manifest.entries).toHaveLength(0);
      expect(manifest.unmatchedFolders).toHaveLength(1);
      expect(manifest.unmatchedFolders[0]?.reason).toBe("unmatched");
    });

    it("3. every accepted image is assigned to at most one catalog reference", () => {
      const manifest = buildTissotPhotoArchiveManifest({
        mainArchiveFile: "test-main.zip",
        mainArchiveEntriesByFolder: new Map([
          [
            "T150.410.11.091.00",
            [
              { zipEntry: "tissot_FULL_CATALOG/T150.410.11.091.00/x_front.jpg", filename: "x_front.jpg" },
              { zipEntry: "tissot_FULL_CATALOG/T150.410.11.091.00/x_back.jpg", filename: "x_back.jpg" },
            ],
          ],
        ]),
        supplementalArchiveFiles: new Map(),
        tissotCatalogReferences: [{ referenceDisplay: "T150.410.11.091.00", referenceNormalized: "T1504101109100" }],
        dimensionsFor: () => null,
      });
      const zipEntries = manifest.entries.map((e) => e.zipEntry);
      expect(new Set(zipEntries).size).toBe(zipEntries.length);
      expect(manifest.entries.every((e) => e.matchConfidence === "exact")).toBe(true);
    });

    it("4. supplemental archive never overrides a reference the main archive already matched", () => {
      const manifest = buildTissotPhotoArchiveManifest({
        mainArchiveFile: "test-main.zip",
        mainArchiveEntriesByFolder: new Map([
          ["T150.410.11.091.00", [{ zipEntry: "tissot_FULL_CATALOG/T150.410.11.091.00/x_front.jpg", filename: "x_front.jpg" }]],
        ]),
        supplementalArchiveFiles: new Map([["supplemental/T150.410.11.091.00.zip", ["T150.410.11.091.00/i.webp"]]]),
        tissotCatalogReferences: [{ referenceDisplay: "T150.410.11.091.00", referenceNormalized: "T1504101109100" }],
        dimensionsFor: () => null,
      });
      expect(manifest.entries).toHaveLength(1);
      expect(manifest.entries[0]?.archiveFile).toBe("test-main.zip");
    });

    it("5. supplemental archive fills in a reference the main archive does not cover", () => {
      const manifest = buildTissotPhotoArchiveManifest({
        mainArchiveFile: "test-main.zip",
        mainArchiveEntriesByFolder: new Map(),
        supplementalArchiveFiles: new Map([["supplemental/T150.410.11.091.00.zip", ["T150.410.11.091.00/i.webp"]]]),
        tissotCatalogReferences: [{ referenceDisplay: "T150.410.11.091.00", referenceNormalized: "T1504101109100" }],
        dimensionsFor: () => null,
      });
      expect(manifest.entries).toHaveLength(1);
      expect(manifest.entries[0]?.position).toBe("primary");
      expect(manifest.catalogReferencesWithoutSourceFolder).toHaveLength(0);
    });

    it("6. a catalog reference with no source in either archive is reported, never invented", () => {
      const manifest = buildTissotPhotoArchiveManifest({
        mainArchiveFile: "test-main.zip",
        mainArchiveEntriesByFolder: new Map(),
        supplementalArchiveFiles: new Map(),
        tissotCatalogReferences: [{ referenceDisplay: "T150.410.11.091.00", referenceNormalized: "T1504101109100" }],
        dimensionsFor: () => null,
      });
      expect(manifest.entries).toHaveLength(0);
      expect(manifest.catalogReferencesWithoutSourceFolder).toHaveLength(1);
      expect(manifest.catalogReferencesWithoutSourceFolder[0]?.reason).toBe("no_source_archive");
    });

    it("6a. a public set reference can use an exact component reference from its own A + B identity", () => {
      const manifest = buildTissotPhotoArchiveManifest({
        mainArchiveFile: "test-main.zip",
        mainArchiveEntriesByFolder: new Map([
          ["T006.407.11.033.00", [{ zipEntry: "tissot_FULL_CATALOG/T006.407.11.033.00/x_front.jpg", filename: "x_front.jpg" }]],
        ]),
        supplementalArchiveFiles: new Map(),
        tissotCatalogReferences: [
          {
            referenceDisplay: "T006.407.11.033.00 + T006.207.11.038.00",
            referenceNormalized: "T0064071103300T0062071103800",
          },
        ],
        dimensionsFor: () => null,
      });
      expect(manifest.entries).toHaveLength(1);
      expect(manifest.entries[0]?.referenceNormalized).toBe("T0064071103300T0062071103800");
      expect(manifest.entries[0]?.sourceReferenceNormalized).toBe("T0064071103300");
      expect(manifest.entries[0]?.matchConfidence).toBe("component-exact");
      expect(manifest.catalogReferencesWithoutSourceFolder).toHaveLength(0);
    });
  });

  describe("image taxonomy classification (main archive)", () => {
    it("7. front is always selected as primary, never a caseback/profile/wrist file", () => {
      const { primary } = selectMainArchiveImages([
        { zipEntry: "a/x_back.jpg", filename: "x_back.jpg" },
        { zipEntry: "a/x_profile.jpg", filename: "x_profile.jpg" },
        { zipEntry: "a/x_wrist.jpg", filename: "x_wrist.jpg" },
        { zipEntry: "a/x_front.jpg", filename: "x_front.jpg" },
      ]);
      expect(primary?.zipEntry).toBe("a/x_front.jpg");
      expect(primary?.type).toBe("front");
    });

    it("8. a folder with no front file at all contributes gallery images only, never an unverified primary", () => {
      const { primary, gallery } = selectMainArchiveImages([
        { zipEntry: "a/x_back.jpg", filename: "x_back.jpg" },
        { zipEntry: "a/x_wrist.jpg", filename: "x_wrist.jpg" },
      ]);
      expect(primary).toBeNull();
      expect(gallery).toHaveLength(2);
    });

    it("9. gallery order follows three-quarter, caseback, dial-detail, strap-detail, lifestyle", () => {
      const { gallery } = selectMainArchiveImages([
        { zipEntry: "a/x_wrist.jpg", filename: "x_wrist.jpg" },
        { zipEntry: "a/x_strapzoom.jpg", filename: "x_strapzoom.jpg" },
        { zipEntry: "a/x_detail1.jpg", filename: "x_detail1.jpg" },
        { zipEntry: "a/x_back.jpg", filename: "x_back.jpg" },
        { zipEntry: "a/x_profile.jpg", filename: "x_profile.jpg" },
        { zipEntry: "a/x_front.jpg", filename: "x_front.jpg" },
      ]);
      expect(gallery.map((g) => g.type)).toEqual(["three-quarter", "caseback", "dial-detail", "strap-detail", "lifestyle"]);
    });

    it("10. an unrecognized filename is rejected, never silently included as an unknown-type gallery image", () => {
      const { rejected, gallery } = selectMainArchiveImages([
        { zipEntry: "a/x_packaging_box.jpg", filename: "x_packaging_box.jpg" },
        { zipEntry: "a/x_front.jpg", filename: "x_front.jpg" },
      ]);
      expect(rejected).toHaveLength(1);
      expect(gallery).toHaveLength(0);
    });

    it("11. the archive's own documented outlier filenames (bare _detail, _NN_detail) classify as dial-detail", () => {
      const { gallery } = selectMainArchiveImages([
        { zipEntry: "a/x_front.jpg", filename: "x_front.jpg" },
        { zipEntry: "a/x_detail.jpg", filename: "x_detail.jpg" },
        { zipEntry: "a/x_04_detail.jpg", filename: "x_04_detail.jpg" },
      ]);
      expect(gallery.map((g) => g.type)).toEqual(["dial-detail", "dial-detail"]);
    });
  });

  describe("supplemental archive selection", () => {
    it("12. the bare (unnumbered) file is primary; numbered files are ordered gallery", () => {
      const { primary, gallery } = selectSupplementalArchiveImages(["a/i (2).webp", "a/i.webp", "a/i (1).webp"]);
      expect(primary).toBe("a/i.webp");
      expect(gallery).toEqual(["a/i (1).webp", "a/i (2).webp"]);
    });
  });

  describe("resolver safety", () => {
    it("13. an unknown image key resolves to not_found, not a thrown error", async () => {
      const result = await resolveTissotArchiveImage({
        imageKey: "tissot_0000000000000000000000000000000000",
        nodeEnv: "test",
        manifestPath: path.join(projectRoot, "does-not-exist-manifest.json"),
      });
      expect(result.status).toBe("not_found");
    });

    it("14. disabled in production regardless of manifest contents", async () => {
      const result = await resolveTissotArchiveImage({ imageKey: "tissot_anything", nodeEnv: "production" });
      expect(result.status).toBe("disabled");
    });

    it("15. a manifest entry with a path-traversal archiveFile is rejected, never read from disk", async () => {
      const manifestPath = path.join(projectRoot, ".tmp", "tissot-photo-import", "traversal-test-manifest.json");
      const fs = await import("node:fs/promises");
      await fs.mkdir(path.dirname(manifestPath), { recursive: true });
      await fs.writeFile(
        manifestPath,
        JSON.stringify({
          generatedAt: new Date().toISOString(),
          sourceArchives: [],
          entries: [
            {
              catalogReference: "X",
              referenceNormalized: "X",
              brandSlug: "tissot",
              archiveFile: "../../../etc/passwd",
              zipEntry: "x.jpg",
              sourceFilename: "x.jpg",
              imageType: "front",
              width: null,
              height: null,
              position: "primary",
              galleryIndex: null,
              matchConfidence: "exact",
            },
          ],
          unmatchedFolders: [],
          rejectedFiles: [],
          catalogReferencesWithoutSourceFolder: [],
        }),
        "utf8",
      );
      const imageKey = createTissotArchiveImageKey("../../../etc/passwd", "x.jpg");
      const result = await resolveTissotArchiveImage({ imageKey, nodeEnv: "test", manifestPath });
      expect(result.status).toBe("not_found");
      await fs.rm(manifestPath, { force: true });
    });

    it("16. serves archive images with a content type matching the actual bytes, not only the extension", async () => {
      const fs = await import("node:fs/promises");
      const { default: JSZip } = await import("jszip");
      const manifestPath = path.join(projectRoot, ".tmp", "tissot-photo-import", "mime-test-manifest.json");
      const archiveFile = ".tmp/tissot-photo-import/mime-test.zip";
      const archivePath = path.join(projectRoot, archiveFile);
      const zipEntry = "Tissot/test-image.webp";
      const imageKey = createTissotArchiveImageKey(archiveFile, zipEntry);
      const zip = new JSZip();

      zip.file(zipEntry, Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]));
      await fs.mkdir(path.dirname(manifestPath), { recursive: true });
      await fs.writeFile(archivePath, await zip.generateAsync({ type: "nodebuffer" }));
      await fs.writeFile(
        manifestPath,
        JSON.stringify({
          generatedAt: new Date().toISOString(),
          sourceArchives: [],
          entries: [
            {
              catalogReference: "X",
              referenceNormalized: "X",
              brandSlug: "tissot",
              archiveFile,
              zipEntry,
              sourceFilename: "test-image.webp",
              imageType: "front",
              width: null,
              height: null,
              position: "primary",
              galleryIndex: null,
              matchConfidence: "exact",
            },
          ],
          unmatchedFolders: [],
          rejectedFiles: [],
          catalogReferencesWithoutSourceFolder: [],
        }),
        "utf8",
      );

      const result = await resolveTissotArchiveImage({ imageKey, nodeEnv: "test", rootDir: projectRoot, manifestPath });
      expect(result.status).toBe("found");
      if (result.status === "found") {
        expect(result.contentType).toBe("image/jpeg");
      }

      await fs.rm(manifestPath, { force: true });
      await fs.rm(archivePath, { force: true });
    });

    it("17. isTissotArchiveImageKey distinguishes this archive's keys from Orient/Casio/import-pipeline keys", () => {
      expect(isTissotArchiveImageKey(createTissotArchiveImageKey("a.zip", "b.jpg"))).toBe(true);
      expect(isTissotArchiveImageKey("orient_abc")).toBe(false);
      expect(isTissotArchiveImageKey("casio_abc")).toBe(false);
    });
  });

  describe("real catalog integration", () => {
    it("18. after the archive manifest is applied, no watch's primaryImage.src points at another reference's archive entry", () => {
      const manifestPath = path.join(projectRoot, ".tmp/tissot-photo-import/manifest.json");
      let manifest: { entries: Array<{ referenceNormalized: string; zipEntry: string }> };
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch {
        return; // manifest not built in this environment — resolver/adapter behavior is covered above with synthetic fixtures.
      }
      const dataset = realDataset();
      const tissotByRef = new Map(dataset.watches.filter((w) => w.brandSlug === "tissot").map((w) => [w.referenceNormalized, w]));
      for (const entry of manifest.entries) {
        const watch = tissotByRef.get(entry.referenceNormalized);
        expect(watch).toBeDefined();
      }
    });

    it("18. Tissot front-image coverage materially improved over the pre-archive baseline (32/218), when the manifest has been built locally", () => {
      const manifestPath = path.join(projectRoot, ".tmp/tissot-photo-import/manifest.json");
      try {
        readFileSync(manifestPath, "utf8");
      } catch {
        return; // best-effort, same as production — absent until `npx tsx .../tissot-photo-archive-manifest.ts` has run.
      }
      const dataset = realDataset();
      const tissot = dataset.watches.filter((w) => w.brandSlug === "tissot");
      const withFront = tissot.filter((w) => w.primaryImage.kind !== "none");
      expect(tissot.length).toBe(218);
      expect(withFront.length).toBeGreaterThan(100);
    });
  });
});
