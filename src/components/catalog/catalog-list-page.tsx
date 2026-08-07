import Link from "next/link";
import {
  CatalogFilterChipsRow,
  CatalogFilterSearchField,
  CatalogFilterSortField,
  catalogFilterResetHref,
} from "@/components/catalog/catalog-filter-panel";
import { CatalogFilterDialog } from "@/components/catalog/catalog-filter-dialog";
import { CatalogCuratorialModule } from "@/components/catalog/catalog-curatorial-module";
import { CatalogHero } from "@/components/catalog/catalog-hero";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogTabs } from "@/components/catalog/catalog-tabs";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import {
  CatalogReviewDrawer,
  type CatalogReviewData,
  type CatalogReviewSanitationEntry,
} from "@/components/catalog/catalog-review-drawer";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { formatCatalogCount } from "@/modules/catalog/application/catalog-format";
import { isRecommendedViewActive, type CatalogCuratorialPath } from "@/modules/catalog/application/catalog-read-service";
import type { CatalogListResult, CatalogReadQuery, CatalogWatchCard } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-list-page.module.css";

const INSERT_AFTER_ITEM_COUNT = 12;
const PRIORITY_CARD_COUNT = 4;

type CatalogFeedItem =
  | { type: "watch"; key: string; watch: CatalogWatchCard; priority: boolean }
  | { type: "curatorial"; key: string };

/**
 * Builds one ordered feed array (watches + a single spliced-in curatorial-module marker) in the
 * exact visual/DOM order the grid should render. No CSS `order` is used anywhere to reposition a
 * card — the insert's position is decided here, once, in plain application logic, so DOM order,
 * visual order, and reading/tab order are always identical to the actual result order.
 */
function buildCatalogFeed(items: CatalogWatchCard[], includeCuratorial: boolean): CatalogFeedItem[] {
  const feed: CatalogFeedItem[] = [];
  const insertPosition = Math.min(INSERT_AFTER_ITEM_COUNT, items.length);

  items.forEach((watch, index) => {
    if (includeCuratorial && index === insertPosition) {
      feed.push({ type: "curatorial", key: "curatorial-module" });
    }
    feed.push({ type: "watch", key: watch.id, watch, priority: index < PRIORITY_CARD_COUNT });
  });

  if (includeCuratorial && insertPosition === items.length && items.length > 0) {
    feed.push({ type: "curatorial", key: "curatorial-module" });
  }

  return feed;
}

function hasRefinementFilters(query: CatalogReadQuery): boolean {
  return Boolean(
    query.search ||
      query.brandCollection ||
      query.movement ||
      query.waterResistance ||
      query.caseMaterial ||
      query.crystal ||
      query.positioning ||
      query.minPriceMinor !== null ||
      query.maxPriceMinor !== null,
  );
}

