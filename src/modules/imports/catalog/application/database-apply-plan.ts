import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { referenceSlugFromNormalized } from "../../../catalog/domain/reference-normalization";
import { slugifyCatalogText } from "../../../catalog/domain/slug";
import type {
  CatalogApplyStatusBreakdown,
  CatalogImageUploadPlan,
  CatalogImageUploadPlanItem,
  ControlledCatalogApplyPlan,
  ControlledCatalogApplyRecord,
} from "../domain/database-apply-types";
import type { ApplyEligibilityStatus, CatalogImportPreview, MergedCatalogCandidate } from "../domain/types";

const knownStatuses: ApplyEligibilityStatus[] = [
  "eligible",
  "manual_review",
  "blocked",
  "intentionally_skipped_missing_reference",
];

export function emptyStatusBreakdown(): CatalogApplyStatusBreakdown {
  return {
    eligible: 0,
    manual_review: 0,
    blocked: 0,
    intentionally_skipped_missing_reference: 0,
  };
}

function statusBreakdown(records: MergedCatalogCandidate[]): CatalogApplyStatusBreakdown {
  const breakdown = emptyStatusBreakdown();

  for (const record of records) {
    breakdown[record.applyEligibility.status] += 1;
  }

  return breakdown;
}

function requireSlug(value: string, context: string): string {
  const slug = slugifyCatalogText(value);

  if (!slug) {
    throw new Error(`Cannot create a safe catalog slug for ${context}.`);
  }

  return slug;
}

function storageSafeFileName(input: string | null, fallback: string): string {
  const basename = (input ?? fallback).split(/[\\/]/).pop() ?? fallback;
  const safe = basename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return safe || fallback;
}

function uploadPlanItem(input: {
  record: MergedCatalogCandidate;
  image: MergedCatalogCandidate["images"]["candidates"][number];
  brandSlug: string;
  referenceSlug: string;
  index: number;
}): CatalogImageUploadPlanItem {
  const rawPath = input.image.actualZipEntry ?? input.image.remoteImageUrl;
  const filename = storageSafeFileName(rawPath, `image-${input.index + 1}.jpg`);

  return {
    candidateId: input.record.candidateId,
    brand: input.record.identity.brand ?? "",
    brandSlug: input.brandSlug,
    referenceNormalized: input.record.identity.referenceNormalized ?? "",
    referenceSlug: input.referenceSlug,
    databaseWatchReferenceId: null,
    sourceImageCandidate: input.image,
    sourcePackage: input.image.sourcePackage,
    actualZipEntry: input.image.actualZipEntry,
    remoteImageUrl: input.image.remoteImageUrl,
    intendedOrder: input.index + 1,
    isPrimaryCandidate: input.image.isPrimaryCandidate,
    imageValidationState: input.image.status,
    proposedStorageObjectPath: `catalog/watches/${input.brandSlug}/${input.referenceSlug}/${String(input.index + 1).padStart(2, "0")}-${filename}`,
  };
}

function applyRecordFromCandidate(candidate: MergedCatalogCandidate): ControlledCatalogApplyRecord {
  if (
    candidate.applyEligibility.status !== "eligible" ||
    !candidate.applyEligibility.referenceApplyEligible ||
    !candidate.identity.brand ||
    !candidate.identity.referenceNormalized ||
    !candidate.identity.referenceRaw ||
    !candidate.identity.title ||
    !candidate.hierarchy.watchModelCandidate
  ) {
    throw new Error(`Candidate ${candidate.candidateId} is not eligible for controlled database apply.`);
  }

  const brandSlug = requireSlug(candidate.identity.brand, `brand ${candidate.identity.brand}`);
  const brandCollectionSlug = candidate.hierarchy.brandCollection
    ? requireSlug(candidate.hierarchy.brandCollection, `Brand Collection ${candidate.hierarchy.brandCollection}`)
    : null;
  const watchModelSlug = requireSlug(candidate.hierarchy.watchModelCandidate, `Watch Model ${candidate.hierarchy.watchModelCandidate}`);
  const referenceSlug = referenceSlugFromNormalized(candidate.identity.referenceNormalized);

  return {
    candidateId: candidate.candidateId,
    brand: candidate.identity.brand,
    brandSlug,
    brandCollection: candidate.hierarchy.brandCollection,
    brandCollectionSlug,
    brandLine: candidate.hierarchy.brandLine,
    watchModel: candidate.hierarchy.watchModelCandidate,
    watchModelSlug,
    referenceDisplay: candidate.identity.referenceRaw,
    referenceNormalized: candidate.identity.referenceNormalized,
    referenceSlug,
    displayName: candidate.identity.title,
    publicPriceMinor: candidate.applyEligibility.commercialApplyEligible
      ? candidate.pricing.publicPriceCandidate?.amountMinor ?? null
      : null,
    currencyCode: candidate.applyEligibility.commercialApplyEligible ? "RUB" : null,
    warnings: candidate.validationIssues
      .filter((issue) => issue.severity !== "error")
      .map((issue) => ({
        code: issue.code,
        field: issue.field,
        message: issue.message,
      })),
    sourceCandidate: candidate.candidateId,
  };
}

