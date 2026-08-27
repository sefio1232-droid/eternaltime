export const CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH = "src/content/catalog/citizen-official-photo-manifest.json";
export const CITIZEN_OFFICIAL_PUBLIC_ASSET_ROOT = "/generated/catalog/citizen-official";
export const CITIZEN_OFFICIAL_PUBLIC_ASSET_DIR = "public/generated/catalog/citizen-official";

export type CitizenOfficialPhotoImportStatus =
  | "success"
  | "success_with_limited_images"
  | "manual_review"
  | "official_source_not_resolved"
  | "model_not_found_in_database"
  | "download_failed"
  | "upload_failed";

export type CitizenOfficialPhotoManifestEntry = {
  catalogReference: string;
  referenceNormalized: string;
  brandSlug: "citizen";
  sourcePageUrl: string;
  sourceAssetUrl: string;
  publicPath: string;
  storedRelativePath: string;
  width: number | null;
  height: number | null;
  contentType: string;
  sha256: string;
  imageOrder: number;
  isCover: boolean;
  view: "front" | "alternate" | "angle" | "side" | "caseback" | "detail" | "lifestyle" | "unknown";
  officialSource: "Citizen";
};

export type CitizenOfficialPhotoManifestModel = {
  reference: string;
  referenceNormalized: string;
  internalId: string | null;
  status: CitizenOfficialPhotoImportStatus;
  initialUrl: string;
  resolvedOfficialUrl: string | null;
  sourceVerificationStatus: "verified_exact" | "candidate_verified_exact" | "not_resolved" | "not_found";
  galleryEntries: number;
  uniqueProductImages: number;
  coverPublicPath: string | null;
  storagePath: string | null;
  notes: string[];
};

export type CitizenOfficialPhotoManifest = {
  generatedAt: string;
  sourceWorkbook: string;
  officialSource: "Citizen";
  entries: CitizenOfficialPhotoManifestEntry[];
  models: CitizenOfficialPhotoManifestModel[];
};
