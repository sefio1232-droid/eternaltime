/**
 * Shared constants/types for the Orient photo archive (manifest builder, resolver, and the
 * preview adapter that consumes it). Kept side-effect-free and separate from the CLI script
 * (orient-photo-archive-manifest.ts) on purpose — that script runs a real `main()` at module
 * scope, so nothing that loads at request time may import a value from it.
 */

export const DEFAULT_ORIENT_ARCHIVE_PATH = "incoming/orient_catalog_FULL_001-079.zip";
export const ORIENT_MANIFEST_OUTPUT_PATH = ".tmp/orient-photo-import/manifest.json";

export type OrientManifestEntry = {
  catalogReference: string;
  referenceNormalized: string;
  brandSlug: "orient";
  zipEntry: string;
  sourceFilename: string;
  width: number | null;
  height: number | null;
  position: "primary" | "gallery";
  galleryIndex: number | null;
  matchConfidence: "exact";
};

export type OrientManifestUnmatchedFolder = {
  folder: string;
  normalizedReference: string;
  reason: "unmatched";
};

export type OrientManifestRejectedFile = {
  zipEntry: string;
  reason: string;
};

export type OrientManifestCatalogGap = {
  catalogReference: string;
  referenceNormalized: string;
  reason: "no_source_folder";
};

export type OrientPhotoArchiveManifest = {
  generatedAt: string;
  sourceArchive: string;
  entries: OrientManifestEntry[];
  unmatchedFolders: OrientManifestUnmatchedFolder[];
  rejectedFiles: OrientManifestRejectedFile[];
  catalogReferencesWithoutSourceFolder: OrientManifestCatalogGap[];
};
