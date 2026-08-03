/**
 * Casio photo-archive manifest builder (docs/CATALOG_SHOWROOM_RECOVERY.md "Casio updated photo
 * archive", Phase 3.3). Reads the source archive and the existing catalog preview read-only —
 * never modifies either — and matches archive folders to real catalog references by EXACT
 * normalized reference equality only, nothing approximate or score-based: an archive folder
 * either names a real catalog reference exactly (after the same normalization the catalog itself
 * uses) or it is recorded as unmatched and left untouched. This deliberately ignores the archive's
 * own companion spreadsheet's family-based fallback assignments for un-photographed references
 * (see the archive's "Источники_фото" sheet) — those are approximate substitutions the source
 * author made, and using them here would violate the exact-match-only requirement; a folder is
 * only ever used for the reference it is literally named after. Every accepted image
 * is assigned to at most one catalog reference, enforced with a `Map<string, string>` from zip
 * entry to the reference it was assigned to.
 *
 * Primary-image selection cannot rely on filename convention the way the Orient archive's "front"
 * keyword did — this archive's files are just `{REFERENCE}_{N}.jpg` with no semantic hint, and
 * position 1 is not reliably the front view (verified: AE-1200WH-1BV-style folders in this same
 * catalog have shown position 1 can be a caseback). Every folder whose current catalog primary is
 * missing was therefore visually inspected by hand; `PRIMARY_OVERRIDES` records the confirmed
 * clean front/three-quarter file for each. A folder not listed here contributes gallery images
 * only — never an unverified guess at a primary.
 *
 * Run with: npx tsx src/modules/catalog/cli/casio-photo-archive-manifest.ts
 * Output: .tmp/casio-photo-import/manifest.json (gitignored; never committed).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import { readImageDimensions } from "@/modules/catalog/infrastructure/image-dimensions";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import {
  DEFAULT_CASIO_ARCHIVE_PATH,
  CASIO_MANIFEST_OUTPUT_PATH,
  type CasioManifestCatalogGap,
  type CasioManifestEntry,
  type CasioManifestRejectedFile,
  type CasioManifestUnmatchedFolder,
  type CasioPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

export {
  DEFAULT_CASIO_ARCHIVE_PATH,
  CASIO_MANIFEST_OUTPUT_PATH,
  type CasioManifestCatalogGap,
  type CasioManifestEntry,
  type CasioManifestRejectedFile,
  type CasioManifestUnmatchedFolder,
  type CasioPhotoArchiveManifest,
} from "@/modules/catalog/infrastructure/casio-photo-archive-types";

const ARCHIVE_IMAGE_ROOT = "images/Casio/";

/**
 * Confirmed by direct visual inspection (see the doc comment above) — every entry here names a
 * real file that was verified to be a clean straight-on or slight three-quarter front view of the
 * watch, never a caseback/clasp/wrist-lifestyle/extreme-crop shot. Only used to *set a new
 * primary*; a folder absent from this map contributes gallery images only.
 */
