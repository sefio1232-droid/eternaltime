import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createMoney } from "@/modules/catalog/domain/money";
import { getPublicCommerceState, isValidRubPrice, type PublicCommerceOfferInput } from "@/modules/commerce/domain/public-commerce-state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
import {
  CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH,
  type CitizenOfficialPhotoManifest,
} from "@/modules/catalog/infrastructure/citizen-official-photo-types";
import {
  SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH,
  type SeikoOfficialPhotoManifest,
} from "@/modules/catalog/infrastructure/seiko-official-photo-types";
import {
  isPublicCatalogSpecification,
  isPublicCatalogWatch,
  sanitizeCatalogSpecificationValue,
} from "@/modules/catalog/application/catalog-display";

type CatalogPublicReadModelRow = {
  watch_reference_id: string;
  read_model_json: CatalogWatchDetail;
  updated_at: string;
};

type CatalogOfferCommerceRow = {
  watch_reference_id: string;
  status: string | null;
  is_visible: boolean | null;
  current_price_minor: number | string | null;
  currency_code: string | null;
  offer_kind: string | null;
  condition: string | null;
  inventory_states?: {
    code: string | null;
    label: string | null;
    is_orderable: boolean | null;
  } | null;
  delivery_estimates?: {
    label: string | null;
    min_days: number | null;
    max_days: number | null;
  } | null;
};

type CatalogPhotoManifests = {
  casio: CasioPhotoArchiveManifest | null;
  orient: OrientPhotoArchiveManifest | null;
  tissot: TissotPhotoArchiveManifest | null;
  citizen: CitizenOfficialPhotoManifest | null;
  seiko: SeikoOfficialPhotoManifest | null;
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
  const [casio, orient, tissot, citizen, seiko] = await Promise.all([
    readOptionalJsonFromCandidates<CasioPhotoArchiveManifest>(candidateManifestPaths(CASIO_MANIFEST_OUTPUT_PATH)),
    readOptionalJsonFromCandidates<OrientPhotoArchiveManifest>(candidateManifestPaths(ORIENT_MANIFEST_OUTPUT_PATH)),
    readOptionalJsonFromCandidates<TissotPhotoArchiveManifest>(candidateManifestPaths(TISSOT_MANIFEST_OUTPUT_PATH)),
    readOptionalJsonFromCandidates<CitizenOfficialPhotoManifest>(candidateManifestPaths(CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH)),
    readOptionalJsonFromCandidates<SeikoOfficialPhotoManifest>(candidateManifestPaths(SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH)),
  ]);

  return { casio, orient, tissot, citizen, seiko };
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

  if (watch.brandSlug === "citizen" && manifests.citizen) {
    return sortArchiveImages(
      manifests.citizen.entries
        .filter((entry) => comparableReference(entry.referenceNormalized) === watchReference)
        .map((entry) => ({
          ...entry,
          position: entry.isCover ? "primary" as const : "gallery" as const,
          galleryIndex: entry.isCover ? null : entry.imageOrder,
        })),
    ).map((entry, index) => ({
      kind: "remote",
      url: entry.publicPath,
      src: entry.publicPath,
      alt: `${watch.title}, ${watch.referenceDisplay}, фото ${index + 1}`,
    }));
  }

  if (watch.brandSlug === "seiko" && manifests.seiko) {
    return sortArchiveImages(
      manifests.seiko.entries
        .filter((entry) => comparableReference(entry.referenceNormalized) === watchReference)
        .map((entry) => ({
          ...entry,
          position: entry.isCover ? "primary" as const : "gallery" as const,
          galleryIndex: entry.isCover ? null : entry.imageOrder,
        })),
    ).map((entry, index) => ({
      kind: "remote",
      url: entry.publicPath,
      src: entry.publicPath,
      alt: `${watch.title}, ${watch.referenceDisplay}, фото ${index + 1}`,
    }));
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
    specifications: watch.specifications.map(sanitize).filter(isPublicCatalogSpecification),
    keySpecifications: watch.keySpecifications.map(sanitize).filter(isPublicCatalogSpecification),
  };
}

function refreshSiblingImages(watches: CatalogWatchDetail[]): CatalogWatchDetail[] {
  const primaryById = new Map(watches.map((watch) => [watch.id, watch.primaryImage]));
  const primaryByHref = new Map(watches.map((watch) => [watch.href, watch.primaryImage]));
  const commerceById = new Map(watches.map((watch) => [watch.id, watch.publicCommerceState]));
  const commerceByHref = new Map(watches.map((watch) => [watch.href, watch.publicCommerceState]));

  return watches.map((watch) => ({
    ...watch,
    siblingReferences: watch.siblingReferences.map((sibling) => ({
      ...sibling,
      primaryImage: primaryById.get(sibling.id) ?? primaryByHref.get(sibling.href) ?? sanitizeExternalImage(sibling.primaryImage, sibling.title),
      publicCommerceState: commerceById.get(sibling.id) ?? commerceByHref.get(sibling.href) ?? sibling.publicCommerceState,
    })),
  }));
}

