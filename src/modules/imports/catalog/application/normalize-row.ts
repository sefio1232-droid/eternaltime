import { mapCatalogHeader } from "../domain/headers";
import { parseCharacteristics } from "../domain/characteristics";
import {
  imageCandidateFromSource,
  imageCandidatesFromZipEntries,
  isImagePathLike,
  markPrimaryImageCandidate,
} from "../domain/images";
import { priceSourceFromField, buildStagedPricing } from "../domain/pricing";
import { validateManufacturerReference, normalizedBrandKey } from "../domain/references";
import { normalizeComparableText, tryNormalizeReferenceText } from "../domain/text-normalization";
import type {
  CatalogSourceType,
  FieldValue,
  ImageCandidate,
  NormalizedCatalogRow,
  ParsedCharacteristic,
  RawCatalogRow,
  SourceProvenance,
  ValidationIssue,
} from "../domain/types";

const sourceTypeBrand: Partial<Record<CatalogSourceType, string>> = {
  casio_package: "Casio",
  tissot_package: "Tissot",
  orient_package: "Orient",
};

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.normalize("NFKC").trim() ?? "";
  return trimmed ? trimmed : null;
}

function provenanceFor(row: RawCatalogRow, rawColumn: string, rawValue: string, normalizedValue?: string): SourceProvenance {
  return {
    sourceFile: row.sourceFile,
    sourceType: row.sourceType,
    workbook: row.workbook,
    sheet: row.sheet,
    rowNumber: row.rowNumber,
    rawColumn,
    rawValue,
    normalizedValue,
  };
}

function firstFieldValue(row: RawCatalogRow, canonicalField: ReturnType<typeof mapCatalogHeader>): FieldValue | null {
  if (canonicalField === null) {
    return null;
  }

  for (const [rawColumn, rawValue] of Object.entries(row.values)) {
    if (mapCatalogHeader(rawColumn) !== canonicalField) {
      continue;
    }

    const value = trimToNull(rawValue);

    if (value) {
      return {
        value,
        provenance: provenanceFor(row, rawColumn, rawValue, value),
      };
    }
  }

  return null;
}

function brandFromRow(row: RawCatalogRow): FieldValue | null {
  const explicitBrand = firstFieldValue(row, "brand");
  if (explicitBrand) {
    return explicitBrand;
  }

  const packageBrand = sourceTypeBrand[row.sourceType];
  if (packageBrand) {
    return {
      value: packageBrand,
      provenance: provenanceFor(row, "__source_type", row.sourceType, packageBrand),
    };
  }

  const sheetBrand = ["Casio", "Tissot", "Orient", "Citizen"].find(
    (brand) => normalizedBrandKey(brand) === normalizedBrandKey(row.sheet),
  );

  if (sheetBrand) {
    return {
      value: sheetBrand,
      provenance: provenanceFor(row, "__sheet_name", row.sheet, sheetBrand),
    };
  }

  return null;
}

function imageSourcesFromRow(row: RawCatalogRow): Array<{ rawColumn: string; rawValue: string }> {
  return Object.entries(row.values)
    .filter(([rawColumn, rawValue]) => {
      const canonical = mapCatalogHeader(rawColumn);
      const value = rawValue.trim();
      return (
        canonical === "image" ||
        ((canonical === "sourceUrl" || rawColumn.toLowerCase().includes("url")) && isImagePathLike(value))
      );
    })
    .map(([rawColumn, rawValue]) => ({ rawColumn, rawValue }));
}

function metadataConflictIssue(input: {
  characteristic: ParsedCharacteristic;
  brand: FieldValue | null;
  brandCollection: FieldValue | null;
  reference: ReturnType<typeof validateManufacturerReference>;
  source?: SourceProvenance;
}): ValidationIssue | null {
  const rawValue = input.characteristic.rawValue.trim();

  if (!rawValue || input.characteristic.destination !== "source_metadata") {
    return null;
  }

  if (input.characteristic.targetField === "brand" && input.brand) {
    const sameBrand = normalizedBrandKey(rawValue) === normalizedBrandKey(input.brand.value);

    return sameBrand
      ? null
      : {
          severity: "warning",
          code: "source_metadata_conflict",
          message: "Characteristic metadata brand conflicts with the normalized identity brand.",
          source: input.source,
          field: "brand",
          rawValue,
        };
  }

  if (input.characteristic.targetField === "brandCollection" && input.brandCollection) {
    const sameCollection = normalizeComparableText(rawValue) === normalizeComparableText(input.brandCollection.value);

    return sameCollection
      ? null
      : {
          severity: "warning",
          code: "source_metadata_conflict",
          message: "Characteristic metadata series conflicts with the normalized brand collection candidate.",
          source: input.source,
          field: "brandCollection",
          rawValue,
        };
  }

  if (input.characteristic.targetField === "manufacturerReference" && input.reference.normalized) {
    const metadataReference = tryNormalizeReferenceText(rawValue);
    const sameReference = metadataReference === input.reference.normalized;

    return sameReference
      ? null
      : {
          severity: "warning",
          code: "source_metadata_conflict",
          message: "Characteristic metadata reference conflicts with the normalized manufacturer reference.",
          source: input.source,
          field: "manufacturerReference",
          rawValue,
        };
  }

  return null;
}

