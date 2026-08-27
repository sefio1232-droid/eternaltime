export const SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH = "src/content/catalog/seiko-official-photo-manifest.json";
export const SEIKO_OFFICIAL_PUBLIC_ASSET_ROOT = "/generated/catalog/seiko-official";
export const SEIKO_OFFICIAL_PUBLIC_ASSET_DIR = "public/generated/catalog/seiko-official";

export type SeikoWomenImportStatus =
  | "success"
  | "success_with_limited_images"
  | "manual_review"
  | "official_source_not_found"
  | "download_failed"
  | "failed";

export type SeikoOfficialPhotoManifestEntry = {
  catalogReference: string;
  referenceNormalized: string;
  brandSlug: "seiko";
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
  officialSource: "Seiko";
};

export type SeikoOfficialPhotoManifestModel = {
  reference: string;
  referenceNormalized: string;
  status: SeikoWomenImportStatus;
  collection: string | null;
  seriesLine: string | null;
  initialUrl: string | null;
  resolvedOfficialUrl: string | null;
  galleryEntries: number;
  uniqueProductImages: number;
  coverPublicPath: string | null;
  storagePath: string | null;
  notes: string[];
};

export type SeikoOfficialPhotoManifest = {
  generatedAt: string;
  sourceWorkbook: string;
  officialSource: "Seiko";
  targetModels: 73;
  entries: SeikoOfficialPhotoManifestEntry[];
  models: SeikoOfficialPhotoManifestModel[];
};
