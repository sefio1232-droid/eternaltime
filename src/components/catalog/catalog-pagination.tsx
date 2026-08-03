import Link from "next/link";
import { catalogQueryHref } from "@/modules/catalog/application/catalog-read-query";
import type { CatalogReadQuery } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-pagination.module.css";

function pageHref(pathname: string, query: CatalogReadQuery, page: number, includeBrandParam: boolean): string {
  return catalogQueryHref(pathname, query, {
    brandSlug: includeBrandParam ? query.brandSlug : null,
    page,
  });
}

export function CatalogPagination({
  pathname,
  query,
  page,
  pageCount,
  includeBrandParam,
}: Readonly<{
  pathname: string;
  query: CatalogReadQuery;
  page: number;
  pageCount: number;
  includeBrandParam: boolean;
}>) {
  if (pageCount <= 1) {
    return null;
  }

  const visiblePages = Array.from(
    new Set([1, page - 1, page, page + 1, pageCount].filter((value) => value >= 1 && value <= pageCount)),
  );

  return (
    <div className={styles.wrap}>
      <nav aria-label="Пагинация каталога" className={styles.nav}>
        <Link
          href={pageHref(pathname, query, Math.max(1, page - 1), includeBrandParam)}
          aria-disabled={page === 1}
          tabIndex={page === 1 ? -1 : undefined}
          className={`${styles.step} ${page === 1 ? styles.stepDisabled : ""}`}
        >
          Назад
        </Link>
        <span className={styles.divider} aria-hidden="true" />
        {visiblePages.map((value, index) => {
          const previous = visiblePages[index - 1];
          const showGap = previous !== undefined && value - previous > 1;

          return (
            <span key={value} className={styles.nav}>
              {showGap ? (
                <span className={styles.gap} aria-hidden="true">
                  …
                </span>
              ) : null}
              <Link
                href={pageHref(pathname, query, value, includeBrandParam)}
                aria-current={value === page ? "page" : undefined}
                className={`${styles.pageLink} ${value === page ? styles.pageLinkActive : ""}`}
              >
                {value}
              </Link>
            </span>
          );
        })}
        <span className={styles.divider} aria-hidden="true" />
        <Link
          href={pageHref(pathname, query, Math.min(pageCount, page + 1), includeBrandParam)}
          aria-disabled={page === pageCount}
          tabIndex={page === pageCount ? -1 : undefined}
          className={`${styles.step} ${page === pageCount ? styles.stepDisabled : ""}`}
        >
          Вперед
        </Link>
      </nav>
      <p className={styles.context}>
        Страница {page} из {pageCount}
      </p>
    </div>
  );
}
