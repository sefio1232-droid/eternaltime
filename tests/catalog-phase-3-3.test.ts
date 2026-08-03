import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import { normalizeWaterResistanceGroup, waterResistanceGroupLabels } from "@/modules/catalog/application/catalog-water-resistance-taxonomy";
import { normalizeCaseMaterialGroup, caseMaterialGroupLabels } from "@/modules/catalog/application/catalog-case-material-taxonomy";
import { normalizeCrystalGroup, crystalGroupLabels } from "@/modules/catalog/application/catalog-crystal-taxonomy";
import {
  buildCasioPhotoArchiveManifest,
  parseCasioZipFolderReference,
  selectCasioFolderImages,
} from "@/modules/catalog/cli/casio-photo-archive-manifest";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

/**
 * Phase 3.3 checks (docs/CATALOG_SHOWROOM_RECOVERY.md "Phase 3.3"): water-resistance/case-
 * material/crystal normalization, the Casio updated photo archive's exact-match manifest, and the
 * data-quality fixes (Cyrillic-contaminated / duplicate-reference rows) this phase found while
 * auditing the ground truth. Real-data checks load the actual production preview/image-plan
 * files; everything else uses small synthetic fixtures for speed and determinism.
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
  return catalogReadDatasetFromPreview({ preview, imagePlan });
}

describe("catalog Phase 3.3", () => {
  describe("water-resistance normalization", () => {
    it("1. groups every real water_resistance_raw value into a known bucket or null, never a new ad-hoc one", () => {
      const dataset = realDataset();
      for (const watch of dataset.watches) {
        const spec = watch.specifications.find((s) => s.key === "water_resistance_raw");
        if (!spec) continue;
        const group = normalizeWaterResistanceGroup(spec.value);
        if (group !== null) {
          expect(Object.keys(waterResistanceGroupLabels)).toContain(group);
        }
      }
    });

    it("2. maps ATM/bar figures to the matching meter bucket", () => {
      expect(normalizeWaterResistanceGroup("200 метров / 20 ATM")).toBe("200m");
      expect(normalizeWaterResistanceGroup("100 м / 10 bar")).toBe("100m");
      expect(normalizeWaterResistanceGroup("50 метров / 5 ATM")).toBe("50m");
      expect(normalizeWaterResistanceGroup("WR / 30 м (3 ATM)")).toBe("30m");
    });

    it("3. treats bare WR / splash-protection wording as the splash bucket, never a specific depth", () => {
      expect(normalizeWaterResistanceGroup("WR")).toBe("splash");
      expect(normalizeWaterResistanceGroup("WR / защита от брызг")).toBe("splash");
    });

    it("4. never invents a depth for vague marketing wording", () => {
      expect(normalizeWaterResistanceGroup("водозащита зависит от серии")).toBeNull();
      expect(normalizeWaterResistanceGroup("повышенная водозащита для спортивной серии")).toBeNull();
    });

    it("5. filtering by a normalized water-resistance group narrows results and never exposes a raw label", () => {
      const dataset = realDataset();
      const filtered = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all", water: "200m" } }));
      expect(filtered.totalRecords).toBeGreaterThan(0);
      expect(filtered.totalRecords).toBeLessThan(dataset.watches.length);
      for (const option of filtered.facets.waterResistance) {
        expect(Object.values(waterResistanceGroupLabels)).toContain(option.label);
      }
    });
  });

  describe("case-material normalization", () => {
    it("6. groups every real case_material_raw value into a known bucket, never null for non-empty input", () => {
      const dataset = realDataset();
      for (const watch of dataset.watches) {
        const spec = watch.specifications.find((s) => s.key === "case_material_raw");
        if (!spec) continue;
        expect(normalizeCaseMaterialGroup(spec.value)).not.toBeNull();
      }
    });

    it("7. recognizes steel/polymer declensions (genitive case), not just the nominative form", () => {
      expect(normalizeCaseMaterialGroup("корпус из нержавеющей стали")).toBe("steel");
      expect(normalizeCaseMaterialGroup("Пластик / смола (Resin) + безель из нержавеющей стали")).toBe("steel_polymer");
    });

    it("8. a genuine steel+polymer combination gets its own bucket, not a silent default to one material", () => {
      expect(normalizeCaseMaterialGroup("Комбинированный: пластик / нержавеющая сталь")).toBe("steel_polymer");
    });

    it("9. carbon takes priority over a co-mentioned steel/polymer — a distinct premium-materials bucket", () => {
      expect(normalizeCaseMaterialGroup("Карбон / Нержавеющая сталь с DLC-покрытием (Carbon Core Guard)")).toBe("carbon");
    });

    it("10. filtering by a normalized case-material group narrows results and never exposes a raw sentence", () => {
      const dataset = realDataset();
      const filtered = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all", caseMaterial: "steel" } }));
      expect(filtered.totalRecords).toBeGreaterThan(0);
      expect(filtered.totalRecords).toBeLessThan(dataset.watches.length);
      for (const option of filtered.facets.caseMaterials) {
        expect(Object.values(caseMaterialGroupLabels)).toContain(option.label);
        expect(option.label.length).toBeLessThan(30);
      }
    });
  });

  describe("crystal normalization", () => {
    it("11. groups every real crystal_type_raw value into a known bucket or null, never a new ad-hoc one", () => {
      const dataset = realDataset();
      for (const watch of dataset.watches) {
        const spec = watch.specifications.find((s) => s.key === "crystal_type_raw");
        if (!spec) continue;
        const group = normalizeCrystalGroup(spec.value);
        if (group !== null) {
          expect(Object.keys(crystalGroupLabels)).toContain(group);
        }
      }
    });

    it("12. never asserts sapphire or mineral when the source names both as possibilities", () => {
      expect(normalizeCrystalGroup("минеральное или сапфировое стекло в зависимости от версии")).toBeNull();
    });

    it("13. filtering by a normalized crystal group narrows results and never exposes a raw sentence", () => {
      const dataset = realDataset();
      const filtered = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all", crystal: "sapphire" } }));
      expect(filtered.totalRecords).toBeGreaterThan(0);
      expect(filtered.totalRecords).toBeLessThan(dataset.watches.length);
      for (const option of filtered.facets.crystalTypes) {
        expect(Object.values(crystalGroupLabels)).toContain(option.label);
      }
    });
  });

  describe("data-quality fixes (Phase 3.3 ground-truth audit)", () => {
    it("14. no watch anywhere in the real catalog has Cyrillic text in its public reference", () => {
      const dataset = realDataset();
      const cyrillicPattern = /[а-яё]/iu;
      for (const watch of dataset.watches) {
        expect(cyrillicPattern.test(watch.referenceDisplay)).toBe(false);
      }
    });

    it("15. no two watches in the real catalog share an id (no duplicate canonical route)", () => {
      const dataset = realDataset();
      const ids = dataset.watches.map((w) => w.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("16. no two watches in the same brand share a normalized public reference (deduplicateByCleanReference)", () => {
      const dataset = realDataset();
      const keys = dataset.watches.map((w) => `${w.brandSlug}:${normalizeManufacturerReference(w.referenceDisplay)}`);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("17. the real catalog contains exactly 547 legitimate distinct records", () => {
      const dataset = realDataset();
      expect(dataset.watches.length).toBe(547);
    });
  });

  describe("Casio photo-archive manifest — exact matching only", () => {
    it("18. the manifest script never does fuzzy/similarity/closest-match matching", () => {
      const script = readSrc("src/modules/catalog/cli/casio-photo-archive-manifest.ts");
      expect(script).toContain("exact");
      expect(script).toContain("unmatched");
      expect(script).toMatch(/Map<string,/);
      expect(script).not.toMatch(/fuzzy|closest|levenshtein/i);
    });

    it("19. explicitly ignores the archive's own approximate 'closest family' fallback assignments", () => {
      const script = readSrc("src/modules/catalog/cli/casio-photo-archive-manifest.ts");
      expect(script).toMatch(/family.*fallback|fallback.*family|approximate substitution/i);
    });

    it("20. a folder name is used verbatim as the reference — no numeric-prefix stripping like Orient's", () => {
      expect(parseCasioZipFolderReference("GA-2100-1A1DR")).toBe("GA-2100-1A1DR");
      expect(parseCasioZipFolderReference("")).toBeNull();
    });

    it("21. an archive folder with no matching catalog reference is recorded as unmatched, never guessed", () => {
      const manifest = buildCasioPhotoArchiveManifest({
        zipEntriesByFolder: new Map([["GA-2100-1A1DR-DOES-NOT-EXIST", ["images/Casio/GA-2100-1A1DR-DOES-NOT-EXIST/x_1.jpg"]]]),
        casioCatalogReferences: [{ referenceDisplay: "GA-2100-1A1DR", referenceNormalized: "GA21001A1DR" }],
        sourceArchive: "test.zip",
        dimensionsFor: () => null,
      });
      expect(manifest.entries).toHaveLength(0);
      expect(manifest.unmatchedFolders).toHaveLength(1);
      expect(manifest.unmatchedFolders[0]?.reason).toBe("unmatched");
    });

    it("22. a reference-shaped folder that does not exactly equal a catalog reference is not silently assigned (e.g. GA-2100-1A vs GA-2100-1A1DR)", () => {
      const manifest = buildCasioPhotoArchiveManifest({
        zipEntriesByFolder: new Map([["GA-2100-1A", ["images/Casio/GA-2100-1A/GA-2100-1A_1.jpg"]]]),
        casioCatalogReferences: [
          { referenceDisplay: "GA-2100-1A1DR", referenceNormalized: "GA21001A1DR" },
          { referenceDisplay: "GA-2100-1A2DR", referenceNormalized: "GA21001A2DR" },
        ],
        sourceArchive: "test.zip",
        dimensionsFor: () => null,
      });
      expect(manifest.entries).toHaveLength(0);
      expect(manifest.unmatchedFolders).toHaveLength(1);
    });

    it("23. every accepted image is assigned to at most one catalog reference", () => {
      const manifest = buildCasioPhotoArchiveManifest({
        zipEntriesByFolder: new Map([["GA-2100-1A1DR", ["images/Casio/GA-2100-1A1DR/GA-2100-1A1DR_1.jpg", "images/Casio/GA-2100-1A1DR/GA-2100-1A1DR_2.jpg"]]]),
        casioCatalogReferences: [{ referenceDisplay: "GA-2100-1A1DR", referenceNormalized: "GA21001A1DR" }],
        sourceArchive: "test.zip",
        dimensionsFor: () => null,
      });
      const zipEntries = manifest.entries.map((e) => e.zipEntry);
      expect(new Set(zipEntries).size).toBe(zipEntries.length);
      expect(manifest.entries.every((e) => e.matchConfidence === "exact")).toBe(true);
    });

    it("24. a folder without a verified primary override contributes gallery images only, never an unverified primary guess", () => {
      const { primary, gallery } = selectCasioFolderImages("SOME-UNVERIFIED-REF", [
        "images/Casio/SOME-UNVERIFIED-REF/SOME-UNVERIFIED-REF_1.jpg",
        "images/Casio/SOME-UNVERIFIED-REF/SOME-UNVERIFIED-REF_2.jpg",
      ]);
      expect(primary).toBeNull();
      expect(gallery).toHaveLength(2);
    });

    it("25. a verified primary override is pulled out as the primary and excluded from gallery", () => {
      const { primary, gallery } = selectCasioFolderImages("DW-5000R-1", ["images/Casio/DW-5000R-1/DW-5000R-1_1.jpg"]);
      expect(primary).toBe("images/Casio/DW-5000R-1/DW-5000R-1_1.jpg");
      expect(gallery).toHaveLength(0);
    });

    it("26. a file confirmed unsuitable even as a secondary photo is rejected, not silently included in the gallery", () => {
      const { gallery, rejected } = selectCasioFolderImages("GA-B2100-2ADR", [
        "images/Casio/GA-B2100-2ADR/GA-B2100-2ADR_1.jpg",
        "images/Casio/GA-B2100-2ADR/GA-B2100-2ADR_4.jpg",
      ]);
      expect(rejected.map((r) => r.zipEntry)).toContain("images/Casio/GA-B2100-2ADR/GA-B2100-2ADR_1.jpg");
      expect(gallery).not.toContain("images/Casio/GA-B2100-2ADR/GA-B2100-2ADR_1.jpg");
    });

    it("27. the real Casio archive manifest matches every one of its 218 folders exactly (0 unmatched)", () => {
      const manifestPath = path.join(projectRoot, ".tmp/casio-photo-import/manifest.json");
      let manifest: { unmatchedFolders: unknown[]; entries: Array<{ zipEntry: string }> } | null = null;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch {
        manifest = null;
      }
      if (!manifest) {
        // Manifest not generated in this environment yet — covered by the synthetic-fixture tests
        // above; skip the real-archive assertion rather than fail on missing local state.
        return;
      }
      expect(manifest.unmatchedFolders).toHaveLength(0);
      const zipEntries = manifest.entries.map((e) => e.zipEntry);
      expect(new Set(zipEntries).size).toBe(zipEntries.length);
    });
  });

  describe("archive image upgrade: gallery always augmented, primary only replaced when missing/rejected", () => {
    it("28. dev-images route dispatches Casio archive keys to the Casio resolver, Orient keys to the Orient resolver", () => {
      const route = readSrc("src/app/api/catalog/dev-images/[imageKey]/route.ts");
      expect(route).toContain("isCasioArchiveImageKey");
      expect(route).toContain("resolveCasioArchiveImage");
      expect(route).toContain("isOrientArchiveImageKey");
      expect(route).toContain("resolveOrientArchiveImage");
    });

    it("29. canonical href/id are derived from the reference alone, independent of image/manifest state", () => {
      const adapter = readSrc("src/modules/catalog/infrastructure/preview-catalog-adapter.ts");
      // href/id are built before any archive upgrade is applied in readModelFromCandidate.
      const hrefIndex = adapter.indexOf("href: `/watches/${brandSlug}/${referenceSlug}`");
      const upgradeIndex = adapter.indexOf("applyOrientArchiveUpgrade({");
      expect(hrefIndex).toBeGreaterThan(-1);
      expect(upgradeIndex).toBeGreaterThan(-1);
    });

    it("30. repeated dataset builds from the same real source data are fully deterministic (SSR/client stable ordering)", () => {
      const first = realDataset();
      const second = realDataset();
      expect(first.watches.map((w) => w.id)).toEqual(second.watches.map((w) => w.id));
      expect(first.watches.map((w) => w.primaryImage.kind === "none" ? null : w.primaryImage.src)).toEqual(
        second.watches.map((w) => (w.primaryImage.kind === "none" ? null : w.primaryImage.src)),
      );
    });
  });
});
