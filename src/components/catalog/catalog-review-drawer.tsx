"use client";

import { useEffect, useState } from "react";
import styles from "@/components/catalog/catalog-review-drawer.module.css";

export type CatalogReviewItem = {
  feedIndex: number;
  feedType: "watch" | "editorial";
  reference: string;
  referenceNormalized: string | null;
  href: string;
  imageKind: "development_zip" | "remote" | "none";
  imageSrc: string | null;
  hadImagePriority: boolean;
};

export type CatalogReviewSanitationEntry = {
  referenceNormalized: string;
  rawReferenceDisplay: string | null;
  sanitizedReferenceDisplay: string | null;
  rawTitle: string | null;
  sanitizedTitle: string | null;
  wasSanitized: boolean;
};

export type CatalogReviewData = {
  pathname: string;
  canonicalHref: string;
  totalRecords: number;
  page: number;
  pageCount: number;
  sort: string;
  defaultImagePriorityActive: boolean;
  activeFilters: Array<{ label: string; value: string }>;
  items: CatalogReviewItem[];
  /** Dev-only raw-vs-sanitized lookup; always empty in production. */
  sanitationEntries: CatalogReviewSanitationEntry[];
};

type ToggleKey =
  | "card-grid"
  | "card-bounds"
  | "media-bounds"
  | "image-dimensions"
  | "raw-source"
  | "sanitized-display"
  | "feed-order"
  | "default-image-priority"
  | "filter-state";

const gridBreakpoints = [
  { min: 1920, columns: 5 },
  { min: 1200, columns: 4 },
  { min: 980, columns: 3 },
  { min: 600, columns: 2 },
  { min: 0, columns: 1 },
];

function columnsForWidth(width: number): number {
  return gridBreakpoints.find((entry) => width >= entry.min)?.columns ?? 1;
}

function breakpointLabel(width: number): string {
  if (width >= 1920) return "≥1920 (ultra-wide, 5 cols)";
  if (width >= 1200) return "1200–1919 (desktop, 4 cols)";
  if (width >= 980) return "980–1199 (small desktop, 3 cols)";
  if (width >= 600) return "600–979 (tablet, 2 cols)";
  return "<600 (mobile, 1 col)";
}

const serverClientMap: Array<{ name: string; kind: string }> = [
  { name: "CatalogListPage", kind: "Server" },
  { name: "CatalogHero", kind: "Server" },
  { name: "CatalogFilterDialog", kind: "Client (open/close UI state only)" },
  { name: "CatalogWatchCardView", kind: "Server" },
  { name: "CatalogMissingImage", kind: "Server" },
  { name: "CatalogPagination", kind: "Server" },
  { name: "CatalogReviewDrawer", kind: "Client (dev-only)" },
];

function useImageDimensions(enabled: boolean) {
  const [dimensions, setDimensions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const images = Array.from(document.querySelectorAll<HTMLImageElement>("[data-catalog-reference] img"));
    const nextDimensions: Record<string, string> = {};

    function readDimensions(img: HTMLImageElement) {
      const card = img.closest<HTMLElement>("[data-catalog-reference]");
      const reference = card?.dataset.catalogReference;
      if (!reference) {
        return;
      }
      nextDimensions[reference] = `${img.naturalWidth}×${img.naturalHeight}`;
      setDimensions((current) => ({ ...current, [reference]: `${img.naturalWidth}×${img.naturalHeight}` }));
    }

    for (const img of images) {
      if (img.complete && img.naturalWidth > 0) {
        readDimensions(img);
      } else {
        img.addEventListener("load", () => readDimensions(img), { once: true });
      }
    }
  }, [enabled]);

  return dimensions;
}

