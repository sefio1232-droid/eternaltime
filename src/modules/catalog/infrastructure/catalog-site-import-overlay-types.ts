/**
 * Shared constants/types for the catalog site-import overlay (specifications + SEO copy sourced
 * from the user-provided `*_catalog_site_import_*.xlsx` workbooks) — mirrors the photo-archive
 * overlay pattern (orient/casio-photo-archive-types.ts). Kept side-effect-free and separate from
 * the CLI script (catalog-site-import-overlay-manifest.ts) on purpose — that script runs a real
 * `main()` at module scope, so nothing that loads at request time may import a value from it.
 */

export const CASIO_SITE_IMPORT_XLSX_PATH = "incoming/casio_catalog_site_import_UPDATED.xlsx";
export const ORIENT_SITE_IMPORT_XLSX_PATH = "incoming/orient_catalog_site_import_001-079.xlsx";
export const SITE_IMPORT_OVERLAY_OUTPUT_PATH = ".tmp/catalog-site-import-overlay/manifest.json";

export type CatalogSiteImportOverlayEntry = {
  catalogReference: string;
  referenceNormalized: string;
  brandSlug: string;
  /** Keyed by the same specification keys `preview-catalog-adapter.ts`'s `specificationDefinitions`
   * already understands (e.g. `movement_type_raw`, `case_material_raw`) — never a new, parallel
   * taxonomy — so overlay values flow through the exact same labeling/grouping/filter-normalization
   * logic real import data already does. */
  specifications: Record<string, string>;
  seoTitle: string | null;
  metaDescription: string | null;
  shortDescription: string | null;
  longDescription: string | null;
};

export type CatalogSiteImportOverlayUnmatchedRow = {
  sourceFile: string;
  referenceRaw: string;
  reason: "unmatched";
};

export type CatalogSiteImportOverlayManifest = {
  generatedAt: string;
  sourceFiles: string[];
  entries: CatalogSiteImportOverlayEntry[];
  unmatchedRows: CatalogSiteImportOverlayUnmatchedRow[];
};
