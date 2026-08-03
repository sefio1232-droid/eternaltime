"use client";

import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import styles from "@/components/catalog/catalog-list-error.module.css";

export function CatalogListError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <EditorialContainer className="public-page">
      <div className={styles.wrap}>
        <h1 className={styles.title}>Не удалось загрузить каталог</h1>
        <p className={styles.body}>
          Что-то пошло не так при подготовке витрины. Попробуйте обновить страницу — если
          проблема повторится, вернитесь в каталог позже.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.retryButton} onClick={reset}>
            Попробовать снова
          </button>
          <Link href="/watches" className={styles.backLink}>
            Вернуться в каталог
          </Link>
        </div>
      </div>
    </EditorialContainer>
  );
}
