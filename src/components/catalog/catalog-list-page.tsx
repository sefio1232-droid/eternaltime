import { CatalogFilterPanel } from "@/components/catalog/catalog-filter-panel";
import { CatalogMobileFilterSheet } from "@/components/catalog/catalog-mobile-filter-sheet";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCatalogCount } from "@/modules/catalog/application/catalog-format";
import type { CatalogListResult } from "@/modules/catalog/domain/read-models";

export function CatalogListPage({
  result,
  pathname,
  title,
  description,
  includeBrandFilter,
}: Readonly<{
  result: CatalogListResult;
  pathname: string;
  title: string;
  description: string;
  includeBrandFilter: boolean;
}>) {
  return (
    <Container className="py-10 lg:py-14">
      <div className="grid gap-9">
        <header className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="type-label">Каталог</p>
            <h1 className="type-page mt-3 max-w-3xl text-3xl text-balance md:text-5xl">{title}</h1>
            <p className="type-body mt-4 max-w-2xl text-[var(--text-muted)]">{description}</p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-[var(--font-reference)] text-2xl font-semibold text-[var(--text)]">
              {formatCatalogCount(result.totalRecords)}
            </span>{" "}
            моделей
          </p>
        </header>

        <section data-layout="catalog-toolbar" className="border-y border-[var(--border)] py-4 lg:py-5">
          <div className="hidden lg:block">
            <CatalogFilterPanel
              facets={result.facets}
              query={result.query}
              pathname={pathname}
              includeBrandFilter={includeBrandFilter}
            />
          </div>
          <CatalogMobileFilterSheet
            facets={result.facets}
            query={result.query}
            pathname={pathname}
            includeBrandFilter={includeBrandFilter}
          />
        </section>

        <section className="grid gap-8" aria-label="Результаты каталога">
          {result.items.length > 0 ? (
            <div data-layout="catalog-grid" className="grid gap-x-6 gap-y-11 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {result.items.map((watch) => (
                <CatalogWatchCardView key={watch.id} watch={watch} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить поиск, цену или параметры часов."
            />
          )}

          <CatalogPagination
            pathname={pathname}
            query={result.query}
            page={result.page}
            pageCount={result.pageCount}
            includeBrandParam={includeBrandFilter}
          />
        </section>
      </div>
    </Container>
  );
}
