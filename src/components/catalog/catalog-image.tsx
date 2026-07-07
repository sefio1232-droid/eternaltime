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
      <span
        role="img"
        aria-label={image.alt}
        className={`flex h-full w-full items-center justify-center ${className}`}
      >
        <span className="media-placeholder-mark" aria-hidden="true">
          ET
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- catalog images can come from dev ZIP resolver or remote source URLs.
    <img src={image.src} alt={image.alt} className={`h-full w-full object-contain ${className}`} loading="lazy" decoding="async" />
  );
}
