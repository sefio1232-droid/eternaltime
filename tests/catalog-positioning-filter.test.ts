import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import { normalizeCatalogGender } from "@/modules/catalog/application/catalog-filter-taxonomy";
import { normalizePositioningGroup, positioningGroupLabels, positioningGroupOrder } from "@/modules/catalog/application/catalog-positioning-taxonomy";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

/**
 * Positioning filter (docs/CATALOG_SHOWROOM_RECOVERY.md "Positioning filter") — never inferred from
 * diameter/color/price/visual style, only from the explicit `watch_type_raw` source field.
 */

const projectRoot = path.resolve(__dirname, "..");

function realDataset(): CatalogReadDataset {
  const preview = JSON.parse(readFileSync(path.join(projectRoot, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
  const imagePlan = JSON.parse(
    readFileSync(path.join(projectRoot, "imports/generated/catalog-image-upload-plan.json"), "utf8"),
  ) as CatalogImageUploadPlan;
  return catalogReadDatasetFromPreview({ preview, imagePlan });
}

describe("positioning taxonomy", () => {
  it("1. never returns null — unknown is itself a real, explicit value", () => {
    expect(normalizePositioningGroup(null)).toBe("unknown");
    expect(normalizePositioningGroup(undefined)).toBe("unknown");
    expect(normalizePositioningGroup("")).toBe("unknown");
  });

  it("2. a hedged combined value (мужские / унисекс) maps to the inclusive unisex bucket, never asserted as male-only", () => {
    expect(normalizePositioningGroup("мужские / унисекс")).toBe("unisex");
  });

  it("3. a couple/paired-set value maps to unknown rather than being split apart", () => {
    expect(normalizePositioningGroup("парный комплект")).toBe("unknown");
  });

  it("4. an explicit female value maps to female", () => {
    expect(normalizePositioningGroup("женские")).toBe("female");
  });

  it("5. an unrecognized value maps to unknown, never thrown or guessed", () => {
    expect(normalizePositioningGroup("нечто странное")).toBe("unknown");
  });

  it("6. every label in positioningGroupOrder has a corresponding entry in positioningGroupLabels", () => {
    for (const group of positioningGroupOrder) {
      expect(positioningGroupLabels[group]).toBeTruthy();
    }
  });

  describe("real catalog coverage", () => {
    it("7. every real watch classifies into exactly one of the four declared groups", () => {
      const dataset = realDataset();
      for (const watch of dataset.watches) {
        const spec = watch.specifications.find((s) => s.key === "watch_type_raw");
        const group = normalizePositioningGroup(spec?.value ?? null);
        expect(positioningGroupOrder).toContain(group);
      }
    });

    it("8. non-Tissot brands have zero positioning coverage today (honest, not hidden) — asserts the real number so a future data change is caught, not silently masked", () => {
      const dataset = realDataset();
      const nonTissotWithData = dataset.watches.filter(
        (w) => w.brandSlug !== "tissot" && w.specifications.some((s) => s.key === "watch_type_raw"),
      );
      expect(nonTissotWithData).toHaveLength(0);
    });

    it("9. legacy positioning=female is parsed as the new customer-facing gender filter", () => {
      const dataset = realDataset();
      const filtered = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all", positioning: "female" } }));
      expect(filtered.totalRecords).toBeGreaterThan(0);
      expect(filtered.totalRecords).toBeLessThan(dataset.watches.length);
      for (const item of filtered.items) {
        const full = dataset.watches.find((w) => w.id === item.id)!;
        expect(normalizeCatalogGender(full).gender).toBe("female");
      }
    });

    it("10. unknown/unclassified positioning is not exposed as a public gender filter", () => {
      const dataset = realDataset();
      const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
      expect(result.facets.genders.some((option) => option.value === "unknown")).toBe(false);
    });

    it("11. positioning facet counts sum to the full unfiltered record count", () => {
      const dataset = realDataset();
      const result = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
      const total = result.facets.positioning.reduce((sum, option) => sum + option.count, 0);
      expect(total).toBe(dataset.watches.length);
    });

    it("12. removing the gender filter via URL (gender absent) returns the full catalog again", () => {
      const dataset = realDataset();
      const withFilter = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all", gender: "female" } }));
      const withoutFilter = listCatalogWatches(dataset, parseCatalogReadQuery({ searchParams: { view: "all" } }));
      expect(withFilter.totalRecords).toBeLessThan(withoutFilter.totalRecords);
      expect(withoutFilter.totalRecords).toBe(dataset.watches.length);
    });
  });
});
