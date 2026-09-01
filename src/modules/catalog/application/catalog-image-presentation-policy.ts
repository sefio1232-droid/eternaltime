import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

export type CatalogImagePresentationMode =
  | "product-contained"
  | "product-crop"
  | "detail-hero"
  | "editorial-close-up"
  | "weak-source"
  | "technical-angle"
  | "missing";

export type CatalogImageSourceQuality = "strong" | "standard" | "weak" | "technical" | "missing";

export type CatalogImageCompositionSlot =
  | "catalog-card"
  | "catalog-feature"
  | "catalog-hero-primary"
  | "catalog-hero-secondary"
  | "detail-hero"
  | "detail-gallery"
  | "home-hero-main"
  | "home-hero-secondary"
  | "home-scenario"
  | "journal-lead"
  | "journal-compact";

export type CatalogResolvedImagePresentation = {
  mode: CatalogImagePresentationMode;
  focalX: number;
  focalY: number;
  scale: number;
  translateX: number;
  translateY: number;
  sourceQuality: CatalogImageSourceQuality;
  caption: string | null;
};

type PresentationOverride = Partial<CatalogResolvedImagePresentation>;

// Focal-point-only overrides (no forced `scale`): a hardcoded scale here would apply across every
// slot this image is used in, including tightly-clipped catalog cards, and previously caused
// exactly the overflow-cropping bug reported for A130WE-7ADF (see catalog-card's own scale fix
// below). Each slot's own base scale in `basePresentation()` is the right place to control zoom.
const imageKeyOverrides: Record<string, PresentationOverride> = {
  "367aaa9e3c1b8f6a145057501b35493a": { focalX: 50, focalY: 46 },
  "4cb66e52d72a13a0c09e09edb70f727e": { focalX: 50, focalY: 45 },
  "22e784202d81f95b817f791807ced5f6": { focalX: 51, focalY: 45 },
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function imageIdentity(image: CatalogImagePresentation): string {
  if (image.kind === "development_zip") {
    return image.imageKey;
  }

  if (image.kind === "remote") {
    return image.url;
  }

  return image.alt;
}

export function imageOrderFromAlt(image: CatalogImagePresentation): number | null {
  const match = image.alt.match(/фото\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function imageText(image: CatalogImagePresentation): string {
  return [image.alt, image.kind === "remote" ? image.url : "", image.kind === "development_zip" ? image.imageKey : ""]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("ru");
}

// Source filenames/alt text carry no view-type signal for most of the catalog (e.g.
// "A168WA-1WDF_1.jpg" gives no hint it's a caseback shot), so text heuristics below miss cases
// text can't see. This is a targeted denylist of specific image keys visually confirmed during
// Phase 2.2 to be a back/caseback/clasp view masquerading as gallery position 1 — not a general
// classifier. Extend only after visually confirming a specific imageKey; a full-catalog fix needs
// either enriched import metadata or a real vision-based audit pass (see
// docs/CATALOG_PREMIUM_EDITORIAL_REBUILD.md "Known limitations").
const knownTechnicalAngleImageKeys = new Set<string>([
  "4b660c3862bda8abce31d75ac8f41473", // Casio A168WA-1WDF, gallery position 1 — caseback/clasp view
  "18ed5922d050fad407b9b2ddc9fe3cc8", // Casio AE-1200WH-1BV, gallery position 1 — caseback/buckle view
]);

export function isLikelyTechnicalAngle(image: CatalogImagePresentation, imageIndex = 0): boolean {
  if (image.kind === "none") {
    return false;
  }

  if (image.kind === "development_zip" && knownTechnicalAngleImageKeys.has(image.imageKey)) {
    return true;
  }

  const text = imageText(image);
  if (/(caseback|back|clasp|buckle|(?:^|[^a-z])side(?:$|[^a-z])|задн|крышк|заст[её]ж|вид сбоку|браслет detail|bracelet detail)/i.test(text)) {
    return true;
  }

  const order = imageOrderFromAlt(image) ?? imageIndex + 1;
  return order >= 4;
}

/**
 * Recommended-tab-only rejection categories (docs/CATALOG_SHOWROOM_RECOVERY.md "Image quality
 * policy"). Broader than `isLikelyTechnicalAngle` (which governs hero-image *selection* for every
 * surface) — this governs *eligibility for the curated Recommended tab specifically*. All/brand
 * tabs still show these watches; only Recommended excludes them, per the explicit requirement
 * that Recommended never contain a missing-image, caseback, or unreadable-dial card.
 */
export type CatalogImageRejectionReason =
  | "missing"
  | "caseback"
  | "technical-angle"
  | "contaminated-ui"
  | "low-contrast"
  | "crop-risk";

// Visually verified during Phase 3.1 (fetched and inspected the actual served bytes — see
// docs/CATALOG_SHOWROOM_RECOVERY.md). Matched against the combined alt+url text, not an exact
// key, since remote URLs carry encoded query params that vary between where they're read. Extend
// only after visually confirming a specific image; a full-catalog darkness/contamination
// classifier needs real vision analysis, out of scope here (see "Known limitations").
const knownLowContrastPatterns: RegExp[] = [
  /T151-422-36-051-00_Shadow/i, // Tissot PRC 100 Solar, all-black case/dial/strap — numerals unreadable
];

// Forward-looking only: current source alt text/URLs never contain these words (both remote
// domains are official manufacturer product-photography CDNs, sampled and confirmed clean), so
// this has no effect on today's data — it exists so a future contaminated scrape (e.g. a
// screenshot including a browser/viewer chrome) is caught automatically instead of silently
// passing through as a normal photo.
const contaminatedUiPattern = /(screenshot|browser|chrome|firefox|edge-browser|image-viewer|lightbox|devtools)/i;

/**
 * Returns the first applicable rejection reason for showing this image on the curated Recommended
 * tab, or `null` if it's clean. Never used to hide a watch from All/brand tabs/search — see
 * `isRecommendedImageEligible` in catalog-read-service.ts for where this is actually applied.
 */
export function classifyCatalogImageRejection(image: CatalogImagePresentation, imageIndex = 0): CatalogImageRejectionReason | null {
  if (image.kind === "none") {
    return "missing";
  }

  const text = imageText(image);

  if (/(caseback|back|задн|крышк)/i.test(text) || (image.kind === "development_zip" && knownTechnicalAngleImageKeys.has(image.imageKey))) {
    return "caseback";
  }

  if (contaminatedUiPattern.test(text)) {
    return "contaminated-ui";
  }

  if (knownLowContrastPatterns.some((pattern) => pattern.test(text))) {
    return "low-contrast";
  }

  if (isLikelyTechnicalAngle(image, imageIndex)) {
    return "technical-angle";
  }

  return null;
}

function sourceQualityFor(image: CatalogImagePresentation, imageIndex: number): CatalogImageSourceQuality {
  if (image.kind === "none") {
    return "missing";
  }

  if (isLikelyTechnicalAngle(image, imageIndex)) {
    return "technical";
  }

  if (image.kind === "remote") {
    return "strong";
  }

  return "standard";
}

function basePresentation(input: {
  image: CatalogImagePresentation;
  slot: CatalogImageCompositionSlot;
  imageIndex: number;
  galleryCount: number;
}): CatalogResolvedImagePresentation {
  const { image, imageIndex, slot } = input;
  const sourceQuality = sourceQualityFor(image, imageIndex);

  if (sourceQuality === "missing") {
    return {
      mode: "missing",
      focalX: 50,
      focalY: 50,
      scale: 1,
      translateX: 0,
      translateY: 0,
      sourceQuality,
      caption: null,
    };
  }

  if (sourceQuality === "technical") {
    return {
      mode: "technical-angle",
      focalX: 50,
      focalY: 50,
      scale: 1.04,
      translateX: 0,
      translateY: 0,
      sourceQuality,
      caption: technicalCaption(image, imageIndex),
    };
  }

  switch (slot) {
    case "home-hero-main":
      return { mode: "detail-hero", focalX: 50, focalY: 45, scale: 1.28, translateX: 0, translateY: -1, sourceQuality, caption: null };
    case "home-hero-secondary":
      return { mode: "product-contained", focalX: 50, focalY: 47, scale: 1.1, translateX: 0, translateY: 0, sourceQuality, caption: null };
    case "home-scenario":
      return { mode: "product-contained", focalX: 50, focalY: 46, scale: 1.18, translateX: 0, translateY: 0, sourceQuality, caption: null };
    case "catalog-card":
      // `product-contained` (never `product-crop`) and scale 1 — object-fit: contain already
      // sizes the image to the largest fit within its box; any transform scale beyond 1 on top
      // of that pushes the bound axis outside an overflow-hidden card and crops it. This was the
      // root cause of oversized/cropped catalog cards (e.g. A130WE-7ADF's tall bracelet shot).
      return {
        mode: "product-contained",
        focalX: 50,
        focalY: 50,
        scale: 1,
        translateX: 0,
        translateY: 0,
        sourceQuality,
        caption: null,
      };
    case "catalog-feature":
      // `product-contained` (object-fit: contain), not `product-crop` — the curatorial module's
      // watch must always be fully visible, never cropped by an object-fit: cover box. scale: 1 —
      // same fix as catalog-hero-primary/secondary: a transform scale on top of an already
      // object-fit: contain'd image compounds with it and pushes the watch outside its box
      // (docs/CATALOG_SHOWROOM_RECOVERY.md "Phase 4 hero — no compounding scale").
      return { mode: "product-contained", focalX: 50, focalY: 44, scale: 1, translateX: 0, translateY: 0, sourceQuality, caption: null };
    case "catalog-hero-primary":
      // scale: 1 — sizing is fully controlled by the CSS module's fixed max-height/max-width (see
      // catalog-hero.module.css); a scale transform on top of an already object-fit: contain'd
      // image compounds with it and pushes the watch outside its box (the exact bug real user
      // feedback caught: an oversized, cropped-looking primary watch — docs/CATALOG_SHOWROOM_
      // RECOVERY.md "Phase 4 hero — no compounding scale").
      return { mode: "product-contained", focalX: 50, focalY: 42, scale: 1, translateX: 0, translateY: 0, sourceQuality, caption: null };
    case "catalog-hero-secondary":
      return { mode: "product-contained", focalX: 50, focalY: 46, scale: 1, translateX: 0, translateY: 0, sourceQuality, caption: null };
    case "detail-hero":
      // scale: 1 — same fix as catalog-card/catalog-hero-primary/catalog-feature: the detail
      // page's own CSS (.detailMedia :global(.catalog-image--composed[...="detail-hero"])) already
      // caps the image at max-height/max-width: 102%, sizing it via object-fit: contain; a 1.14-
      // 1.24x transform scale on top of that compounds and pushes the watch outside the (overflow:
      // hidden) stage, cropping it — the same bug class real user feedback caught on the catalog
      // hero (docs/CATALOG_SHOWROOM_RECOVERY.md "Phase 4 hero — no compounding scale").
      return {
        mode: sourceQuality === "weak" ? "weak-source" : "detail-hero",
        focalX: 50,
        focalY: 45,
        scale: 1,
        translateX: 0,
        translateY: -1,
        sourceQuality,
        caption: null,
      };
    case "detail-gallery": {
      // scale: 1 — same fix as every other slot in this file: the gallery figure's own base
      // sizing already fills the box (globals.css .catalog-image is height/width: 100% before any
      // mode-specific rule runs), and "product-crop" mode additionally uses object-fit: cover —
      // stacking a 1.13-1.14x transform scale on top of either one compounds and crops the image
      // hard against the figure's overflow: hidden, the same bug class real user feedback caught
      // on the catalog hero and the detail-page main photo (docs/CATALOG_SHOWROOM_RECOVERY.md
      // "Phase 4 hero — no compounding scale").
      const order = imageOrderFromAlt(image) ?? imageIndex + 1;
      if (order === 1) {
        return { mode: "product-contained", focalX: 50, focalY: 46, scale: 1, translateX: 0, translateY: 0, sourceQuality, caption: "Фронтальный вид" };
      }
      return { mode: "product-crop", focalX: 50, focalY: 48, scale: 1, translateX: 0, translateY: 0, sourceQuality, caption: "Ракурс" };
    }
    case "journal-lead":
      return {
        mode: image.kind === "remote" ? "editorial-close-up" : "product-contained",
        focalX: 50,
        focalY: 45,
        scale: image.kind === "remote" ? 1.08 : 1.16,
        translateX: 0,
        translateY: 0,
        sourceQuality,
        caption: null,
      };
    case "journal-compact":
      return { mode: "product-contained", focalX: 50, focalY: 46, scale: 1.12, translateX: 0, translateY: 0, sourceQuality, caption: null };
  }
}

function technicalCaption(image: CatalogImagePresentation, imageIndex: number): string {
  const text = imageText(image);

  if (/clasp|buckle|заст[её]ж/.test(text)) {
    return "Застежка";
  }

  if (/caseback|back|задн|крышк/.test(text)) {
    return "Задняя крышка";
  }

  if (/(?:^|[^a-z])side(?:$|[^a-z])|вид сбоку/.test(text)) {
    return "Вид сбоку";
  }

  const order = imageOrderFromAlt(image) ?? imageIndex + 1;
  return order >= 4 ? "Технический ракурс" : "Ракурс";
}

export function resolveCatalogImagePresentation(input: {
  image: CatalogImagePresentation;
  slot: CatalogImageCompositionSlot;
  imageIndex?: number;
  galleryCount?: number;
}): CatalogResolvedImagePresentation {
  const imageIndex = input.imageIndex ?? 0;
  const base = basePresentation({
    image: input.image,
    slot: input.slot,
    imageIndex,
    galleryCount: input.galleryCount ?? 1,
  });
  const override = input.image.kind === "development_zip" ? imageKeyOverrides[imageIdentity(input.image)] : undefined;
  const resolved = { ...base, ...override };

  return {
    ...resolved,
    focalX: clampPercent(resolved.focalX),
    focalY: clampPercent(resolved.focalY),
    scale: Number(Math.max(0.82, Math.min(1.55, resolved.scale)).toFixed(2)),
    translateX: Number(Math.max(-20, Math.min(20, resolved.translateX)).toFixed(2)),
    translateY: Number(Math.max(-20, Math.min(20, resolved.translateY)).toFixed(2)),
  };
}

export function isProminentCatalogImage(image: CatalogImagePresentation, imageIndex = 0): boolean {
  const quality = sourceQualityFor(image, imageIndex);
  return quality !== "missing" && quality !== "technical" && quality !== "weak";
}

// Preferred when alt/filename metadata happens to say so; current source data carries no such
// words (filenames are just "_1.jpg", "_2.jpg", ...), so this has no effect on today's selection
// order and only helps once richer import metadata exists.
const preferredFrontViewPattern = /(front|face|dial|main|hero|product|frontal|циферблат|спереди|главное)/i;

export function selectBestCatalogHeroImage(images: CatalogImagePresentation[]): CatalogImagePresentation {
  const prominent = images.map((image, index) => ({ image, index })).filter(({ image, index }) => isProminentCatalogImage(image, index));

  if (prominent.length === 0) {
    return images[0] ?? { kind: "none", alt: "Изображение недоступно" };
  }

  const preferred = prominent.find(({ image }) => preferredFrontViewPattern.test(imageText(image)));
  return (preferred ?? prominent[0]).image;
}

/**
 * Orders a detail-page gallery as a front-to-back editorial sequence: the chosen hero image
 * first, then every other clean/prominent image, then known technical angles (caseback/clasp/
 * side — see `isLikelyTechnicalAngle`) last. Deliberately does not attempt a finer "dial
 * close-up" vs "lifestyle" vs "macro" split — source alt text/filenames carry no reliable signal
 * for that distinction across most of the catalog (see this file's other doc comments), and
 * guessing would risk mislabeling a real photo. Promoting clean images ahead of technical ones is
 * the one distinction the data actually supports (docs/CATALOG_SHOWROOM_RECOVERY.md
 * "Gallery sequencing").
 */
export function sequenceCatalogGalleryImages(
  gallery: CatalogImagePresentation[],
  heroImage: CatalogImagePresentation,
): CatalogImagePresentation[] {
  const heroIdentity = heroImage.kind === "none" ? null : imageIdentity(heroImage);
  const rest = gallery.filter((image) => image.kind === "none" || heroIdentity === null || imageIdentity(image) !== heroIdentity);

  const clean: CatalogImagePresentation[] = [];
  const technical: CatalogImagePresentation[] = [];

  rest.forEach((image, index) => {
    if (image.kind !== "none" && isLikelyTechnicalAngle(image, index)) {
      technical.push(image);
    } else {
      clean.push(image);
    }
  });

  return [heroImage, ...clean, ...technical];
}

export type CatalogImageQualityPresentation = CatalogImagePresentationMode;

export function resolveCatalogImageQualityPresentation(input: {
  primaryImage: CatalogImagePresentation;
  galleryCount: number;
}): CatalogImageQualityPresentation {
  return resolveCatalogImagePresentation({
    image: input.primaryImage,
    slot: "detail-hero",
    galleryCount: input.galleryCount,
  }).mode;
}

export function canUsePremiumProductScene(input: {
  primaryImage: CatalogImagePresentation;
  galleryCount: number;
}) {
  return resolveCatalogImageQualityPresentation(input) === "detail-hero";
}
