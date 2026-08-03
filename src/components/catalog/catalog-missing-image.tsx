import styles from "@/components/catalog/catalog-missing-image.module.css";

/**
 * Editorial placeholder shown when a watch has no usable image in the current source data.
 * Never a fake product photo, never another reference's image — a neutral watch-case
 * silhouette plus factual identity text and an honest status line.
 */
export function CatalogMissingImage({
  brandName,
  referenceDisplay,
}: Readonly<{
  brandName: string;
  referenceDisplay: string;
}>) {
  return (
    <div className={styles.wrap} role="img" aria-label={`${brandName} ${referenceDisplay}: изображение пока недоступно`}>
      <svg viewBox="0 0 64 64" fill="none" className={styles.silhouette} aria-hidden="true">
        <rect x="26" y="4" width="12" height="8" rx="1.5" strokeWidth="1.4" />
        <rect x="26" y="52" width="12" height="8" rx="1.5" strokeWidth="1.4" />
        <circle cx="32" cy="32" r="19" strokeWidth="1.4" />
        <line x1="32" y1="32" x2="32" y2="21" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="32" y1="32" x2="40" y2="36" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <div className={styles.caption} aria-hidden="true">
        <span className={styles.brand}>{brandName}</span>
        <span className={styles.reference}>{referenceDisplay}</span>
        <span className={styles.status}>Изображение готовится</span>
      </div>
    </div>
  );
}
