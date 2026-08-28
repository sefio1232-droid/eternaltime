import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogQueryHref, catalogQueryToSearchParams, parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { listCatalogWatches } from "@/modules/catalog/application/catalog-read-service";
import {
  classifyCatalogFacets,
  normalizeCatalogGender,
  normalizeDialColorGroup,
} from "@/modules/catalog/application/catalog-filter-taxonomy";
import { normalizeMechanismGroup } from "@/modules/catalog/application/catalog-mechanism-taxonomy";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const projectRoot = path.resolve(__dirname, "..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8")) as T;
}

function realDataset(): CatalogReadDataset {
  return catalogReadDatasetFromPreview({
    preview: readJson<CatalogImportPreview>("imports/generated/catalog-import-preview.json"),
    imagePlan: readJson<CatalogImageUploadPlan>("imports/generated/catalog-image-upload-plan.json"),
  });
}

function allResults(dataset: CatalogReadDataset, searchParams: Record<string, string>) {
  return listCatalogWatches(dataset, {
    ...parseCatalogReadQuery({ searchParams: { view: "all", ...searchParams } }),
    pageSize: dataset.watches.length,
  });
}

describe("urgent catalog discoverability filters", () => {
  it("exposes every current public brand in facets, including Seiko with the real 73-model count", () => {
    const result = allResults(realDataset(), {});
    expect(result.totalRecords).toBe(620);
    expect(result.facets.brands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "casio", label: "Casio", count: 222 }),
        expect.objectContaining({ value: "citizen", label: "Citizen", count: 25 }),
        expect.objectContaining({ value: "orient", label: "Orient", count: 82 }),
        expect.objectContaining({ value: "seiko", label: "Seiko", count: 73 }),
        expect.objectContaining({ value: "tissot", label: "Tissot", count: 218 }),
      ]),
    );
  });

  it("does not cap catalog brand tabs at the old four-brand surface", () => {
    const tabs = readFileSync(path.join(projectRoot, "src/components/catalog/catalog-tabs.tsx"), "utf8");
    expect(tabs).toContain('"seiko"');
    expect(tabs).not.toContain(".slice(0, 4)");
  });

  it("brand=seiko returns all 73 Seiko Women references", () => {
    const result = allResults(realDataset(), { brand: "seiko" });
    expect(result.totalRecords).toBe(73);
    expect(new Set(result.items.map((watch) => watch.brandSlug))).toEqual(new Set(["seiko"]));
  });

  it("search finds Seiko by brand and by punctuated reference", () => {
    const dataset = realDataset();
    expect(allResults(dataset, { q: "Seiko" }).totalRecords).toBe(73);
    const byReference = allResults(dataset, { q: "SRPL61J1" });
    expect(byReference.totalRecords).toBe(1);
    expect(byReference.items[0]?.referenceNormalized).toBe("SRPL61J1");
  });

  it("implements the public gender filter from reliable provenance, not from diameter", () => {
    const dataset = realDataset();
    const seiko = dataset.watches.filter((watch) => watch.brandSlug === "seiko");
    expect(seiko).toHaveLength(73);
    expect(seiko.every((watch) => normalizeCatalogGender(watch).gender === "female")).toBe(true);
    expect(seiko.every((watch) => normalizeCatalogGender(watch).genderProvenance === "source_category:seiko_women")).toBe(true);

    const result = allResults(dataset, { gender: "female" });
    expect(result.facets.genders.some((option) => option.value === "unknown")).toBe(false);
    expect(result.totalRecords).toBeGreaterThanOrEqual(73);
  });

  it("Seiko + Women composes to the exact Seiko Women dataset", () => {
    const result = allResults(realDataset(), { brand: "seiko", gender: "female" });
    expect(result.totalRecords).toBe(73);
    expect(result.items.every((watch) => watch.brandSlug === "seiko")).toBe(true);
  });

  it("compact size remains a separate watch-size facet and is not treated as a synonym for women", () => {
    const dataset = realDataset();
    const compact = allResults(dataset, { size: "compact" });
    const women = allResults(dataset, { gender: "female" });
    expect(compact.totalRecords).toBeGreaterThan(0);
    expect(women.totalRecords).toBeGreaterThan(0);
    expect(compact.totalRecords).not.toBe(women.totalRecords);
  });

  it("Seiko blue dial and compact filters compose without using image-pixel guesses", () => {
    const dataset = realDataset();
    const result = allResults(dataset, { brand: "seiko", gender: "female", dialColor: "blue", size: "compact" });
    expect(result.totalRecords).toBeGreaterThan(0);
    for (const item of result.items) {
      const full = dataset.watches.find((watch) => watch.id === item.id)!;
      const facets = classifyCatalogFacets(full);
      expect(facets.gender).toBe("female");
      expect(facets.caseSize).toBe("compact");
      expect(facets.dialColor).toBe("blue");
    }
  });

  it("uses public RUB price for Seiko filtering and never exposes purchase/CNY/margin fields", () => {
    const result = allResults(realDataset(), { brand: "seiko", priceMin: "50000", priceMax: "65000" });
    expect(result.totalRecords).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.publicPrice?.currencyCode).toBe("RUB");
      expect(item.publicPrice?.amountMinor).toBeGreaterThanOrEqual(5_000_000);
      expect(item.publicPrice?.amountMinor).toBeLessThanOrEqual(6_500_000);
      expect(JSON.stringify(item)).not.toMatch(/CNY|юан|закуп|разница|margin/i);
    }
  });

  it("normalizes English Seiko movement values into public movement groups", () => {
    expect(normalizeMechanismGroup("Automatic")).toBe("automatic");
    expect(normalizeMechanismGroup("Quartz")).toBe("quartz");
    expect(normalizeMechanismGroup("Solar radio")).toBe("solar");
    expect(allResults(realDataset(), { brand: "seiko", movement: "solar" }).totalRecords).toBe(32);
  });

  it("normalizes Seiko dial colors into accessible public color families", () => {
    expect(normalizeDialColorGroup("Dark blue")).toBe("blue");
    expect(normalizeDialColorGroup("Ice blue")).toBe("light_blue");
    expect(normalizeDialColorGroup("Mother-of-pearl / gold")).toBe("mother_of_pearl");
    expect(allResults(realDataset(), { brand: "seiko", dialColor: "blue" }).totalRecords).toBeGreaterThan(0);
  });

  it("search, filter, sort, and pagination URL state stay composable and reload-safe", () => {
    const dataset = realDataset();
    const query = parseCatalogReadQuery({
      searchParams: { view: "all", q: "Seiko", gender: "female", sort: "price_asc", page: "4" },
    });
    const result = listCatalogWatches(dataset, { ...query, pageSize: 24 });
    expect(result.totalRecords).toBe(73);
    expect(result.page).toBe(4);
    const prices = result.items.flatMap((watch) => (watch.publicPrice ? [watch.publicPrice.amountMinor] : []));
    expect(prices).toEqual([...prices].sort((left, right) => left - right));

    expect(catalogQueryToSearchParams(query).get("gender")).toBe("female");
    expect(catalogQueryHref("/watches", query, { caseSize: "compact", page: 1 })).not.toContain("page=");
  });

  it("invalid filter params fail gracefully without duplicate models", () => {
    const result = allResults(realDataset(), { brand: "seiko", gender: "not-real", dialColor: "not-real" });
    expect(result.totalRecords).toBe(0);
    expect(new Set(result.items.map((watch) => watch.id)).size).toBe(result.items.length);
  });
});
