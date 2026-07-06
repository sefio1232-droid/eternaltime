import { describe, expect, it } from "vitest";
import { normalizeCharacteristicKey, parseCharacteristics } from "@/modules/imports/catalog/domain/characteristics";

describe("catalog import quality normalization", () => {
  it("canonicalizes characteristic keys through explicit aliases", () => {
    expect(normalizeCharacteristicKey("Диаметр корпуса")).toBe("диаметркорпуса");
    expect(normalizeCharacteristicKey("диаметр_корпуса")).toBe("диаметркорпуса");
    expect(normalizeCharacteristicKey("Диаметр-корпуса")).toBe("диаметркорпуса");
  });

  it("maps controlled Russian characteristic aliases", () => {
    const parsed = parseCharacteristics(
      "водонепроницаемость: 100 м | диаметр_корпуса: 40 мм | материал корпуса: сталь | тип механизма: кварцевый | форма корпуса: круглая",
    );

    expect(parsed.find((item) => item.normalizedKey === "водонепроницаемость")?.targetField).toBe("water_resistance_raw");
    expect(parsed.find((item) => item.normalizedKey === "диаметркорпуса")?.targetField).toBe("case_diameter_raw");
    expect(parsed.find((item) => item.normalizedKey === "материалкорпуса")?.targetField).toBe("case_material_raw");
    expect(parsed.find((item) => item.normalizedKey === "типмеханизма")?.targetField).toBe("movement_type_raw");
    expect(parsed.find((item) => item.normalizedKey === "формакорпуса")?.targetField).toBe("case_shape_raw");
  });

  it("keeps identity metadata out of arbitrary attribute parsing", () => {
    const parsed = parseCharacteristics("Артикул: A158WA-1DF | Бренд: Casio | Серия: Vintage");

    expect(parsed.map((item) => item.destination)).toEqual(["source_metadata", "source_metadata", "source_metadata"]);
    expect(parsed.map((item) => item.targetField)).toEqual(["manufacturerReference", "brand", "brandCollection"]);
  });
});
