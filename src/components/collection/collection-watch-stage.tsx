import {
  CollectionWatchMedia,
  type CollectionWatchMediaPresentation,
} from "@/components/collection/collection-watch-media";
import styles from "./collection-experience.module.css";

export type CollectionWatchStageVariant =
  | "shelf"
  | "recommendation"
  | "picker"
  | "preview"
  | "detail";

export function CollectionWatchStage({
  imageUrl,
  alt,
  presentation,
  variant,
  className = "",
}: Readonly<{
  imageUrl: string | null;
  alt: string;
  presentation?: CollectionWatchMediaPresentation;
  variant: CollectionWatchStageVariant;
  className?: string;
}>) {
  return (
    <div className={`${styles.watchStageSurface} ${className}`} data-watch-stage={variant}>
      <CollectionWatchMedia imageUrl={imageUrl} alt={alt} presentation={presentation} />
    </div>
  );
}
