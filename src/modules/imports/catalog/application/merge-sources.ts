import { buildStagedPricing } from "../domain/pricing";
import { normalizedBrandKey } from "../domain/references";
import { markPrimaryImageCandidate } from "../domain/images";
import { mapCatalogHeader } from "../domain/headers";
import {
  areTextValuesEquivalent,
  normalizeComparableText,
  normalizeCompactedText,
  valueContainsNormalizedReference,
} from "../domain/text-normalization";
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

function titleForIdentity(row: NormalizedCatalogRow): string | null {
  return row.officialName?.value ?? row.siteTitle?.value ?? null;
}

function candidateKey(row: NormalizedCatalogRow): string {
  const brandKey = row.brand ? normalizedBrandKey(row.brand.value) : "unknown-brand";
  const referenceKey =
    row.manufacturerReference.normalized && !row.manufacturerReference.suspicious
      ? row.manufacturerReference.normalized
      : null;

  if (referenceKey) {
    return `${brandKey}:${referenceKey}`;
  }

  const titleKey = titleForIdentity(row) ?? row.rowId;
  return `${brandKey}:unresolved:${normalizeCompactedText(titleKey)}`;
}

function stableIdentitySignals(row: NormalizedCatalogRow): string[] {
  return Object.entries(row.sourceRow.values)
    .filter(([header, value]) => mapCatalogHeader(header) === "sourceUrl" && value.trim().length > 0)
    .map(([, value]) => value.normalize("NFKC").trim().toLowerCase());
}

function crossSourceRecoveryKeys(row: NormalizedCatalogRow): string[] {
  if (!row.brand) {
    return [];
  }

  const title = titleForIdentity(row);
  if (!title) {
    return [];
  }

  return stableIdentitySignals(row).map(
    (signal) => `${normalizedBrandKey(row.brand?.value ?? "")}:${normalizeComparableText(title)}:${signal}`,
  );
}

function withRecoveredReferences(rows: NormalizedCatalogRow[]): NormalizedCatalogRow[] {
  const validRowsByRecoveryKey = new Map<string, NormalizedCatalogRow[]>();

  for (const row of rows) {
    if (!row.manufacturerReference.normalized || row.manufacturerReference.suspicious) {
      continue;
    }

    for (const key of crossSourceRecoveryKeys(row)) {
      validRowsByRecoveryKey.set(key, [...(validRowsByRecoveryKey.get(key) ?? []), row]);
    }
  }

  return rows.map((row) => {
    if (row.manufacturerReference.normalized && !row.manufacturerReference.suspicious) {
      return row;
    }

    const recoveryCandidates = crossSourceRecoveryKeys(row).flatMap((key) => validRowsByRecoveryKey.get(key) ?? []);
    const uniqueReferences = new Map(
      recoveryCandidates.map((candidate) => [candidate.manufacturerReference.normalized, candidate.manufacturerReference]),
    );

    if (uniqueReferences.size !== 1) {
      if (recoveryCandidates.length > 1) {
        return {
          ...row,
          validationIssues: [
            ...row.validationIssues,
            {
              severity: "warning",
              code: "reference_recovery_ambiguous",
              message: "Cross-source reference recovery was rejected because the stable identity match is ambiguous.",
              source: row.brand?.provenance,
              field: "manufacturerReference",
              rawValue: row.manufacturerReference.raw,
            },
          ],
        };
      }

      return row;
    }

    const recovered = [...uniqueReferences.values()][0];
    const recoveredSource = recoveryCandidates[0]?.brand?.provenance;
    const recoveryIssue: ValidationIssue = {
      severity: "info",
      code: "reference_recovered_from_cross_source",
      message: "Manufacturer reference was recovered through brand, exact title, and shared source URL.",
      source: recoveredSource,
      field: "manufacturerReference",
      rawValue: row.manufacturerReference.raw,
    };

    return {
      ...row,
      manufacturerReference: {
        raw: recovered.raw,
        normalized: recovered.normalized,
        suspicious: false,
        issues: [recoveryIssue],
      },
      validationIssues: [
        ...row.validationIssues.filter(
          (issue) => issue.code !== "missing_reference" && issue.code !== "suspicious_reference",
        ),
        recoveryIssue,
      ],
    };
  });
}

function priorityScore(field: FieldValue, brand: string | null): number {
  const sourceType = field.provenance.sourceType;
  const priorities = brand ? packagePriorityByBrand[normalizedBrandKey(brand)] ?? ["main_catalog_workbook"] : ["main_catalog_workbook"];
  const index = priorities.indexOf(sourceType);
  return index === -1 ? priorities.length + 1 : index;
}

function conflictIssueForField(input: {
  fieldName: string;
  values: FieldValue[];
  referenceNormalized: string | null;
}): ValidationIssue | null {
  const rawValues = input.values.map((value) => value.value);

  if (areTextValuesEquivalent(rawValues)) {
    return null;
  }

  if (input.fieldName === "seoDescription") {
    return {
      severity: "warning",
      code: "content_draft_conflict",
      message: "Conflicting SEO source drafts detected; source priority selected the staged draft.",
      source: input.values[0].provenance,
      field: input.fieldName,
      rawValue: rawValues.join(" | "),
    };
  }

  if (
    (input.fieldName === "siteTitle" || input.fieldName === "officialName") &&
    input.referenceNormalized &&
    rawValues.every((value) => valueContainsNormalizedReference(value, input.referenceNormalized ?? ""))
  ) {
    return {
      severity: "info",
      code: "source_conflict_resolved_by_priority",
      message: `Textual ${input.fieldName} variation was resolved by deterministic source priority and reference compatibility.`,
      source: input.values[0].provenance,
      field: input.fieldName,
      rawValue: rawValues.join(" | "),
    };
  }

  return {
    severity: "warning",
    code: "identity_source_conflict",
    message: `Conflicting identity or hierarchy values detected for ${input.fieldName}; manual review is required.`,
    source: input.values[0].provenance,
    field: input.fieldName,
    rawValue: rawValues.join(" | "),
  };
}

