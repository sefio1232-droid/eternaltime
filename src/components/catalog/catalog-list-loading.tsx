import { EditorialContainer } from "@/components/ui/editorial-primitives";
import styles from "@/components/catalog/catalog-list-loading.module.css";

export function CatalogListLoading() {
  return (
    <EditorialContainer className="public-page">
      <div className={styles.shell} role="status" aria-label="Загрузка каталога">
        <div className={styles.intro}>
          <div className={`${styles.block} ${styles.eyebrow}`} />
          <div className={`${styles.block} ${styles.title}`} />
          <div className={`${styles.block} ${styles.lead}`} />
        </div>

        <div className={styles.toolbar} />

        <div className={`${styles.block} ${styles.resultsHead}`} />

        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={styles.card}>
              <div className={`${styles.block} ${styles.media}`} />
              <div className={`${styles.block} ${styles.line}`} />
              <div className={`${styles.block} ${styles.lineWide}`} />
              <div className={`${styles.block} ${styles.line}`} />
            </div>
          ))}
        </div>
      </div>
    </EditorialContainer>
  );
}
