import { createMoney } from "@/modules/catalog/domain/money";
import { normalizeManufacturerReference, referenceSlugFromNormalized } from "@/modules/catalog/domain/reference-normalization";
import { slugifyCatalogText } from "@/modules/catalog/domain/slug";
import { createCatalogDevImageKey } from "@/modules/catalog/infrastructure/dev-image-keys";
import { createOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import type { OrientManifestEntry, OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import { createCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import type { CasioManifestEntry, CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import { createTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import type { TissotManifestEntry, TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";
import type { CatalogSiteImportOverlayEntry, CatalogSiteImportOverlayManifest } from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";
import { classifyCatalogImageRejection, selectBestCatalogHeroImage } from "@/modules/catalog/application/catalog-image-presentation-policy";
import { sanitizeCatalogPublicText } from "@/modules/catalog/application/catalog-public-sanitation";
import type {
  CatalogImagePresentation,
  CatalogPublicSpecification,
  CatalogReadDataset,
  CatalogSpecificationGroup,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import type {
  CatalogImageUploadPlan,
  CatalogImageUploadPlanItem,
} from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview, MergedCatalogCandidate } from "@/modules/imports/catalog/domain/types";

type SpecificationDefinition = {
  label: string;
  group: CatalogSpecificationGroup;
};

const specificationDefinitions: Record<string, SpecificationDefinition> = {
  movement_raw: { label: "Механизм", group: "mechanism" },
  movement_type_raw: { label: "Тип механизма", group: "mechanism" },
  caliber_raw: { label: "Калибр", group: "mechanism" },
  display_raw: { label: "Дисплей", group: "mechanism" },
  power_source_raw: { label: "Питание", group: "mechanism" },
  power_reserve_raw: { label: "Запас хода", group: "mechanism" },
  accuracy_raw: { label: "Точность хода", group: "mechanism" },
  jewel_count_raw: { label: "Количество камней", group: "mechanism" },
  case_material_raw: { label: "Материал корпуса", group: "case" },
  case_shape_raw: { label: "Форма корпуса", group: "case" },
  case_diameter_raw: { label: "Диаметр корпуса", group: "dimensions" },
  case_thickness_raw: { label: "Толщина корпуса", group: "dimensions" },
  case_dimensions_raw: { label: "Размер корпуса", group: "dimensions" },
  weight_raw: { label: "Вес", group: "dimensions" },
  dial_raw: { label: "Циферблат", group: "dial" },
  dial_color_raw: { label: "Цвет циферблата", group: "dial" },
  crystal_type_raw: { label: "Стекло", group: "glass" },
  attachment_material_raw: { label: "Ремешок или браслет", group: "strap" },
  strap_material_raw: { label: "Ремешок", group: "strap" },
  bracelet_material_raw: { label: "Браслет", group: "strap" },
  strap_width_raw: { label: "Ширина ремешка", group: "strap" },
  clasp_raw: { label: "Застежка", group: "strap" },
  water_resistance_raw: { label: "Водозащита", group: "water_resistance" },
  functions_raw: { label: "Функции", group: "functions" },
  watch_type_raw: { label: "Тип", group: "other" },
  brand_country_raw: { label: "Страна бренда", group: "other" },
  bezel_material_raw: { label: "Материал безеля", group: "case" },
  bezel_raw: { label: "Безель", group: "case" },
  construction_raw: { label: "Конструкция корпуса", group: "case" },
  case_coating_raw: { label: "Покрытие корпуса/безеля", group: "case" },
  caseback_raw: { label: "Задняя крышка", group: "case" },
  crown_raw: { label: "Заводная головка", group: "case" },
  purpose_raw: { label: "Назначение", group: "other" },
  luminescence_raw: { label: "Люминесценция", group: "other" },
  // Added for the "*_seo_final.xlsx" overlay batch (docs/CATALOG_SHOWROOM_RECOVERY.md "Site-import
  // overlay v2") — real fields the source data has that no existing key covered.
  strap_color_raw: { label: "Цвет ремешка/браслета", group: "strap" },
  strap_features_raw: { label: "Особенности браслета", group: "strap" },
  strap_coating_raw: { label: "Покрытие браслета", group: "strap" },
  dial_markers_raw: { label: "Индексы", group: "dial" },
  gemstones_raw: { label: "Драгоценные камни", group: "dial" },
  certification_raw: { label: "Сертификация", group: "mechanism" },
  package_contents_raw: { label: "Комплектация", group: "other" },
};

const specificationOrder = [
  "movement_type_raw",
  "movement_raw",
  "caliber_raw",
  "display_raw",
  "power_source_raw",
  "power_reserve_raw",
  "accuracy_raw",
  "jewel_count_raw",
  "case_material_raw",
  "bezel_material_raw",
  "bezel_raw",
  "construction_raw",
  "case_coating_raw",
  "case_shape_raw",
  "case_diameter_raw",
  "case_thickness_raw",
  "case_dimensions_raw",
  "weight_raw",
  "caseback_raw",
  "crown_raw",
  "dial_raw",
  "dial_color_raw",
  "dial_markers_raw",
  "gemstones_raw",
  "crystal_type_raw",
  "attachment_material_raw",
  "strap_material_raw",
  "bracelet_material_raw",
  "strap_color_raw",
  "strap_coating_raw",
  "strap_width_raw",
  "clasp_raw",
  "strap_features_raw",
  "water_resistance_raw",
  "functions_raw",
  "purpose_raw",
  "luminescence_raw",
  "certification_raw",
  "package_contents_raw",
  "watch_type_raw",
  "brand_country_raw",
];

const keySpecificationPriority = [
  "movement_type_raw",
  "movement_raw",
  "case_material_raw",
  "water_resistance_raw",
  "crystal_type_raw",
  "case_dimensions_raw",
];

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * `overlaySpecifications` comes from the user-supplied site-import workbooks
 * (catalog-site-import-overlay-manifest.ts) — richer, pre-normalized values for the same
 * specification keys the raw import already fills in. Spread last so an overlay value wins when
 * present, but a reference absent from the overlay (or a key the overlay leaves blank) still falls
 * back to the raw import's own value untouched.
 */
function publicSpecifications(candidate: MergedCatalogCandidate, overlaySpecifications?: Record<string, string> | null): CatalogPublicSpecification[] {
  const sourceValues: Record<string, unknown> = {
    ...candidate.specifications.firstClass,
    ...candidate.specifications.controlledAttributes,
    ...(overlaySpecifications ?? {}),
  };

  // `movement_raw` is, in every real (type, raw) pair found across the catalog, either byte-for-
  // byte identical to `movement_type_raw` or a generic brand-boilerplate restatement of it (e.g.
  // "автоматический механический механизм Orient" next to the fuller "Механический с
  // автоматическим заводом и ручным подзаводом") — never a genuinely different fact. Showing both
  // reads as the same trait twice (catalog card, hero key facts, and the full specifications
  // table all pick from this same array), so `movement_raw` is dropped whenever the more
  // descriptive `movement_type_raw` is already present; when `movement_type_raw` is absent,
  // `movement_raw` is untouched and still shown.
  if (textValue(sourceValues.movement_type_raw) && textValue(sourceValues.movement_raw)) {
    delete sourceValues.movement_raw;
  }

  const result: CatalogPublicSpecification[] = [];
  const seen = new Set<string>();

  for (const key of specificationOrder) {
    const value = textValue(sourceValues[key]);
    const definition = specificationDefinitions[key];
    if (!value || !definition || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      key,
      label: definition.label,
      value,
      group: definition.group,
    });
  }

  return result;
}

function keySpecifications(specifications: CatalogPublicSpecification[]): CatalogPublicSpecification[] {
  const byKey = new Map(specifications.map((specification) => [specification.key, specification]));
  const picked: CatalogPublicSpecification[] = [];

  for (const key of keySpecificationPriority) {
    const specification = byKey.get(key);
    if (specification) {
      picked.push(specification);
    }

    if (picked.length === 3) {
      return picked;
    }
  }

  return picked;
}

function imageAlt(title: string, referenceDisplay: string, order: number): string {
  return `${title}, ${referenceDisplay}, фото ${order}`;
}

function imagePresentationFromPlanItem(
  item: CatalogImageUploadPlanItem,
  title: string,
  referenceDisplay: string,
): CatalogImagePresentation | null {
  const alt = imageAlt(title, referenceDisplay, item.intendedOrder);

  if (item.actualZipEntry) {
    const imageKey = createCatalogDevImageKey(item);
    return {
      kind: "development_zip",
      imageKey,
      src: `/api/catalog/dev-images/${imageKey}`,
      alt,
    };
  }

  if (item.remoteImageUrl) {
    return {
      kind: "remote",
      url: item.remoteImageUrl,
      src: item.remoteImageUrl,
      alt,
    };
  }

  return null;
}

function imageGalleryForCandidate(input: {
  candidate: MergedCatalogCandidate;
  imagePlanItems: CatalogImageUploadPlanItem[];
  title: string;
  referenceDisplay: string;
}): CatalogImagePresentation[] {
  return input.imagePlanItems
    .filter((item) => item.candidateId === input.candidate.candidateId && item.imageValidationState === "valid")
    .sort((left, right) => left.intendedOrder - right.intendedOrder)
    .map((item) => imagePresentationFromPlanItem(item, input.title, input.referenceDisplay))
    .filter((image): image is Exclude<CatalogImagePresentation, { kind: "none" }> => image !== null);
}

function missingImage(title: string): CatalogImagePresentation {
  return {
    kind: "none",
    alt: `${title}: изображение пока недоступно`,
  };
}

/**
 * Groups the site-import overlay (specifications + SEO copy) by brand-scoped normalized reference,
 * so a Casio row can never accidentally satisfy an Orient candidate (or vice versa) even if a
 * normalized reference were ever to coincide. Exported so the read repository can reuse the exact
 * same lookup for the SEO half, which is deliberately kept out of `CatalogWatchDetail` — see
 * `readModelFromCandidate`'s use of only `.specifications` from the looked-up entry.
 */
export function groupSiteImportOverlayByReference(
  manifest: CatalogSiteImportOverlayManifest | null,
): Map<string, CatalogSiteImportOverlayEntry> {
  const grouped = new Map<string, CatalogSiteImportOverlayEntry>();
  if (!manifest) {
    return grouped;
  }

  for (const entry of manifest.entries) {
    grouped.set(`${entry.brandSlug}:${entry.referenceNormalized}`, entry);
  }

  return grouped;
}

/** Groups the Orient photo-archive manifest by catalog reference, primary image first, so a
 * single map lookup per Orient candidate is all `readModelFromCandidate` ever needs. */
function groupOrientManifestByReference(manifest: OrientPhotoArchiveManifest | null): Map<string, OrientManifestEntry[]> {
  const grouped = new Map<string, OrientManifestEntry[]>();
  if (!manifest) {
    return grouped;
  }

  for (const entry of manifest.entries) {
    if (!grouped.has(entry.referenceNormalized)) {
      grouped.set(entry.referenceNormalized, []);
    }
    grouped.get(entry.referenceNormalized)!.push(entry);
  }

  for (const entries of grouped.values()) {
    entries.sort((left, right) => {
      if (left.position !== right.position) return left.position === "primary" ? -1 : 1;
      return (left.galleryIndex ?? 0) - (right.galleryIndex ?? 0);
    });
  }

  return grouped;
}

function orientArchiveImagePresentation(entry: OrientManifestEntry, title: string, referenceDisplay: string, order: number): CatalogImagePresentation {
  const imageKey = createOrientArchiveImageKey(entry.zipEntry);
  return {
    kind: "development_zip",
    imageKey,
    src: `/api/catalog/dev-images/${imageKey}`,
    alt: imageAlt(title, referenceDisplay, order),
  };
}

function casioArchiveImagePresentation(entry: CasioManifestEntry, title: string, referenceDisplay: string, order: number): CatalogImagePresentation {
  const imageKey = createCasioArchiveImageKey(entry.zipEntry);
  return {
    kind: "development_zip",
    imageKey,
    src: `/api/catalog/dev-images/${imageKey}`,
    alt: imageAlt(title, referenceDisplay, order),
  };
}

function tissotArchiveImagePresentation(entry: TissotManifestEntry, title: string, referenceDisplay: string, order: number): CatalogImagePresentation {
  const imageKey = createTissotArchiveImageKey(entry.archiveFile, entry.zipEntry);
  return {
    kind: "development_zip",
    imageKey,
    src: `/api/catalog/dev-images/${imageKey}`,
    alt: imageAlt(title, referenceDisplay, order),
  };
}

/**
 * Shared upgrade logic for both brand archives. The primary image is only ever replaced when the
 * candidate's own current primary is genuinely missing or rejected by the same clean-image policy
 * the Recommended ranking already trusts — a working primary is never overridden. Archive images
 * are otherwise always appended as extra gallery entries (deduplicated by src) whether or not the
 * primary needed an upgrade, so a watch detail page shows more than one photo whenever the archive
 * has them — docs/CATALOG_SHOWROOM_RECOVERY.md "Orient ZIP integration" / "Casio updated photo
 * archive" (Phase 3.3: "при открытии часов ... должно быть несколько фото").
 */
function applyPhotoArchiveUpgrade(input: {
  primaryImage: CatalogImagePresentation;
  imageGallery: CatalogImagePresentation[];
  archiveImages: CatalogImagePresentation[];
}): { primaryImage: CatalogImagePresentation; imageGallery: CatalogImagePresentation[] } {
  if (input.archiveImages.length === 0) {
    return { primaryImage: input.primaryImage, imageGallery: input.imageGallery };
  }

  const needsPrimaryUpgrade = classifyCatalogImageRejection(input.primaryImage, 0) !== null;
  if (needsPrimaryUpgrade) {
    return { primaryImage: input.archiveImages[0]!, imageGallery: input.archiveImages };
  }

  const existingSrcs = new Set(input.imageGallery.map((image) => (image.kind === "none" ? null : image.src)));
  const additional = input.archiveImages.filter((image) => image.kind !== "none" && !existingSrcs.has(image.src));
  return { primaryImage: input.primaryImage, imageGallery: [...input.imageGallery, ...additional] };
}

/** Never mixes in another reference's photo (both manifests only ever hold exact-reference
 * matches) and only applies to the matching brand. */
function applyOrientArchiveUpgrade(input: {
  brandSlug: string;
  referenceNormalized: string;
  title: string;
  referenceDisplay: string;
  primaryImage: CatalogImagePresentation;
  imageGallery: CatalogImagePresentation[];
  orientManifestByReference: Map<string, OrientManifestEntry[]>;
}): { primaryImage: CatalogImagePresentation; imageGallery: CatalogImagePresentation[] } {
  if (input.brandSlug !== "orient") {
    return { primaryImage: input.primaryImage, imageGallery: input.imageGallery };
  }

  const archiveEntries = input.orientManifestByReference.get(input.referenceNormalized) ?? [];
  const archiveImages = archiveEntries.map((entry, index) => orientArchiveImagePresentation(entry, input.title, input.referenceDisplay, index));
  return applyPhotoArchiveUpgrade({ primaryImage: input.primaryImage, imageGallery: input.imageGallery, archiveImages });
}

function applyCasioArchiveUpgrade(input: {
  brandSlug: string;
  referenceNormalized: string;
  title: string;
  referenceDisplay: string;
  primaryImage: CatalogImagePresentation;
  imageGallery: CatalogImagePresentation[];
  casioManifestByReference: Map<string, CasioManifestEntry[]>;
}): { primaryImage: CatalogImagePresentation; imageGallery: CatalogImagePresentation[] } {
  if (input.brandSlug !== "casio") {
    return { primaryImage: input.primaryImage, imageGallery: input.imageGallery };
  }

  const archiveEntries = input.casioManifestByReference.get(input.referenceNormalized) ?? [];
  const archiveImages = archiveEntries.map((entry, index) => casioArchiveImagePresentation(entry, input.title, input.referenceDisplay, index));
  return applyPhotoArchiveUpgrade({ primaryImage: input.primaryImage, imageGallery: input.imageGallery, archiveImages });
}

function applyTissotArchiveUpgrade(input: {
  brandSlug: string;
  referenceNormalized: string;
  title: string;
  referenceDisplay: string;
  primaryImage: CatalogImagePresentation;
  imageGallery: CatalogImagePresentation[];
  tissotManifestByReference: Map<string, TissotManifestEntry[]>;
}): { primaryImage: CatalogImagePresentation; imageGallery: CatalogImagePresentation[] } {
  if (input.brandSlug !== "tissot") {
    return { primaryImage: input.primaryImage, imageGallery: input.imageGallery };
  }

  const archiveEntries = input.tissotManifestByReference.get(input.referenceNormalized) ?? [];
  const archiveImages = archiveEntries.map((entry, index) => tissotArchiveImagePresentation(entry, input.title, input.referenceDisplay, index));
  return applyPhotoArchiveUpgrade({ primaryImage: input.primaryImage, imageGallery: input.imageGallery, archiveImages });
}

/** Groups the Casio photo-archive manifest by catalog reference, primary image first (mirrors
 * groupOrientManifestByReference). */
function groupCasioManifestByReference(manifest: CasioPhotoArchiveManifest | null): Map<string, CasioManifestEntry[]> {
  const grouped = new Map<string, CasioManifestEntry[]>();
  if (!manifest) {
    return grouped;
  }

  for (const entry of manifest.entries) {
    if (!grouped.has(entry.referenceNormalized)) {
      grouped.set(entry.referenceNormalized, []);
    }
    grouped.get(entry.referenceNormalized)!.push(entry);
  }

  for (const entries of grouped.values()) {
    entries.sort((left, right) => {
      if (left.position !== right.position) return left.position === "primary" ? -1 : 1;
      return (left.galleryIndex ?? 0) - (right.galleryIndex ?? 0);
    });
  }

  return grouped;
}

/** Groups the Tissot photo-archive manifest by catalog reference, primary image first (mirrors
 * groupOrientManifestByReference / groupCasioManifestByReference). */
function groupTissotManifestByReference(manifest: TissotPhotoArchiveManifest | null): Map<string, TissotManifestEntry[]> {
  const grouped = new Map<string, TissotManifestEntry[]>();
  if (!manifest) {
    return grouped;
  }

  for (const entry of manifest.entries) {
    if (!grouped.has(entry.referenceNormalized)) {
      grouped.set(entry.referenceNormalized, []);
    }
    grouped.get(entry.referenceNormalized)!.push(entry);
  }

  for (const entries of grouped.values()) {
    entries.sort((left, right) => {
      if (left.position !== right.position) return left.position === "primary" ? -1 : 1;
      return (left.galleryIndex ?? 0) - (right.galleryIndex ?? 0);
    });
  }

  return grouped;
}

function readModelFromCandidate(input: {
  candidate: MergedCatalogCandidate;
  imagePlanItems: CatalogImageUploadPlanItem[];
  orientManifestByReference: Map<string, OrientManifestEntry[]>;
  casioManifestByReference: Map<string, CasioManifestEntry[]>;
  tissotManifestByReference: Map<string, TissotManifestEntry[]>;
  siteImportOverlayByReference: Map<string, CatalogSiteImportOverlayEntry>;
}): Omit<CatalogWatchDetail, "siblingReferences"> | null {
  const { candidate } = input;

  if (candidate.applyEligibility.status !== "eligible") {
    return null;
  }

  if (candidate.sourceRowClassification?.action === "exclude_from_public_read_and_apply") {
    return null;
  }

  const brandName = textValue(candidate.identity.brand);
  const rawTitle = textValue(candidate.identity.title);
  const rawReferenceDisplay = textValue(candidate.identity.referenceRaw);
  const referenceNormalized = textValue(candidate.identity.referenceNormalized);
  const rawWatchModelName = textValue(candidate.hierarchy.watchModelCandidate);

  if (!brandName || !rawTitle || !rawReferenceDisplay || !referenceNormalized || !rawWatchModelName) {
    return null;
  }

  if (referenceNormalized === "7") {
    return null;
  }

  const brandSlug = slugifyCatalogText(brandName);
  if (!brandSlug) {
    return null;
  }

  // Presentation-only cleanup: strips leftover source-spreadsheet review annotations (e.g.
  // "ECB-950YMP-1A блять повтор" -> "ECB-950YMP-1A") from the two visible identity strings.
  // Never touches raw source data, referenceNormalized (matching/canonical-slug identity), or
  // eligibility above, which all use the untouched raw values.
  const title = sanitizeCatalogPublicText(rawTitle).sanitized;
  const referenceDisplay = sanitizeCatalogPublicText(rawReferenceDisplay).sanitized;
  const watchModelName = sanitizeCatalogPublicText(rawWatchModelName).sanitized;

  // A real manufacturer reference is always Latin letters/digits/punctuation — never Cyrillic. A
  // handful of source rows glue an unrecognized review annotation onto an otherwise-reference-
  // shaped string (so the import pipeline's own classifier lets them through as "product_candidate"),
  // which the sanitizer above only strips when it recognizes the specific phrase. This is a second,
  // general safety net: if Cyrillic survives in the public reference after sanitization, the row was
  // never a real distinct product (either pure leftover spreadsheet noise, or a near-duplicate of an
  // already-present clean-reference row for the same watch) — never a legitimate public catalog
  // record to begin with, so excluding it is not "hiding" a real watch.
  if (/[а-яё]/iu.test(referenceDisplay)) {
    return null;
  }

  const referenceSlug = referenceSlugFromNormalized(referenceNormalized);
  const siteImportOverlay = input.siteImportOverlayByReference.get(`${brandSlug}:${referenceNormalized}`) ?? null;
  const specifications = publicSpecifications(candidate, siteImportOverlay?.specifications ?? null);
  const imageGallery = imageGalleryForCandidate({
    candidate,
    imagePlanItems: input.imagePlanItems,
    title,
    referenceDisplay,
  });
  // Prefer a front-facing image over a caseback/side/detail shot when one is available in this
  // reference's own gallery, using the same alt-text/ordering heuristic already trusted for the
  // watch detail hero (catalog-image-presentation-policy.ts). Never substitutes another
  // reference's image and never invents one; only reorders among this candidate's own gallery.
  const initialPrimaryImage = imageGallery.length > 0 ? selectBestCatalogHeroImage(imageGallery) : missingImage(title);
  const orientUpgrade = applyOrientArchiveUpgrade({
    brandSlug,
    referenceNormalized,
    title,
    referenceDisplay,
    primaryImage: initialPrimaryImage,
    imageGallery,
    orientManifestByReference: input.orientManifestByReference,
  });
  const casioUpgrade = applyCasioArchiveUpgrade({
    brandSlug,
    referenceNormalized,
    title,
    referenceDisplay,
    primaryImage: orientUpgrade.primaryImage,
    imageGallery: orientUpgrade.imageGallery,
    casioManifestByReference: input.casioManifestByReference,
  });
  const tissotUpgrade = applyTissotArchiveUpgrade({
    brandSlug,
    referenceNormalized,
    title,
    referenceDisplay,
    primaryImage: casioUpgrade.primaryImage,
    imageGallery: casioUpgrade.imageGallery,
    tissotManifestByReference: input.tissotManifestByReference,
  });
  const primaryImage = tissotUpgrade.primaryImage;
  const price = candidate.pricing.publicPriceCandidate
    ? createMoney(candidate.pricing.publicPriceCandidate.amountMinor, candidate.pricing.publicPriceCandidate.currencyCode)
    : null;
  const rawOfficialName = textValue(candidate.identity.officialName);
  const officialName = rawOfficialName ? sanitizeCatalogPublicText(rawOfficialName).sanitized : null;

  return {
    id: `${brandSlug}/${referenceSlug}`,
    href: `/watches/${brandSlug}/${referenceSlug}`,
    brandName,
    brandSlug,
    title,
    officialName,
    referenceDisplay,
    referenceNormalized,
    referenceSlug,
    brandCollectionName: textValue(candidate.hierarchy.brandCollection),
    brandLineName: textValue(candidate.hierarchy.brandLine),
    watchModelName,
    publicPrice: price,
    primaryImage,
    imageGallery: tissotUpgrade.imageGallery,
    keySpecifications: keySpecifications(specifications),
    specifications,
  };
}

/**
 * A handful of source rows are a verbatim duplicate of an already-present clean row, with a
 * leftover review annotation appended to the reference/title that `sanitizeCatalogPublicText`
 * successfully strips (e.g. "ECB-900YDB-1A бляTь повTор" -> the exact same public reference as the
 * existing clean "ECB-900YDB-1A" row) — so two rows end up showing the identical public reference
 * for the same brand. The Cyrillic-content check in `readModelFromCandidate` only catches the case
 * where sanitization *fails* to fully clean the text; this catches the case where it succeeds but
 * a duplicate remains. Grouped by the sanitized, normalized reference (never the raw
 * `referenceNormalized`, which still carries the annotation), keeping the most complete record in
 * each group — every real duplicate found this way had strictly less data (no image, no
 * specifications) than its clean counterpart, never the reverse, so "most complete" is a safe,
 * deterministic, non-arbitrary tiebreak rather than a guess.
 */
function deduplicateByCleanReference<T extends Omit<CatalogWatchDetail, "siblingReferences">>(watches: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const watch of watches) {
    const key = `${watch.brandSlug}:${normalizeManufacturerReference(watch.referenceDisplay)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(watch);
  }

  const kept: T[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      kept.push(group[0]!);
      continue;
    }

    const best = [...group].sort((left, right) => {
      const leftHasImage = left.primaryImage.kind !== "none" ? 1 : 0;
      const rightHasImage = right.primaryImage.kind !== "none" ? 1 : 0;
      if (leftHasImage !== rightHasImage) return rightHasImage - leftHasImage;

      if (left.specifications.length !== right.specifications.length) return right.specifications.length - left.specifications.length;

      if (left.referenceNormalized.length !== right.referenceNormalized.length) return left.referenceNormalized.length - right.referenceNormalized.length;

      return left.id.localeCompare(right.id, "en");
    })[0]!;

    kept.push(best);
  }

  return kept;
}

function attachSiblings(watches: Array<Omit<CatalogWatchDetail, "siblingReferences">>): CatalogWatchDetail[] {
  return watches.map((watch) => {
    const siblingReferences = watches
      .filter(
        (sibling) =>
          sibling.id !== watch.id &&
          sibling.brandSlug === watch.brandSlug &&
          sibling.watchModelName === watch.watchModelName,
      )
      .slice(0, 8)
      .map((sibling) => ({
        id: sibling.id,
        href: sibling.href,
        title: sibling.title,
        referenceDisplay: sibling.referenceDisplay,
        referenceNormalized: sibling.referenceNormalized,
        referenceSlug: sibling.referenceSlug,
        publicPrice: sibling.publicPrice,
        primaryImage: sibling.primaryImage,
      }));

    return {
      ...watch,
      siblingReferences,
    };
  });
}

export function catalogReadDatasetFromPreview(input: {
  preview: CatalogImportPreview;
  imagePlan: CatalogImageUploadPlan | null;
  /** Optional — absent on every existing call site until it's explicitly passed, so this never
   * changes behavior unless a caller opts in (docs/CATALOG_SHOWROOM_RECOVERY.md "Orient ZIP
   * integration" / "Casio updated photo archive"). Only ever replaces a missing/rejected primary
   * image; a working primary is always appended-to (extra gallery photos), never replaced. */
  orientPhotoManifest?: OrientPhotoArchiveManifest | null;
  casioPhotoManifest?: CasioPhotoArchiveManifest | null;
  /** Optional — absent on every existing call site until it's explicitly passed. Same "only ever
   * upgrades a missing/rejected primary, otherwise appends real gallery photos" rule as the Orient/
   * Casio manifests above (docs/CATALOG_SHOWROOM_RECOVERY.md "Tissot photo gap"). */
  tissotPhotoManifest?: TissotPhotoArchiveManifest | null;
  /** Optional — absent on every existing call site until it's explicitly passed. Merges richer,
   * pre-normalized specification values from the user-supplied site-import workbooks into the same
   * `CatalogPublicSpecification[]` shape the raw import already produces; never changes the
   * read-model type. SEO copy from the same source is deliberately NOT consumed here — it stays out
   * of `CatalogWatchDetail` entirely and is read separately at the repository/page layer. */
  siteImportOverlay?: CatalogSiteImportOverlayManifest | null;
}): CatalogReadDataset {
  const imagePlanItems = input.imagePlan?.items ?? [];
  const orientManifestByReference = groupOrientManifestByReference(input.orientPhotoManifest ?? null);
  const casioManifestByReference = groupCasioManifestByReference(input.casioPhotoManifest ?? null);
  const tissotManifestByReference = groupTissotManifestByReference(input.tissotPhotoManifest ?? null);
  const siteImportOverlayByReference = groupSiteImportOverlayByReference(input.siteImportOverlay ?? null);
  const baseWatches = input.preview.records
    .map((candidate) =>
      readModelFromCandidate({
        candidate,
        imagePlanItems,
        orientManifestByReference,
        casioManifestByReference,
        tissotManifestByReference,
        siteImportOverlayByReference,
      }),
    )
    .filter((watch): watch is Omit<CatalogWatchDetail, "siblingReferences"> => watch !== null);
  const deduplicatedWatches = deduplicateByCleanReference(baseWatches);
  const watches = attachSiblings(deduplicatedWatches);
  const brandCounts = watches.reduce<Map<string, { name: string; count: number }>>((counts, watch) => {
    const existing = counts.get(watch.brandSlug);
    counts.set(watch.brandSlug, {
      name: watch.brandName,
      count: (existing?.count ?? 0) + 1,
    });
    return counts;
  }, new Map());

  return {
    source: "preview",
    generatedAt: input.preview.generatedAt,
    watches,
    brands: [...brandCounts.entries()]
      .map(([slug, value]) => ({ slug, name: value.name, watchCount: value.count }))
      .sort((left, right) => right.watchCount - left.watchCount || left.name.localeCompare(right.name, "ru")),
  };
}
