import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { getServerEnv } from "@/config/server-env";
import {
  getCatalogBrandBySlug,
  getCatalogWatchByRoute,
  listCatalogBrands,
  listCatalogWatches,
  pickCatalogCuratorialPaths,
  pickCatalogHeroWatches,
  pickRelatedCatalogWatches,
} from "@/modules/catalog/application/catalog-read-service";
import { cleanImportedProseText } from "@/modules/catalog/application/catalog-display";
import { resolveCatalogReadSourcePolicy } from "@/modules/catalog/infrastructure/catalog-read-source-policy";
import { catalogReadDatasetFromPreview, groupSiteImportOverlayByReference } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { ORIENT_MANIFEST_OUTPUT_PATH, type OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import { CASIO_MANIFEST_OUTPUT_PATH, type CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import {
  SITE_IMPORT_OVERLAY_OUTPUT_PATH,
  type CatalogSiteImportOverlayManifest,
} from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";
import type { CatalogReadQuery, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const previewPath = path.join(process.cwd(), "imports", "generated", "catalog-import-preview.json");
const imagePlanPath = path.join(process.cwd(), "imports", "generated", "catalog-image-upload-plan.json");
const orientManifestPath = path.join(process.cwd(), ORIENT_MANIFEST_OUTPUT_PATH);
const casioManifestPath = path.join(process.cwd(), CASIO_MANIFEST_OUTPUT_PATH);
const siteImportOverlayPath = path.join(process.cwd(), SITE_IMPORT_OVERLAY_OUTPUT_PATH);

export class CatalogReadSourceError extends Error {
  readonly code: "catalog_source_unavailable" | "catalog_source_not_configured";

  constructor(code: CatalogReadSourceError["code"], message: string) {
    super(message);
    this.name = "CatalogReadSourceError";
    this.code = code;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function readOptionalJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

// Best-effort: absent until `npx tsx src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts`
// has been run locally. Cached once per request so both the specification-merge path below and
// `getPublicCatalogWatchSeoOverlay` read the same file exactly once.
const getCatalogSiteImportOverlayManifest = cache(async () => {
  return readOptionalJsonFile<CatalogSiteImportOverlayManifest>(siteImportOverlayPath);
});

export const getCatalogReadDataset = cache(async () => {
  const env = getServerEnv();
  const policy = resolveCatalogReadSourcePolicy(env);

  if (!policy.allowed) {
    throw new CatalogReadSourceError(policy.code, policy.message);
  }

  if (policy.source === "preview") {
    const preview = await readOptionalJsonFile<CatalogImportPreview>(previewPath);
    if (!preview) {
      throw new CatalogReadSourceError(
        "catalog_source_unavailable",
        "Catalog preview file is unavailable. Run npm run catalog:import:preview for local development.",
      );
    }

    const imagePlan = await readOptionalJsonFile<CatalogImageUploadPlan>(imagePlanPath);
    // Best-effort: absent until the corresponding `npx tsx src/modules/catalog/cli/*-photo-
    // archive-manifest.ts` script has been run locally. Never required — `catalogReadDatasetFromPreview`
    // treats a missing manifest exactly like an empty one.
    const orientPhotoManifest = await readOptionalJsonFile<OrientPhotoArchiveManifest>(orientManifestPath);
    const casioPhotoManifest = await readOptionalJsonFile<CasioPhotoArchiveManifest>(casioManifestPath);
    const siteImportOverlay = await getCatalogSiteImportOverlayManifest();
    return catalogReadDatasetFromPreview({ preview, imagePlan, orientPhotoManifest, casioPhotoManifest, siteImportOverlay });
  }

  throw new CatalogReadSourceError(
    "catalog_source_not_configured",
    "Production catalog read repository is not configured yet.",
  );
});

export async function listPublicCatalogWatches(query: CatalogReadQuery) {
  const dataset = await getCatalogReadDataset();
  return listCatalogWatches(dataset, query);
}

/** Real watches for the catalog hero's product composition — see `pickCatalogHeroWatches`. */
export async function getPublicCatalogHeroWatches(input: { brandSlug?: string; count?: number } = {}) {
  const dataset = await getCatalogReadDataset();
  return pickCatalogHeroWatches(dataset, input);
}

/** Real watches for the curatorial module — see `pickCatalogCuratorialPaths`. */
export async function getPublicCatalogCuratorialPaths() {
  const dataset = await getCatalogReadDataset();
  return pickCatalogCuratorialPaths(dataset);
}

export async function getPublicCatalogBrand(brandSlug: string) {
  const dataset = await getCatalogReadDataset();
  return getCatalogBrandBySlug(dataset, brandSlug);
}

export async function listPublicCatalogBrands() {
  const dataset = await getCatalogReadDataset();
  return listCatalogBrands(dataset);
}

export async function getPublicCatalogWatch(input: { brandSlug: string; referenceSlug: string }) {
  const dataset = await getCatalogReadDataset();
  return getCatalogWatchByRoute(dataset, input);
}

/**
 * "Похожие модели" for the end of the detail page — reads the same cached dataset every other
 * catalog page already reads and applies the simple, transparent brand/mechanism/price rule in
 * `pickRelatedCatalogWatches`. Never a bespoke ranking system or extra data source.
 */
export async function getPublicCatalogRelatedWatches(watch: CatalogWatchDetail, limit = 4) {
  const dataset = await getCatalogReadDataset();
  return pickRelatedCatalogWatches(dataset, watch, limit);
}

export type CatalogWatchSeoOverlay = {
  seoTitle: string | null;
  metaDescription: string | null;
  shortDescription: string | null;
  longDescription: string | null;
};

/**
 * SEO copy from the site-import workbooks (SEO Title / Meta Description / short + long
 * description), read entirely independently of `CatalogWatchDetail` per the catalog read-model
 * contract — never merged into the shared read model, only consumed directly at the page/component
 * layer (generateMetadata, the watch detail "Обзор" section). Returns null when the manifest is
 * absent or has no matching, non-empty entry for this reference.
 */
export async function getPublicCatalogWatchSeoOverlay(input: {
  brandSlug: string;
  referenceNormalized: string;
}): Promise<CatalogWatchSeoOverlay | null> {
  const manifest = await getCatalogSiteImportOverlayManifest();
  const byReference = groupSiteImportOverlayByReference(manifest);
  const entry = byReference.get(`${input.brandSlug}:${input.referenceNormalized}`);
  if (!entry) {
    return null;
  }

  if (!entry.seoTitle && !entry.metaDescription && !entry.shortDescription && !entry.longDescription) {
    return null;
  }

  // Cleaned once, here, at the single boundary where overlay text enters the app — every
  // consumer (generateMetadata, JSON-LD, the detail page "Обзор" section) gets whitespace-clean
  // prose without needing to remember to clean it itself (docs/CATALOG_SHOWROOM_RECOVERY.md
  // "SEO text hygiene"). Fixes a source-spreadsheet artifact (stray space before punctuation)
  // only — never rewrites wording.
  return {
    seoTitle: entry.seoTitle ? cleanImportedProseText(entry.seoTitle) : null,
    metaDescription: entry.metaDescription ? cleanImportedProseText(entry.metaDescription) : null,
    shortDescription: entry.shortDescription ? cleanImportedProseText(entry.shortDescription) : null,
    longDescription: entry.longDescription ? cleanImportedProseText(entry.longDescription) : null,
  };
}
