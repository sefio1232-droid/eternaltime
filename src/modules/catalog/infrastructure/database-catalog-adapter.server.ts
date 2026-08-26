import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CatalogBrandSummary,
  CatalogImagePresentation,
  CatalogReadDataset,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import { createCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import { CASIO_MANIFEST_OUTPUT_PATH, type CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import { createOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import { ORIENT_MANIFEST_OUTPUT_PATH, type OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import { createTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import { TISSOT_MANIFEST_OUTPUT_PATH, type TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";
import { resolveCatalogImageAssetRoot } from "@/modules/catalog/infrastructure/catalog-image-asset-root";
import { sanitizeCatalogSpecificationValue } from "@/modules/catalog/application/catalog-display";

type CatalogPublicReadModelRow = {
  read_model_json: CatalogWatchDetail;
  updated_at: string;
};

type CatalogPhotoManifests = {
  casio: CasioPhotoArchiveManifest | null;
  orient: OrientPhotoArchiveManifest | null;
  tissot: TissotPhotoArchiveManifest | null;
};

function candidateManifestPaths(relativePath: string): string[] {
  const assetRoot = resolveCatalogImageAssetRoot();
  return [
    path.join(/* turbopackIgnore: true */ process.cwd(), relativePath),
    ...(assetRoot ? [path.join(/* turbopackIgnore: true */ assetRoot, relativePath)] : []),
  ];
}

async function readOptionalJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readOptionalJsonFromCandidates<T>(filePaths: string[]): Promise<T | null> {
  for (const filePath of filePaths) {
    const parsed = await readOptionalJsonFile<T>(filePath);
    if (parsed) return parsed;
  }

  return null;
}

async function loadPhotoManifests(): Promise<CatalogPhotoManifests> {
  const [casio, orient, tissot] = await Promise.all([
    readOptionalJsonFromCandidates<CasioPhotoArchiveManifest>(candidateManifestPaths(CASIO_MANIFEST_OUTPUT_PATH)),
    readOptionalJsonFromCandidates<OrientPhotoArchiveManifest>(candidateManifestPaths(ORIENT_MANIFEST_OUTPUT_PATH)),
    readOptionalJsonFromCandidates<TissotPhotoArchiveManifest>(candidateManifestPaths(TISSOT_MANIFEST_OUTPUT_PATH)),
  ]);

  return { casio, orient, tissot };
}

function missingImage(title: string): CatalogImagePresentation {
  return {
    kind: "none",
    alt: `${title}, изображение недоступно`,
  };
}

function sanitizeExternalImage(image: CatalogImagePresentation, title: string): CatalogImagePresentation {
  return image.kind === "remote" ? missingImage(title) : image;
}

function sortArchiveImages<T extends { position: "primary" | "gallery"; galleryIndex: number | null }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position === "primary" ? -1 : 1;
    }
    return (left.galleryIndex ?? 0) - (right.galleryIndex ?? 0);
  });
}

function comparableReference(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").toUpperCase().replace(/[^\p{Letter}\p{Number}]/gu, "");
}

function archiveImagesForWatch(watch: CatalogWatchDetail, manifests: CatalogPhotoManifests): CatalogImagePresentation[] {
  const watchReference = comparableReference(watch.referenceNormalized || watch.referenceDisplay || watch.referenceSlug);

  if (watch.brandSlug === "casio" && manifests.casio) {
    return sortArchiveImages(
      manifests.casio.entries.filter((entry) => comparableReference(entry.referenceNormalized) === watchReference),
    ).map((entry, index) => {
      const imageKey = createCasioArchiveImageKey(entry.zipEntry);
      return {
        kind: "development_zip",
        imageKey,
        src: `/api/catalog/dev-images/${imageKey}`,
        alt: `${watch.title}, ${watch.referenceDisplay}, фото ${index + 1}`,
      };
    });
  }

  if (watch.brandSlug === "orient" && manifests.orient) {
    return sortArchiveImages(
      manifests.orient.entries.filter((entry) => comparableReference(entry.referenceNormalized) === watchReference),
    ).map((entry, index) => {
      const imageKey = createOrientArchiveImageKey(entry.zipEntry);
      return {
        kind: "development_zip",
        imageKey,
        src: `/api/catalog/dev-images/${imageKey}`,
        alt: `${watch.title}, ${watch.referenceDisplay}, фото ${index + 1}`,
      };
    });
  }

  if (watch.brandSlug === "tissot" && manifests.tissot) {
    return sortArchiveImages(
      manifests.tissot.entries.filter(
        (entry) =>
          comparableReference(entry.referenceNormalized) === watchReference ||
          comparableReference(entry.sourceReferenceNormalized) === watchReference,
      ),
    ).map((entry, index) => {
      const imageKey = createTissotArchiveImageKey(entry.archiveFile, entry.zipEntry);
      return {
        kind: "development_zip",
        imageKey,
        src: `/api/catalog/dev-images/${imageKey}`,
        alt: `${watch.title}, ${watch.referenceDisplay}, фото ${index + 1}`,
      };
    });
  }

  return [];
}

function applyProductionImagePolicy(watch: CatalogWatchDetail, manifests: CatalogPhotoManifests): CatalogWatchDetail {
  const archiveImages = archiveImagesForWatch(watch, manifests);
  if (archiveImages.length > 0) {
    return {
      ...watch,
      primaryImage: archiveImages[0]!,
      imageGallery: archiveImages,
    };
  }

  return {
    ...watch,
    primaryImage: sanitizeExternalImage(watch.primaryImage, watch.title),
    imageGallery: watch.imageGallery
      .map((image) => sanitizeExternalImage(image, watch.title))
      .filter((image) => image.kind !== "none"),
  };
}

function applyProductionSpecificationPolicy(watch: CatalogWatchDetail): CatalogWatchDetail {
  const sanitize = (specification: CatalogWatchDetail["specifications"][number]) => ({
    ...specification,
    value: sanitizeCatalogSpecificationValue({
      key: specification.key,
      label: specification.label,
      value: specification.value,
    }),
  });

  return {
    ...watch,
    specifications: watch.specifications.map(sanitize),
    keySpecifications: watch.keySpecifications.map(sanitize),
  };
}

function refreshSiblingImages(watches: CatalogWatchDetail[]): CatalogWatchDetail[] {
  const primaryById = new Map(watches.map((watch) => [watch.id, watch.primaryImage]));

  return watches.map((watch) => ({
    ...watch,
    siblingReferences: watch.siblingReferences.map((sibling) => ({
      ...sibling,
      primaryImage: primaryById.get(sibling.id) ?? sanitizeExternalImage(sibling.primaryImage, sibling.title),
    })),
  }));
}

function datasetFromRows(rows: CatalogPublicReadModelRow[], manifests: CatalogPhotoManifests): CatalogReadDataset {
  const watches = rows
    .map((row) => ({
      ...row.read_model_json,
    }))
    .map(applyProductionSpecificationPolicy)
    .map((watch) => applyProductionImagePolicy(watch, manifests))
    .sort((left, right) => left.brandName.localeCompare(right.brandName, "ru") || left.title.localeCompare(right.title, "ru"));
  const watchesWithSiblingImages = refreshSiblingImages(watches);
  const brandCounts = watchesWithSiblingImages.reduce<Map<string, CatalogBrandSummary>>((counts, watch) => {
    const existing = counts.get(watch.brandSlug);
    counts.set(watch.brandSlug, {
      name: watch.brandName,
      slug: watch.brandSlug,
      watchCount: (existing?.watchCount ?? 0) + 1,
    });
    return counts;
  }, new Map());
  const generatedAt = rows
    .map((row) => row.updated_at)
    .sort()
    .at(-1) ?? new Date(0).toISOString();

  return {
    source: "database",
    generatedAt,
    watches: watchesWithSiblingImages,
    brands: [...brandCounts.values()].sort(
      (left, right) => right.watchCount - left.watchCount || left.name.localeCompare(right.name, "ru"),
    ),
  };
}

export async function catalogReadDatasetFromDatabase(): Promise<CatalogReadDataset | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("catalog_public_read_models")
    .select("read_model_json,updated_at")
    .eq("status", "published")
    .order("brand_slug", { ascending: true })
    .order("reference_slug", { ascending: true });

  if (error || !data) {
    return null;
  }

  const manifests = await loadPhotoManifests();
  return datasetFromRows(data as CatalogPublicReadModelRow[], manifests);
}
