import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { getServerEnv } from "@/config/server-env";
import {
  getCatalogBrandBySlug,
  getCatalogWatchByRoute,
  listCatalogBrands,
  listCatalogWatches,
} from "@/modules/catalog/application/catalog-read-service";
import { resolveCatalogReadSourcePolicy } from "@/modules/catalog/infrastructure/catalog-read-source-policy";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogReadQuery } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const previewPath = path.join(process.cwd(), "imports", "generated", "catalog-import-preview.json");
const imagePlanPath = path.join(process.cwd(), "imports", "generated", "catalog-image-upload-plan.json");

export class CatalogReadSourceError extends Error {
  readonly code: "catalog_source_unavailable" | "catalog_source_not_configured";

  constructor(code: CatalogReadSourceError["code"], message: string) {
    super(message);
    this.name = "CatalogReadSourceError";
    this.code = code;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function readOptionalJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export const getCatalogReadDataset = cache(async () => {
  const env = getServerEnv();
  const policy = resolveCatalogReadSourcePolicy(env);

  if (!policy.allowed) {
    throw new CatalogReadSourceError(policy.code, policy.message);
  }

  if (policy.source === "preview") {
    const preview = await readOptionalJsonFile<CatalogImportPreview>(previewPath);
    if (!preview) {
      throw new CatalogReadSourceError(
        "catalog_source_unavailable",
        "Catalog preview file is unavailable. Run npm run catalog:import:preview for local development.",
      );
    }

    const imagePlan = await readOptionalJsonFile<CatalogImageUploadPlan>(imagePlanPath);
    return catalogReadDatasetFromPreview({ preview, imagePlan });
  }

  throw new CatalogReadSourceError(
    "catalog_source_not_configured",
    "Production catalog read repository is not configured yet.",
  );
});

export async function listPublicCatalogWatches(query: CatalogReadQuery) {
  const dataset = await getCatalogReadDataset();
  return listCatalogWatches(dataset, query);
}

export async function getPublicCatalogBrand(brandSlug: string) {
  const dataset = await getCatalogReadDataset();
  return getCatalogBrandBySlug(dataset, brandSlug);
}

export async function listPublicCatalogBrands() {
  const dataset = await getCatalogReadDataset();
  return listCatalogBrands(dataset);
}

export async function getPublicCatalogWatch(input: { brandSlug: string; referenceSlug: string }) {
  const dataset = await getCatalogReadDataset();
  return getCatalogWatchByRoute(dataset, input);
}
