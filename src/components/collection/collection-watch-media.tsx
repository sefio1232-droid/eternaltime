export function CollectionWatchMedia({
  imageUrl,
  alt,
  className = "",
}: Readonly<{
  imageUrl: string | null;
  alt: string;
  className?: string;
}>) {
  return (
    <div className={`collection-watch-media ${className}`}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- private signed URLs and public storage URLs are runtime sources.
        <img src={imageUrl} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <span className="media-placeholder-mark" aria-label="Изображение не добавлено">ET</span>
      )}
    </div>
  );
}
