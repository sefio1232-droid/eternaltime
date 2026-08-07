import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { displayWatchModelHeading } from "@/modules/catalog/application/catalog-display";
import type { CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import styles from "./editorial-watch-visual.module.css";

export type EditorialWatchVisualSize = "small" | "medium" | "large";
export type EditorialWatchVisualSurface = "paper" | "stone" | "ink" | "mist";
export type EditorialWatchPresentationMode = "compact" | "standard" | "large" | "long-strap" | "wide-case";

export function EditorialWatchVisual({
  watch,
  size,
  surface,
  showBrand = true,
  showReference = false,
  link = watch.href,
  presentationMode = "standard",
  priority = false,
  className = "",
  index,
}: Readonly<{
  watch: CatalogWatchDetail;
  size: EditorialWatchVisualSize;
  surface: EditorialWatchVisualSurface;
  showBrand?: boolean;
  showReference?: boolean;
  link?: string | false;
  presentationMode?: EditorialWatchPresentationMode;
  priority?: boolean;
  className?: string;
  index?: number;
}>) {
  const displayName = displayWatchModelHeading({
    brandName: watch.brandName,
    title: watch.title,
    referenceDisplay: watch.referenceDisplay,
  });
  const content = (
    <>
      <span className={styles.media}>
        <CatalogImage
          image={watch.primaryImage}
          compositionSlot={size === "large" ? "journal-lead" : "journal-compact"}
          priority={priority}
        />
      </span>
      {showBrand || showReference ? (
        <span className={styles.identity}>
          {showBrand ? <strong>{watch.brandName}</strong> : null}
          {showReference ? <span>{displayName}<small>{watch.referenceDisplay}</small></span> : null}
        </span>
      ) : null}
    </>
  );
  const classNames = `${styles.visual} ${className}`;
  const sharedProps = {
    className: classNames,
    "data-size": size,
    "data-surface": surface,
    "data-presentation": presentationMode,
    "data-index": index,
  } as const;

  if (link) {
    return <Link href={link} {...sharedProps} aria-label={`${watch.brandName} ${displayName}, ${watch.referenceDisplay}`}>{content}</Link>;
  }

  return <span {...sharedProps}>{content}</span>;
}
