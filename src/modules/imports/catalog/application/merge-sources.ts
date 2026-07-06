import { buildStagedPricing } from "../domain/pricing";
import { normalizedBrandKey } from "../domain/references";
import { markPrimaryImageCandidate } from "../domain/images";
import type {
  ApplyEligibility,
  FieldValue,
  MergedCatalogCandidate,
  NormalizedCatalogRow,
  ParsedCharacteristic,
  SourceProvenance,
  StagedPricing,
  ValidationIssue,
} from "../domain/types";

const packagePriorityByBrand: Record<string, string[]> = {
  casio: ["casio_package", "main_catalog_workbook"],
  tissot: ["tissot_package", "main_catalog_workbook"],
  orient: ["orient_package", "main_catalog_workbook"],
  citizen: ["main_catalog_workbook"],
};

function candidateKey(row: NormalizedCatalogRow): string {
  const brandKey = row.brand ? normalizedBrandKey(row.brand.value) : "unknown-brand";
  const referenceKey = row.manufacturerReference.normalized ?? `row-${row.rowId}`;
  return `${brandKey}:${referenceKey}`;
}

function priorityScore(field: FieldValue, brand: string | null): number {
  const sourceType = field.provenance.sourceType;
  const priorities = brand ? packagePriorityByBrand[normalizedBrandKey(brand)] ?? ["main_catalog_workbook"] : ["main_catalog_workbook"];
  const index = priorities.indexOf(sourceType);
  return index === -1 ? priorities.length + 1 : index;
}

function resolveField(
  rows: NormalizedCatalogRow[],
  pick: (row: NormalizedCatalogRow) => FieldValue | null,
  brand: string | null,
  fieldName: string,
  issues: ValidationIssue[],
): FieldValue | null {
  const values = rows.map(pick).filter((value) => value !== null);

  if (values.length === 0) {
    return null;
  }

  const distinct = new Map(values.map((value) => [value.value.trim().toLowerCase(), value.value]));

  if (distinct.size > 1) {
    issues.push({
      severity: "warning",
      code: "source_conflict",
      message: `Conflicting values detected for ${fieldName}; source priority selected the staged value.`,
      source: values[0].provenance,
      field: fieldName,
      rawValue: [...distinct.values()].join(" | "),
    });
  }

  return values.slice().sort((left, right) => priorityScore(left, brand) - priorityScore(right, brand))[0];
}

function characteristicMaps(characteristics: ParsedCharacteristic[]): {
  firstClass: Record<string, string>;
  controlledAttributes: Record<string, string>;
  unresolvedAttributes: Record<string, string[]>;
} {
  const firstClass: Record<string, string> = {};
  const controlledAttributes: Record<string, string> = {};
  const unresolvedAttributes: Record<string, string[]> = {};

  for (const characteristic of characteristics) {
    if (!characteristic.targetField) {
      unresolvedAttributes[characteristic.normalizedKey] = [
        ...(unresolvedAttributes[characteristic.normalizedKey] ?? []),
        characteristic.rawValue,
      ];
      continue;
    }

    if (characteristic.destination === "first_class_catalog_field") {
      firstClass[characteristic.targetField] = characteristic.rawValue;
    } else if (
      characteristic.destination === "normalized_catalog_dimension" ||
      characteristic.destination === "controlled_extensible_attribute"
    ) {
      controlledAttributes[characteristic.targetField] = characteristic.rawValue;
    }
  }

  return { firstClass, controlledAttributes, unresolvedAttributes };
}

function deriveEligibility(input: {
  brand: string | null;
  title: string | null;
  referenceNormalized: string | null;
  watchModelCandidate: string | null;
  issues: ValidationIssue[];
  pricing: StagedPricing;
}): ApplyEligibility {
  const reasons: string[] = [];
  const hasCriticalError = input.issues.some((issue) => issue.severity === "error");
  const hasSourceConflict = input.issues.some((issue) => issue.code === "source_conflict");

  if (!input.brand) {
    reasons.push("missing brand");
  }

  if (!input.title) {
    reasons.push("missing usable title");
  }

  if (!input.referenceNormalized) {
    reasons.push("missing or suspicious manufacturer reference");
  }

  if (!input.watchModelCandidate) {
    reasons.push("missing watch model candidate");
  }

  if (hasCriticalError) {
    reasons.push("critical validation issue");
  }

  const referenceApplyEligible =
    Boolean(input.brand && input.title && input.referenceNormalized && input.watchModelCandidate) && !hasCriticalError;
  const commercialApplyEligible = referenceApplyEligible && Boolean(input.pricing.publicPriceCandidate);

  if (!input.pricing.publicPriceCandidate) {
    reasons.push("commercial apply requires public price candidate");
  }

  if (referenceApplyEligible && hasSourceConflict) {
    return {
      status: "manual_review",
      referenceApplyEligible: false,
      commercialApplyEligible: false,
      reasons: [...reasons, "source conflict requires manual review"],
    };
  }

  return {
    status: referenceApplyEligible ? "eligible" : "blocked",
    referenceApplyEligible,
    commercialApplyEligible,
    reasons,
  };
}

