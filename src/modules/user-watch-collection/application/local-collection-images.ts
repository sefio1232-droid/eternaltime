import { isProminentCatalogImage } from "@/modules/catalog/application/catalog-image-presentation-policy";
import type {
  CatalogImagePresentation,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import type {
  CollectionAnalysisItem,
  CollectionRecommendationCandidate,
} from "@/modules/collection-intelligence/domain/types";

const confirmedNonPrimaryImageIdentities = new Set([
  // Confirmed reverse/caseback frames in the current catalog source.
  "65b7e43cdff3f5069b8b5f173dc46b38",
  "196ed398503fb2d14fa53887c5607b39",
  "7ea639026b6476dc348005fb720a9326",
  // Casio AE-1200WH-1BV: caseback and profile; image 2 is the front product view.
  "18ed5922d050fad407b9b2ddc9fe3cc8",
  "fdfab10ce549bc39e6fa84814dbe462c",
  // Confirmed broken sources from the current Orient package.
  "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0002S/product_en_file/file/RA-AB0002S_main.webp",
  "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0003S/product_en_file/file/RA-AB0003S_main.webp",
]);

const confirmedVisuallyWeakImageIdentities = new Set([
  // Tissot PR 100 T150.410.16.031.00: too dark for the collection's product surfaces.
  "83927d60-f5d9-4bdc-b534-0cc8206d2794",
]);

const technicalPrimaryPattern =
  /(case\s*back|caseback|back\s*view|rear\s*view|reverse|backside|underside|clasp|buckle|strap\s*(reverse|inside|inner)|(?:reverse|inside|inner)\s*strap|technical\s*(drawing|angle)|detail\s*macro|dial\s*only|packaging|screenshot|watermark|side\s*view|profile|lifestyle|wrist|(?:_|-)b\d{1,2}(?:[._-]|$)|задн(?:яя|ей|ий)|крышк|оборотн(?:ая|ой)|изнанк|заст[её]ж|пряжк|ремень\s*изнутри|вид\s*сбоку|техническ(?:ий|ая)|черт[её]ж|макро|упаковк|скриншот|водян(?:ой|ым)\s*знак)/i;

type CollectionImageRecord = Pick<
  CollectionAnalysisItem,
  | "sourceKind"
  | "catalogReferenceId"
  | "catalogHref"
  | "brandName"
  | "referenceDisplay"
  | "imageUrl"
> & {
  photoDataUrl: string | null;
};

function normalizeIdentityPart(value: string | null): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-я0-9]+/g, "");
}

function imageIdentityFromUrl(value: string): string {
  const devImageMatch = value.match(/\/api\/catalog\/dev-images\/([a-f0-9]{32})(?:[/?#]|$)/i);
  return devImageMatch?.[1]?.toLowerCase() ?? value;
}

function isConfirmedWeakIdentity(value: string): boolean {
  const normalized = value.toLocaleLowerCase("ru");
  return (
    confirmedNonPrimaryImageIdentities.has(value) ||
    [...confirmedVisuallyWeakImageIdentities].some((identity) => normalized.includes(identity))
  );
}

export function isCleanCollectionPersistedImageUrl(value: string | null): value is string {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized || /^(?:data|blob|javascript):/i.test(normalized)) return false;
  if (!normalized.startsWith("/") && !/^https?:\/\//i.test(normalized)) return false;
  if (isConfirmedWeakIdentity(imageIdentityFromUrl(normalized))) return false;

  let decoded = normalized;
  try {
    decoded = decodeURIComponent(normalized);
  } catch {
    // A malformed escape sequence must not make an otherwise valid source fatal.
  }

  return !technicalPrimaryPattern.test(decoded.normalize("NFKC").toLocaleLowerCase("ru"));
}

function findCurrentCatalogCandidate(
  watch: CollectionImageRecord,
  candidates: CollectionRecommendationCandidate[],
): CollectionRecommendationCandidate | null {
  if (watch.catalogReferenceId) {
    const byId = candidates.find(
      (candidate) => candidate.catalogReferenceId === watch.catalogReferenceId,
    );
    if (byId) return byId;
  }

  if (watch.catalogHref) {
    const byHref = candidates.find((candidate) => candidate.href === watch.catalogHref);
    if (byHref) return byHref;
  }

  const brand = normalizeIdentityPart(watch.brandName);
  const reference = normalizeIdentityPart(watch.referenceDisplay);
  if (!brand || !reference) return null;

  const matches = candidates.filter(
    (candidate) =>
      normalizeIdentityPart(candidate.brandName) === brand &&
      normalizeIdentityPart(candidate.referenceDisplay) === reference,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function resolveLocalCollectionWatchImage<T extends CollectionImageRecord>(
  watch: T,
  candidates: CollectionRecommendationCandidate[],
): T {
  if (watch.sourceKind === "manual") {
    return watch.imageUrl === null ? watch : { ...watch, imageUrl: null };
  }

  const currentCandidate = findCurrentCatalogCandidate(watch, candidates);
  const currentCanonical = isCleanCollectionPersistedImageUrl(currentCandidate?.imageUrl ?? null)
    ? currentCandidate?.imageUrl ?? null
    : null;
  const persistedFallback = isCleanCollectionPersistedImageUrl(watch.imageUrl)
    ? watch.imageUrl
    : null;
  const imageUrl = currentCanonical ?? persistedFallback;

  return imageUrl === watch.imageUrl ? watch : { ...watch, imageUrl };
}

export function resolveLocalCollectionWatchImages<T extends CollectionImageRecord>(
  watches: T[],
  candidates: CollectionRecommendationCandidate[],
): T[] {
  let changed = false;
  const resolved = watches.map((watch) => {
    const next = resolveLocalCollectionWatchImage(watch, candidates);
    if (next !== watch) changed = true;
    return next;
  });
  return changed ? resolved : watches;
}

export function collectionCatalogImageIdentity(image: CatalogImagePresentation): string {
  if (image.kind === "development_zip") return image.imageKey;
  if (image.kind === "remote") return image.url;
  return "";
}

function collectionCatalogImageText(image: CatalogImagePresentation): string {
  if (image.kind === "none") return image.alt;
  return [image.alt, image.kind === "remote" ? image.url : ""]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("ru");
}

export function isCleanCollectionPrimaryImage(
  image: CatalogImagePresentation,
  imageIndex = 0,
): boolean {
  if (image.kind === "none") return false;
  if (isConfirmedWeakIdentity(collectionCatalogImageIdentity(image))) return false;
  if (technicalPrimaryPattern.test(collectionCatalogImageText(image))) return false;
  return isProminentCatalogImage(image, imageIndex);
}

export function selectCollectionPrimaryImage(
  watch: Pick<CatalogWatchDetail, "primaryImage" | "imageGallery">,
): CatalogImagePresentation {
  const seen = new Set<string>();
  const images = [watch.primaryImage, ...watch.imageGallery].filter((image) => {
    const identity = collectionCatalogImageIdentity(image);
    const key = identity || `${image.kind}:${image.alt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return images.find((image, index) => isCleanCollectionPrimaryImage(image, index)) ?? {
    kind: "none",
    alt: "Изображение часов недоступно",
  };
}

export function collectionPrimaryImageUrl(
  watch: Pick<CatalogWatchDetail, "primaryImage" | "imageGallery">,
): string | null {
  const image = selectCollectionPrimaryImage(watch);
  return image.kind === "none" ? null : image.src;
}
