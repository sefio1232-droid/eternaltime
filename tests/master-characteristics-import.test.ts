import { describe, expect, it } from "vitest";
import { classifyCatalogFacets, normalizeCaseSizeGroup, normalizeCaseSizeMm } from "@/modules/catalog/application/catalog-filter-taxonomy";
import { getCatalogWatchByRoute } from "@/modules/catalog/application/catalog-read-service";
import { buildComparisonPresentation } from "@/modules/comparison/application/comparison-presentation";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import {
  applyMasterPatchToWatch,
  buildMasterImportPatches,
  buildMasterSpecifications,
  countProhibitedSpecifications,
  parseMasterWorkbook,
  type MasterBrandSlug,
} from "@/modules/imports/catalog/application/master-characteristics-import";

const orientWorkbookPath = "C:/Users/Sergey/Downloads/EternalTime_Orient_MASTER_FINAL_v2 (1).xlsx";
const citizenWorkbookPath = "C:/Users/Sergey/Downloads/EternalTime_Citizen_MASTER_FINAL.xlsx";
const tissotWorkbookPath = "C:/Users/Sergey/Downloads/EternalTime_Tissot_MASTER_FINAL_160.xlsx";
const casioWorkbookPath = "C:/Users/Sergey/Downloads/EternalTime_Casio_MASTER_FINAL_215 (1).xlsx";
const seikoWorkbookPath = "C:/Users/Sergey/Downloads/EternalTime_Seiko_MASTER_FINAL_73 (1).xlsx";

const masterSources: Array<{ brandSlug: MasterBrandSlug; sourceFile: string; expectedRows: number }> = [
  { brandSlug: "orient", sourceFile: orientWorkbookPath, expectedRows: 82 },
  { brandSlug: "citizen", sourceFile: citizenWorkbookPath, expectedRows: 25 },
  { brandSlug: "tissot", sourceFile: tissotWorkbookPath, expectedRows: 160 },
  { brandSlug: "casio", sourceFile: casioWorkbookPath, expectedRows: 215 },
  { brandSlug: "seiko", sourceFile: seikoWorkbookPath, expectedRows: 73 },
];

function watch(input: Partial<CatalogWatchDetail> = {}): CatalogWatchDetail {
  return {
    id: "citizen/aw181859l",
    href: "/watches/citizen/aw181859l",
    brandName: "Citizen",
    brandSlug: "citizen",
    title: "Citizen AW1818-59L",
    officialName: null,
    referenceDisplay: "AW1818-59L",
    referenceNormalized: "AW181859L",
    referenceSlug: "aw181859l",
    brandCollectionName: null,
    brandLineName: null,
    watchModelName: "Eco-Drive",
    publicPrice: { amountMinor: 1710000, currencyCode: "RUB" },
    primaryImage: { kind: "none", alt: "missing" },
    imageGallery: [],
    keySpecifications: [],
    specifications: [],
    siblingReferences: [],
    ...input,
  };
}

