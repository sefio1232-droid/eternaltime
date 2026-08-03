"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogFilterExpandedFields, catalogFilterResetHref, countExpandedFilters } from "@/components/catalog/catalog-filter-panel";
import { formatCatalogCount } from "@/modules/catalog/application/catalog-format";
import type { CatalogFilterFacets, CatalogReadQuery } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-filter-dialog.module.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one filter surface for every breakpoint (Phase 4 "radical rebuild" — replaces the old
 * desktop-inline-`<details>` panel and the separate mobile-only sheet with a single component).
 * Renders as a right-side panel (~420-480px) at desktop widths and a bottom sheet on mobile — pure
 * CSS media queries in the module, same DOM/JS either way. Opening it never moves the page's own
 * layout: the trigger button sits in the persistent control bar and the panel itself is
 * `position: fixed`, so it overlays rather than pushing the grid down. It renders as a plain
 * descendant of the shared control-bar `<form>` (not its own `<form>`) so every field submits
 * together with search/sort without needing a `form=` attribute on each control.
 */
export function CatalogFilterDialog({
  facets,
  query,
  pathname,
  includeBrandFilter,
  totalRecords,
}: Readonly<{
  facets: CatalogFilterFacets;
  query: CatalogReadQuery;
  pathname: string;
  includeBrandFilter: boolean;
  totalRecords: number;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Focus trap, Escape-to-close, body scroll lock, and focus return — this only ever manages its
  // own open/close UI state; it never touches filter/sort/pagination query logic.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const trigger = triggerRef.current;
    const dialog = dialogRef.current;
    const previousBodyOverflow = document.body.style.overflow;

    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      (previouslyFocused ?? trigger)?.focus();
    };
  }, [isOpen, close]);

  const resetHref = catalogFilterResetHref(pathname, query);
  const expandedCount = countExpandedFilters(query, includeBrandFilter);
  const toggleLabel = expandedCount > 0 ? `Фильтры · ${expandedCount}` : "Фильтры";

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="catalog-filters-panel"
        onClick={() => setIsOpen(true)}
      >
        {toggleLabel}
      </button>

      {isOpen ? (
        <div className={styles.overlay} role="presentation" onClick={close}>
          <section
            ref={dialogRef}
            id="catalog-filters-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-filters-title"
            className={styles.panel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.panelHead}>
              <h2 id="catalog-filters-title" className={styles.panelTitle}>
                Фильтры
              </h2>
              <button type="button" ref={closeButtonRef} className={styles.closeButton} onClick={close} aria-label="Закрыть фильтры">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className={styles.panelBody}>
              <CatalogFilterExpandedFields
                facets={facets}
                query={query}
                includeBrandFilter={includeBrandFilter}
                totalRecords={totalRecords}
                idPrefix="catalog"
                showFooter={false}
              />
            </div>

            <div className={styles.panelFooter}>
              <Link href={resetHref} className={styles.footerReset} onClick={close}>
                Сбросить
              </Link>
              <button type="submit" className={styles.footerSubmit}>
                Показать {formatCatalogCount(totalRecords)} моделей
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
