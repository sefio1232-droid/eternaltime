import type { Money } from "../../../catalog/domain/money";

export const catalogSourceTypes = [
  "main_catalog_workbook",
  "casio_package",
  "tissot_package",
  "orient_package",
  "unknown",
] as const;
export type CatalogSourceType = (typeof catalogSourceTypes)[number];

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  source?: SourceProvenance;
  field?: string;
  rawValue?: string;
};

export type SourceProvenance = {
  sourceFile: string;
  sourceType: CatalogSourceType;
  workbook?: string;
  sheet?: string;
  rowNumber?: number;
  rawColumn?: string;
  rawValue?: string;
  normalizedValue?: string;
  resolution?: string;
};

export type WorkbookSheetSummary = {
  name: string;
  headers: string[];
  rowCount: number;
};

export type WorkbookSummary = {
  workbookName: string;
  nestedEntry?: string;
  sheets: WorkbookSheetSummary[];
};

export type SourceSignature = {
  filename: string;
  extension: string;
  sizeBytes?: number;
  zipEntries?: string[];
  imageEntryCount?: number;
  workbooks: WorkbookSummary[];
};

export type SourceDetection = {
  sourceType: CatalogSourceType;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  workbookSheets: string[];
};

export type RawCatalogRow = {
  sourceFile: string;
  sourceType: CatalogSourceType;
  workbook: string;
  sheet: string;
  rowNumber: number;
  values: Record<string, string>;
};

export type FieldValue = {
  value: string;
  provenance: SourceProvenance;
};

export type ReferenceValidation = {
  raw: string;
  normalized: string | null;
  suspicious: boolean;
  issues: ValidationIssue[];
};

export type CharacteristicDestination =
  | "first_class_catalog_field"
  | "normalized_catalog_dimension"
  | "controlled_extensible_attribute"
  | "source_metadata"
  | "unresolved_import_attribute";

export type ParsedCharacteristic = {
  rawKey: string;
  rawValue: string;
  normalizedKey: string;
  destination: CharacteristicDestination;
  targetField: string | null;
  resolved: boolean;
};

export type PriceSourceVisibility = "public_candidate" | "internal" | "excluded_from_public";
export type PriceValidationState = "valid" | "invalid" | "not_a_price";

export type PriceSource = {
  rawFieldName: string;
  sourcePackage: string;
  currency: string | null;
  rawValue: string;
  normalizedAmountMinor: number | null;
  intendedVisibility: PriceSourceVisibility;
  validationState: PriceValidationState;
  reason?: string;
  provenance: SourceProvenance;
};

export type StagedPricing = {
  publicPriceCandidate: Money | null;
  selectedPublicPriceSource: PriceSource | null;
  rubPriceSources: PriceSource[];
  nonRubPriceSources: PriceSource[];
  internalAnalyticalValues: PriceSource[];
  allSources: PriceSource[];
};

export type ImageCandidate = {
  sourcePackage: string;
  sourceType: CatalogSourceType;
  excelImagePath: string | null;
  actualZipEntry: string | null;
  remoteImageUrl: string | null;
  ordering: number;
  isPrimaryCandidate: boolean;
  status: "valid" | "broken" | "invalid_url";
  provenance: SourceProvenance;
};

export type NormalizedCatalogRow = {
  rowId: string;
  sourceRow: RawCatalogRow;
  brand: FieldValue | null;
  brandCollection: FieldValue | null;
  siteTitle: FieldValue | null;
  officialName: FieldValue | null;
  manufacturerReference: ReferenceValidation;
  seoDescription: FieldValue | null;
  characteristics: ParsedCharacteristic[];
  pricing: StagedPricing;
  imageCandidates: ImageCandidate[];
  validationIssues: ValidationIssue[];
};

export type ParsedCatalogSource = {
  sourceFile: string;
  sourceType: CatalogSourceType;
  detection: SourceDetection;
  signature: SourceSignature;
  zipEntries: string[];
  rows: RawCatalogRow[];
  imageRows: RawCatalogRow[];
};

