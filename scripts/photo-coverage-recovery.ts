import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { classifyCatalogImageRejection } from "@/modules/catalog/application/catalog-image-presentation-policy";
import { createCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import { CASIO_MANIFEST_OUTPUT_PATH, DEFAULT_CASIO_ARCHIVE_PATH, type CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import { CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH, type CitizenOfficialPhotoManifest } from "@/modules/catalog/infrastructure/citizen-official-photo-types";
import { createOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import { DEFAULT_ORIENT_ARCHIVE_PATH, ORIENT_MANIFEST_OUTPUT_PATH, type OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import { SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH, type SeikoOfficialPhotoManifest } from "@/modules/catalog/infrastructure/seiko-official-photo-types";
import { createTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import { TISSOT_MANIFEST_OUTPUT_PATH, type TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

type CatalogPublicReadModelRow = {
  read_model_json: CatalogWatchDetail;
  updated_at: string;
};

type PhotoManifests = {
  casio: CasioPhotoArchiveManifest | null;
  orient: OrientPhotoArchiveManifest | null;
  tissot: TissotPhotoArchiveManifest | null;
  citizen: CitizenOfficialPhotoManifest | null;
  seiko: SeikoOfficialPhotoManifest | null;
};

type ImageStatus = {
  valid: boolean;
  reason: string;
  src: string | null;
  kind: CatalogImagePresentation["kind"];
};

type ModelPhotoReport = {
  brand: string;
  reference: string;
  title: string;
  href: string;
  beforeImageStatus: string;
  officialPage: string | null;
  officialAsset: string | null;
  localAsset: string | null;
  afterImageStatus: string;
  primaryImage: string | null;
  galleryCount: number;
  verification: "verified_exact" | "manifest_exact" | "unresolved";
  reason: string;
};

type BrandCoverage = {
  total: number;
  withPrimaryOfficialImage: number;
  withoutPrimaryImage: number;
  withGallery: number;
  withoutGallery: number;
};

const rootDir = process.cwd();
const reportDir = path.join(rootDir, "imports", "reports", "photo-coverage-recovery");
const scopedBrands = ["casio", "orient", "tissot", "citizen", "seiko"];

function comparableReference(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").toUpperCase().replace(/[^\p{Letter}\p{Number}]/gu, "");
}

async function readOptionalJson<T>(relativePath: string): Promise<T | null> {
  const filePath = path.join(rootDir, relativePath);
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function imageAlt(title: string, referenceDisplay: string, order: number): string {
  return `${title}, ${referenceDisplay}, фото ${order}`;
}

function localPublicPath(src: string): string | null {
  if (!src.startsWith("/")) return null;
  if (src.startsWith("/api/")) return null;
  return path.join(rootDir, "public", src.replace(/^\//, ""));
}

async function statusForImage(image: CatalogImagePresentation, imageIndex: number): Promise<ImageStatus> {
  if (image.kind === "none") {
    return { valid: false, reason: "MISSING_IMAGE", src: null, kind: image.kind };
  }

  const rejection = classifyCatalogImageRejection(image, imageIndex);
  if (rejection) {
    return { valid: false, reason: `REJECTED_${rejection.toUpperCase()}`, src: image.src, kind: image.kind };
  }

  if (/placeholder|fallback|logo|brand[-_ ]?image|missing/i.test(image.src) || /placeholder|logo/i.test(image.alt)) {
    return { valid: false, reason: "PLACEHOLDER_OR_GENERIC", src: image.src, kind: image.kind };
  }

  const publicFile = localPublicPath(image.src);
  if (publicFile) {
    return {
      valid: await fileExists(publicFile),
      reason: await fileExists(publicFile) ? "VALID_LOCAL_PUBLIC_ASSET" : "MISSING_LOCAL_PUBLIC_ASSET",
      src: image.src,
      kind: image.kind,
    };
  }

  if (image.kind === "development_zip" && image.src.startsWith("/api/catalog/dev-images/")) {
    return { valid: true, reason: "VALID_ARCHIVE_MANIFEST_ASSET", src: image.src, kind: image.kind };
  }

  if (image.kind === "remote" && /^https:\/\//i.test(image.src)) {
    return { valid: true, reason: "VALID_REMOTE_ASSET_URL", src: image.src, kind: image.kind };
  }

  return { valid: false, reason: "UNSUPPORTED_IMAGE_SRC", src: image.src, kind: image.kind };
}

function missingImage(title: string): CatalogImagePresentation {
  return { kind: "none", alt: `${title}, изображение недоступно` };
}

function archivePrimarySort<T extends { position: "primary" | "gallery"; galleryIndex: number | null }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    if (left.position !== right.position) return left.position === "primary" ? -1 : 1;
    return (left.galleryIndex ?? 0) - (right.galleryIndex ?? 0);
  });
}

function officialPrimarySort<T extends { isCover: boolean; imageOrder: number }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    if (left.isCover !== right.isCover) return left.isCover ? -1 : 1;
    return left.imageOrder - right.imageOrder;
  });
}

function manifestImagesForWatch(watch: CatalogWatchDetail, manifests: PhotoManifests): CatalogImagePresentation[] {
  const ref = comparableReference(watch.referenceNormalized || watch.referenceDisplay || watch.referenceSlug);

  if (watch.brandSlug === "casio" && manifests.casio) {
    return archivePrimarySort(manifests.casio.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "development_zip" as const,
        imageKey: createCasioArchiveImageKey(entry.zipEntry),
        src: `/api/catalog/dev-images/${createCasioArchiveImageKey(entry.zipEntry)}`,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  if (watch.brandSlug === "orient" && manifests.orient) {
    return archivePrimarySort(manifests.orient.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "development_zip" as const,
        imageKey: createOrientArchiveImageKey(entry.zipEntry),
        src: `/api/catalog/dev-images/${createOrientArchiveImageKey(entry.zipEntry)}`,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  if (watch.brandSlug === "tissot" && manifests.tissot) {
    return archivePrimarySort(
      manifests.tissot.entries.filter((entry) =>
        comparableReference(entry.referenceNormalized) === ref ||
        comparableReference(entry.sourceReferenceNormalized) === ref
      ),
    ).map((entry, index) => ({
      kind: "development_zip" as const,
      imageKey: createTissotArchiveImageKey(entry.archiveFile, entry.zipEntry),
      src: `/api/catalog/dev-images/${createTissotArchiveImageKey(entry.archiveFile, entry.zipEntry)}`,
      alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
    }));
  }

  if (watch.brandSlug === "citizen" && manifests.citizen) {
    return officialPrimarySort(manifests.citizen.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "remote" as const,
        url: entry.publicPath,
        src: entry.publicPath,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  if (watch.brandSlug === "seiko" && manifests.seiko) {
    return officialPrimarySort(manifests.seiko.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "remote" as const,
        url: entry.publicPath,
        src: entry.publicPath,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  return [];
}

function applyProductionLikeImagePolicy(watch: CatalogWatchDetail, manifests: PhotoManifests): CatalogWatchDetail {
  const manifestImages = manifestImagesForWatch(watch, manifests);
  if (manifestImages.length > 0) {
    return { ...watch, primaryImage: manifestImages[0]!, imageGallery: manifestImages };
  }

  const sanitizedPrimary = watch.primaryImage.kind === "remote" ? missingImage(watch.title) : watch.primaryImage;
  const sanitizedGallery = watch.imageGallery
    .map((image) => image.kind === "remote" ? missingImage(watch.title) : image)
    .filter((image) => image.kind !== "none");
  return { ...watch, primaryImage: sanitizedPrimary, imageGallery: sanitizedGallery };
}

async function readDatasetFromDatabase(): Promise<CatalogReadDataset> {
  loadEnvConfig(rootDir);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("Supabase URL or server admin secret key is not configured.");

  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client
    .from("catalog_public_read_models")
    .select("read_model_json,updated_at")
    .eq("status", "published")
    .order("brand_slug", { ascending: true })
    .order("reference_slug", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as CatalogPublicReadModelRow[];
  const watches = rows.map((row) => row.read_model_json);
  const brands = [...watches.reduce<Map<string, { slug: string; name: string; watchCount: number }>>((acc, watch) => {
    const current = acc.get(watch.brandSlug);
    acc.set(watch.brandSlug, {
      slug: watch.brandSlug,
      name: watch.brandName,
      watchCount: (current?.watchCount ?? 0) + 1,
    });
    return acc;
  }, new Map()).values()];

  return {
    source: "database",
    generatedAt: rows.map((row) => row.updated_at).sort().at(-1) ?? new Date(0).toISOString(),
    watches,
    brands,
  };
}

async function loadManifests(): Promise<PhotoManifests> {
  return {
    casio: await readOptionalJson<CasioPhotoArchiveManifest>(CASIO_MANIFEST_OUTPUT_PATH),
    orient: await readOptionalJson<OrientPhotoArchiveManifest>(ORIENT_MANIFEST_OUTPUT_PATH),
    tissot: await readOptionalJson<TissotPhotoArchiveManifest>(TISSOT_MANIFEST_OUTPUT_PATH),
    citizen: await readOptionalJson<CitizenOfficialPhotoManifest>(CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH),
    seiko: await readOptionalJson<SeikoOfficialPhotoManifest>(SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH),
  };
}

async function archiveAvailability() {
  return {
    casio: await fileExists(path.join(rootDir, DEFAULT_CASIO_ARCHIVE_PATH)),
    orient: await fileExists(path.join(rootDir, DEFAULT_ORIENT_ARCHIVE_PATH)),
    tissotManifest: await fileExists(path.join(rootDir, TISSOT_MANIFEST_OUTPUT_PATH)),
  };
}

function manifestReasonFor(watch: CatalogWatchDetail, manifests: PhotoManifests): string | null {
  const ref = comparableReference(watch.referenceNormalized || watch.referenceDisplay || watch.referenceSlug);

  if (watch.referenceDisplay.includes("+")) {
    return "CATALOG_REFERENCE_IS_COMBINED_PAIR_NO_EXACT_SINGLE_MODEL_ASSET";
  }

  if (watch.brandSlug === "casio" && manifests.casio?.catalogReferencesWithoutSourceFolder.some((gap) => comparableReference(gap.referenceNormalized) === ref)) {
    return "OFFICIAL_ARCHIVE_EXACT_SOURCE_FOLDER_NOT_FOUND";
  }

  if (watch.brandSlug === "orient" && manifests.orient?.catalogReferencesWithoutSourceFolder.some((gap) => comparableReference(gap.referenceNormalized) === ref)) {
    return "OFFICIAL_ARCHIVE_EXACT_SOURCE_FOLDER_NOT_FOUND";
  }

  if (watch.brandSlug === "tissot" && manifests.tissot?.catalogReferencesWithoutSourceFolder.some((gap) => comparableReference(gap.referenceNormalized) === ref)) {
    return "OFFICIAL_ARCHIVE_EXACT_SOURCE_ARCHIVE_NOT_FOUND";
  }

  if (watch.brandSlug === "citizen") {
    const model = manifests.citizen?.models.find((item) => comparableReference(item.referenceNormalized) === ref);
    if (model && model.status !== "success" && model.status !== "success_with_limited_images") {
      return model.status.toUpperCase();
    }
  }

  if (watch.brandSlug === "seiko") {
    const model = manifests.seiko?.models.find((item) => comparableReference(item.referenceNormalized) === ref);
    if (model && model.status !== "success" && model.status !== "success_with_limited_images") {
      return model.status.toUpperCase();
    }
  }

  return null;
}

async function summarize(watches: CatalogWatchDetail[], manifests: PhotoManifests) {
  const records: ModelPhotoReport[] = [];
  const byBrand: Record<string, BrandCoverage> = {};
  let withPrimary = 0;
  let withGallery = 0;
  let broken = 0;
  let placeholderOnly = 0;

  for (const brand of scopedBrands) {
    byBrand[brand] = { total: 0, withPrimaryOfficialImage: 0, withoutPrimaryImage: 0, withGallery: 0, withoutGallery: 0 };
  }

  for (const watch of watches.filter((item) => scopedBrands.includes(item.brandSlug))) {
    const primary = await statusForImage(watch.primaryImage, 0);
    const galleryStatuses = await Promise.all(watch.imageGallery.map((image, index) => statusForImage(image, index)));
    const galleryCount = galleryStatuses.filter((item) => item.valid).length;
    const brand = byBrand[watch.brandSlug] ??= { total: 0, withPrimaryOfficialImage: 0, withoutPrimaryImage: 0, withGallery: 0, withoutGallery: 0 };
    brand.total += 1;

    if (primary.valid) {
      withPrimary += 1;
      brand.withPrimaryOfficialImage += 1;
    } else {
      brand.withoutPrimaryImage += 1;
    }

    if (galleryCount > 0) {
      withGallery += 1;
      brand.withGallery += 1;
    } else {
      brand.withoutGallery += 1;
    }

    if (!primary.valid && (primary.reason.includes("MISSING_LOCAL") || primary.reason.includes("UNSUPPORTED"))) broken += 1;
    if (!primary.valid && /PLACEHOLDER|MISSING_IMAGE|REJECTED_MISSING/.test(primary.reason)) placeholderOnly += 1;

    const officialEntry = officialEntryFor(watch);
    records.push({
      brand: watch.brandSlug,
      reference: watch.referenceDisplay,
      title: watch.title,
      href: watch.href,
      beforeImageStatus: primary.reason,
      officialPage: officialEntry?.page ?? null,
      officialAsset: officialEntry?.asset ?? null,
      localAsset: primary.src?.startsWith("/") ? primary.src : null,
      afterImageStatus: primary.reason,
      primaryImage: primary.src,
      galleryCount,
      verification: primary.valid ? (officialEntry ? "verified_exact" : "manifest_exact") : "unresolved",
      reason: primary.valid ? "OK" : (manifestReasonFor(watch, manifests) ?? unresolvedReason(watch, primary.reason)),
    });
  }

  const total = records.length;
  return {
    generatedAt: new Date().toISOString(),
    totalPublicModels: total,
    withValidPrimaryImage: withPrimary,
    withoutValidPrimaryImage: total - withPrimary,
    withGallery,
    withoutGallery: total - withGallery,
    brokenImageReferences: broken,
    placeholderOnlyModels: placeholderOnly,
    coveragePercent: total ? Number(((withPrimary / total) * 100).toFixed(1)) : 0,
    byBrand,
    models: records,
    unresolved: records.filter((record) => record.afterImageStatus !== "VALID_LOCAL_PUBLIC_ASSET" && record.afterImageStatus !== "VALID_ARCHIVE_MANIFEST_ASSET" && record.afterImageStatus !== "VALID_REMOTE_ASSET_URL"),
  };
}

function officialEntryFor(watch: CatalogWatchDetail): { page: string; asset: string } | null {
  const image = watch.primaryImage;
  if (image.kind === "remote" && image.src.startsWith("/generated/catalog/")) {
    return { page: "existing official manifest", asset: image.src };
  }
  if (image.kind === "development_zip") {
    return { page: "existing exact-reference photo archive manifest", asset: image.src };
  }
  return null;
}

function unresolvedReason(watch: CatalogWatchDetail, imageReason: string): string {
  if (imageReason === "MISSING_IMAGE" || imageReason === "REJECTED_MISSING") return "OFFICIAL_ASSET_NOT_LINKED_TO_READ_MODEL";
  if (imageReason === "MISSING_LOCAL_PUBLIC_ASSET") return "OFFICIAL_ASSET_FILE_MISSING";
  if (imageReason.startsWith("REJECTED_")) return `PRIMARY_NOT_CUSTOMER_FACING_${imageReason.replace("REJECTED_", "")}`;
  return `${watch.brandSlug.toUpperCase()}_${imageReason}`;
}

function renderMarkdown(before: Awaited<ReturnType<typeof summarize>>, after: Awaited<ReturnType<typeof summarize>>, archive: Awaited<ReturnType<typeof archiveAvailability>>) {
  const lines = [
    "# Photo coverage recovery",
    "",
    `Generated at: ${after.generatedAt}`,
    "",
    "## Existing pipeline",
    "",
    "- Database public read model is the public catalog source in production.",
    "- Production image policy overlays exact-reference Casio/Orient/Tissot archive manifests and Citizen/Seiko official manifests.",
    "- Customer-facing assets are served either from `/generated/catalog/...` public files or `/api/catalog/dev-images/...` backed by the shared catalog asset root.",
    "",
    "## Archive availability",
    "",
    `- Casio source archive: ${archive.casio ? "YES" : "NO"}`,
    `- Orient source archive: ${archive.orient ? "YES" : "NO"}`,
    `- Tissot manifest: ${archive.tissotManifest ? "YES" : "NO"}`,
    "",
    "## Coverage",
    "",
    `- BEFORE total: ${before.totalPublicModels}`,
    `- BEFORE with primary: ${before.withValidPrimaryImage}`,
    `- BEFORE without primary: ${before.withoutValidPrimaryImage}`,
    `- BEFORE coverage: ${before.coveragePercent}%`,
    `- AFTER total: ${after.totalPublicModels}`,
    `- AFTER with primary: ${after.withValidPrimaryImage}`,
    `- AFTER without primary: ${after.withoutValidPrimaryImage}`,
    `- AFTER coverage: ${after.coveragePercent}%`,
    "",
    "## By brand",
    "",
    "| Brand | Total | Before with primary | Before missing | After with primary | After missing |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...scopedBrands.map((brand) => {
      const b = before.byBrand[brand]!;
      const a = after.byBrand[brand]!;
      return `| ${brand.toUpperCase()} | ${a.total} | ${b.withPrimaryOfficialImage} | ${b.withoutPrimaryImage} | ${a.withPrimaryOfficialImage} | ${a.withoutPrimaryImage} |`;
    }),
    "",
    "## Unresolved",
    "",
    ...after.unresolved.map((record) => `- ${record.brand.toUpperCase()} ${record.reference}: ${record.reason}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const phase = process.argv.includes("--after") ? "after" : "before";
  const dataset = await readDatasetFromDatabase();
  const manifests = await loadManifests();
  const productionLikeWatches = dataset.watches.map((watch) => applyProductionLikeImagePolicy(watch, manifests));
  const summary = await summarize(productionLikeWatches, manifests);
  const archive = await archiveAvailability();

  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, `photo-coverage-${phase}.json`), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  if (phase === "after") {
    const beforeRaw = await readFile(path.join(reportDir, "photo-coverage-before.json"), "utf8");
    const before = JSON.parse(beforeRaw) as Awaited<ReturnType<typeof summarize>>;
    await writeFile(path.join(reportDir, "photo-unresolved.json"), `${JSON.stringify(summary.unresolved, null, 2)}\n`, "utf8");
    await writeFile(path.join(reportDir, "photo-recovery.md"), renderMarkdown(before, summary, archive), "utf8");
  }

  await access(reportDir);
  console.log(JSON.stringify({
    phase,
    totalPublicModels: summary.totalPublicModels,
    withValidPrimaryImage: summary.withValidPrimaryImage,
    withoutValidPrimaryImage: summary.withoutValidPrimaryImage,
    withGallery: summary.withGallery,
    withoutGallery: summary.withoutGallery,
    brokenImageReferences: summary.brokenImageReferences,
    placeholderOnlyModels: summary.placeholderOnlyModels,
    coveragePercent: summary.coveragePercent,
    byBrand: summary.byBrand,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown photo coverage recovery error.");
  process.exitCode = 1;
});
