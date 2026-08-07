/**
 * Shared constants/types for the Tissot photo archive (manifest builder, resolver, and the preview
 * adapter that consumes it) — mirrors orient-photo-archive-types.ts / casio-photo-archive-types.ts,
 * with one structural difference: the real Tissot photo assets found on this machine come from two
 * separate sources (docs/CATALOG_SHOWROOM_RECOVERY.md "Tissot photo gap") — the main archive
 * (`incoming/tissot_FULL_CATALOG_1-193.zip`, one zip with one folder per reference, like Orient/
 * Casio) plus a handful of extra per-reference zips assembled for the homepage hero feature — so
 * each manifest entry records its own archive file (repo-root-relative), not just a zip-internal
 * path against one fixed default archive.
 */

export const TISSOT_MANIFEST_OUTPUT_PATH = ".tmp/tissot-photo-import/manifest.json";

/** One of the taxonomy types from docs/CATALOG_SHOWROOM_RECOVERY.md "Image taxonomy" that this
 * archive's filenames can actually express — used only to order the gallery and pick a primary,
 * never shown to a user as raw text. */
export type TissotImageType =
  | "front"
  | "three-quarter"
  | "caseback"
  | "dial-detail"
  | "strap-detail"
  | "lifestyle";

export type TissotManifestEntry = {
  catalogReference: string;
  referenceNormalized: string;
  brandSlug: "tissot";
  /** Repo-root-relative path to the zip file this entry's bytes live in — may be the main archive
   * or one of the supplemental per-reference zips. */
  archiveFile: string;
  zipEntry: string;
  sourceFilename: string;
  imageType: TissotImageType;
  width: number | null;
  height: number | null;
  position: "primary" | "gallery";
  galleryIndex: number | null;
  matchConfidence: "exact";
};

export type TissotManifestUnmatchedFolder = {
  archiveFile: string;
  folder: string;
  normalizedReference: string;
  reason: "unmatched";
};

export type TissotManifestRejectedFile = {
  zipEntry: string;
  reason: string;
};

export type TissotManifestCatalogGap = {
  catalogReference: string;
  referenceNormalized: string;
  reason: "no_source_archive";
};

export type TissotPhotoArchiveManifest = {
  generatedAt: string;
  sourceArchives: string[];
  entries: TissotManifestEntry[];
  unmatchedFolders: TissotManifestUnmatchedFolder[];
  rejectedFiles: TissotManifestRejectedFile[];
  catalogReferencesWithoutSourceFolder: TissotManifestCatalogGap[];
};