function uniqueImageCandidates(candidates: MergedCatalogCandidate["images"]["candidates"]): MergedCatalogCandidate["images"]["candidates"] {
  const seen = new Set<string>();
  const result: MergedCatalogCandidate["images"]["candidates"] = [];

  for (const candidate of candidates) {
    const key = candidate.actualZipEntry ?? candidate.remoteImageUrl ?? candidate.excelImagePath;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(candidate);
  }

  return result;
}

function buildImageUploadPlan(input: {
  generatedAt: string;
  previewGeneratedAt: string;
  records: MergedCatalogCandidate[];
}): CatalogImageUploadPlan {
  const items = input.records
    .filter((record) => record.applyEligibility.status === "eligible" && record.applyEligibility.referenceApplyEligible)
    .flatMap((record) => {
      if (!record.identity.brand || !record.identity.referenceNormalized) {
        return [];
      }

      const brandSlug = requireSlug(record.identity.brand, `brand ${record.identity.brand}`);
      const referenceSlug = referenceSlugFromNormalized(record.identity.referenceNormalized);

      return uniqueImageCandidates(record.images.candidates.filter((image) => image.status === "valid"))
        .map((image, index) => uploadPlanItem({ record, image, brandSlug, referenceSlug, index }));
    });

  return {
    generatedAt: input.generatedAt,
    previewGeneratedAt: input.previewGeneratedAt,
    itemCount: items.length,
    items,
  };
}

export async function loadCatalogImportPreview(previewPath: string): Promise<CatalogImportPreview> {
  const raw = await readFile(previewPath, "utf8");
  const parsed = JSON.parse(raw) as CatalogImportPreview;

  if (!Array.isArray(parsed.records) || typeof parsed.generatedAt !== "string") {
    throw new Error(`Invalid catalog import preview: ${previewPath}`);
  }

  return parsed;
}

export function buildControlledCatalogApplyPlan(input: {
  preview: CatalogImportPreview;
  previewPath: string;
  generatedAt?: string;
}): ControlledCatalogApplyPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const breakdown = statusBreakdown(input.preview.records);
  const eligibleRecords = input.preview.records
    .filter((candidate) => candidate.applyEligibility.status === "eligible" && candidate.applyEligibility.referenceApplyEligible)
    .map(applyRecordFromCandidate);
  const imageUploadPlan = buildImageUploadPlan({
    generatedAt,
    previewGeneratedAt: input.preview.generatedAt,
    records: input.preview.records,
  });

  return {
    generatedAt,
    previewGeneratedAt: input.preview.generatedAt,
    sourcePreviewPath: input.previewPath,
    statusBreakdown: breakdown,
    eligibleRecords,
    manualReviewCandidateIds: input.preview.records
      .filter((candidate) => candidate.applyEligibility.status === "manual_review")
      .map((candidate) => candidate.candidateId),
    intentionallySkippedCandidateIds: input.preview.records
      .filter((candidate) => candidate.applyEligibility.status === "intentionally_skipped_missing_reference")
      .map((candidate) => candidate.candidateId),
    blockedCandidateIds: input.preview.records
      .filter((candidate) => candidate.applyEligibility.status === "blocked")
      .map((candidate) => candidate.candidateId),
    imageUploadPlan,
    sourcePreview: input.preview,
  };
}

export async function writeCatalogImageUploadPlan(input: {
  imagePlanPath: string;
  imageUploadPlan: CatalogImageUploadPlan;
}): Promise<void> {
  await mkdir(path.dirname(input.imagePlanPath), { recursive: true });
  await writeFile(input.imagePlanPath, `${JSON.stringify(input.imageUploadPlan, null, 2)}\n`, "utf8");
}

export function assertKnownApplyStatuses(plan: ControlledCatalogApplyPlan): void {
  const unexpected = Object.keys(plan.statusBreakdown).filter(
    (status) => !knownStatuses.includes(status as ApplyEligibilityStatus),
  );

  if (unexpected.length > 0) {
    throw new Error(`Unexpected apply eligibility statuses: ${unexpected.join(", ")}`);
  }
}
