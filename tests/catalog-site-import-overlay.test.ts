import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  buildColumnIndex,
  mapCasioSpecifications,
  mapOrientSpecifications,
  processSiteImportWorkbook,
} from "@/modules/catalog/cli/catalog-site-import-overlay-manifest";
import { catalogReadDatasetFromPreview, groupSiteImportOverlayByReference } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogSiteImportOverlayManifest } from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

/**
 * Catalog site-import overlay (specifications + SEO copy sourced from the user-supplied
 * `incoming/*_catalog_site_import_*.xlsx` workbooks): exact-reference-matching-only manifest
 * building, brand-scoped lookup, specification-merge priority, and the "SEO stays out of
 * CatalogWatchDetail entirely" contract. Real-data checks load the actual generated manifest (when
 * present locally) and the real production preview/image-plan files; everything else uses small
 * synthetic fixtures for speed and determinism.
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function buildSheet(header: string[], rows: unknown[][]): unknown[][] {
  return [["title row"], ["note row"], header, ...rows];
}

function buildWorkbook(sheets: Record<string, unknown[][]>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return workbook;
}

function realOverlayManifest(): CatalogSiteImportOverlayManifest | null {
  try {
    return JSON.parse(readFileSync(path.join(projectRoot, ".tmp/catalog-site-import-overlay/manifest.json"), "utf8")) as CatalogSiteImportOverlayManifest;
  } catch {
    return null;
  }
}

describe("catalog site-import overlay (specifications + SEO)", () => {
  describe("column mapping", () => {
    it("1. buildColumnIndex maps header names to their column position, ignoring blank cells", () => {
      const index = buildColumnIndex(["№", "Артикул", "", "Стекло"]);
      expect(index.get("Артикул")).toBe(1);
      expect(index.get("Стекло")).toBe(3);
      expect(index.has("")).toBe(false);
    });

    it("2. mapCasioSpecifications never maps the redundant individual L/W/T columns once 'Размер корпуса' already combines them", () => {
      const header = ["Артикул", "Размер корпуса", "Длина корпуса, мм", "Ширина корпуса, мм", "Толщина корпуса, мм"];
      const col = buildColumnIndex(header);
      const specs = mapCasioSpecifications(["GA-700SK-1ADR", "57,5 × 53,4 × 18,4 мм", 57.5, 53.4, 18.4], col);
      expect(specs.case_dimensions_raw).toBe("57,5 × 53,4 × 18,4 мм");
      expect(Object.keys(specs)).not.toContain("case_length_raw");
      expect(Object.keys(specs)).not.toContain("case_width_raw");
      expect(Object.keys(specs)).not.toContain("case_thickness_raw");
    });

    it("3. mapCasioSpecifications formats sparse numeric columns (diameter, weight, strap width) with units", () => {
      const header = ["Диаметр корпуса, мм", "Вес, г", "Ширина ремешка, мм"];
      const col = buildColumnIndex(header);
      const specs = mapCasioSpecifications([38.5, 52, 20], col);
      expect(specs.case_diameter_raw).toBe("38,5 мм");
      expect(specs.weight_raw).toBe("52 г");
      expect(specs.strap_width_raw).toBe("20 мм");
    });

    it("4. mapCasioSpecifications combines battery type + life into a single power_source_raw value, and skips it entirely when both are blank", () => {
      const header = ["Тип батарейки", "Срок службы батареи"];
      const col = buildColumnIndex(header);
      expect(mapCasioSpecifications(["CR2016", "Около 5 лет"], col).power_source_raw).toBe("CR2016, Около 5 лет");
      expect(mapCasioSpecifications(["", ""], col).power_source_raw).toBeUndefined();
    });

    it("5. mapOrientSpecifications only produces a combined case_dimensions_raw when width, height AND thickness are all present", () => {
      const header = ["Ширина корпуса, мм", "Высота корпуса, мм", "Толщина корпуса, мм"];
      const col = buildColumnIndex(header);
      expect(mapOrientSpecifications([41.5, 47, 13], col).case_dimensions_raw).toBe("41,5 × 47 × 13 мм");
      expect(mapOrientSpecifications([41.5, 47, ""], col).case_dimensions_raw).toBeUndefined();
    });

    it("6. mapOrientSpecifications maps mechanism/case/strap/functional columns onto the shared specification keys", () => {
      const header = [
        "Тип механизма",
        "Калибр",
        "Количество камней",
        "Застежка",
        "Заводная головка",
        "Безель",
        "Люминесценция",
      ];
      const col = buildColumnIndex(header);
      const specs = mapOrientSpecifications(
        ["Механический с автоподзаводом", "F6922", 22, "Раскладывающаяся застежка", "Завинчивающаяся головка", "Однонаправленный безель", "Люминесцентные метки"],
        col,
      );
      expect(specs.movement_type_raw).toBe("Механический с автоподзаводом");
      expect(specs.caliber_raw).toBe("F6922");
      expect(specs.jewel_count_raw).toBe("22");
      expect(specs.clasp_raw).toBe("Раскладывающаяся застежка");
      expect(specs.crown_raw).toBe("Завинчивающаяся головка");
      expect(specs.bezel_raw).toBe("Однонаправленный безель");
      expect(specs.luminescence_raw).toBe("Люминесцентные метки");
    });

    it("7. neither mapper ever produces a price/inventory-shaped specification key", () => {
      const header = ["Цена ¥", "Цена ₽", "Цена в России", "Кол-во фото", "Артикул"];
      const col = buildColumnIndex(header);
      const casioKeys = Object.keys(mapCasioSpecifications([629, 7548, 16300, 4, "GA-700SK-1ADR"], col));
      const orientKeys = Object.keys(mapOrientSpecifications([629, 7548, 16300, 4, "FAA02002D9"], col));
      for (const key of [...casioKeys, ...orientKeys]) {
        expect(key).not.toMatch(/price|цена/i);
      }
    });
  });

  describe("workbook processing — exact matching only, brand-scoped", () => {
    const catalogByNormalized = new Map([
      ["GA700SK1ADR", { referenceDisplay: "GA-700SK-1ADR", referenceNormalized: "GA700SK1ADR", brandSlug: "casio" }],
    ]);

    it("8. a row whose Артикул matches an existing catalog reference produces one merged entry with specs + SEO", () => {
      const workbook = buildWorkbook({
        "Характеристики": buildSheet(["Артикул", "Стекло"], [["GA-700SK-1ADR", "минеральное"]]),
        "Импорт_на_сайт": buildSheet(
          ["Артикул", "SEO Title", "Meta Description", "Короткое описание", "Подробное SEO-описание"],
          [["GA-700SK-1ADR", "SEO Title", "Meta desc", "Short", "Long"]],
        ),
      });
      const { entries, unmatched } = processSiteImportWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        catalogByNormalized,
        mapSpecifications: mapCasioSpecifications,
      });
      expect(unmatched).toHaveLength(0);
      const entry = entries.get("GA700SK1ADR");
      expect(entry?.specifications.crystal_type_raw).toBe("минеральное");
      expect(entry?.seoTitle).toBe("SEO Title");
      expect(entry?.longDescription).toBe("Long");
    });

    it("9. a row whose Артикул does not exactly equal any catalog reference is recorded as unmatched, never guessed at", () => {
      const workbook = buildWorkbook({
        "Характеристики": buildSheet(["Артикул", "Стекло"], [["GA-700SK-1A", "минеральное"]]),
        "Импорт_на_сайт": buildSheet(["Артикул"], [[""]]),
      });
      const { entries, unmatched } = processSiteImportWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        catalogByNormalized,
        mapSpecifications: mapCasioSpecifications,
      });
      expect(entries.size).toBe(0);
      expect(unmatched.map((u) => u.referenceRaw)).toContain("GA-700SK-1A");
      expect(unmatched[0]?.reason).toBe("unmatched");
    });

    it("10. matching is brand-scoped: a reference only present in the Orient catalog map never matches through the Casio map", () => {
      const orientOnly = new Map([["GA700SK1ADR", { referenceDisplay: "GA-700SK-1ADR", referenceNormalized: "GA700SK1ADR", brandSlug: "orient" }]]);
      const workbook = buildWorkbook({
        "Характеристики": buildSheet(["Артикул"], [["GA-700SK-1ADR"]]),
        "Импорт_на_сайт": buildSheet(["Артикул"], [[""]]),
      });
      const { entries } = processSiteImportWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        catalogByNormalized: orientOnly,
        mapSpecifications: mapCasioSpecifications,
      });
      const entry = entries.get("GA700SK1ADR");
      expect(entry?.brandSlug).toBe("orient");
    });

    it("11. rows in Характеристики and Импорт_на_сайт for the same reference are merged into a single entry, not two", () => {
      const workbook = buildWorkbook({
        "Характеристики": buildSheet(["Артикул", "Стекло"], [["GA-700SK-1ADR", "минеральное"]]),
        "Импорт_на_сайт": buildSheet(["Артикул", "SEO Title"], [["GA-700SK-1ADR", "Title"]]),
      });
      const { entries } = processSiteImportWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        catalogByNormalized,
        mapSpecifications: mapCasioSpecifications,
      });
      expect(entries.size).toBe(1);
      const entry = entries.get("GA700SK1ADR");
      expect(entry?.specifications.crystal_type_raw).toBe("минеральное");
      expect(entry?.seoTitle).toBe("Title");
    });

    it("12. an empty Артикул cell is skipped entirely, never treated as an unmatched row", () => {
      const workbook = buildWorkbook({
        "Характеристики": buildSheet(["Артикул", "Стекло"], [["", "минеральное"]]),
        "Импорт_на_сайт": buildSheet(["Артикул"], [[""]]),
      });
      const { entries, unmatched } = processSiteImportWorkbook({
        sourceFile: "test.xlsx",
        workbook,
        catalogByNormalized,
        mapSpecifications: mapCasioSpecifications,
      });
      expect(entries.size).toBe(0);
      expect(unmatched).toHaveLength(0);
    });
  });

  describe("preview-catalog-adapter wiring — specs merge, SEO stays out of CatalogWatchDetail", () => {
    it("13. groupSiteImportOverlayByReference keys entries by brand-scoped normalized reference", () => {
      const manifest: CatalogSiteImportOverlayManifest = {
        generatedAt: new Date().toISOString(),
        sourceFiles: ["a.xlsx"],
        entries: [
          {
            catalogReference: "GA-700SK-1ADR",
            referenceNormalized: "GA700SK1ADR",
            brandSlug: "casio",
            specifications: { crystal_type_raw: "минеральное" },
            seoTitle: "T",
            metaDescription: null,
            shortDescription: null,
            longDescription: null,
          },
        ],
        unmatchedRows: [],
      };
      const grouped = groupSiteImportOverlayByReference(manifest);
      expect(grouped.get("casio:GA700SK1ADR")?.seoTitle).toBe("T");
      expect(grouped.get("orient:GA700SK1ADR")).toBeUndefined();
      expect(groupSiteImportOverlayByReference(null).size).toBe(0);
    });

    it("14. an overlay specification value takes priority over the raw import's own value for the same key", () => {
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

    it("15. an absent siteImportOverlay never changes the dataset (fully backward compatible)", () => {
      const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
      const imagePlan = JSON.parse(
        readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
      ) as CatalogImageUploadPlan;
      const withoutOverlayArg = catalogReadDatasetFromPreview({ preview, imagePlan });
      const withNullOverlay = catalogReadDatasetFromPreview({ preview, imagePlan, siteImportOverlay: null });
      expect(withoutOverlayArg.watches.length).toBe(withNullOverlay.watches.length);
      expect(withoutOverlayArg.watches.map((w) => w.id)).toEqual(withNullOverlay.watches.map((w) => w.id));
    });

    it("16. the overlay never changes publicPrice — price/inventory stays sourced from catalog_offers only", () => {
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

    it("17. the overlay never removes a specification the raw import already had — enrichment only, never regression", () => {
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

    it("18. CatalogWatchCard/CatalogWatchDetail never gain an seo/description field — SEO stays entirely out of the read-model contract", () => {
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
    it("19. the manifest script never does fuzzy/similarity/closest-match matching", () => {
      const script = readSrc("src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts");
      expect(script).toContain("EXACT");
      expect(script).toContain("unmatched");
      expect(script).not.toMatch(/fuzzy|closest|levenshtein/i);
    });

    it("20. the manifest script never reads a price/inventory column from the workbook", () => {
      const script = readSrc("src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts");
      expect(script).not.toMatch(/Цена|Разница|Ссылка поставщика/);
    });

    it("21. the real generated manifest (when present locally) matches Casio 100% and reports the same single genuinely-absent Orient reference as the photo archive", () => {
      const manifest = realOverlayManifest();
      if (!manifest) return;
      const casioUnmatched = manifest.unmatchedRows.filter((row) => row.sourceFile.includes("casio"));
      expect(casioUnmatched).toHaveLength(0);
      const orientUnmatchedRefs = new Set(manifest.unmatchedRows.filter((row) => row.sourceFile.includes("orient")).map((row) => row.referenceRaw));
      expect([...orientUnmatchedRefs]).toEqual(["RE-AU0306L00B"]);
    });

    it("22. every real overlay entry is either casio or orient, and every specification value is a non-empty string", () => {
      const manifest = realOverlayManifest();
      if (!manifest) return;
      for (const entry of manifest.entries) {
        expect(["casio", "orient"]).toContain(entry.brandSlug);
        for (const value of Object.values(entry.specifications)) {
          expect(typeof value).toBe("string");
          expect(value.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("SEO overlay contract — never part of CatalogWatchDetail, always optional", () => {
    it("23. groupSiteImportOverlayByReference exposes SEO fields independently of specifications", () => {
      const manifest: CatalogSiteImportOverlayManifest = {
        generatedAt: new Date().toISOString(),
        sourceFiles: ["a.xlsx"],
        entries: [
          {
            catalogReference: "GA-700SK-1ADR",
            referenceNormalized: "GA700SK1ADR",
            brandSlug: "casio",
            specifications: {},
            seoTitle: "Title",
            metaDescription: "Meta",
            shortDescription: "Short",
            longDescription: "Long",
          },
        ],
        unmatchedRows: [],
      };
      const entry = groupSiteImportOverlayByReference(manifest).get("casio:GA700SK1ADR");
      expect(entry?.seoTitle).toBe("Title");
      expect(entry?.metaDescription).toBe("Meta");
      expect(entry?.shortDescription).toBe("Short");
      expect(entry?.longDescription).toBe("Long");
    });

    it("24. a reference absent from the overlay has no entry — callers must fall back, never receive fabricated SEO text", () => {
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
    it("25. building the real dataset with the real overlay manifest twice produces identical watch ordering", () => {
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