function resolveField(
  rows: NormalizedCatalogRow[],
  pick: (row: NormalizedCatalogRow) => FieldValue | null,
  brand: string | null,
  fieldName: string,
  referenceNormalized: string | null,
  issues: ValidationIssue[],
): FieldValue | null {
  const values = rows.map(pick).filter((value) => value !== null);

  if (values.length === 0) {
    return null;
  }

  const distinct = new Map(values.map((value) => [normalizeComparableText(value.value), value.value]));

  if (distinct.size > 1) {
    const issue = conflictIssueForField({
      fieldName,
      values,
      referenceNormalized,
    });

    if (issue) {
      issues.push(issue);
    }
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
    if (characteristic.destination === "source_metadata") {
      continue;
    }

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
  const criticalIssueCodes = input.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code);
  const hasOnlyUnavailableReferenceErrors =
    criticalIssueCodes.length > 0 &&
    criticalIssueCodes.every((code) => code === "missing_reference" || code === "suspicious_reference");
  const hasBlockingIdentityConflict = input.issues.some((issue) =>
    ["identity_source_conflict", "duplicate_reference_conflict", "source_metadata_conflict"].includes(issue.code),
  );

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

  if (referenceApplyEligible && hasBlockingIdentityConflict) {
    return {
      status: "manual_review",
      referenceApplyEligible: false,
      commercialApplyEligible: false,
      reasons: [...reasons, "identity conflict requires manual review"],
    };
  }

  if (hasOnlyUnavailableReferenceErrors && input.brand && input.title && input.watchModelCandidate && !hasBlockingIdentityConflict) {
    return {
      status: "intentionally_skipped_missing_reference",
      referenceApplyEligible: false,
      commercialApplyEligible: false,
      reasons: ["Intentionally skipped because reliable manufacturer reference is unavailable."],
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

function duplicateReferenceIssue(sourceKey: string, duplicateRows: NormalizedCatalogRow[]): ValidationIssue {
  const referenceNormalized = duplicateRows[0].manufacturerReference.normalized;
  const titles = duplicateRows
    .map((row) => row.officialName?.value ?? row.siteTitle?.value)
    .filter((value): value is string => Boolean(value));
  const collections = duplicateRows
    .map((row) => row.brandCollection?.value)
    .filter((value): value is string => Boolean(value));
  const sameTitles = areTextValuesEquivalent(titles);
  const sameCollections = areTextValuesEquivalent(collections);
  const compactedTitles = titles.map(normalizeCompactedText).filter(Boolean);
  const titleContainsTitle =
    compactedTitles.length > 0 &&
    compactedTitles.some((title) => compactedTitles.every((otherTitle) => title.includes(otherTitle) || otherTitle.includes(title)));
  const titlesContainReference =
    Boolean(referenceNormalized) &&
    titles.length > 0 &&
    titles.every((title) => valueContainsNormalizedReference(title, referenceNormalized ?? ""));
  const compatible = sameCollections && (sameTitles || (titlesContainReference && titleContainsTitle));

  return {
    severity: compatible ? "info" : "warning",
    code: compatible ? "duplicate_reference_same_identity" : "duplicate_reference_conflict",
    message: compatible
      ? "Duplicate reference rows are compatible and were merged as the same identity."
      : "Duplicate reference rows contain materially different identity data and require review.",
    source: duplicateRows[0].manufacturerReference.issues[0]?.source ?? duplicateRows[0].brand?.provenance,
    field: "manufacturerReference",
    rawValue: sourceKey,
  };
}

export function mergeNormalizedCatalogRows(rows: NormalizedCatalogRow[]): MergedCatalogCandidate[] {
  const rowsForMerge = withRecoveredReferences(rows);
  const groups = new Map<string, NormalizedCatalogRow[]>();

  for (const row of rowsForMerge) {
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
        issues.push(duplicateReferenceIssue(sourceKey, duplicateRows));
      }
    }
    const reference =
      groupedRows.find((row) => row.manufacturerReference.normalized && !row.manufacturerReference.suspicious)
        ?.manufacturerReference ?? groupedRows[0].manufacturerReference;
    const brandField = resolveField(groupedRows, (row) => row.brand, null, "brand", reference.normalized, issues);
    const brand = brandField?.value ?? null;
    const brandCollectionField = resolveField(
      groupedRows,
      (row) => row.brandCollection,
      brand,
      "brandCollection",
      reference.normalized,
      issues,
    );
    const titleField = resolveField(groupedRows, (row) => row.siteTitle, brand, "siteTitle", reference.normalized, issues);
    const officialNameField = resolveField(
      groupedRows,
      (row) => row.officialName,
      brand,
      "officialName",
      reference.normalized,
      issues,
    );
    const seoField = resolveField(groupedRows, (row) => row.seoDescription, brand, "seoDescription", reference.normalized, issues);
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
