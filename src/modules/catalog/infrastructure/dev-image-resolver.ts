import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { createCatalogDevImageKey, isCatalogDevImageKey } from "@/modules/catalog/infrastructure/dev-image-keys";
import type {
  CatalogImageUploadPlan,
  CatalogImageUploadPlanItem,
} from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

export type DevCatalogImageResolution =
  | {
      status: "found";
      contentType: string;
      bytes: Uint8Array;
    }
  | {
      status: "not_found" | "disabled";
    };

type DevImageManifestLookup = {
  status: "found" | "not_found" | "disabled";
  item: CatalogImageUploadPlanItem | null;
};

const imageContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function contentTypeForEntry(entry: string): string | null {
  return imageContentTypes[path.extname(entry).toLowerCase()] ?? null;
}

function isSafeZipImageEntry(entry: string): boolean {
  const normalized = entry.normalize("NFKC").replace(/\\/g, "/");
  return (
    normalized.length > 0 &&
    !normalized.startsWith("/") &&
    !normalized.includes("\u0000") &&
    !normalized.split("/").includes("..") &&
    contentTypeForEntry(normalized) !== null
  );
}

function resolveSourcePackagePath(rootDir: string, sourcePackage: string): string | null {
  if (!sourcePackage || sourcePackage.includes("/") || sourcePackage.includes("\\") || sourcePackage.includes(":")) {
    return null;
  }

  const rawDir = path.resolve(rootDir, "imports", "raw", "catalog");
  const resolved = path.resolve(rawDir, sourcePackage);
  const allowedPrefix = `${rawDir}${path.sep}`;

  return resolved.startsWith(allowedPrefix) ? resolved : null;
}

function envFromProcess(): "development" | "test" | "production" {
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    return process.env.NODE_ENV;
  }

  return "development";
}

export function findDevCatalogImagePlanItem(input: {
  imageKey: string;
  preview: CatalogImportPreview;
  imagePlan: CatalogImageUploadPlan;
  nodeEnv: "development" | "test" | "production";
}): DevImageManifestLookup {
  if (input.nodeEnv === "production") {
    return { status: "disabled", item: null };
  }

  if (!isCatalogDevImageKey(input.imageKey)) {
    return { status: "not_found", item: null };
  }

  const eligibleCandidateIds = new Set(
    input.preview.records
      .filter((record) => record.applyEligibility.status === "eligible")
      .map((record) => record.candidateId),
  );

  const item = input.imagePlan.items.find(
    (candidate) =>
      candidate.actualZipEntry &&
      isSafeZipImageEntry(candidate.actualZipEntry) &&
      candidate.imageValidationState === "valid" &&
      eligibleCandidateIds.has(candidate.candidateId) &&
      createCatalogDevImageKey(candidate) === input.imageKey,
  );

  return item ? { status: "found", item } : { status: "not_found", item: null };
}

export async function resolveDevCatalogImage(input: {
  imageKey: string;
  rootDir?: string;
  nodeEnv?: "development" | "test" | "production";
  previewPath?: string;
  imagePlanPath?: string;
}): Promise<DevCatalogImageResolution> {
  const rootDir = input.rootDir ?? process.cwd();
  const nodeEnv = input.nodeEnv ?? envFromProcess();
  const previewPath =
    input.previewPath ?? path.join(rootDir, "imports", "generated", "catalog-import-preview.json");
  const imagePlanPath =
    input.imagePlanPath ?? path.join(rootDir, "imports", "generated", "catalog-image-upload-plan.json");

  if (nodeEnv === "production") {
    return { status: "disabled" };
  }

  const preview = await readJsonFile<CatalogImportPreview>(previewPath);
  const imagePlan = await readJsonFile<CatalogImageUploadPlan>(imagePlanPath);
  const lookup = findDevCatalogImagePlanItem({
    imageKey: input.imageKey,
    preview,
    imagePlan,
    nodeEnv,
  });

  if (lookup.status !== "found" || !lookup.item?.actualZipEntry) {
    return { status: lookup.status === "disabled" ? "disabled" : "not_found" };
  }

  const sourcePackagePath = resolveSourcePackagePath(rootDir, lookup.item.sourcePackage);
  const contentType = contentTypeForEntry(lookup.item.actualZipEntry);
  if (!sourcePackagePath || !contentType) {
    return { status: "not_found" };
  }

  const zipBytes = await readFile(sourcePackagePath);
  const zip = await JSZip.loadAsync(zipBytes);
  const file = zip.file(lookup.item.actualZipEntry);

  if (!file) {
    return { status: "not_found" };
  }

  return {
    status: "found",
    contentType,
    bytes: await file.async("uint8array"),
  };
}
