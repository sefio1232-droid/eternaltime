import type { ApplyEligibilityStatus, CatalogImportPreview, ImageCandidate } from "./types";

export const catalogImportApplyConfirmationPhrase = "APPLY_ETERNAL_TIME_CATALOG_IMPORT";
export const catalogImportOfferMarker = "catalog_import_pipeline_v1";

export type ControlledCatalogApplyRecord = {
  candidateId: string;
  brand: string;
  brandSlug: string;
  brandCollection: string | null;
  brandCollectionSlug: string | null;
  brandLine: string | null;
  watchModel: string;
  watchModelSlug: string;
  referenceDisplay: string;
  referenceNormalized: string;
  referenceSlug: string;
  displayName: string;
  publicPriceMinor: number | null;
  currencyCode: "RUB" | null;
  warnings: Array<{ code: string; field?: string; message: string }>;
  sourceCandidate: string;
};

export type CatalogImageUploadPlanItem = {
  candidateId: string;
  brand: string;
  brandSlug: string;
  referenceNormalized: string;
  referenceSlug: string;
  databaseWatchReferenceId: string | null;
  sourceImageCandidate: ImageCandidate;
  sourcePackage: string;
  actualZipEntry: string | null;
  remoteImageUrl: string | null;
  intendedOrder: number;
  isPrimaryCandidate: boolean;
  imageValidationState: ImageCandidate["status"];
  proposedStorageObjectPath: string;
};

export type CatalogImageUploadPlan = {
  generatedAt: string;
  previewGeneratedAt: string;
  itemCount: number;
  items: CatalogImageUploadPlanItem[];
};

export type CatalogApplyStatusBreakdown = Record<ApplyEligibilityStatus, number>;

export type ControlledCatalogApplyPlan = {
  generatedAt: string;
  previewGeneratedAt: string;
  sourcePreviewPath: string;
  statusBreakdown: CatalogApplyStatusBreakdown;
  eligibleRecords: ControlledCatalogApplyRecord[];
  manualReviewCandidateIds: string[];
  intentionallySkippedCandidateIds: string[];
  blockedCandidateIds: string[];
  imageUploadPlan: CatalogImageUploadPlan;
  sourcePreview: CatalogImportPreview;
};

export type CatalogDatabasePreflight = {
  localSupabaseProject: {
    configPresent: boolean;
    migrationsPresent: boolean;
    migrationFiles: string[];
  };
  remoteLink: {
    linked: boolean;
    source: "supabase_temp" | "missing";
  };
  environment: {
    publicUrlConfigured: boolean;
    publishableKeyConfigured: boolean;
    adminSecretKeyConfigured: boolean;
  };
  database: {
    comparisonAvailable: boolean;
    blocker: string | null;
    requiredTablesChecked: string[];
    missingRequiredTables: string[];
  };
};

export type CatalogApplyChangeCounts = {
  inserts: number;
  updates: number;
  noops: number;
  conflicts: number;
};

export type CatalogApplyDryRunSummary = {
  generatedAt: string;
  previewGeneratedAt: string;
  statusBreakdown: CatalogApplyStatusBreakdown;
  intentionallySkippedMissingReferenceCount: number;
  databasePreflight: CatalogDatabasePreflight;
  databaseComparisonStatus: "available" | "unavailable";
  planCounts: {
    brands: number;
    brandCollections: number;
    brandLines: number;
    watchModels: number;
    watchReferences: number;
    catalogOffers: number;
    publicPrices: number;
  };
  proposedChanges: {
    brands: CatalogApplyChangeCounts;
    brandCollections: CatalogApplyChangeCounts;
    brandLines: CatalogApplyChangeCounts;
    watchModels: CatalogApplyChangeCounts;
    watchReferences: CatalogApplyChangeCounts;
    catalogOffers: CatalogApplyChangeCounts;
    publicPrices: CatalogApplyChangeCounts;
  };
  totals: {
    eligibleRecords: number;
    manualReviewRecords: number;
    intentionallySkippedRecords: number;
    blockedRecords: number;
    proposedUpdates: number;
    proposedNoops: number;
    conflicts: number;
    imageUploadPlanItems: number;
  };
  conflicts: Array<{
    entityType: string;
    identity: string;
    message: string;
    candidateId?: string;
  }>;
  inventoryAvailability: {
    sourceContainsConfirmedAvailability: boolean;
    proposedInventoryStateChanges: number;
    note: string;
  };
  actualApplyAllowed: boolean;
  actualApplyBlockers: string[];
};

export type CatalogApplyExecutionResult = {
  executed: boolean;
  generatedAt: string;
  dryRun: CatalogApplyDryRunSummary;
  databaseResult: unknown | null;
  blockers: string[];
};