export function CatalogReviewDrawer({ data }: Readonly<{ data: CatalogReviewData }>) {
  const [isOpen, setIsOpen] = useState(true);
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    "card-grid": false,
    "card-bounds": false,
    "media-bounds": false,
    "image-dimensions": false,
    "raw-source": false,
    "sanitized-display": false,
    "feed-order": false,
    "default-image-priority": false,
    "filter-state": false,
  });
  const [density, setDensity] = useState<"default" | "compact">("default");
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const imageDimensions = useImageDimensions(toggles["image-dimensions"]);

  useEffect(() => {
    function updateWidth() {
      setViewportWidth(window.innerWidth);
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.catalogReviewGridOverlay = toggles["card-grid"] ? "1" : "0";
    root.dataset.catalogReviewCardBounds = toggles["card-bounds"] ? "1" : "0";
    root.dataset.catalogReviewImageBounds = toggles["media-bounds"] ? "1" : "0";

    return () => {
      delete root.dataset.catalogReviewGridOverlay;
      delete root.dataset.catalogReviewCardBounds;
      delete root.dataset.catalogReviewImageBounds;
    };
  }, [toggles]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.catalogReviewDensity = density;
    return () => {
      delete root.dataset.catalogReviewDensity;
    };
  }, [density]);

  function toggle(key: ToggleKey) {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  }

  if (!isOpen) {
    return (
      <button type="button" className={styles.toggle} onClick={() => setIsOpen(true)}>
        Catalog Review
      </button>
    );
  }

  const sanitationByReference = new Map(data.sanitationEntries.map((entry) => [entry.referenceNormalized, entry]));
  const sanitizedCount = data.sanitationEntries.filter((entry) => entry.wasSanitized).length;

  return (
    <aside className={styles.drawer} aria-label="Catalog review drawer (dev only)">
      <div className={styles.head}>
        <span className={styles.headTitle}>Catalog Review</span>
        <button type="button" className={styles.closeButton} onClick={() => setIsOpen(false)}>
          ×
        </button>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Route</p>
        <div className={styles.row}>
          <span className={styles.rowLabel}>pathname</span>
          <span className={styles.rowValue}>{data.pathname}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>canonical</span>
          <span className={styles.rowValue}>{data.canonicalHref}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>total results</span>
          <span className={styles.rowValue}>{data.totalRecords}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>page</span>
          <span className={styles.rowValue}>
            {data.page} / {data.pageCount}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>sort</span>
          <span className={styles.rowValue}>{data.sort}</span>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Viewport</p>
        <div className={styles.row}>
          <span className={styles.rowLabel}>width</span>
          <span className={styles.rowValue}>{viewportWidth ?? "…"}px</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>breakpoint</span>
          <span className={styles.rowValue}>{viewportWidth !== null ? breakpointLabel(viewportWidth) : "…"}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>grid columns</span>
          <span className={styles.rowValue}>{viewportWidth !== null ? columnsForWidth(viewportWidth) : "…"}</span>
        </div>
      </div>

      {toggles["default-image-priority"] ? (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Default image priority</p>
          <div className={styles.row}>
            <span className={styles.rowLabel}>active for this view</span>
            <span className={styles.rowValue}>{data.defaultImagePriorityActive ? "yes" : "no (explicit sort or search)"}</span>
          </div>
          <p className={styles.itemMeta}>
            When active, watches with a usable image sort before image-less watches; total count, filters, and pagination are
            unaffected — see docs/CATALOG_LIST_VISUAL_RECOVERY.md.
          </p>
        </div>
      ) : null}

      {toggles["filter-state"] ? (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Active filters</p>
          {data.activeFilters.length === 0 ? (
            <div className={styles.row}>
              <span className={styles.rowLabel}>none</span>
            </div>
          ) : (
            data.activeFilters.map((filter) => (
              <div className={styles.row} key={filter.label}>
                <span className={styles.rowLabel}>{filter.label}</span>
                <span className={styles.rowValue}>{filter.value}</span>
              </div>
            ))
          )}
        </div>
      ) : null}

      {toggles["sanitized-display"] ? (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Public display sanitation ({sanitizedCount} sanitized this run)</p>
          <p className={styles.itemMeta}>
            Full report: public/generated/catalog-review/public-display-sanitation.json (dev-only, gitignored, never linked
            from production).
          </p>
        </div>
      ) : null}

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Controls</p>
        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["card-grid"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("card-grid")}
          >
            Show card grid {toggles["card-grid"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["card-bounds"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("card-bounds")}
          >
            Show card bounds {toggles["card-bounds"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["media-bounds"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("media-bounds")}
          >
            Show media bounds {toggles["media-bounds"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["image-dimensions"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("image-dimensions")}
          >
            Show image dimensions {toggles["image-dimensions"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["raw-source"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("raw-source")}
          >
            Show raw source data {toggles["raw-source"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["sanitized-display"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("sanitized-display")}
          >
            Show sanitized display {toggles["sanitized-display"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["feed-order"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("feed-order")}
          >
            Show feed order {toggles["feed-order"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["default-image-priority"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("default-image-priority")}
          >
            Show default image priority {toggles["default-image-priority"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${toggles["filter-state"] ? styles.controlButtonActive : ""}`}
            onClick={() => toggle("filter-state")}
          >
            Show filter state {toggles["filter-state"] ? "on" : "off"}
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${density === "compact" ? styles.controlButtonActive : ""}`}
            onClick={() => setDensity(density === "compact" ? "default" : "compact")}
          >
            {density === "compact" ? "Default density" : "Compact density"}
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Server / client components</p>
        {serverClientMap.map((entry) => (
          <div className={styles.row} key={entry.name}>
            <span className={styles.rowLabel}>{entry.name}</span>
            <span className={styles.rowValue}>{entry.kind}</span>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Feed ({data.items.length} items)</p>
        <div className={styles.itemList}>
          {data.items.map((item) => {
            const sanitation = item.referenceNormalized ? sanitationByReference.get(item.referenceNormalized) : undefined;
            return (
              <div className={styles.itemRow} key={`${item.feedType}-${item.href}-${item.feedIndex}`}>
                {toggles["feed-order"] ? (
                  <div className={styles.itemMeta}>
                    #{item.feedIndex} · {item.feedType}
                  </div>
                ) : null}
                <div className={styles.itemRef}>{item.reference}</div>
                <div className={styles.itemMeta}>href: {item.href}</div>
                <div className={styles.itemMeta}>image kind: {item.imageKind}</div>
                {toggles["default-image-priority"] ? (
                  <div className={styles.itemMeta}>priority load: {item.hadImagePriority ? "yes" : "no"}</div>
                ) : null}
                {toggles["image-dimensions"] && imageDimensions[item.reference] ? (
                  <div className={styles.itemMeta}>dimensions: {imageDimensions[item.reference]}</div>
                ) : null}
                {toggles["image-dimensions"] && item.imageSrc ? (
                  <div className={styles.itemMeta}>image src: {item.imageSrc}</div>
                ) : null}
                {toggles["raw-source"] && sanitation ? (
                  <>
                    <div className={styles.itemMeta}>raw reference: {sanitation.rawReferenceDisplay ?? "—"}</div>
                    <div className={styles.itemMeta}>raw title: {sanitation.rawTitle ?? "—"}</div>
                  </>
                ) : null}
                {toggles["sanitized-display"] && sanitation?.wasSanitized ? (
                  <div className={styles.itemMeta}>sanitized (annotation removed)</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
