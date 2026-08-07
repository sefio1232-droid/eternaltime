"use client";

import { useEffect, useRef, useState } from "react";
import type { CollectionWatchMediaPresentation } from "@/modules/user-watch-collection/application/local-collection-presentation";

export type { CollectionWatchMediaPresentation };

export function CollectionWatchMedia({
  imageUrl,
  imageCandidates = [],
  alt,
  className = "",
  presentation = "standard",
}: Readonly<{
  imageUrl: string | null;
  imageCandidates?: string[];
  alt: string;
  className?: string;
  presentation?: CollectionWatchMediaPresentation;
}>) {
  const [failedImageUrls, setFailedImageUrls] = useState<ReadonlySet<string>>(() => new Set());
  const imageRef = useRef<HTMLImageElement>(null);
  const sources = [imageUrl, ...imageCandidates]
    .filter((source): source is string => Boolean(source))
    .filter((source, index, values) => values.indexOf(source) === index);
  const currentSource = sources.find((source) => !failedImageUrls.has(source)) ?? null;

  useEffect(() => {
    const image = imageRef.current;
    if (!currentSource || !image?.complete || image.naturalWidth > 0) return;
    const frame = window.requestAnimationFrame(() => {
      setFailedImageUrls((current) => new Set(current).add(currentSource));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentSource]);

  return (
    <div className={`collection-watch-media ${className}`} data-presentation={presentation}>
      {currentSource ? (
        // eslint-disable-next-line @next/next/no-img-element -- private signed URLs and public storage URLs are runtime sources.
        <img
          ref={imageRef}
          src={currentSource}
          alt={alt}
          onError={() => setFailedImageUrls((current) => new Set(current).add(currentSource))}
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
