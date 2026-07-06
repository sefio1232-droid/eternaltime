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
        className={`flex h-full min-h-48 w-full items-center justify-center bg-[var(--surface-muted)] text-center text-sm text-[var(--text-muted)] ${className}`}
        role="img"
        aria-label={image.alt}
      >
        <span>Изображение готовится</span>
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
