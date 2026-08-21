import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";
import styles from "@/components/admin/admin.module.css";

export function AdminCatalogImage({ image, label }: { image: CatalogImagePresentation; label: string }) {
  if (image.kind === "none") {
    return (
      <div className={styles.thumb} aria-label={`${label}: изображение не добавлено`}>
        <span className={styles.meta}>нет фото</span>
      </div>
    );
  }

  return (
    <div className={styles.thumb}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt} loading="lazy" />
    </div>
  );
}

export function AdminGalleryImage({ image, label }: { image: CatalogImagePresentation; label: string }) {
  if (image.kind === "none") {
    return (
      <div className={styles.imageFrame} aria-label={`${label}: изображение не добавлено`}>
        <span className={styles.meta}>нет фото</span>
      </div>
    );
  }

  return (
    <div className={styles.imageFrame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt} loading="lazy" />
    </div>
  );
}
