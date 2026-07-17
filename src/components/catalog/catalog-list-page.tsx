import Link from "next/link";
import { CatalogFilterPanel } from "@/components/catalog/catalog-filter-panel";
import { CatalogMobileFilterSheet } from "@/components/catalog/catalog-mobile-filter-sheet";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { EditorialContainer, EditorialHeading } from "@/components/ui/editorial-primitives";
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
  const featuredWatch = result.items.find((watch) => watch.primaryImage.kind !== "none") ?? result.items[0] ?? null;
  const firstRowItems = result.items.slice(0, 4);
  const remainingItems = result.items.slice(4);

  return (
    <EditorialContainer className="catalog-page public-page">
      <div className="grid gap-7">
        <header className="catalog-page-head">
          <EditorialHeading eyebrow="Каталог" title={title} deck={description} />
          <aside className="catalog-help-card">
            <p className="font-semibold">Не знаете, что выбрать?</p>
            <p>Начните со сценария: стиль, размер, механизм и роль в будущей коллекции.</p>
            <Link href="/selection" className="editorial-link">Перейти к подбору</Link>
          </aside>
        </header>

        <section data-layout="catalog-toolbar" className="catalog-toolbar">
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

        <section className="catalog-results-layout" aria-label="Результаты каталога">
          <aside className="catalog-sidebar" aria-label="Бренды">
            <p className="type-label">Бренды</p>
            <div className="catalog-sidebar-list">
              <span>
                <strong>Все бренды</strong>
                <em>{formatCatalogCount(result.totalRecords)}</em>
              </span>
              {result.facets.brands.slice(0, 8).map((brand) => (
                <Link key={brand.value} href={`/watches?brand=${brand.value}`}>
                  <strong>{brand.label}</strong>
                  <em>{formatCatalogCount(brand.count)}</em>
                </Link>
              ))}
            </div>
            <Link href="/journal" className="catalog-sidebar-note">
              <span>Как выбрать механические часы?</span>
              <small>Гайд по выбору от Eternal Time</small>
            </Link>
          </aside>

          <div className="grid gap-7">
            <div className="catalog-results-head">
              <p>
                Найдено <strong>{formatCatalogCount(result.totalRecords)}</strong> часов
              </p>
              <div className="catalog-view-toggle" aria-label="Вид каталога">
                <span aria-hidden="true">▦</span>
                <span aria-hidden="true">☰</span>
              </div>
            </div>

            {result.items.length > 0 ? (
              <>
                <div data-layout="catalog-grid" className="catalog-grid grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {firstRowItems.map((watch) => (
                    <CatalogWatchCardView key={watch.id} watch={watch} />
                  ))}
                </div>

                {featuredWatch ? (
                  <Link href={featuredWatch.href} className="catalog-feature-strip">
                    <span>
                      <span className="type-label">Подборка</span>
                      <strong>Элегантная классика на каждый день</strong>
                      <em>Смотреть модель</em>
                    </span>
                    <span className="catalog-feature-media">
                      <CatalogImage image={featuredWatch.primaryImage} presentation="guarded" compositionSlot="catalog-feature" />
                    </span>
                  </Link>
                ) : null}

                {remainingItems.length > 0 ? (
                  <div className="catalog-grid grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {remainingItems.map((watch) => (
                      <CatalogWatchCardView key={watch.id} watch={watch} />
                    ))}
                  </div>
                ) : null}
              </>
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
          </div>
        </section>
      </div>
    </EditorialContainer>
  );
}