function collectProvenance(rows: NormalizedCatalogRow[]): SourceProvenance[] {
  return rows.flatMap((row) => [
    ...(row.brand ? [row.brand.provenance] : []),
    ...(row.brandCollection ? [row.brandCollection.provenance] : []),
    ...(row.siteTitle ? [row.siteTitle.provenance] : []),
    ...(row.officialName ? [row.officialName.provenance] : []),
    ...(row.seoDescription ? [row.seoDescription.provenance] : []),
    ...row.pricing.allSources.map((source) => source.provenance),
    ...row.imageCandidates.map((candidate) => candidate.provenance),
  ]);
}

export function mergeNormalizedCatalogRows(rows: NormalizedCatalogRow[]): MergedCatalogCandidate[] {
  const groups = new Map<string, NormalizedCatalogRow[]>();

  for (const row of rows) {
    groups.set(candidateKey(row), [...(groups.get(candidateKey(row)) ?? []), row]);
  }

  const merged = [...groups.entries()].map(([key, groupedRows]) => {
    const issues: ValidationIssue[] = groupedRows.flatMap((row) => row.validationIssues);
    const duplicateSourceRows = new Map<string, NormalizedCatalogRow[]>();

    for (const row of groupedRows.filter((candidateRow) => !isImageManifestSheet(candidateRow.sourceRow.sheet))) {
      const sourceKey = `${row.sourceRow.sourceFile}:${row.sourceRow.sheet}`;
      duplicateSourceRows.set(sourceKey, [...(duplicateSourceRows.get(sourceKey) ?? []), row]);
    }

    for (const [sourceKey, duplicateRows] of duplicateSourceRows.entries()) {
      if (duplicateRows.length > 1 && groupedRows[0].manufacturerReference.normalized) {
        issues.push({
          severity: "warning",
          code: "duplicate_reference_within_brand",
          message: "Duplicate normalized manufacturer reference found within one brand/source scope.",
          source: duplicateRows[0].manufacturerReference.issues[0]?.source ?? duplicateRows[0].brand?.provenance,
          field: "manufacturerReference",
          rawValue: sourceKey,
        });
      }
    }
    const brandField = resolveField(groupedRows, (row) => row.brand, null, "brand", issues);
    const brand = brandField?.value ?? null;
    const brandCollectionField = resolveField(groupedRows, (row) => row.brandCollection, brand, "brandCollection", issues);
    const titleField = resolveField(groupedRows, (row) => row.siteTitle, brand, "siteTitle", issues);
    const officialNameField = resolveField(groupedRows, (row) => row.officialName, brand, "officialName", issues);
    const seoField = resolveField(groupedRows, (row) => row.seoDescription, brand, "seoDescription", issues);
    const reference = groupedRows.find((row) => row.manufacturerReference.normalized)?.manufacturerReference ?? groupedRows[0].manufacturerReference;
    const pricing = buildStagedPricing(groupedRows.flatMap((row) => row.pricing.allSources));
    const characteristics = groupedRows.flatMap((row) => row.characteristics);
    const specs = characteristicMaps(characteristics);
    const imageCandidates = markPrimaryImageCandidate(groupedRows.flatMap((row) => row.imageCandidates));
    const title = officialNameField?.value ?? titleField?.value ?? null;
    const watchModelCandidate = officialNameField?.value ?? titleField?.value ?? null;
    const eligibility = deriveEligibility({
      brand,
      title,
      referenceNormalized: reference.normalized,
      watchModelCandidate,
      issues,
      pricing,
    });

    return {
      candidateId: key,
      identity: {
        brand,
        brandNormalized: brand ? normalizedBrandKey(brand) : null,
        title,
        officialName: officialNameField?.value ?? null,
        referenceRaw: reference.raw || null,
        referenceNormalized: reference.normalized,
      },
      hierarchy: {
        brandCollection: brandCollectionField?.value ?? null,
        brandLine: null,
        watchModelCandidate,
      },
      specifications: specs,
      traits: {},
      pricing,
      contentDrafts: {
        seoDescription: seoField
          ? {
              rawDraft: seoField.value,
              normalizedText: seoField.value.replace(/\s+/g, " ").trim(),
              length: seoField.value.replace(/\s+/g, " ").trim().length,
              provenance: seoField.provenance,
            }
          : null,
      },
      images: {
        candidates: imageCandidates,
        primaryImageCandidate: imageCandidates.find((candidate) => candidate.isPrimaryCandidate) ?? null,
      },
      sourceProvenance: collectProvenance(groupedRows),
      sourceRows: groupedRows.map((row) => row.sourceRow),
      validationIssues: issues,
      applyEligibility: eligibility,
    } satisfies MergedCatalogCandidate;
  });

  return merged.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
}

function isImageManifestSheet(sheetName: string): boolean {
  const normalized = sheetName.normalize("NFKC").toLowerCase();
  return normalized.includes("\u0444\u043e\u0442\u043e") || normalized.includes("\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438");
}
