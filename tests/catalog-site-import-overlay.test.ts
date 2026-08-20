import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  buildColumnIndex,
  mapCombinedSpecifications,
  processSeoFinalWorkbook,
} from "@/modules/catalog/cli/catalog-site-import-overlay-manifest";
import { catalogReadDatasetFromPreview, groupSiteImportOverlayByReference } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogSiteImportOverlayManifest } from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

/**
 * Catalog site-import overlay v2 ("seo_final" batch — docs/CATALOG_SHOWROOM_RECOVERY.md
 * "Site-import overlay v2"): one sheet per brand (Casio/Orient/Tissot), one combined
 * "Label: value | Label: value | ..." specifications cell per row, exact-reference-matching-only
 * manifest building, brand-scoped lookup, and the "SEO stays out of CatalogWatchDetail entirely"
 * contract. Real-data checks load the actual generated manifest (when present locally) and the
 * real production preview/image-plan files; everything else uses small synthetic fixtures.
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function buildSheet(header: string[], rows: unknown[][]): unknown[][] {
  return [header, ...rows];
}

function buildWorkbook(sheetName: string, rows: unknown[][]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  return workbook;
}

function realOverlayManifest(): CatalogSiteImportOverlayManifest | null {
  try {
    return JSON.parse(readFileSync(path.join(projectRoot, ".tmp/catalog-site-import-overlay/manifest.json"), "utf8")) as CatalogSiteImportOverlayManifest;
  } catch {
    return null;
  }
}

describe("catalog site-import overlay v2 (specifications + SEO)", () => {
  describe("column mapping", () => {
    it("1. buildColumnIndex maps header names to their column position, ignoring blank cells", () => {
      const index = buildColumnIndex(["№", "Артикул", "", "Стекло"]);
      expect(index.get("Артикул")).toBe(1);
      expect(index.get("Стекло")).toBe(3);
      expect(index.has("")).toBe(false);
    });
  });

  describe("mapCombinedSpecifications — the pipe-delimited 'Характеристики' cell", () => {
    it("2. splits 'Label: value | Label: value' into the shared canonical specification keys", () => {
      const specs = mapCombinedSpecifications("Диаметр корпуса: 41.5 мм | Материал корпуса: Нержавеющая сталь | Стекло: минеральное стекло");
      expect(specs.case_diameter_raw).toBe("41.5 мм");
      expect(specs.case_material_raw).toBe("Нержавеющая сталь");
      expect(specs.crystal_type_raw).toBe("минеральное стекло");
    });

    it("3. label matching is case-insensitive and tolerant of the same field spelled differently across rows", () => {
      expect(mapCombinedSpecifications("механизм: Автоматический").movement_raw).toBe("Автоматический");
      expect(mapCombinedSpecifications("Механизм: Автоматический").movement_raw).toBe("Автоматический");
      expect(mapCombinedSpecifications("Ремешок/браслет: Кожа").attachment_material_raw).toBe("Кожа");
      expect(mapCombinedSpecifications("Ремешок / Браслет: Кожа").attachment_material_raw).toBe("Кожа");
    });

    it("4. an unrecognized label is skipped, never guessed at, and reported via onUnknownLabel", () => {
      const unknown: string[] = [];
      const specs = mapCombinedSpecifications("Совершенно новое поле: значение | Стекло: сапфировое", (label) => unknown.push(label));
      expect(specs.crystal_type_raw).toBe("сапфировое");
      expect(Object.keys(specs)).not.toContain("совершенно новое поле");
      expect(unknown).toContain("Совершенно новое поле");
    });

    it("5. two labels that map to the same canonical key combine their values rather than one overwriting the other", () => {
      const specs = mapCombinedSpecifications("Тип батарейки: CR2016 | Срок службы батареи: около 5 лет");
      expect(specs.power_source_raw).toBe("CR2016, около 5 лет");
    });

    it("6. an empty value for a recognized label contributes nothing (never an empty-string specification)", () => {
      const specs = mapCombinedSpecifications("Стекло:  | Механизм: Автоматический");
      expect(specs.crystal_type_raw).toBeUndefined();
      expect(specs.movement_raw).toBe("Автоматический");
    });

    it("7. genuinely new fields from this batch (gemstones, dial markers, strap color/coating/features, certification, thickness) map onto real canonical keys, never invented text", () => {
      const specs = mapCombinedSpecifications(
        "Толщина корпуса: 13 мм | Индексы: римские цифры | Драгоценные камни: тип — бриллианты | Цвет ремешка/браслета: синий | Покрытие браслета: PVD | Покрытие: DLC | Особенности браслета: быстросъёмный | Сертификация: COSC | Комплектация: стальной браслет и кожаный ремешок",
      );
      expect(specs.case_thickness_raw).toBe("13 мм");
      expect(specs.dial_markers_raw).toBe("римские цифры");
      expect(specs.gemstones_raw).toBe("тип — бриллианты");
      expect(specs.strap_color_raw).toBe("синий");
      expect(specs.strap_coating_raw).toBe("PVD");
      expect(specs.case_coating_raw).toBe("DLC");
      expect(specs.strap_features_raw).toBe("быстросъёмный");
      expect(specs.certification_raw).toBe("COSC");
      expect(specs.package_contents_raw).toBe("стальной браслет и кожаный ремешок");
    });

    it("7b. maps the FINAL_FOR_SITE_DROPIN Casio label variants onto existing canonical fields", () => {
      const specs = mapCombinedSpecifications(
        "Материал корпуса/безеля: полимер | Автономность: около 3 лет | Связь: Bluetooth, CASIO WATCHES | Комплект: G-SHOCK DW-5600SLB-2 + BABY-G BGD-560SLB-2",
      );

      expect(specs.case_material_raw).toBe("полимер");
      expect(specs.power_source_raw).toBe("около 3 лет");
      expect(specs.functions_raw).toBe("Bluetooth, CASIO WATCHES");
      expect(specs.package_contents_raw).toBe("G-SHOCK DW-5600SLB-2 + BABY-G BGD-560SLB-2");
    });

    it("8. 'Модель' and 'Серия' are deliberately never mapped — both duplicate data the main catalog import already provides", () => {
      const unknown: string[] = [];
      mapCombinedSpecifications("Модель: Casio GA-700 | Серия: G-Shock", (label) => unknown.push(label));
      expect(unknown).toEqual(["Модель", "Серия"]);
    });

    it("9. never produces a price/inventory-shaped specification key", () => {
      const keys = Object.keys(mapCombinedSpecifications("Цена ¥: 629 | Цена ₽: 7548 | Стекло: минеральное"));
      for (const key of keys) {
        expect(key).not.toMatch(/price|цена/i);
      }
    });
  });

  describe("workbook processing — exact matching only, brand-scoped", () => {
    const catalogByNormalized = new Map([
      ["GA700SK1ADR", { referenceDisplay: "GA-700SK-1ADR", referenceNormalized: "GA700SK1ADR", brandSlug: "casio" }],
    ]);

    it("10. a row whose Артикул matches an existing catalog reference produces one entry with specs + description", () => {
      const workbook = buildWorkbook(
        "Casio",
        buildSheet(
          ["Артикул", "Название для сайта", "SEO-описание", "Характеристики"],
          [["GA-700SK-1ADR", "Casio GA-700SK-1ADR", "Описание модели.", "Стекло: минеральное"]],
        ),
      );
      const { entries, unmatched } = processSeoFinalWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        sheetName: "Casio",
        catalogByNormalized,
      });
      expect(unmatched).toHaveLength(0);
      const entry = entries.get("GA700SK1ADR");
      expect(entry?.specifications.crystal_type_raw).toBe("минеральное");
      expect(entry?.longDescription).toBe("Описание модели.");
      expect(entry?.metaDescription).toBe("Описание модели.");
    });

    it("11. a row whose Артикул does not exactly equal any catalog reference is recorded as unmatched, never guessed at", () => {
      const workbook = buildWorkbook(
        "Casio",
        buildSheet(["Артикул", "Характеристики"], [["GA-700SK-1A", "Стекло: минеральное"]]),
      );
      const { entries, unmatched } = processSeoFinalWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        sheetName: "Casio",
        catalogByNormalized,
      });
      expect(entries.size).toBe(0);
      expect(unmatched.map((u) => u.referenceRaw)).toContain("GA-700SK-1A");
      expect(unmatched[0]?.reason).toBe("unmatched");
    });

    it("12. matching is brand-scoped: a reference only present in the Orient catalog map never matches through the Casio map", () => {
      const orientOnly = new Map([["GA700SK1ADR", { referenceDisplay: "GA-700SK-1ADR", referenceNormalized: "GA700SK1ADR", brandSlug: "orient" }]]);
      const workbook = buildWorkbook("Casio", buildSheet(["Артикул"], [["GA-700SK-1ADR"]]));
      const { entries } = processSeoFinalWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        sheetName: "Casio",
        catalogByNormalized: orientOnly,
      });
      const entry = entries.get("GA700SK1ADR");
      expect(entry?.brandSlug).toBe("orient");
    });

    it("13. an empty Артикул cell is skipped entirely, never treated as an unmatched row", () => {
      const workbook = buildWorkbook("Casio", buildSheet(["Артикул", "Характеристики"], [["", "Стекло: минеральное"]]));
      const { entries, unmatched } = processSeoFinalWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        sheetName: "Casio",
        catalogByNormalized,
      });
      expect(entries.size).toBe(0);
      expect(unmatched).toHaveLength(0);
    });
  });

  describe("preview-catalog-adapter wiring — specs merge, SEO stays out of CatalogWatchDetail", () => {
    it("14. groupSiteImportOverlayByReference keys entries by brand-scoped normalized reference", () => {
      const manifest: CatalogSiteImportOverlayManifest = {
        generatedAt: new Date().toISOString(),
        sourceFiles: ["a.xlsx"],
        entries: [
          {
            catalogReference: "GA-700SK-1ADR",
            referenceNormalized: "GA700SK1ADR",
            brandSlug: "casio",
            specifications: { crystal_type_raw: "минеральное" },
            seoTitle: null,
            metaDescription: "M",
            shortDescription: null,
            longDescription: "L",
          },
        ],
        unmatchedRows: [],
      };
      const grouped = groupSiteImportOverlayByReference(manifest);
      expect(grouped.get("casio:GA700SK1ADR")?.longDescription).toBe("L");
      expect(grouped.get("orient:GA700SK1ADR")).toBeUndefined();
      expect(groupSiteImportOverlayByReference(null).size).toBe(0);
    });

    it("15. an overlay specification value takes priority over the raw import's own value for the same key", () => {
      const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
      const imagePlan = JSON.parse(
        readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
      ) as CatalogImageUploadPlan;
      const baseline = catalogReadDatasetFromPreview({ preview, imagePlan });
      const sample = baseline.watches.find((watch) => watch.specifications.length > 0);
      expect(sample).toBeDefined();
      const key = sample!.specifications[0]!.key;

      const overlayManifest: CatalogSiteImportOverlayManifest = {
        generatedAt: new Date().toISOString(),
        sourceFiles: ["a.xlsx"],
        entries: [
          {
            catalogReference: sample!.referenceDisplay,
            referenceNormalized: sample!.referenceNormalized,
            brandSlug: sample!.brandSlug,
            specifications: { [key]: "ПЕРЕОПРЕДЕЛЕНО-ТЕСТ" },
            seoTitle: null,
            metaDescription: null,
            shortDescription: null,
            longDescription: null,
          },
        ],
        unmatchedRows: [],
      };

      const overridden = catalogReadDatasetFromPreview({ preview, imagePlan, siteImportOverlay: overlayManifest });
      const overriddenWatch = overridden.watches.find((watch) => watch.id === sample!.id);
      expect(overriddenWatch?.specifications.find((s) => s.key === key)?.value).toBe("ПЕРЕОПРЕДЕЛЕНО-ТЕСТ");
    });

    it("16. an absent siteImportOverlay never changes the dataset (fully backward compatible)", () => {
      const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
      const imagePlan = JSON.parse(
        readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
      ) as CatalogImageUploadPlan;
      const withoutOverlayArg = catalogReadDatasetFromPreview({ preview, imagePlan });
      const withNullOverlay = catalogReadDatasetFromPreview({ preview, imagePlan, siteImportOverlay: null });
      expect(withoutOverlayArg.watches.length).toBe(withNullOverlay.watches.length);
      expect(withoutOverlayArg.watches.map((w) => w.id)).toEqual(withNullOverlay.watches.map((w) => w.id));
    });

    it("17. the overlay never changes publicPrice — price/inventory stays sourced from catalog_offers only", () => {
      const manifest = realOverlayManifest();
      if (!manifest) return;
      const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
      const imagePlan = JSON.parse(
        readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
      ) as CatalogImageUploadPlan;
      const withoutOverlay = catalogReadDatasetFromPreview({ preview, imagePlan });
      const withOverlay = catalogReadDatasetFromPreview({ preview, imagePlan, siteImportOverlay: manifest });
      for (const watch of withOverlay.watches) {
        const base = withoutOverlay.watches.find((b) => b.id === watch.id);
        expect(JSON.stringify(watch.publicPrice)).toBe(JSON.stringify(base?.publicPrice ?? null));
      }
    });

    it("18. the overlay never removes a specification the raw import already had — enrichment only, never regression", () => {
      const manifest = realOverlayManifest();
      if (!manifest) return;
      const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
      const imagePlan = JSON.parse(
        readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
      ) as CatalogImageUploadPlan;
      const withoutOverlay = catalogReadDatasetFromPreview({ preview, imagePlan });
      const withOverlay = catalogReadDatasetFromPreview({ preview, imagePlan, siteImportOverlay: manifest });
      for (const watch of withOverlay.watches) {
        const base = withoutOverlay.watches.find((b) => b.id === watch.id);
        expect(watch.specifications.length).toBeGreaterThanOrEqual(base?.specifications.length ?? 0);
      }
    });

    it("19. CatalogWatchCard/CatalogWatchDetail never gain an seo/description field — SEO stays entirely out of the read-model contract", () => {
      const readModelsSource = readSrc("src/modules/catalog/domain/read-models.ts");
      const cardTypeMatch = /export type CatalogWatchCard = \{[\s\S]*?\n\};/.exec(readModelsSource);
      const detailTypeMatch = /export type CatalogWatchDetail = CatalogWatchCard & \{[\s\S]*?\n\};/.exec(readModelsSource);
      expect(cardTypeMatch).not.toBeNull();
      expect(detailTypeMatch).not.toBeNull();
      expect(cardTypeMatch![0]).not.toMatch(/seo|metaDescription|shortDescription|longDescription/i);
      expect(detailTypeMatch![0]).not.toMatch(/seo|metaDescription|shortDescription|longDescription/i);
    });
  });

  describe("manifest builder script — exact matching only, real-data checks", () => {
    it("20. the manifest script never does fuzzy/similarity/closest-match matching", () => {
      const script = readSrc("src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts");
      expect(script).toContain("EXACT");
      expect(script).toContain("unmatched");
      expect(script).not.toMatch(/fuzzy|closest|levenshtein/i);
    });

    it("21. the manifest script never reads a price/inventory column from the workbook", () => {
      const script = readSrc("src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts");
      expect(script).not.toMatch(/Цена|Разница|Ссылка поставщика/);
    });

    it("22. all three brands (Casio, Orient, Tissot) are wired into the manifest builder", () => {
      const script = readSrc("src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts");
      expect(script).toContain('brandSlug: "casio"');
      expect(script).toContain('brandSlug: "orient"');
      expect(script).toContain('brandSlug: "tissot"');
    });

    it("23. the real generated manifest (when present locally) matches exact in-catalog rows and reports the known DROPIN references absent from the current catalog as unmatched", () => {
      const manifest = realOverlayManifest();
      if (!manifest) return;
      const unmatchedByBrand = (brand: string) =>
        manifest.unmatchedRows
          .filter((row) => row.sourceFile.includes(brand))
          .map((row) => row.referenceRaw)
          .sort();

      expect(unmatchedByBrand("casio")).toEqual(
        [
          "DW-5000R-1A",
          "ECB-S10NIS-7A",
          "EFR-571MDC-1AV",
          "EFR-574DE-7AV",
          "EFS-S641TMS-1A",
          "EQB-1100YD-1A",
          "EQB-1100YDC-1A",
          "GA-2110SU-3A",
          "GA-B001AH-6A",
          "GM-110BB-1A",
          "GM-2100MWG-1A",
          "GW-B5600BC-1B",
          "GWF-A1000BRT-1A",
          "MWA-300H-1AVD",
        ].sort(),
      );
      expect(unmatchedByBrand("orient")).toEqual(
        [
          "RA-AK0803Y10B",
          "RE-AU0306L00B",
          "RE-AW0004S00B",
          "RE-AW0006S00B",
          "RE-ND0001S00B",
          "RE-ND0003S00B",
        ].sort(),
      );
      expect(unmatchedByBrand("tissot")).toEqual([]);
    });

    it("24. every real overlay entry belongs to one of the three integrated brands, and every specification value is a non-empty string", () => {
      const manifest = realOverlayManifest();
      if (!manifest) return;
      for (const entry of manifest.entries) {
        expect(["casio", "orient", "tissot"]).toContain(entry.brandSlug);
        for (const value of Object.values(entry.specifications)) {
          expect(typeof value).toBe("string");
          expect(value.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("25. the real manifest includes Tissot entries (the first brand to get this overlay)", () => {
      const manifest = realOverlayManifest();
      if (!manifest) return;
      const tissotEntries = manifest.entries.filter((entry) => entry.brandSlug === "tissot");
      expect(tissotEntries.length).toBeGreaterThan(0);
    });
  });

  describe("SEO overlay contract — never part of CatalogWatchDetail, always optional", () => {
    it("26. groupSiteImportOverlayByReference exposes SEO fields independently of specifications", () => {
      const manifest: CatalogSiteImportOverlayManifest = {
        generatedAt: new Date().toISOString(),
        sourceFiles: ["a.xlsx"],
        entries: [
          {
            catalogReference: "GA-700SK-1ADR",
            referenceNormalized: "GA700SK1ADR",
            brandSlug: "casio",
            specifications: {},
            seoTitle: null,
            metaDescription: "Meta",
            shortDescription: null,
            longDescription: "Long",
          },
        ],
        unmatchedRows: [],
      };
      const entry = groupSiteImportOverlayByReference(manifest).get("casio:GA700SK1ADR");
      expect(entry?.metaDescription).toBe("Meta");
      expect(entry?.longDescription).toBe("Long");
    });

    it("27. a reference absent from the overlay has no entry — callers must fall back, never receive fabricated SEO text", () => {
      const grouped = groupSiteImportOverlayByReference({
        generatedAt: new Date().toISOString(),
        sourceFiles: [],
        entries: [],
        unmatchedRows: [],
      });
      expect(grouped.get("casio:UNKNOWNREF")).toBeUndefined();
    });
  });

  describe("determinism", () => {
    it("28. building the real dataset with the real overlay manifest twice produces identical watch ordering", () => {
      const manifest = realOverlayManifest();
      const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
      const imagePlan = JSON.parse(
        readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
      ) as CatalogImageUploadPlan;
      const first = catalogReadDatasetFromPreview({ preview, imagePlan, siteImportOverlay: manifest });
      const second = catalogReadDatasetFromPreview({ preview, imagePlan, siteImportOverlay: manifest });
      expect(first.watches.map((w) => w.id)).toEqual(second.watches.map((w) => w.id));
    });
  });
});
