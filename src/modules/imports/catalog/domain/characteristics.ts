import type { CharacteristicDestination, ParsedCharacteristic } from "./types";

type CharacteristicMapping = {
  normalizedKey: string;
  destination: CharacteristicDestination;
  targetField: string;
};

const characteristicMappings: CharacteristicMapping[] = [
  { normalizedKey: "размер", destination: "first_class_catalog_field", targetField: "case_dimensions_raw" },
  { normalizedKey: "вес", destination: "first_class_catalog_field", targetField: "weight_raw" },
  { normalizedKey: "корпус/безель", destination: "normalized_catalog_dimension", targetField: "case_material_raw" },
  { normalizedKey: "корпус", destination: "normalized_catalog_dimension", targetField: "case_material_raw" },
  {
    normalizedKey: "ремешок/браслет",
    destination: "normalized_catalog_dimension",
    targetField: "attachment_material_raw",
  },
  {
    normalizedKey: "браслет/ремешок",
    destination: "normalized_catalog_dimension",
    targetField: "attachment_material_raw",
  },
  { normalizedKey: "браслет", destination: "normalized_catalog_dimension", targetField: "bracelet_material_raw" },
  { normalizedKey: "ремешок", destination: "normalized_catalog_dimension", targetField: "strap_material_raw" },
  { normalizedKey: "стекло", destination: "normalized_catalog_dimension", targetField: "crystal_type_raw" },
  { normalizedKey: "водозащита", destination: "first_class_catalog_field", targetField: "water_resistance_raw" },
  { normalizedKey: "питание", destination: "controlled_extensible_attribute", targetField: "power_source_raw" },
  { normalizedKey: "механизм", destination: "first_class_catalog_field", targetField: "movement_raw" },
  { normalizedKey: "функции", destination: "controlled_extensible_attribute", targetField: "functions_raw" },
  { normalizedKey: "циферблат", destination: "normalized_catalog_dimension", targetField: "dial_raw" },
  { normalizedKey: "странабренда", destination: "first_class_catalog_field", targetField: "brand_country_raw" },
  { normalizedKey: "тип", destination: "normalized_catalog_dimension", targetField: "watch_type_raw" },
];

export function normalizeCharacteristicKey(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[\s:;.,]+/g, "");
}

export function parseCharacteristics(rawCharacteristics: string): ParsedCharacteristic[] {
  return rawCharacteristics
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const separatorIndex = segment.indexOf(":");
      const rawKey = separatorIndex >= 0 ? segment.slice(0, separatorIndex).trim() : segment.trim();
      const rawValue = separatorIndex >= 0 ? segment.slice(separatorIndex + 1).trim() : "";
      const normalizedKey = normalizeCharacteristicKey(rawKey);
      const mapping = characteristicMappings.find((candidate) => candidate.normalizedKey === normalizedKey);

      return {
        rawKey,
        rawValue,
        normalizedKey,
        destination: mapping?.destination ?? "unresolved_import_attribute",
        targetField: mapping?.targetField ?? null,
        resolved: Boolean(mapping),
      };
    });
}
