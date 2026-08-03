"use client";

import { useState } from "react";
import type { CollectionWatchMediaPresentation } from "@/modules/user-watch-collection/application/local-collection-presentation";

export type { CollectionWatchMediaPresentation };

export function CollectionWatchMedia({
  imageUrl,
  alt,
  className = "",
  presentation = imageUrl ? "analog-bracelet" : "missing-image",
}: Readonly<{
  imageUrl: string | null;
  alt: string;
  className?: string;
  presentation?: CollectionWatchMediaPresentation;
}>) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImage = imageUrl !== null && failedImageUrl !== imageUrl;

  return (
    <div className={`collection-watch-media ${className}`} data-presentation={presentation}>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- private signed URLs and public storage URLs are runtime sources.
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-contain"
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : (
        <span className="media-placeholder-watch" role="img" aria-label="Изображение часов не добавлено">
          <i aria-hidden="true" />
          <b aria-hidden="true" />
          <em aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
