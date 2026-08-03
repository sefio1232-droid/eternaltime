/**
 * Orient photo-archive manifest builder (docs/CATALOG_SHOWROOM_RECOVERY.md "Orient ZIP
 * integration"). Reads the source archive and the existing catalog preview read-only — never
 * modifies either — and matches archive folders to real catalog references by EXACT normalized
 * reference equality only, nothing approximate or score-based: an archive folder either names a
 * real catalog reference exactly (after the same normalization the catalog itself uses) or it is
 * recorded as unmatched and left untouched. Every accepted image is assigned to at most one
 * catalog reference, enforced with a `Map<string, string>` from zip entry to the reference it was
 * assigned to.
 *
 * Run with: npx tsx src/modules/catalog/cli/orient-photo-archive-manifest.ts
 * Output: .tmp/orient-photo-import/manifest.json (gitignored; never committed).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import { readImageDimensions } from "@/modules/catalog/infrastructure/image-dimensions";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import {
  DEFAULT_ORIENT_ARCHIVE_PATH,
  ORIENT_MANIFEST_OUTPUT_PATH,
  type OrientManifestCatalogGap,
  type OrientManifestEntry,
  type OrientManifestRejectedFile,
  type OrientManifestUnmatchedFolder,
  type OrientPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

export {
  DEFAULT_ORIENT_ARCHIVE_PATH,
  ORIENT_MANIFEST_OUTPUT_PATH,
  type OrientManifestCatalogGap,
  type OrientManifestEntry,
  type OrientManifestRejectedFile,
  type OrientManifestUnmatchedFolder,
  type OrientPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/orient-photo-archive-types";

const folderPattern = /^(\d{3})_(.+)$/;

/** Filenames these bad angles/contexts never qualify as primary or gallery candidates, even if a
 * folder otherwise matches exactly — quality rejection, not a matching decision. */
const rejectedImagePattern = /(caseback|back-case|buckle|clasp|reverse-strap|packaging|package|box|lifestyle|wrist|hand-model|diagram)/i;

export function parseOrientZipFolderName(folder: string): { sequence: string; rawReference: string } | null {
  const match = folderPattern.exec(folder);
  return match ? { sequence: match[1]!, rawReference: match[2]! } : null;
}

type RankedFile = { entry: string; filename: string; rank: number; numeric: number };

function rankImageFilename(filename: string): number {
  if (/front/i.test(filename)) return 0;
  if (/official/i.test(filename)) return 1;
  if (/studio/i.test(filename)) return 2;
  return 3;
}

/** Orders a folder's files into a primary pick plus a ranked gallery, and separates out any file
 * that fails the quality bar (never chosen as primary or gallery, whatever the folder match). */
export function selectOrientFolderImages(entries: string[]): {
  primary: string | null;
  gallery: string[];
  rejected: OrientManifestRejectedFile[];
} {
  const rejected: OrientManifestRejectedFile[] = [];
  const accepted: RankedFile[] = [];

  for (const entry of entries) {
    const filename = entry.split("/").pop() ?? entry;
    if (rejectedImagePattern.test(filename)) {
      rejected.push({ zipEntry: entry, reason: "rejected-angle-or-context" });
      continue;
    }

    const numericMatch = /(\d+)/.exec(filename);
    accepted.push({
      entry,
      filename,
      rank: rankImageFilename(filename),
      numeric: numericMatch ? Number(numericMatch[1]) : 0,
    });
  }

  accepted.sort((left, right) => (left.rank !== right.rank ? left.rank - right.rank : left.numeric - right.numeric));

  const frontIndex = accepted.findIndex((file) => file.rank === 0);
  const primary = frontIndex === -1 ? null : accepted[frontIndex]!.entry;
  const gallery = accepted.filter((_file, index) => index !== frontIndex).map((file) => file.entry);

  return { primary, gallery, rejected };
}