export function normalizeCatalogRow(row: RawCatalogRow, zipEntries: string[]): NormalizedCatalogRow {
  const brand = brandFromRow(row);
  const brandCollection = firstFieldValue(row, "brandCollection");
  const siteTitle = firstFieldValue(row, "siteTitle");
  const officialName = firstFieldValue(row, "officialName");
  const referenceField = firstFieldValue(row, "reference");
  const seoDescription = firstFieldValue(row, "seoDescription");
  const characteristicsField = firstFieldValue(row, "characteristics");
  const validationIssues: ValidationIssue[] = [];

  const reference = validateManufacturerReference(
    referenceField?.value ?? "",
    referenceField?.provenance ?? provenanceFor(row, "Артикул", "", ""),
  );
  validationIssues.push(...reference.issues);

  const priceSources = Object.entries(row.values)
    .map(([rawFieldName, rawValue]) =>
      priceSourceFromField({
        rawFieldName,
        rawValue,
        sourcePackage: row.sourceFile,
        provenance: provenanceFor(row, rawFieldName, rawValue),
      }),
    )
    .filter((source) => source !== null);

  const pricing = buildStagedPricing(priceSources);
  const imageCandidates: ImageCandidate[] = [];

  imageSourcesFromRow(row).forEach(({ rawColumn, rawValue }, index) => {
    const { candidate, issue } = imageCandidateFromSource({
      sourcePackage: row.sourceFile,
      sourceType: row.sourceType,
      rawImageSource: rawValue,
      ordering: index + 1,
      zipEntries,
      provenance: provenanceFor(row, rawColumn, rawValue),
    });

    if (candidate) {
      imageCandidates.push(candidate);
    }

    if (issue) {
      validationIssues.push(issue);
    }
  });

  if (reference.raw && row.sourceType !== "main_catalog_workbook") {
    imageCandidates.push(
      ...imageCandidatesFromZipEntries({
        sourcePackage: row.sourceFile,
        sourceType: row.sourceType,
        referenceRaw: reference.raw,
        zipEntries,
        provenance: referenceField?.provenance ?? provenanceFor(row, "__zip_reference", reference.raw, reference.normalized ?? undefined),
      }),
    );
  }

  const characteristics = characteristicsField ? parseCharacteristics(characteristicsField.value) : [];

  const characteristicsProvenance = characteristicsField?.provenance;

  for (const characteristic of characteristics) {
    if (characteristic.destination === "source_metadata") {
      const issue = metadataConflictIssue({
        characteristic,
        brand,
        brandCollection,
        reference,
        source: characteristicsProvenance,
      });

      if (issue) {
        validationIssues.push(issue);
      }

      continue;
    }

    if (!characteristic.resolved) {
      validationIssues.push({
        severity: "info",
        code: "unsupported_characteristic_key",
        message: "Characteristic key is preserved as unresolved import data.",
        source: characteristicsProvenance,
        field: characteristic.rawKey,
        rawValue: characteristic.rawValue,
      });
    }
  }

  if (!brand) {
    validationIssues.push({
      severity: "error",
      code: "missing_brand",
      message: "Brand is required for automatic catalog identity apply.",
      source: provenanceFor(row, "Бренд", "", ""),
      field: "brand",
    });
  }

  if (!siteTitle && !officialName) {
    validationIssues.push({
      severity: "error",
      code: "missing_usable_title",
      message: "A usable title or official name is required for watch model staging.",
      source: provenanceFor(row, "Название для сайта", "", ""),
      field: "title",
    });
  }

  if (!pricing.publicPriceCandidate) {
    validationIssues.push({
      severity: "warning",
      code: "missing_public_price_candidate",
      message: "No valid RUB public price candidate was found; commercial offer apply is not automatic.",
      source: referenceField?.provenance,
      field: "pricing",
    });
  }

  return {
    rowId: `${row.sourceFile}:${row.sheet}:${row.rowNumber}`,
    sourceRow: row,
    brand,
    brandCollection,
    siteTitle,
    officialName,
    manufacturerReference: reference,
    seoDescription,
    characteristics,
    pricing,
    imageCandidates: markPrimaryImageCandidate(imageCandidates),
    validationIssues,
  };
}

export function normalizeImageCatalogRow(row: RawCatalogRow, zipEntries: string[]): NormalizedCatalogRow {
  const brand = brandFromRow(row);
  const referenceField = firstFieldValue(row, "reference");
  const validationIssues: ValidationIssue[] = [];
  const reference = validateManufacturerReference(
    referenceField?.value ?? "",
    referenceField?.provenance ?? provenanceFor(row, "Артикул", "", ""),
  );
  validationIssues.push(...reference.issues);
  const imageCandidates: ImageCandidate[] = [];

  imageSourcesFromRow(row).forEach(({ rawColumn, rawValue }, index) => {
    const { candidate, issue } = imageCandidateFromSource({
      sourcePackage: row.sourceFile,
      sourceType: row.sourceType,
      rawImageSource: rawValue,
      ordering: index + 1,
      zipEntries,
      provenance: provenanceFor(row, rawColumn, rawValue),
    });

    if (candidate) {
      imageCandidates.push(candidate);
    }

    if (issue) {
      validationIssues.push(issue);
    }
  });

  if (!brand) {
    validationIssues.push({
      severity: "error",
      code: "missing_brand",
      message: "Brand is required for automatic catalog identity apply.",
      source: provenanceFor(row, "Бренд", "", ""),
      field: "brand",
    });
  }

  return {
    rowId: `${row.sourceFile}:${row.sheet}:${row.rowNumber}`,
    sourceRow: row,
    brand,
    brandCollection: null,
    siteTitle: null,
    officialName: null,
    manufacturerReference: reference,
    seoDescription: null,
    characteristics: [],
    pricing: buildStagedPricing([]),
    imageCandidates: markPrimaryImageCandidate(imageCandidates),
    validationIssues,
  };
}