function minorAmount(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function offerInput(row: CatalogOfferCommerceRow): PublicCommerceOfferInput {
  const delivery = row.delivery_estimates;
  const deliveryLabel =
    delivery?.min_days === 12 && delivery.max_days === 12
      ? "Ориентир доставки — около 12 календарных дней."
      : delivery?.label ?? null;

  return {
    status: row.status,
    isVisible: row.is_visible,
    currentPriceMinor: minorAmount(row.current_price_minor),
    currencyCode: row.currency_code,
    inventoryCode: row.inventory_states?.code ?? null,
    inventoryIsOrderable: row.inventory_states?.is_orderable ?? null,
    deliveryEstimateLabel: deliveryLabel,
  };
}

function offerScore(row: CatalogOfferCommerceRow): number {
  let score = 0;
  if (row.status === "active") score += 100;
  if (row.is_visible) score += 50;
  if (row.offer_kind === "standard") score += 10;
  if (row.condition === "new") score += 10;
  if (row.currency_code === "RUB" && minorAmount(row.current_price_minor) !== null) score += 5;
  if (row.inventory_states?.is_orderable !== false) score += 3;
  return score;
}

async function loadCommerceOffers(watchReferenceIds: string[]): Promise<Map<string, CatalogOfferCommerceRow>> {
  const client = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!client || watchReferenceIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from("catalog_offers")
    .select("watch_reference_id,status,is_visible,current_price_minor,currency_code,offer_kind,condition,inventory_states(code,label,is_orderable),delivery_estimates(label,min_days,max_days)")
    .in("watch_reference_id", watchReferenceIds);

  if (error || !data) {
    return new Map();
  }

  const bestByReference = new Map<string, CatalogOfferCommerceRow>();
  for (const row of data as unknown as CatalogOfferCommerceRow[]) {
    const existing = bestByReference.get(row.watch_reference_id);
    if (!existing || offerScore(row) > offerScore(existing)) {
      bestByReference.set(row.watch_reference_id, row);
    }
  }
  return bestByReference;
}

function applyCommerceState(input: {
  watch: CatalogWatchDetail;
  offer: CatalogOfferCommerceRow | null;
  allowLegacyReadModelPurchasable: boolean;
}): CatalogWatchDetail {
  const offer = input.offer ? offerInput(input.offer) : null;
  const offerPriceMinor = offer?.currentPriceMinor ?? null;
  const price =
    offer?.currencyCode === "RUB" && offerPriceMinor !== null && offerPriceMinor > 0
      ? createMoney(offerPriceMinor, "RUB")
      : input.watch.publicPrice;
  const publicCommerceState = getPublicCommerceState({
    publicPrice: price,
    offer,
    publicReadModelPurchasable: input.allowLegacyReadModelPurchasable && isValidRubPrice(price),
  });

  return {
    ...input.watch,
    publicPrice: publicCommerceState.priceVisible ? price : null,
    publicCommerceState,
  };
}

async function datasetFromRows(rows: CatalogPublicReadModelRow[], manifests: CatalogPhotoManifests): Promise<CatalogReadDataset> {
  const offersByReference = await loadCommerceOffers(rows.map((row) => row.watch_reference_id));
  const allowLegacyReadModelPurchasable = offersByReference.size === 0;
  const watches = rows
    .map((row) => ({
      ...row.read_model_json,
      id: row.watch_reference_id || row.read_model_json.id,
    }))
    .filter(isPublicCatalogWatch)
    .map(applyProductionSpecificationPolicy)
    .map((watch) => applyProductionImagePolicy(watch, manifests))
    .map((watch) =>
      applyCommerceState({
        watch,
        offer: offersByReference.get(watch.id) ?? null,
        allowLegacyReadModelPurchasable,
      }),
    )
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
    .select("watch_reference_id,read_model_json,updated_at")
    .eq("status", "published")
    .order("brand_slug", { ascending: true })
    .order("reference_slug", { ascending: true });

  if (error || !data) {
    return null;
  }

  const manifests = await loadPhotoManifests();
  return datasetFromRows(data as CatalogPublicReadModelRow[], manifests);
}
