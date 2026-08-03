"use client";

import { useState } from "react";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";
import styles from "./selection-page.module.css";

export function SelectionWatchImage({
  images,
  alt,
  priority = false,
}: Readonly<{
  images: CatalogImagePresentation[];
  alt: string;
  priority?: boolean;
}>) {
  const [imageIndex, setImageIndex] = useState(0);
  const image = images[imageIndex];

  if (!image || image.kind === "none") {
    return (
      <span className={styles.imageFallback} role="img" aria-label={`Изображение ${alt} недоступно`} data-image-fallback="true">
        <span className={styles.watchSilhouette} aria-hidden="true">
          <span />
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- runtime fallback must advance across catalog image candidates.
    <img
      src={image.src}
      alt={alt}
      className={styles.watchImage}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setImageIndex((current) => current + 1)}
      data-image-candidate={imageIndex + 1}
    />
  );
}
