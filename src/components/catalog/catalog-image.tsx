import type { CSSProperties } from "react";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";
import {
  resolveCatalogImagePresentation,
  type CatalogImageCompositionSlot,
} from "@/modules/catalog/application/catalog-image-presentation-policy";

export function CatalogImage({
  image,
  className = "",
  priority = false,
  presentation = "guarded",
  compositionSlot,
  imageIndex = 0,
  galleryCount = 1,
}: Readonly<{
  image: CatalogImagePresentation;
  className?: string;
  priority?: boolean;
  presentation?: "guarded" | "card" | "full";
  compositionSlot?: CatalogImageCompositionSlot;
  imageIndex?: number;
  galleryCount?: number;
}>) {
  const composition = compositionSlot
    ? resolveCatalogImagePresentation({ image, slot: compositionSlot, imageIndex, galleryCount })
    : null;

  if (image.kind === "none") {
    return (
      <span
        role="img"
        aria-label={image.alt}
        className={`flex h-full w-full items-center justify-center ${className}`}
        data-image-presentation-mode={composition?.mode ?? "missing"}
        data-image-focal-x={composition?.focalX ?? 50}
        data-image-focal-y={composition?.focalY ?? 50}
        data-image-scale={composition?.scale ?? 1}
        data-image-source-quality={composition?.sourceQuality ?? "missing"}
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
      src={image.src}
      alt={image.alt}
      className={`catalog-image catalog-image--${presentation} ${composition ? "catalog-image--composed" : ""} ${className}`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
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
