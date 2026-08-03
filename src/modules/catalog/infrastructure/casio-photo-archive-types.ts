/**
 * Shared constants/types for the Casio photo archive (manifest builder, resolver, and the preview
 * adapter that consumes it) — mirrors orient-photo-archive-types.ts. Kept side-effect-free and
 * separate from the CLI script (casio-photo-archive-manifest.ts) on purpose — that script runs a
 * real `main()` at module scope, so nothing that loads at request time may import a value from it.
 */

export const DEFAULT_CASIO_ARCHIVE_PATH = "incoming/casio_for_it_all_photos_UPDATED.zip";
export const CASIO_MANIFEST_OUTPUT_PATH = ".tmp/casio-photo-import/manifest.json";

export type CasioManifestEntry = {
  catalogReference: string;
  referenceNormalized: string;
  brandSlug: "casio";
  zipEntry: string;
  sourceFilename: string;
  width: number | null;
  height: number | null;
  position: "primary" | "gallery";
  galleryIndex: number | null;
  matchConfidence: "exact";
};

export type CasioManifestUnmatchedFolder = {
  folder: string;
  normalizedReference: string;
  reason: "unmatched";
};

export type CasioManifestRejectedFile = {
  zipEntry: string;
  reason: string;
};

export type CasioManifestCatalogGap = {
  catalogReference: string;
  referenceNormalized: string;
  reason: "no_source_folder";
};

export type CasioPhotoArchiveManifest = {
  generatedAt: string;
  sourceArchive: string;
  entries: CasioManifestEntry[];
  unmatchedFolders: CasioManifestUnmatchedFolder[];
  rejectedFiles: CasioManifestRejectedFile[];
  catalogReferencesWithoutSourceFolder: CasioManifestCatalogGap[];
};
