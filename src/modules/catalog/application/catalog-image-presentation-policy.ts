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

const imageKeyOverrides: Record<string, PresentationOverride> = {
  "367aaa9e3c1b8f6a145057501b35493a": { focalX: 50, focalY: 46, scale: 1.2 },
  "4cb66e52d72a13a0c09e09edb70f727e": { focalX: 50, focalY: 45, scale: 1.22 },
  "22e784202d81f95b817f791807ced5f6": { focalX: 51, focalY: 45, scale: 1.18 },
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

export function isLikelyTechnicalAngle(image: CatalogImagePresentation, imageIndex = 0): boolean {
  if (image.kind === "none") {
    return false;
  }

  const text = imageText(image);
  if (/(caseback|back|clasp|buckle|side|задн|крышк|заст[её]ж|вид сбоку|браслет detail|bracelet detail)/i.test(text)) {
    return true;
  }

  const order = imageOrderFromAlt(image) ?? imageIndex + 1;
  return order >= 4;
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
      return {
        mode: image.kind === "remote" ? "product-crop" : "product-contained",
        focalX: 50,
        focalY: 47,
        scale: image.kind === "remote" ? 1.1 : 1.22,
        translateX: 0,
        translateY: -1,
        sourceQuality,
        caption: null,
      };
    case "catalog-feature":
      return { mode: "product-crop", focalX: 50, focalY: 45, scale: 1.18, translateX: 0, translateY: -1, sourceQuality, caption: null };
    case "detail-hero":
      return {
        mode: sourceQuality === "weak" ? "weak-source" : "detail-hero",
        focalX: 50,
        focalY: 45,
        scale: image.kind === "remote" ? 1.14 : 1.24,
        translateX: 0,
        translateY: -1,
        sourceQuality,
        caption: null,
      };
    case "detail-gallery": {
      const order = imageOrderFromAlt(image) ?? imageIndex + 1;
      if (order === 1) {
        return { mode: "product-contained", focalX: 50, focalY: 46, scale: 1.13, translateX: 0, translateY: 0, sourceQuality, caption: "Фронтальный вид" };
      }
      return { mode: "product-crop", focalX: 50, focalY: 48, scale: 1.14, translateX: 0, translateY: 0, sourceQuality, caption: "Ракурс" };
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

  if (/side|вид сбоку/.test(text)) {
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

export function selectBestCatalogHeroImage(images: CatalogImagePresentation[]): CatalogImagePresentation {
  return images.find((image, index) => isProminentCatalogImage(image, index)) ?? images[0] ?? { kind: "none", alt: "Изображение недоступно" };
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