export function buildOrientPhotoArchiveManifest(input: {
  zipEntriesByFolder: Map<string, string[]>;
  orientCatalogReferences: Array<{ referenceDisplay: string; referenceNormalized: string }>;
  sourceArchive: string;
  dimensionsFor: (zipEntry: string) => { width: number; height: number } | null;
}): OrientPhotoArchiveManifest {
  const catalogByNormalized = new Map(input.orientCatalogReferences.map((ref) => [ref.referenceNormalized, ref]));
  const entries: OrientManifestEntry[] = [];
  const unmatchedFolders: OrientManifestUnmatchedFolder[] = [];
  const rejectedFiles: OrientManifestRejectedFile[] = [];
  // Enforces "never assign one archive file to more than one catalog reference" — every accepted
  // zip entry is inserted here exactly once before it's added to `entries`.
  const assignedZipEntries = new Map<string, string>();
  const matchedReferences = new Set<string>();

  for (const folder of [...input.zipEntriesByFolder.keys()].sort()) {
    const parsed = parseOrientZipFolderName(folder);
    if (!parsed) continue;

    const normalizedReference = normalizeManufacturerReference(parsed.rawReference);
    const catalogMatch = catalogByNormalized.get(normalizedReference);
    if (!catalogMatch) {
      unmatchedFolders.push({ folder, normalizedReference, reason: "unmatched" });
      continue;
    }

    matchedReferences.add(catalogMatch.referenceNormalized);
    const { primary, gallery, rejected } = selectOrientFolderImages(input.zipEntriesByFolder.get(folder)!);
    rejectedFiles.push(...rejected);

    const assign = (zipEntry: string, position: "primary" | "gallery", galleryIndex: number | null) => {
      if (assignedZipEntries.has(zipEntry)) {
        return;
      }
      assignedZipEntries.set(zipEntry, catalogMatch.referenceDisplay);
      const dimensions = input.dimensionsFor(zipEntry);
      entries.push({
        catalogReference: catalogMatch.referenceDisplay,
        referenceNormalized: catalogMatch.referenceNormalized,
        brandSlug: "orient",
        zipEntry,
        sourceFilename: zipEntry.split("/").pop() ?? zipEntry,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        position,
        galleryIndex,
        matchConfidence: "exact",
      });
    };

    if (primary) {
      assign(primary, "primary", null);
    }
    gallery.forEach((zipEntry, index) => assign(zipEntry, "gallery", index));
  }

  const catalogReferencesWithoutSourceFolder: OrientManifestCatalogGap[] = input.orientCatalogReferences
    .filter((ref) => !matchedReferences.has(ref.referenceNormalized))
    .map((ref) => ({ catalogReference: ref.referenceDisplay, referenceNormalized: ref.referenceNormalized, reason: "no_source_folder" }));

  return {
    generatedAt: new Date().toISOString(),
    sourceArchive: input.sourceArchive,
    entries,
    unmatchedFolders,
    rejectedFiles,
    catalogReferencesWithoutSourceFolder,
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function main() {
  const rootDir = process.cwd();
  const archivePath = path.join(rootDir, DEFAULT_ORIENT_ARCHIVE_PATH);

  const preview = await readJsonFile<CatalogImportPreview>(path.join(rootDir, "imports/generated/catalog-import-preview.json"));
  const imagePlan = await readJsonFile<CatalogImageUploadPlan>(path.join(rootDir, "imports/generated/catalog-image-upload-plan.json"));
  const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
  const orientCatalogReferences = dataset.watches
    .filter((watch) => watch.brandSlug === "orient")
    .map((watch) => ({ referenceDisplay: watch.referenceDisplay, referenceNormalized: watch.referenceNormalized }));

  const zipBuffer = await readFile(archivePath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const zipEntriesByFolder = new Map<string, string[]>();
  for (const entry of Object.keys(zip.files)) {
    if (zip.files[entry]!.dir) continue;
    const parts = entry.split("/");
    if (parts.length < 2) continue;
    const folder = parts[0]!;
    if (!zipEntriesByFolder.has(folder)) zipEntriesByFolder.set(folder, []);
    zipEntriesByFolder.get(folder)!.push(entry);
  }

  const dimensionsCache = new Map<string, { width: number; height: number } | null>();
  const dimensionsFor = (zipEntry: string) => dimensionsCache.get(zipEntry) ?? null;

  // Pre-read every candidate file once so `buildOrientPhotoArchiveManifest` stays a pure,
  // synchronous, directly-testable function.
  for (const files of zipEntriesByFolder.values()) {
    for (const entry of files) {
      const buffer = await zip.files[entry]!.async("nodebuffer");
      dimensionsCache.set(entry, readImageDimensions(buffer));
    }
  }

  const manifest = buildOrientPhotoArchiveManifest({
    zipEntriesByFolder,
    orientCatalogReferences,
    sourceArchive: DEFAULT_ORIENT_ARCHIVE_PATH,
    dimensionsFor,
  });

  const outputPath = path.join(rootDir, ORIENT_MANIFEST_OUTPUT_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");

  const primaryCount = manifest.entries.filter((entry) => entry.position === "primary").length;
  const galleryCount = manifest.entries.filter((entry) => entry.position === "gallery").length;
  console.log("Orient photo-archive manifest written to", ORIENT_MANIFEST_OUTPUT_PATH);
  console.log("catalog Orient references:", orientCatalogReferences.length);
  console.log("exact-matched references (primary image found):", primaryCount);
  console.log("gallery images assigned:", galleryCount);
  console.log("unmatched archive folders:", manifest.unmatchedFolders.length, manifest.unmatchedFolders);
  console.log("rejected files (quality):", manifest.rejectedFiles.length);
  console.log("catalog references with no source folder:", manifest.catalogReferencesWithoutSourceFolder.length, manifest.catalogReferencesWithoutSourceFolder);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Orient photo-archive manifest error.";
  console.error(`Orient photo-archive manifest failed: ${message}`);
  process.exitCode = 1;
});