export function CatalogListPage({
  result,
  pathname,
  title,
  description,
  includeBrandFilter,
  curatorialPaths = [],
  reviewMode = false,
  sanitationEntries = [],
}: Readonly<{
  result: CatalogListResult;
  pathname: string;
  title: string;
  description: string;
  includeBrandFilter: boolean;
  /** Real watches for the curatorial module — see `pickCatalogCuratorialPaths`. Never invented. */
  curatorialPaths?: CatalogCuratorialPath[];
  reviewMode?: boolean;
  sanitationEntries?: CatalogReviewSanitationEntry[];
}>) {
  const feed = buildCatalogFeed(result.items, curatorialPaths.length > 0);
  const resetHref = catalogFilterResetHref(pathname, result.query);
  const rangeStart = result.items.length > 0 ? (result.page - 1) * result.query.pageSize + 1 : 0;
  const rangeEnd = result.items.length > 0 ? rangeStart + result.items.length - 1 : 0;

  const recommendedActive = isRecommendedViewActive(result.query);
  const currentBrandLabel = result.query.brandSlug
    ? result.facets.brands.find((brand) => brand.value === result.query.brandSlug)?.label ?? null
    : null;
  // Recommended is a ranking, not a filter — its header never mentions a price floor or an
  // "eligible" count. All three tabs share the exact same metadata format; only the heading
  // identifies which tab is active. See docs/CATALOG_SHOWROOM_RECOVERY.md "Result header".
  const resultsHeading = recommendedActive ? "Рекомендуемые часы" : currentBrandLabel ? currentBrandLabel : "Все часы";
  const resultsMeta = `Показаны ${rangeStart}–${rangeEnd} из ${formatCatalogCount(result.totalRecords)}`;
  const showRefinementReset = hasRefinementFilters(result.query);
  const defaultImagePriorityActive = result.query.sort === "default" && !result.query.search && !recommendedActive;

  const reviewData: CatalogReviewData | null = reviewMode
    ? {
        pathname,
        canonicalHref: pathname,
        totalRecords: result.totalRecords,
        page: result.page,
        pageCount: result.pageCount,
        sort: result.query.sort,
        defaultImagePriorityActive,
        activeFilters: [
          result.query.search ? { label: "search", value: result.query.search } : null,
          includeBrandFilter && result.query.brandSlug ? { label: "brand", value: result.query.brandSlug } : null,
          result.query.brandCollection ? { label: "collection", value: result.query.brandCollection } : null,
          result.query.movement ? { label: "movement", value: result.query.movement } : null,
          result.query.waterResistance ? { label: "water", value: result.query.waterResistance } : null,
          result.query.caseMaterial ? { label: "caseMaterial", value: result.query.caseMaterial } : null,
          result.query.crystal ? { label: "crystal", value: result.query.crystal } : null,
          result.query.positioning ? { label: "positioning", value: result.query.positioning } : null,
          result.query.minPriceMinor !== null ? { label: "priceMin", value: String(result.query.minPriceMinor) } : null,
          result.query.maxPriceMinor !== null ? { label: "priceMax", value: String(result.query.maxPriceMinor) } : null,
          { label: "view", value: result.query.view },
        ].filter((entry): entry is { label: string; value: string } => entry !== null),
        items: feed.map((item, feedIndex) =>
          item.type === "curatorial"
            ? {
                feedIndex,
                feedType: "editorial" as const,
                reference: "curatorial-module",
                referenceNormalized: null,
                href: "",
                imageKind: "none" as const,
                imageSrc: null,
                hadImagePriority: false,
              }
            : {
                feedIndex,
                feedType: "watch" as const,
                reference: item.watch.referenceDisplay,
                referenceNormalized: item.watch.referenceNormalized,
                href: item.watch.href,
                imageKind: item.watch.primaryImage.kind,
                imageSrc: item.watch.primaryImage.kind === "none" ? null : item.watch.primaryImage.src,
                hadImagePriority: item.priority,
              },
        ),
        sanitationEntries,
      }
    : null;

  return (
    <EditorialContainer className="public-page">
      <div className={styles.shell}>
        <CatalogHero eyebrow="Каталог Eternal Time" title={title} description={description} />

        {includeBrandFilter ? (
          <CatalogTabs pathname={pathname} query={result.query} brands={result.facets.brands} />
        ) : null}

        <div className={styles.toolbarWrap} data-layout="catalog-toolbar">
          <form action={pathname} className={styles.controlBar}>
            {/* Preserves the active Recommended/All tab across filter-form submissions — brand
                tabs already carry their own `brand` param through the URL, so no hidden field is
                needed for that half of the tab state. */}
            <input type="hidden" name="view" value={result.query.view} />
            <div className={styles.controlBarLeft}>
              <CatalogFilterSearchField query={result.query} />
              <span className={styles.controlBarCount}>{formatCatalogCount(result.totalRecords)} моделей</span>
            </div>
            <div className={styles.controlBarRight}>
              <CatalogFilterDialog
                facets={result.facets}
                query={result.query}
                pathname={pathname}
                includeBrandFilter={includeBrandFilter}
                totalRecords={result.totalRecords}
              />
              <CatalogFilterSortField query={result.query} />
            </div>
          </form>
          <CatalogFilterChipsRow facets={result.facets} query={result.query} pathname={pathname} includeBrandFilter={includeBrandFilter} />
        </div>

        <div className={styles.resultsHead}>
          <div className={styles.resultsHeadMain}>
            <h2 className={styles.resultsCount}>{resultsHeading}</h2>
            {rangeEnd > 0 ? <p className={styles.resultsRange}>{resultsMeta}</p> : null}
          </div>
          {showRefinementReset ? (
            <Link href={resetHref} className={styles.resultsReset}>
              Сбросить фильтры
            </Link>
          ) : null}
        </div>

        {feed.length > 0 ? (
          <>
            <div className={styles.grid} data-layout="catalog-grid">
              {feed.map((item) => {
                if (item.type === "curatorial") {
                  return (
                    <div key={item.key} className={`${styles.gridItem} ${styles.insertItem}`}>
                      <CatalogCuratorialModule paths={curatorialPaths} />
                    </div>
                  );
                }

                return (
                  <div key={item.key} className={styles.gridItem}>
                    <CatalogWatchCardView watch={item.watch} priority={item.priority} />
                  </div>
                );
              })}
            </div>

            <CatalogPagination
              pathname={pathname}
              query={result.query}
              page={result.page}
              pageCount={result.pageCount}
              includeBrandParam={includeBrandFilter}
            />
          </>
        ) : (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>Ничего не найдено</h2>
            <p className={styles.emptyBody}>Измените фильтры или вернитесь ко всему каталогу.</p>
            <Link href={resetHref} className={styles.emptyCta}>
              Сбросить фильтры <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>

      {reviewData ? <CatalogReviewDrawer data={reviewData} /> : null}
    </EditorialContainer>
  );
}
