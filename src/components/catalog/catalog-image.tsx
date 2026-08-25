"use client";

import { useState, type CSSProperties } from "react";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";
import {
  resolveCatalogImagePresentation,
  type CatalogImageCompositionSlot,
} from "@/modules/catalog/application/catalog-image-presentation-policy";

function missingCatalogImageAlt(image: CatalogImagePresentation | null | undefined) {
  return image && typeof image === "object" && "alt" in image && typeof image.alt === "string" && image.alt.trim()
    ? image.alt
    : "Изображение часов недоступно";
}

function normalizeCatalogImagePresentation(image: CatalogImagePresentation | null | undefined): CatalogImagePresentation {
  if (!image || typeof image !== "object" || !("kind" in image)) {
    return { kind: "none", alt: missingCatalogImageAlt(image) };
  }

  if (image.kind === "development_zip") {
    return typeof image.src === "string" && image.src.trim() && typeof image.imageKey === "string"
      ? { ...image, alt: missingCatalogImageAlt(image) }
      : { kind: "none", alt: missingCatalogImageAlt(image) };
  }

  if (image.kind === "remote") {
    return typeof image.src === "string" && image.src.trim() && typeof image.url === "string"
      ? { ...image, alt: missingCatalogImageAlt(image) }
      : { kind: "none", alt: missingCatalogImageAlt(image) };
  }

  if (image.kind === "none") {
    return { kind: "none", alt: missingCatalogImageAlt(image) };
  }

  return { kind: "none", alt: missingCatalogImageAlt(image) };
}

export function CatalogImage({
  image,
  className = "",
  priority = false,
  presentation = "guarded",
  compositionSlot,
  imageIndex = 0,
  galleryCount = 1,
}: Readonly<{
  image: CatalogImagePresentation | null | undefined;
  className?: string;
  priority?: boolean;
  presentation?: "guarded" | "card" | "full";
  compositionSlot?: CatalogImageCompositionSlot;
  imageIndex?: number;
  galleryCount?: number;
}>) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const safeImage = normalizeCatalogImagePresentation(image);
  const composition = compositionSlot
    ? resolveCatalogImagePresentation({ image: safeImage, slot: compositionSlot, imageIndex, galleryCount })
    : null;

  if (safeImage.kind === "none" || failed) {
    return (
      <span
        role="img"
        aria-label={safeImage.alt}
        className={`catalog-image catalog-image--${presentation} catalog-image--fallback flex h-full w-full items-center justify-center ${className}`}
        data-image-presentation-mode={composition?.mode ?? "missing"}
        data-image-focal-x={composition?.focalX ?? 50}
        data-image-focal-y={composition?.focalY ?? 50}
        data-image-scale={composition?.scale ?? 1}
        data-image-source-quality={failed ? "load-error" : composition?.sourceQuality ?? "missing"}
      >
        <span className="media-placeholder-mark" aria-hidden="true">
          ET
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- catalog images can come from dev ZIP resolver or remote source URLs.
    <img
      src={safeImage.src}
      alt={safeImage.alt}
      className={`catalog-image catalog-image--${presentation} ${composition ? "catalog-image--composed" : ""} ${loaded ? "catalog-image--loaded" : "catalog-image--loading"} ${className}`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      data-image-presentation-mode={composition?.mode}
      data-image-focal-x={composition?.focalX}
      data-image-focal-y={composition?.focalY}
      data-image-scale={composition?.scale}
      data-image-source-quality={composition?.sourceQuality}
      style={
        composition
          ? ({
              "--image-focal-x": `${composition.focalX}%`,
              "--image-focal-y": `${composition.focalY}%`,
              "--image-scale": composition.scale,
              "--image-translate-x": `${composition.translateX}%`,
              "--image-translate-y": `${composition.translateY}%`,
            } as CSSProperties)
          : undefined
      }
    />
  );
}
