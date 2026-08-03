import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCatalogPublicSanitationDevMap,
  type CatalogPublicSanitationDevEntry,
} from "@/modules/catalog/application/catalog-public-sanitation";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const previewPath = path.join(process.cwd(), "imports", "generated", "catalog-import-preview.json");

/**
 * Dev-only raw-vs-sanitized lookup for the catalog review drawer's "Show raw source data"
 * toggle. Independently re-reads the same preview JSON the Catalog Read Repository reads, but
 * never runs in production and never feeds the public read path — callers must gate on
 * `process.env.NODE_ENV !== "production"` before calling this (this function double-checks the
 * same condition itself as a second safety net).
 */
export async function getCatalogReviewSanitationEntries(): Promise<CatalogPublicSanitationDevEntry[]> {
  if (process.env.NODE_ENV === "production") {
    return [];
  }

  try {
    const raw = await readFile(previewPath, "utf8");
    const preview = JSON.parse(raw) as CatalogImportPreview;
    return [...buildCatalogPublicSanitationDevMap(preview.records).values()];
  } catch {
    return [];
  }
}
