/**
 * Tissot photo-archive manifest builder (docs/CATALOG_SHOWROOM_RECOVERY.md "Tissot photo gap").
 * Mirrors orient-photo-archive-manifest.ts / casio-photo-archive-manifest.ts: reads the source
 * archives and the existing catalog preview read-only — never modifies either — and matches a zip
 * folder/file to a real catalog Tissot reference by EXACT normalized reference equality only,
 * nothing approximate. Two real sources are merged here, in priority order:
 *
 * 1. `incoming/tissot_FULL_CATALOG_1-193.zip` — the main archive (one zip, one folder per
 *    reference, official tissotwatches.com photography, semantically-named files: front, profile,
 *    back, wrist, detail1-4, strapzoom, amb). Its own README.txt documents 160/193 references have
 *    photos; the other 33 are either discontinued everywhere or never had enough source photos —
 *    never guessed or substituted here.
 * 2. `imports/raw/home-hero/final/*.zip` — a handful of extra per-reference zips assembled for the
 *    homepage hero feature (generic `i.webp` / `i (N).webp` naming, no semantic hint). Used only
 *    to fill in a reference the main archive doesn't have (e.g. T120.807.33.051.00, which the main
 *    archive's own README lists as discontinued/skipped but a real photo exists here anyway).
 *
 * Run with: npx tsx src/modules/catalog/cli/tissot-photo-archive-manifest.ts
 * Output: .tmp/tissot-photo-import/manifest.json (gitignored; never committed).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import { readImageDimensions } from "@/modules/catalog/infrastructure/image-dimensions";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import {
  TISSOT_MANIFEST_OUTPUT_PATH,
  type TissotImageType,
  type TissotManifestCatalogGap,
  type TissotManifestEntry,
  type TissotManifestRejectedFile,
  type TissotManifestUnmatchedFolder,
  type TissotPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/tissot-photo-archive-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

export {
  TISSOT_MANIFEST_OUTPUT_PATH,
  type TissotImageType,
  type TissotManifestCatalogGap,
  type TissotManifestEntry,
  type TissotManifestRejectedFile,
  type TissotManifestUnmatchedFolder,
  type TissotPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/tissot-photo-archive-types";

export const MAIN_TISSOT_ARCHIVE_PATH = "incoming/tissot_FULL_CATALOG_1-193.zip";
export const SUPPLEMENTAL_TISSOT_ARCHIVE_DIR = "imports/raw/home-hero/final";

/** Gallery display order (docs/CATALOG_SHOWROOM_RECOVERY.md "Image taxonomy" §8.1/§29) expressed
 * as a numeric rank — front is handled separately as the primary, everything else sorts by this. */
const GALLERY_TYPE_RANK: Record<Exclude<TissotImageType, "front">, number> = {
  "three-quarter": 0,
  caseback: 1,
  "dial-detail": 2,
  "strap-detail": 3,
  lifestyle: 4,
};

/** Maps this archive's own documented filename suffixes (README.txt: "front (лицевое), profile
 * (профиль), back (задняя крышка), wrist (на запястье), detail1/detail2 (детали циферблата/
 * ремешка)") to the shared taxonomy — a plain, declared lookup, never a guess about image content
 * beyond what the filename itself says. */
function classifyMainArchiveFilename(filename: string): TissotImageType | null {
  const stem = filename.replace(/\.(jpe?g|png)$/i, "");
  if (/_front$/i.test(stem)) return "front";
  if (/_profile$/i.test(stem)) return "three-quarter";
  if (/_back$/i.test(stem)) return "caseback";
  if (/_strapzoom$/i.test(stem)) return "strap-detail";
  // "_detail", "_detail1".."_detail4", and the one "_04_detail" outlier all describe a dial/strap
  // close-up per the archive's own README — treated as one dial-detail bucket, since the filename
  // doesn't distinguish further and guessing which would risk a wrong label.
  if (/_(\d+_)?detail\d*$/i.test(stem)) return "dial-detail";
  // "wrist" (on-wrist) and "set" (a handful of flat-lay/box-and-watch shots) are both context
  // shots, not the product alone — grouped with lifestyle, always last, never primary.
  if (/_(wrist|amb|set)$/i.test(stem)) return "lifestyle";
  return null;
}