export type ApplyEligibilityStatus = "eligible" | "manual_review" | "blocked";

export type ApplyEligibility = {
  status: ApplyEligibilityStatus;
  referenceApplyEligible: boolean;
  commercialApplyEligible: boolean;
  reasons: string[];
};

export type MergedCatalogCandidate = {
  candidateId: string;
  identity: {
    brand: string | null;
    brandNormalized: string | null;
    title: string | null;
    officialName: string | null;
    referenceRaw: string | null;
    referenceNormalized: string | null;
  };
  hierarchy: {
    brandCollection: string | null;
    brandLine: string | null;
    watchModelCandidate: string | null;
  };
  specifications: {
    firstClass: Record<string, string>;
    controlledAttributes: Record<string, string>;
    unresolvedAttributes: Record<string, string[]>;
  };
  traits: Record<string, string[]>;
  pricing: StagedPricing;
  contentDrafts: {
    seoDescription: {
      rawDraft: string;
      normalizedText: string;
      length: number;
      provenance: SourceProvenance;
    } | null;
  };
  images: {
    candidates: ImageCandidate[];
    primaryImageCandidate: ImageCandidate | null;
  };
  sourceProvenance: SourceProvenance[];
  sourceRows: RawCatalogRow[];
  validationIssues: ValidationIssue[];
  applyEligibility: ApplyEligibility;
};

export type ImportApplyPlan = {
  proposedBrandChanges: Array<{ brand: string; sourceCandidates: string[] }>;
  proposedBrandCollectionChanges: Array<{ brand: string; brandCollection: string; sourceCandidates: string[] }>;
  proposedWatchModelChanges: Array<{ brand: string; watchModel: string; sourceCandidates: string[] }>;
  proposedWatchReferenceChanges: Array<{ brand: string; reference: string; displayName: string; sourceCandidate: string }>;
  proposedCatalogOfferChanges: Array<{ brand: string; reference: string; publicPriceMinor: number; currencyCode: "RUB" }>;
  proposedPublicPriceChanges: Array<{ brand: string; reference: string; priceMinor: number; currencyCode: "RUB" }>;
  proposedImageUploadCandidates: ImageCandidate[];
};

export type CatalogReviewActionType =
  | "confirm_reference"
  | "correct_reference"
  | "resolve_duplicate"
  | "resolve_hierarchy"
  | "resolve_source_conflict"
  | "review_characteristic"
  | "other";

export type CatalogReviewQueueEntry = {
  candidateId: string;
  brand: string | null;
  sourceTitle: string | null;
  rawReference: string | null;
  normalizedReference: string | null;
  sourcePackages: string[];
  issues: Array<{
    code: string;
    severity: ValidationSeverity;
    field?: string;
    message: string;
    rawValue?: string;
  }>;
  relevantConflictingValues: Array<{
    field: string;
    values: string[];
  }>;
  suggestedReviewActionType: CatalogReviewActionType;
};

export type CatalogReviewQueue = {
  generatedAt: string;
  recordCount: number;
  entries: CatalogReviewQueueEntry[];
};

export type CatalogImportPreview = {
  generatedAt: string;
  sources: Array<{
    filename: string;
    sourceType: CatalogSourceType;
    reasons: string[];
    workbookSheets: string[];
    rawRowCount: number;
  }>;
  records: MergedCatalogCandidate[];
  applyPlan: ImportApplyPlan;
};

export type CatalogImportPipelineResult = {
  generatedAt: string;
  sources: ParsedCatalogSource[];
  normalizedRows: NormalizedCatalogRow[];
  mergedCandidates: MergedCatalogCandidate[];
  applyPlan: ImportApplyPlan;
  auditReportMarkdown: string;
  preview: CatalogImportPreview;
  reviewQueue: CatalogReviewQueue;
};