const PRIMARY_OVERRIDES: Record<string, string> = {
  "DW-5000R-1": "DW-5000R-1_1.jpg",
  "DW-5040PG-1": "DW-5040PG-1_1.jpg",
  "GA-110GW-7ADR": "GA-110GW-7ADR_1.jpg",
  "GA-110MB-1ADR": "GA-110MB-1ADR_1.jpg",
  "GA-110RG-7ADR": "GA-110RG-7ADR_1.jpg",
  "GA-2100AH-6A": "GA-2100AH-6A_1.jpg",
  "GA-B001AH-6": "GA-B001AH-6_1.jpg",
  "GA-B2100-2ADR": "GA-B2100-2ADR_4.jpg",
  "GA-B2100-3ADR": "GA-B2100-3ADR_3.jpg",
  "GA-B2100FC-1": "GA-B2100FC-1_1.jpg",
  "GBD-200-7": "GBD-200-7_1.jpg",
  "GBM-2100-1A": "GBM-2100-1A_1.jpg",
  "GBM-2100A-1A2": "GBM-2100A-1A2_1.jpg",
  "GBM-2100A-1A3": "GBM-2100A-1A3_1.jpg",
  "GBM-2100A-2B": "GBM-2100A-2B_1.jpg",
  "GBM-2100A-8B": "GBM-2100A-8B_1.jpg",
  "GBX-100NS-1": "GBX-100NS-1_1.jpg",
  "GBX-100S-1": "GBX-100S-1_1.jpg",
  "GBX-100S-2": "GBX-100S-2_1.jpg",
  "GM-110-1A": "GM-110-1A_1.jpg",
  "GM-110BB-1": "GM-110BB-1_1.jpg",
  "GM-21000MWG-1A": "GM-21000MWG-1A_1.jpg",
  "GMW-B5000-1": "GMW-B5000-1_1.jpg",
  "GMW-B5000D-1": "GMW-B5000D-1_2.jpg",
  "GMW-B5000D-1C": "GMW-B5000D-1C_2.jpg",
  "GMW-B5000D-3": "GMW-B5000D-3_1.jpg",
  "GMW-B5000GD-1": "GMW-B5000GD-1_1.jpg",
  "GMW-B5000GD-9": "GMW-B5000GD-9_1.jpg",
  "GMW-B5000PB-6": "GMW-B5000PB-6_1.jpg",
  "GMW-B5000PC-1": "GMW-B5000PC-1_2.jpg",
  "GMW-B5000TVA-1": "GMW-B5000TVA-1_1.jpg",
  "GW-5000HS-1": "GW-5000HS-1_1.jpg",
  "GW-5000U-1": "GW-5000U-1_1.jpg",
  "GW-B56000-BC1B": "GW-B56000-BC1B_1.jpg",
  "GW-B5600BL-1": "GW-B5600BL-1_1.jpg",
  "GWF-A1000BRT": "GWF-A1000BRT_1.jpg",
  "GWG-B1000-1A": "GWG-B1000-1A_1.jpg",
  "MRG-B-1000B-1A": "MRG-B-1000B-1A_1.jpg",
  "MRG-B1000D-1A": "MRG-B1000D-1A_1.jpg",
  "MRG-B2000B-1A": "MRG-B2000B-1A_1.jpg",
  "MRG-B2000R-1A": "MRG-B2000R-1A_1.jpg",
  "MRG-B5000B-1": "MRG-B5000B-1_1.jpg",
  "MRG-B5000BA-1": "MRG-B5000BA-1_1.jpg",
  "MRG-B5000D-1": "MRG-B5000D-1_1.jpg",
  "MTG-B3000-1A": "MTG-B3000-1A_1.jpg",
  "MTG-B3000B-1A": "MTG-B3000B-1A_1.jpg",
  "MTG-B3000BD-1A": "MTG-B3000BD-1A_1.jpg",
  "MTG-B3000BD-1A2": "MTG-B3000BD-1A2_1.jpg",
  "MTG-B3000D-1A": "MTG-B3000D-1A_1.jpg",
  "MTG-B3000D-1A9": "MTG-B3000D-1A9_1.jpg",
};

/**
 * Visually confirmed to be unsuitable even as a secondary gallery photo — a wrist/lifestyle shot
 * (GA-B2100-2ADR_1, GA-B2100-3ADR_1) or an extreme macro crop that shows neither the full case nor
 * a useful detail feature (GMW-B5000PC-1_1, GMW-B5000GD-1_2). Every other file in every folder is
 * a legitimate secondary angle (side profile, caseback, bracelet detail) per the project's gallery
 * policy and is kept.
 */
const GALLERY_REJECT_FILENAMES = new Set(["GA-B2100-2ADR_1.jpg", "GA-B2100-3ADR_1.jpg", "GMW-B5000PC-1_1.jpg", "GMW-B5000GD-1_2.jpg"]);

export function parseCasioZipFolderReference(folder: string): string | null {
  return /^[A-Z0-9][A-Z0-9.\-]*$/i.test(folder) ? folder : null;
}

/**
 * Orders one folder's files deterministically (numeric filename order), separates out any file on
 * the gallery reject list, and — only for a folder present in `PRIMARY_OVERRIDES` — pulls the
 * confirmed-clean file out as the primary candidate. A folder absent from the override map never
 * gets a primary assignment here, however many files it has.
 */
export function selectCasioFolderImages(
  folder: string,
  entries: string[],
): { primary: string | null; gallery: string[]; rejected: CasioManifestRejectedFile[] } {
  const rejected: CasioManifestRejectedFile[] = [];
  const accepted: string[] = [];

  for (const entry of entries) {
    const filename = entry.split("/").pop() ?? entry;
    if (GALLERY_REJECT_FILENAMES.has(filename)) {
      rejected.push({ zipEntry: entry, reason: "unsuitable-context" });
      continue;
    }
    accepted.push(entry);
  }

  accepted.sort();

  const overrideFilename = PRIMARY_OVERRIDES[folder];
  const primary = overrideFilename ? (accepted.find((entry) => entry.endsWith(`/${overrideFilename}`)) ?? null) : null;
  const gallery = primary ? accepted.filter((entry) => entry !== primary) : accepted;

  return { primary, gallery, rejected };
}

