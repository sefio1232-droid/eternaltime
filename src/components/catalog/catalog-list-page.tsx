import { CatalogFilterPanel } from "@/components/catalog/catalog-filter-panel";
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
    <Container className="py-10 lg:py-12">
      <div className="grid gap-8">
        <header className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">Каталог часов</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl leading-7 text-[var(--text-muted)]">{description}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
            <span className="font-semibold">{formatCatalogCount(result.totalRecords)}</span>{" "}
            {result.totalRecords === 1 ? "позиция" : "позиций"}
          </div>
        </header>

        <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold">Фильтры и сортировка</summary>
          <div className="mt-5">
            <CatalogFilterPanel
              facets={result.facets}
              query={result.query}
              pathname={pathname}
              includeBrandFilter={includeBrandFilter}
            />
          </div>
        </details>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden self-start rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 lg:block">
            <CatalogFilterPanel
              facets={result.facets}
              query={result.query}
              pathname={pathname}
              includeBrandFilter={includeBrandFilter}
            />
          </aside>

          <section className="grid gap-6" aria-label="Результаты каталога">
            {result.items.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((watch) => (
                  <CatalogWatchCardView key={watch.id} watch={watch} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Ничего не найдено"
                description="Попробуйте изменить поиск или убрать часть фильтров. Мы показываем только часы с надежно подтвержденной публичной карточкой."
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
