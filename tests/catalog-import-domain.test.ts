import { describe, expect, it } from "vitest";
import { parseCharacteristics } from "@/modules/imports/catalog/domain/characteristics";
import { normalizeHeader } from "@/modules/imports/catalog/domain/headers";
import { findMatchingZipEntry, imageCandidateFromSource } from "@/modules/imports/catalog/domain/images";
import { buildStagedPricing, priceSourceFromField } from "@/modules/imports/catalog/domain/pricing";
import { validateManufacturerReference } from "@/modules/imports/catalog/domain/references";
import type { SourceProvenance } from "@/modules/imports/catalog/domain/types";

const provenance: SourceProvenance = {
  sourceFile: "fixture.xlsx",
  sourceType: "main_catalog_workbook",
  workbook: "fixture.xlsx",
  sheet: "Casio",
  rowNumber: 2,
};

describe("catalog import domain rules", () => {
  it("normalizes headers without depending on position, spaces, or case", () => {
    expect(normalizeHeader(" Цена ₽ (¥×12) ")).toBe("цена₽¥x12");
    expect(normalizeHeader("Подробное SEO-описание")).toBe("подробноеseoописание");
    expect(normalizeHeader(" ФОТО 1 ")).toBe("фото1");
  });

  it("parses known characteristics and preserves unknown keys", () => {
    const parsed = parseCharacteristics(
      "Размер: 40 мм | вес: 120 г | корпус/безель: сталь | Стекло: сапфир | странный ключ: значение",
    );

    expect(parsed.find((item) => item.rawKey === "Размер")?.targetField).toBe("case_dimensions_raw");
    expect(parsed.find((item) => item.rawKey === "вес")?.targetField).toBe("weight_raw");
    expect(parsed.find((item) => item.rawKey === "корпус/безель")?.destination).toBe("normalized_catalog_dimension");
    expect(parsed.find((item) => item.rawKey === "Стекло")?.targetField).toBe("crystal_type_raw");
    expect(parsed.find((item) => item.rawKey === "странный ключ")?.destination).toBe("unresolved_import_attribute");
  });

  it("uses existing manufacturer reference normalization and flags suspicious values", () => {
    expect(validateManufacturerReference("T137.407.11.041.00", provenance).normalized).toBe("T1374071104100");

    const suspicious = validateManufacturerReference("7", provenance);
    expect(suspicious.suspicious).toBe(true);
    expect(suspicious.issues[0]?.code).toBe("suspicious_reference");
  });

  it("selects maximum valid RUB price and preserves internal source prices", () => {
    const fields = [
      ["Цена ₽ (¥×12)", "44 000 ₽"],
      ["Цена в России", "67 000 ₽"],
      ["Цена на сайте", "59 000 ₽"],
      ["Цена ¥", "3 100"],
      ["Разница", "23 000"],
      ["Цена ₽", "not valid"],
    ] as const;
    const sources = fields
      .map(([rawFieldName, rawValue]) =>
        priceSourceFromField({
          rawFieldName,
          rawValue,
          sourcePackage: "fixture.xlsx",
          provenance: { ...provenance, rawColumn: rawFieldName, rawValue },
        }),
      )
      .filter((source) => source !== null);
    const pricing = buildStagedPricing(sources);

    expect(pricing.publicPriceCandidate).toEqual({ amountMinor: 6700000, currencyCode: "RUB" });
    expect(pricing.rubPriceSources).toHaveLength(3);
    expect(pricing.nonRubPriceSources.map((source) => source.currency)).toEqual(["CNY"]);
    expect(pricing.internalAnalyticalValues.some((source) => source.rawFieldName === "Разница")).toBe(true);
    expect(pricing.allSources.find((source) => source.rawFieldName === "Цена ₽")?.validationState).toBe("invalid");
  });

  it("returns no public price candidate when no valid RUB source exists", () => {
    const cny = priceSourceFromField({
      rawFieldName: "Цена ¥",
      rawValue: "500",
      sourcePackage: "fixture.xlsx",
      provenance,
    });
    const difference = priceSourceFromField({
      rawFieldName: "Разница",
      rawValue: "1000",
      sourcePackage: "fixture.xlsx",
      provenance,
    });
    const pricing = buildStagedPricing([cny, difference].filter((source) => source !== null));

    expect(pricing.publicPriceCandidate).toBeNull();
    expect(pricing.rubPriceSources).toHaveLength(0);
  });

  it("matches local ZIP image paths and reports broken paths", () => {
    const zipEntries = ["root/images/Casio/A158WA-1DF/A158WA-1DF_1.webp"];
    expect(findMatchingZipEntry("images\\Casio\\A158WA-1DF\\A158WA-1DF_1.webp", zipEntries)).toBe(zipEntries[0]);

    const broken = imageCandidateFromSource({
      sourcePackage: "fixture.zip",
      sourceType: "orient_package",
      rawImageSource: "images/Orient/AAA/missing.webp",
      ordering: 1,
      zipEntries: [],
      provenance,
    });

    expect(broken.candidate?.status).toBe("broken");
    expect(broken.issue?.code).toBe("broken_image_source");
  });
});
