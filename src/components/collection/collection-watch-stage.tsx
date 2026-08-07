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
  imageCandidates,
  alt,
  presentation,
  variant,
  className = "",
}: Readonly<{
  imageUrl: string | null;
  imageCandidates?: string[];
  alt: string;
  presentation?: CollectionWatchMediaPresentation;
  variant: CollectionWatchStageVariant;
  className?: string;
}>) {
  return (
    <div className={`${styles.watchStageSurface} ${className}`} data-watch-stage={variant}>
      <CollectionWatchMedia imageUrl={imageUrl} imageCandidates={imageCandidates} alt={alt} presentation={presentation} />
    </div>
  );
}
