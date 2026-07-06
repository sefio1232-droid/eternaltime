"use client";

import { useState } from "react";
import { CatalogFilterPanel } from "@/components/catalog/catalog-filter-panel";
import type { CatalogFilterFacets, CatalogReadQuery } from "@/modules/catalog/domain/read-models";

export function CatalogMobileFilterSheet({
  facets,
  query,
  pathname,
  includeBrandFilter,
}: Readonly<{
  facets: CatalogFilterFacets;
  query: CatalogReadQuery;
  pathname: string;
  includeBrandFilter: boolean;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="w-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-left text-sm font-medium"
        aria-expanded={isOpen}
        aria-controls="catalog-mobile-filters"
        onClick={() => setIsOpen(true)}
      >
        Фильтры и сортировка
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35" role="presentation">
          <section
            id="catalog-mobile-filters"
            role="dialog"
            aria-modal="true"
            aria-label="Фильтры каталога"
            className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-auto bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <h2 className="text-lg font-semibold">Фильтры</h2>
              <button
                type="button"
                className="border border-[var(--border)] px-3 py-2 text-sm"
                onClick={() => setIsOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <CatalogFilterPanel
              facets={facets}
              query={query}
              pathname={pathname}
              includeBrandFilter={includeBrandFilter}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
