import Link from "next/link";
import { catalogQueryHref } from "@/modules/catalog/application/catalog-read-query";
import type { CatalogReadQuery } from "@/modules/catalog/domain/read-models";

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
    <nav aria-label="Пагинация каталога" className="flex flex-wrap items-center justify-center gap-2">
      <Link
        href={pageHref(pathname, query, Math.max(1, page - 1), includeBrandParam)}
        aria-disabled={page === 1}
        className={`inline-flex min-h-10 items-center rounded-[var(--radius-sm)] border px-3 text-sm ${
          page === 1 ? "pointer-events-none opacity-40" : "hover:border-[var(--border-strong)]"
        }`}
      >
        Назад
      </Link>
      {visiblePages.map((value, index) => {
        const previous = visiblePages[index - 1];
        const showGap = previous !== undefined && value - previous > 1;

        return (
          <span key={value} className="inline-flex items-center gap-2">
            {showGap ? <span className="text-[var(--text-muted)]">…</span> : null}
            <Link
              href={pageHref(pathname, query, value, includeBrandParam)}
              aria-current={value === page ? "page" : undefined}
              className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-sm)] border px-3 text-sm ${
                value === page
                  ? "border-[var(--surface-strong)] bg-[var(--surface-strong)] text-[var(--text-inverse)]"
                  : "hover:border-[var(--border-strong)]"
              }`}
            >
              {value}
            </Link>
          </span>
        );
      })}
      <Link
        href={pageHref(pathname, query, Math.min(pageCount, page + 1), includeBrandParam)}
        aria-disabled={page === pageCount}
        className={`inline-flex min-h-10 items-center rounded-[var(--radius-sm)] border px-3 text-sm ${
          page === pageCount ? "pointer-events-none opacity-40" : "hover:border-[var(--border-strong)]"
        }`}
      >
        Вперед
      </Link>
    </nav>
  );
}
