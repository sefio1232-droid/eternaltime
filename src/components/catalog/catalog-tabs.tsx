import Link from "next/link";
import { catalogQueryHref } from "@/modules/catalog/application/catalog-read-query";
import type { CatalogFilterOption, CatalogReadQuery } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-tabs.module.css";

type CatalogTab = {
  key: string;
  label: string;
  href: string;
  active: boolean;
};

/** Editorial/premium-first brand tab order (docs/CATALOG_SHOWROOM_RECOVERY.md "Catalog tabs") —
 * so Tissot/Orient/Citizen aren't buried after Casio's larger catalog. Real facet data still
 * drives which brands actually render (and their labels/counts); this only orders them. Any
 * brand not in this list (future catalog growth) is appended after, by facet count. */
const BRAND_TAB_PRIORITY = ["tissot", "orient", "citizen", "casio"];

/**
 * Real navigational links over the same query architecture as the rest of the catalog — not a
 * second, independent filter state. "Рекомендуемые"/"Все часы" drive `view`; brand tabs drive the
 * same `brand` param the filter panel and canonical brand pages already use. Rendered only on the
 * generic /watches listing (brand-scoped pages are already brand-filtered).
 */
export function CatalogTabs({
  pathname,
  query,
  brands,
}: Readonly<{
  pathname: string;
  query: CatalogReadQuery;
  brands: CatalogFilterOption[];
}>) {
  const resetOverrides = {
    search: "",
    brandCollection: null,
    movement: null,
    waterResistance: null,
    caseMaterial: null,
    crystal: null,
    minPriceMinor: null,
    maxPriceMinor: null,
    sort: "default" as const,
    page: 1,
  };

  const tabs: CatalogTab[] = [
    {
      key: "recommended",
      label: "Рекомендуемые",
      href: catalogQueryHref(pathname, query, { ...resetOverrides, view: "recommended", brandSlug: null }),
      active: !query.brandSlug && query.view === "recommended",
    },
    {
      key: "all",
      label: "Все часы",
      href: catalogQueryHref(pathname, query, { ...resetOverrides, view: "all", brandSlug: null }),
      active: !query.brandSlug && query.view === "all",
    },
    ...[...brands]
      .sort((left, right) => {
        const leftRank = BRAND_TAB_PRIORITY.indexOf(left.value);
        const rightRank = BRAND_TAB_PRIORITY.indexOf(right.value);
        if (leftRank === -1 && rightRank === -1) return right.count - left.count;
        if (leftRank === -1) return 1;
        if (rightRank === -1) return -1;
        return leftRank - rightRank;
      })
      .slice(0, 4)
      .map((brand) => ({
        key: brand.value,
        label: brand.label,
        href: catalogQueryHref(pathname, query, { ...resetOverrides, view: "all", brandSlug: brand.value }),
        active: query.brandSlug === brand.value,
      })),
  ];

  return (
    <nav aria-label="Разделы каталога" className={styles.tabs}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`${styles.tab} ${tab.active ? styles.tabActive : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
