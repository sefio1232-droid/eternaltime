/* eslint-disable @next/next/no-img-element */
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

export function CatalogImage({
  image,
  className = "",
}: Readonly<{
  image: CatalogImagePresentation;
  className?: string;
}>) {
  if (image.kind === "none") {
    return (
      <div
        className={`flex h-full min-h-48 w-full items-center justify-center bg-[var(--surface-subtle)] text-center text-sm text-[var(--text-soft)] ${className}`}
        role="img"
        aria-label={image.alt}
      >
        <span>Фото готовится</span>
      </div>
    );
  }

  return (
    <img
      src={image.src}
      alt={image.alt}
      className={`h-full w-full object-contain ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