function parseMainArchiveFolderName(folder: string): string | null {
  return folder;
}

type TissotCatalogReference = {
  referenceDisplay: string;
  referenceNormalized: string;
};

function componentReferenceKeys(ref: TissotCatalogReference): string[] {
  return ref.referenceDisplay
    .split(/\s*\+\s*/)
    .map((part) => normalizeManufacturerReference(part))
    .filter((part) => part.length > 0 && part !== ref.referenceNormalized);
}

export function selectMainArchiveImages(
  entries: Array<{ zipEntry: string; filename: string }>,
): {
  primary: { zipEntry: string; type: TissotImageType } | null;
  gallery: Array<{ zipEntry: string; type: TissotImageType }>;
  rejected: TissotManifestRejectedFile[];
} {
  const rejected: TissotManifestRejectedFile[] = [];
  const classified: Array<{ zipEntry: string; type: TissotImageType }> = [];

  for (const { zipEntry, filename } of entries) {
    const type = classifyMainArchiveFilename(filename);
    if (!type) {
      rejected.push({ zipEntry, reason: "unrecognized-filename" });
      continue;
    }
    classified.push({ zipEntry, type });
  }

  const primaryIndex = classified.findIndex((file) => file.type === "front");
  const primary = primaryIndex === -1 ? null : classified[primaryIndex]!;
  const gallery = classified
    .filter((_file, index) => index !== primaryIndex)
    .sort((left, right) => GALLERY_TYPE_RANK[left.type as Exclude<TissotImageType, "front">] - GALLERY_TYPE_RANK[right.type as Exclude<TissotImageType, "front">]);

  return { primary, gallery, rejected };
}

/** Files are plain "i.webp" / "i (1).webp" / "i (2).webp" with no semantic front/back hint — the
 * bare "i.webp" (no parenthetical number) is treated as the primary, every numbered file as a
 * lifestyle-ranked gallery angle ordered by its number (this source has no richer taxonomy). */
function rankSupplementalFilename(filename: string): { rank: number; numeric: number } {
  const match = /\((\d+)\)/.exec(filename);
  return match ? { rank: 1, numeric: Number(match[1]) } : { rank: 0, numeric: 0 };
}

export function selectSupplementalArchiveImages(entries: string[]): {
  primary: string | null;
  gallery: string[];
} {
  const ranked = entries
    .map((entry) => ({ entry, ...rankSupplementalFilename(entry.split("/").pop() ?? entry) }))
    .sort((left, right) => (left.rank !== right.rank ? left.rank - right.rank : left.numeric - right.numeric));

  const primaryIndex = ranked.findIndex((file) => file.rank === 0);
  const primary = primaryIndex === -1 ? null : ranked[primaryIndex]!.entry;
  const gallery = ranked.filter((_file, index) => index !== primaryIndex).map((file) => file.entry);

  return { primary, gallery };
}