export function buildCasioPhotoArchiveManifest(input: {
  zipEntriesByFolder: Map<string, string[]>;
  casioCatalogReferences: Array<{ referenceDisplay: string; referenceNormalized: string }>;
  sourceArchive: string;
  dimensionsFor: (zipEntry: string) => { width: number; height: number } | null;
}): CasioPhotoArchiveManifest {
  const catalogByNormalized = new Map(input.casioCatalogReferences.map((ref) => [ref.referenceNormalized, ref]));
  const entries: CasioManifestEntry[] = [];
  const unmatchedFolders: CasioManifestUnmatchedFolder[] = [];
  const rejectedFiles: CasioManifestRejectedFile[] = [];
  // Enforces "never assign one archive file to more than one catalog reference" — every accepted
  // zip entry is inserted here exactly once before it's added to `entries`.
  const assignedZipEntries = new Map<string, string>();
  const matchedReferences = new Set<string>();

  for (const folder of [...input.zipEntriesByFolder.keys()].sort()) {
    const rawReference = parseCasioZipFolderReference(folder);
    if (!rawReference) continue;

    const normalizedReference = normalizeManufacturerReference(rawReference);
    const catalogMatch = catalogByNormalized.get(normalizedReference);
    if (!catalogMatch) {
      unmatchedFolders.push({ folder, normalizedReference, reason: "unmatched" });
      continue;
    }

    matchedReferences.add(catalogMatch.referenceNormalized);
    const { primary, gallery, rejected } = selectCasioFolderImages(folder, input.zipEntriesByFolder.get(folder)!);
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
        brandSlug: "casio",
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

  const catalogReferencesWithoutSourceFolder: CasioManifestCatalogGap[] = input.casioCatalogReferences
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
  const archivePath = path.join(rootDir, DEFAULT_CASIO_ARCHIVE_PATH);

  const preview = await readJsonFile<CatalogImportPreview>(path.join(rootDir, "imports/generated/catalog-import-preview.json"));
  const imagePlan = await readJsonFile<CatalogImageUploadPlan>(path.join(rootDir, "imports/generated/catalog-image-upload-plan.json"));
  const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
  const casioCatalogReferences = dataset.watches
    .filter((watch) => watch.brandSlug === "casio")
    .map((watch) => ({ referenceDisplay: watch.referenceDisplay, referenceNormalized: watch.referenceNormalized }));

  const zipBuffer = await readFile(archivePath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const zipEntriesByFolder = new Map<string, string[]>();
  for (const entry of Object.keys(zip.files)) {
    if (zip.files[entry]!.dir) continue;
    if (!entry.startsWith(ARCHIVE_IMAGE_ROOT)) continue;
    const rest = entry.slice(ARCHIVE_IMAGE_ROOT.length);
    const parts = rest.split("/");
    if (parts.length < 2) continue;
    const folder = parts[0]!;
    if (!zipEntriesByFolder.has(folder)) zipEntriesByFolder.set(folder, []);
    zipEntriesByFolder.get(folder)!.push(entry);
  }

  const dimensionsCache = new Map<string, { width: number; height: number } | null>();
  const dimensionsFor = (zipEntry: string) => dimensionsCache.get(zipEntry) ?? null;

  for (const files of zipEntriesByFolder.values()) {
    for (const entry of files) {
      const buffer = await zip.files[entry]!.async("nodebuffer");
      dimensionsCache.set(entry, readImageDimensions(buffer));
    }
  }

  const manifest = buildCasioPhotoArchiveManifest({
    zipEntriesByFolder,
    casioCatalogReferences,
    sourceArchive: DEFAULT_CASIO_ARCHIVE_PATH,
    dimensionsFor,
  });

  const outputPath = path.join(rootDir, CASIO_MANIFEST_OUTPUT_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");

  const primaryCount = manifest.entries.filter((entry) => entry.position === "primary").length;
  const galleryCount = manifest.entries.filter((entry) => entry.position === "gallery").length;
  console.log("Casio photo-archive manifest written to", CASIO_MANIFEST_OUTPUT_PATH);
  console.log("catalog Casio references:", casioCatalogReferences.length);
  console.log("exact-matched folders:", zipEntriesByFolder.size - manifest.unmatchedFolders.length, "/", zipEntriesByFolder.size);
  console.log("primary images assigned (verified upgrades):", primaryCount);
  console.log("gallery images assigned:", galleryCount);
  console.log("unmatched archive folders:", manifest.unmatchedFolders.length, manifest.unmatchedFolders);
  console.log("rejected files (quality):", manifest.rejectedFiles.length, manifest.rejectedFiles);
  console.log(
    "catalog references with no source folder:",
    manifest.catalogReferencesWithoutSourceFolder.length,
    manifest.catalogReferencesWithoutSourceFolder,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Casio photo-archive manifest error.";
  console.error(`Casio photo-archive manifest failed: ${message}`);
  process.exitCode = 1;
});
