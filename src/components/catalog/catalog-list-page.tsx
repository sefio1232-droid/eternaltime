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
      <div className="grid gap-8">
        <header className="grid gap-5 border-b border-[var(--border)] pb-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="type-meta">Каталог часов</p>
            <h1 className="type-display mt-3 max-w-3xl text-5xl text-balance md:text-6xl">{title}</h1>
            <p className="type-body mt-5 max-w-2xl text-[var(--text-muted)]">{description}</p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            <span className="text-lg font-semibold text-[var(--text)]">{formatCatalogCount(result.totalRecords)}</span>{" "}
            позиций
          </p>
        </header>

        <CatalogMobileFilterSheet
          facets={result.facets}
          query={result.query}
          pathname={pathname}
          includeBrandFilter={includeBrandFilter}
        />

        <div className="grid gap-9 lg:grid-cols-[260px_1fr]">
          <aside className="hidden self-start border-r border-[var(--border)] pr-6 lg:block">
            <CatalogFilterPanel
              facets={result.facets}
              query={result.query}
              pathname={pathname}
              includeBrandFilter={includeBrandFilter}
            />
          </aside>

          <section className="grid gap-7" aria-label="Результаты каталога">
            {result.items.length > 0 ? (
              <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((watch) => (
                  <CatalogWatchCardView key={watch.id} watch={watch} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Ничего не найдено"
                description="Попробуйте изменить поиск или убрать часть фильтров. Каталог показывает только подтверждённые публичные watch references."
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
      </div>
    </Container>
  );
}