export function buildTissotPhotoArchiveManifest(input: {
  mainArchiveFile: string;
  mainArchiveEntriesByFolder: Map<string, Array<{ zipEntry: string; filename: string }>>;
  supplementalArchiveFiles: Map<string, string[]>;
  tissotCatalogReferences: TissotCatalogReference[];
  dimensionsFor: (archiveFile: string, zipEntry: string) => { width: number; height: number } | null;
}): TissotPhotoArchiveManifest {
  const catalogByNormalized = new Map(input.tissotCatalogReferences.map((ref) => [ref.referenceNormalized, ref]));
  const mainArchiveByNormalized = new Map(
    [...input.mainArchiveEntriesByFolder.entries()]
      .map(([folder, folderEntries]) => {
        const rawReference = parseMainArchiveFolderName(folder);
        return rawReference ? [normalizeManufacturerReference(rawReference), { folder, folderEntries }] : null;
      })
      .filter((entry): entry is [string, { folder: string; folderEntries: Array<{ zipEntry: string; filename: string }> }] => entry !== null),
  );
  const supplementalArchiveByNormalized = new Map(
    [...input.supplementalArchiveFiles.entries()]
      .map(([archiveFile, zipEntries]) => {
        const fileName = path.basename(archiveFile);
        const rawReference = fileName.toLowerCase().endsWith(".zip") ? fileName.slice(0, -4) : null;
        return rawReference ? [normalizeManufacturerReference(rawReference), { archiveFile, zipEntries }] : null;
      })
      .filter((entry): entry is [string, { archiveFile: string; zipEntries: string[] }] => entry !== null),
  );
  const entries: TissotManifestEntry[] = [];
  const unmatchedFolders: TissotManifestUnmatchedFolder[] = [];
  const rejectedFiles: TissotManifestRejectedFile[] = [];
  const matchedReferences = new Set<string>();

  const assign = (
    catalogMatch: TissotCatalogReference,
    sourceReferenceNormalized: string,
    archiveFile: string,
    zipEntry: string,
    imageType: TissotImageType,
    position: "primary" | "gallery",
    galleryIndex: number | null,
    matchConfidence: TissotManifestEntry["matchConfidence"],
  ) => {
    const dimensions = input.dimensionsFor(archiveFile, zipEntry);
    entries.push({
      catalogReference: catalogMatch.referenceDisplay,
      referenceNormalized: catalogMatch.referenceNormalized,
      sourceReferenceNormalized,
      brandSlug: "tissot",
      archiveFile,
      zipEntry,
      sourceFilename: zipEntry.split("/").pop() ?? zipEntry,
      imageType,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      position,
      galleryIndex,
      matchConfidence,
    });
  };

  // Source 1: the main archive — takes priority for any reference it covers.
  for (const folder of [...input.mainArchiveEntriesByFolder.keys()].sort()) {
    const rawReference = parseMainArchiveFolderName(folder);
    if (!rawReference) continue;

    const normalizedReference = normalizeManufacturerReference(rawReference);
    const catalogMatch = catalogByNormalized.get(normalizedReference);
    if (!catalogMatch) {
      unmatchedFolders.push({ archiveFile: input.mainArchiveFile, folder, normalizedReference, reason: "unmatched" });
      continue;
    }

    matchedReferences.add(catalogMatch.referenceNormalized);
    const folderEntries = input.mainArchiveEntriesByFolder.get(folder)!;
    const { primary, gallery, rejected } = selectMainArchiveImages(folderEntries);
    rejectedFiles.push(...rejected);

    if (primary) {
      assign(catalogMatch, normalizedReference, input.mainArchiveFile, primary.zipEntry, primary.type, "primary", null, "exact");
    }
    gallery.forEach((file, index) => assign(catalogMatch, normalizedReference, input.mainArchiveFile, file.zipEntry, file.type, "gallery", index, "exact"));
  }

  // Source 2: the supplemental per-reference zips — only ever fills in a reference the main
  // archive didn't already match (this directory also contains Casio/Orient references, which
  // simply won't match any Tissot catalog reference here and land in unmatchedFolders).
  for (const archiveFile of [...input.supplementalArchiveFiles.keys()].sort()) {
    const fileName = path.basename(archiveFile);
    const rawReference = fileName.toLowerCase().endsWith(".zip") ? fileName.slice(0, -4) : null;
    if (!rawReference) continue;

    const normalizedReference = normalizeManufacturerReference(rawReference);
    const catalogMatch = catalogByNormalized.get(normalizedReference);
    if (!catalogMatch) {
      unmatchedFolders.push({ archiveFile, folder: rawReference, normalizedReference, reason: "unmatched" });
      continue;
    }

    if (matchedReferences.has(catalogMatch.referenceNormalized)) {
      continue;
    }

    matchedReferences.add(catalogMatch.referenceNormalized);
    const { primary, gallery } = selectSupplementalArchiveImages(input.supplementalArchiveFiles.get(archiveFile)!);

    if (primary) {
      assign(catalogMatch, normalizedReference, archiveFile, primary, "front", "primary", null, "exact");
    }
    gallery.forEach((zipEntry, index) => assign(catalogMatch, normalizedReference, archiveFile, zipEntry, "lifestyle", "gallery", index, "exact"));
  }

  // Some public Tissot rows are deliberate pair/set records (`A + B`). The archive has one folder
  // per individual reference, so the combined public identity will not match the folder name as a
  // whole. Fill only those set records whose own displayed components contain an exact archive
  // reference; never borrow a visually similar model.
  for (const catalogMatch of input.tissotCatalogReferences) {
    if (matchedReferences.has(catalogMatch.referenceNormalized)) continue;

    for (const sourceReferenceNormalized of componentReferenceKeys(catalogMatch)) {
      const mainArchiveMatch = mainArchiveByNormalized.get(sourceReferenceNormalized);
      if (mainArchiveMatch) {
        matchedReferences.add(catalogMatch.referenceNormalized);
        const { primary, gallery, rejected } = selectMainArchiveImages(mainArchiveMatch.folderEntries);
        rejectedFiles.push(...rejected);

        if (primary) {
          assign(catalogMatch, sourceReferenceNormalized, input.mainArchiveFile, primary.zipEntry, primary.type, "primary", null, "component-exact");
        }
        gallery.forEach((file, index) =>
          assign(catalogMatch, sourceReferenceNormalized, input.mainArchiveFile, file.zipEntry, file.type, "gallery", index, "component-exact"),
        );
        break;
      }

      const supplementalArchiveMatch = supplementalArchiveByNormalized.get(sourceReferenceNormalized);
      if (supplementalArchiveMatch) {
        matchedReferences.add(catalogMatch.referenceNormalized);
        const { primary, gallery } = selectSupplementalArchiveImages(supplementalArchiveMatch.zipEntries);

        if (primary) {
          assign(catalogMatch, sourceReferenceNormalized, supplementalArchiveMatch.archiveFile, primary, "front", "primary", null, "component-exact");
        }
        gallery.forEach((zipEntry, index) =>
          assign(catalogMatch, sourceReferenceNormalized, supplementalArchiveMatch.archiveFile, zipEntry, "lifestyle", "gallery", index, "component-exact"),
        );
        break;
      }
    }
  }

  const catalogReferencesWithoutSourceFolder: TissotManifestCatalogGap[] = input.tissotCatalogReferences
    .filter((ref) => !matchedReferences.has(ref.referenceNormalized))
    .map((ref) => ({ catalogReference: ref.referenceDisplay, referenceNormalized: ref.referenceNormalized, reason: "no_source_archive" }));

  return {
    generatedAt: new Date().toISOString(),
    sourceArchives: [input.mainArchiveFile, ...input.supplementalArchiveFiles.keys()],
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

  const preview = await readJsonFile<CatalogImportPreview>(path.join(rootDir, "imports/generated/catalog-import-preview.json"));
  const imagePlan = await readJsonFile<CatalogImageUploadPlan>(path.join(rootDir, "imports/generated/catalog-image-upload-plan.json"));
  const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
  const tissotCatalogReferences = dataset.watches
    .filter((watch) => watch.brandSlug === "tissot")
    .map((watch) => ({ referenceDisplay: watch.referenceDisplay, referenceNormalized: watch.referenceNormalized }));

  const dimensionsCache = new Map<string, { width: number; height: number } | null>();
  const dimensionsFor = (archiveFile: string, zipEntry: string) => dimensionsCache.get(`${archiveFile}::${zipEntry}`) ?? null;

  // Main archive: one zip, one top-level folder per reference (mirrors Orient/Casio parsing).
  const mainArchiveBuffer = await readFile(path.join(rootDir, MAIN_TISSOT_ARCHIVE_PATH));
  const mainZip = await JSZip.loadAsync(mainArchiveBuffer);
  const mainArchiveEntriesByFolder = new Map<string, Array<{ zipEntry: string; filename: string }>>();
  for (const entry of Object.keys(mainZip.files)) {
    if (mainZip.files[entry]!.dir) continue;
    const parts = entry.split("/");
    if (parts.length < 3 || !entry.toLowerCase().match(/\.(jpe?g|png)$/)) continue;
    const folder = parts[1]!;
    const filename = parts[parts.length - 1]!;
    if (!mainArchiveEntriesByFolder.has(folder)) mainArchiveEntriesByFolder.set(folder, []);
    mainArchiveEntriesByFolder.get(folder)!.push({ zipEntry: entry, filename });
    const buffer = await mainZip.files[entry]!.async("nodebuffer");
    dimensionsCache.set(`${MAIN_TISSOT_ARCHIVE_PATH}::${entry}`, readImageDimensions(buffer));
  }

  // Supplemental per-reference zips.
  const supplementalDir = path.join(rootDir, SUPPLEMENTAL_TISSOT_ARCHIVE_DIR);
  const supplementalFileNames = (await readdir(supplementalDir)).filter((name) => name.toLowerCase().endsWith(".zip"));
  const supplementalArchiveFiles = new Map<string, string[]>();
  for (const fileName of supplementalFileNames) {
    const archiveFile = path.posix.join(SUPPLEMENTAL_TISSOT_ARCHIVE_DIR, fileName);
    const zipBuffer = await readFile(path.join(supplementalDir, fileName));
    const zip = await JSZip.loadAsync(zipBuffer);
    const entries: string[] = [];
    for (const entry of Object.keys(zip.files)) {
      if (zip.files[entry]!.dir) continue;
      entries.push(entry);
      const buffer = await zip.files[entry]!.async("nodebuffer");
      dimensionsCache.set(`${archiveFile}::${entry}`, readImageDimensions(buffer));
    }
    supplementalArchiveFiles.set(archiveFile, entries);
  }

  const manifest = buildTissotPhotoArchiveManifest({
    mainArchiveFile: MAIN_TISSOT_ARCHIVE_PATH,
    mainArchiveEntriesByFolder,
    supplementalArchiveFiles,
    tissotCatalogReferences,
    dimensionsFor,
  });

  const outputPath = path.join(rootDir, TISSOT_MANIFEST_OUTPUT_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");

  const primaryCount = manifest.entries.filter((entry) => entry.position === "primary").length;
  const galleryCount = manifest.entries.filter((entry) => entry.position === "gallery").length;
  console.log("Tissot photo-archive manifest written to", TISSOT_MANIFEST_OUTPUT_PATH);
  console.log("catalog Tissot references:", tissotCatalogReferences.length);
  console.log("main archive folders:", mainArchiveEntriesByFolder.size);
  console.log("supplemental archive files:", supplementalFileNames.length);
  console.log("references matched (front image):", primaryCount);
  console.log("gallery images assigned:", galleryCount);
  console.log("unmatched/non-Tissot archive folders or files:", manifest.unmatchedFolders.length);
  console.log("rejected files (unrecognized filename):", manifest.rejectedFiles.length, manifest.rejectedFiles);
  console.log(
    "catalog Tissot references with no source archive at all:",
    manifest.catalogReferencesWithoutSourceFolder.length,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Tissot photo-archive manifest error.";
  console.error(`Tissot photo-archive manifest failed: ${message}`);
  process.exitCode = 1;
});