describe("MASTER characteristics import — 5 brand scope", () => {
  it("parses the exact scoped MASTER files without duplicates", () => {
    for (const source of masterSources) {
      const workbook = parseMasterWorkbook({ brandSlug: source.brandSlug, sourceFile: source.sourceFile });

      expect(workbook.products, source.brandSlug).toHaveLength(source.expectedRows);
      expect(new Set(workbook.products.map((row) => row.referenceNormalized)).size, source.brandSlug).toBe(source.expectedRows);
      expect(workbook.warnings, source.brandSlug).toEqual([]);
    }
  });

  it("normalizes the Orient P0 reference correction without creating a duplicate route", () => {
    const orient = parseMasterWorkbook({ brandSlug: "orient", sourceFile: orientWorkbookPath });
    const patches = buildMasterImportPatches([orient]);
    const corrected = patches.find((patch) => patch.referenceNormalized === "RAAK0803Y10B");

    expect(corrected).toBeDefined();
    expect(corrected?.lookupReferenceNormalized).toBe("RAAK0803S10B");
    expect(corrected?.lookupReferenceNormalizedCandidates).toContain("RAAK0803S10B");
    expect(corrected?.referenceSlug).toBe("raak0803y10b");

    const patchedWatch = applyMasterPatchToWatch(
      watch({
        id: "orient/raak0803s10b",
        href: "/watches/orient/raak0803s10b",
        brandName: "Orient",
        brandSlug: "orient",
        referenceDisplay: "RA-AK0803S10B",
        referenceNormalized: "RAAK0803S10B",
        referenceSlug: "raak0803s10b",
      }),
      corrected!,
    );
    const dataset: CatalogReadDataset = {
      source: "database",
      generatedAt: new Date(0).toISOString(),
      brands: [{ name: "Orient", slug: "orient", watchCount: 1 }],
      watches: [patchedWatch],
    };

    expect(getCatalogWatchByRoute(dataset, { brandSlug: "orient", referenceSlug: "raak0803s10b" })?.referenceSlug).toBe("raak0803y10b");
    expect(getCatalogWatchByRoute(dataset, { brandSlug: "orient", referenceSlug: "raak0803y10b" })?.referenceNormalized).toBe("RAAK0803Y10B");
  });

  it("matches Casio reference_live corrections while keeping the MASTER canonical reference", () => {
    const casio = parseMasterWorkbook({ brandSlug: "casio", sourceFile: casioWorkbookPath });
    const patches = buildMasterImportPatches([casio]);
    const corrected = patches.find((patch) => patch.referenceNormalized === "MWA300H1AVD");

    expect(corrected).toBeDefined();
    expect(corrected?.lookupReferenceNormalizedCandidates).toContain("NWA300H1AVD");
    expect(corrected?.referenceDisplay).toBe("MWA-300H-1AVD");
    expect(corrected?.referenceSlug).toBe("mwa300h1avd");
  });

  it("maps Citizen Eco-Drive as solar, not quartz/unknown", () => {
    const citizen = parseMasterWorkbook({ brandSlug: "citizen", sourceFile: citizenWorkbookPath });
    const product = citizen.products.find((row) => row.referenceNormalized === "AW181859L");
    const specifications = buildMasterSpecifications({ product: product!, functions: citizen.functions });
    const facets = classifyCatalogFacets(watch({ specifications }));

    expect(specifications.find((spec) => spec.key === "movement_type_raw")?.value).toContain("Eco-Drive");
    expect(specifications.find((spec) => spec.key === "power_reserve_raw")).toBeUndefined();
    expect(facets.movement).toBe("solar");
  });

  it("keeps mechanical power reserve separate from solar full-charge runtime", () => {
    const citizen = parseMasterWorkbook({ brandSlug: "citizen", sourceFile: citizenWorkbookPath });
    const mechanical = citizen.products.find((row) => row.referenceNormalized === "NJ021005E");
    const solar = citizen.products.find((row) => row.referenceNormalized === "AW181859L");
    const mechanicalSpecs = buildMasterSpecifications({ product: mechanical!, functions: citizen.functions });
    const solarSpecs = buildMasterSpecifications({ product: solar!, functions: citizen.functions });

    expect(mechanicalSpecs.find((spec) => spec.key === "power_reserve_raw")?.value).toContain("40");
    expect(mechanicalSpecs.find((spec) => spec.key === "full_charge_runtime_raw")).toBeUndefined();
    expect(solarSpecs.find((spec) => spec.key === "power_reserve_raw")).toBeUndefined();
  });

  it("imports Casio battery life as its own non-mechanical characteristic", () => {
    const casio = parseMasterWorkbook({ brandSlug: "casio", sourceFile: casioWorkbookPath });
    const product = casio.products.find((row) => row.referenceNormalized === "A158WA1DF");
    const specifications = buildMasterSpecifications({ product: product!, functions: casio.functions });

    expect(specifications.find((spec) => spec.key === "battery_life_raw")?.value).toContain("лет");
    expect(specifications.find((spec) => spec.key === "power_reserve_raw")).toBeUndefined();
  });

  it("uses MASTER size boundaries and only width/diameter for size classification", () => {
    expect(normalizeCaseSizeGroup(37.99)).toBe("compact");
    expect(normalizeCaseSizeGroup(38)).toBe("medium");
    expect(normalizeCaseSizeGroup(42)).toBe("medium");
    expect(normalizeCaseSizeGroup(42.01)).toBe("large");
    expect(normalizeCaseSizeMm(watch({ specifications: [{ key: "case_dimensions_raw", label: "Размер", value: "40 × 46 × 12 мм", group: "dimensions" }] }))).toBeNull();
    expect(normalizeCaseSizeMm(watch({ specifications: [{ key: "case_width_raw", label: "Ширина", value: "37,5 мм", group: "dimensions" }] }))).toBe(37.5);
  });

  it("feeds dial, crystal, band, water resistance, compare and selection facets from the same public specs", () => {
    const citizen = parseMasterWorkbook({ brandSlug: "citizen", sourceFile: citizenWorkbookPath });
    const product = citizen.products.find((row) => row.referenceNormalized === "NJ021005E");
    const specifications = buildMasterSpecifications({ product: product!, functions: citizen.functions });
    const publicWatch = watch({ referenceNormalized: "NJ021005E", referenceSlug: "nj021005e", referenceDisplay: "NJ0210-05E", specifications });
    const facets = classifyCatalogFacets(publicWatch);
    const comparison = buildComparisonPresentation([publicWatch]);

    expect(facets.dialColor).toBe("black");
    expect(facets.crystal).toBe("mineral");
    expect(facets.strapMaterial).toBe("leather");
    expect(facets.waterResistance).toBe("50m");
    expect(comparison.rows.find((row) => row.key === "case-size")?.values[0]?.unknown).toBe(false);
    expect(comparison.rows.find((row) => row.key === "case-thickness")?.values[0]?.unknown).toBe(false);
  });

  it("does not emit case/band/strap/bracelet color or visual_positioning public characteristics", () => {
    const workbooks = masterSources.map((source) =>
      parseMasterWorkbook({ brandSlug: source.brandSlug, sourceFile: source.sourceFile }),
    );
    const patches = buildMasterImportPatches(workbooks);

    expect(patches.reduce((sum, patch) => sum + countProhibitedSpecifications(patch.specifications), 0)).toBe(0);
  });

  it("keeps MASTER SEO separate from prices and out of CatalogWatchDetail", () => {
    const tissot = parseMasterWorkbook({ brandSlug: "tissot", sourceFile: tissotWorkbookPath });
    const patch = buildMasterImportPatches([tissot]).find((row) => row.referenceNormalized === "T0062071103601")!;
    const after = applyMasterPatchToWatch(watch({ brandName: "Tissot", brandSlug: "tissot" }), patch);

    expect(patch.seo?.title).toContain("Tissot");
    expect(patch.seo?.metaDescription).toBeTruthy();
    expect(patch.seo?.overview).toBeTruthy();
    expect("seoOverlay" in after).toBe(false);
    expect(after.publicPrice).toEqual({ amountMinor: 1710000, currencyCode: "RUB" });
  });

  it("does not modify existing commercial price snapshots when applying a characteristics patch", () => {
    const citizen = parseMasterWorkbook({ brandSlug: "citizen", sourceFile: citizenWorkbookPath });
    const patch = buildMasterImportPatches([citizen]).find((row) => row.referenceNormalized === "AW181859L")!;
    const before = watch({ publicPrice: { amountMinor: 1710000, currencyCode: "RUB" } });
    const after = applyMasterPatchToWatch(before, patch);

    expect(after.publicPrice).toEqual(before.publicPrice);
  });
});
