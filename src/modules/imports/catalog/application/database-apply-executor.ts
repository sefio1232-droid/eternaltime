import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { ORIENT_MANIFEST_OUTPUT_PATH, type OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import { CASIO_MANIFEST_OUTPUT_PATH, type CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import { TISSOT_MANIFEST_OUTPUT_PATH, type TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";
import {
  CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH,
  type CitizenOfficialPhotoManifest,
} from "@/modules/catalog/infrastructure/citizen-official-photo-types";
import {
  SITE_IMPORT_OVERLAY_OUTPUT_PATH,
  type CatalogSiteImportOverlayManifest,
} from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";
import {
  catalogImportApplyConfirmationPhrase,
  type CatalogApplyExecutionResult,
  type ControlledCatalogApplyPlan,
} from "../domain/database-apply-types";
import {
  createCatalogApplyDatabaseClient,
  readCatalogApplyEnvironment,
  type CatalogApplyDatabaseClient,
} from "../infrastructure/database-preflight";
import { buildCatalogApplyDryRun, buildCatalogApplyDryRunMarkdown } from "./database-apply-dry-run";

const applyRpcResultSchema = z.object({
  importBatchId: z.string().uuid(),
  recordCount: z.number(),
  insertedBrands: z.number(),
  insertedBrandCollections: z.number(),
  insertedWatchModels: z.number(),
  insertedWatchReferences: z.number(),
  insertedCatalogOffers: z.number(),
  updatedCatalogOffers: z.number(),
  insertedPublicPrices: z.number(),
  noopCatalogOffers: z.number(),
});

const publicReadModelsRpcResultSchema = z.object({
  importBatchId: z.string().uuid(),
  recordCount: z.number(),
});

async function readOptionalJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function buildPublicReadModelPayload(input: {
  rootDir: string;
  plan: ControlledCatalogApplyPlan;
}) {
  const orientPhotoManifest = await readOptionalJsonFile<OrientPhotoArchiveManifest>(
    path.join(input.rootDir, ORIENT_MANIFEST_OUTPUT_PATH),
  );
  const casioPhotoManifest = await readOptionalJsonFile<CasioPhotoArchiveManifest>(
    path.join(input.rootDir, CASIO_MANIFEST_OUTPUT_PATH),
  );
  const tissotPhotoManifest = await readOptionalJsonFile<TissotPhotoArchiveManifest>(
    path.join(input.rootDir, TISSOT_MANIFEST_OUTPUT_PATH),
  );
  const citizenOfficialPhotoManifest = await readOptionalJsonFile<CitizenOfficialPhotoManifest>(
    path.join(input.rootDir, CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH),
  );
  const siteImportOverlay = await readOptionalJsonFile<CatalogSiteImportOverlayManifest>(
    path.join(input.rootDir, SITE_IMPORT_OVERLAY_OUTPUT_PATH),
  );
  const dataset = catalogReadDatasetFromPreview({
    preview: input.plan.sourcePreview,
    imagePlan: input.plan.imageUploadPlan,
    orientPhotoManifest,
    casioPhotoManifest,
    tissotPhotoManifest,
    citizenOfficialPhotoManifest,
    siteImportOverlay,
  });

  return dataset.watches;
}

function payloadForApply(plan: ControlledCatalogApplyPlan, confirmationPhrase: string): Record<string, unknown> {
  return {
    confirmation: confirmationPhrase,
    sourceFilename: "catalog-import-preview.json",
    previewGeneratedAt: plan.previewGeneratedAt,
    generatedAt: plan.generatedAt,
    records: plan.eligibleRecords,
  };
}

export async function executeControlledCatalogApply(input: {
  rootDir: string;
  plan: ControlledCatalogApplyPlan;
  confirmationPhrase: string | null;
  client?: CatalogApplyDatabaseClient | null;
}): Promise<CatalogApplyExecutionResult> {
  const env = readCatalogApplyEnvironment();
  const client = input.client ?? createCatalogApplyDatabaseClient(env);
  const dryRun = await buildCatalogApplyDryRun({ rootDir: input.rootDir, plan: input.plan, client });
  const blockers = [...dryRun.actualApplyBlockers];

  if (input.confirmationPhrase !== catalogImportApplyConfirmationPhrase) {
    blockers.push("Exact apply confirmation phrase was not provided.");
  }

  if (!dryRun.actualApplyAllowed || blockers.length > 0) {
    return {
      executed: false,
      generatedAt: new Date().toISOString(),
      dryRun,
      databaseResult: null,
      blockers,
    };
  }

  if (!client) {
    return {
      executed: false,
      generatedAt: new Date().toISOString(),
      dryRun,
      databaseResult: null,
      blockers: ["Supabase admin client is unavailable."],
    };
  }

  const confirmedPhrase = input.confirmationPhrase;

  if (confirmedPhrase !== catalogImportApplyConfirmationPhrase) {
    return {
      executed: false,
      generatedAt: new Date().toISOString(),
      dryRun,
      databaseResult: null,
      blockers: ["Exact apply confirmation phrase was not provided."],
    };
  }

  const { data, error } = await client.rpc("apply_catalog_import_batch", {
    input: payloadForApply(input.plan, confirmedPhrase),
  });

  if (error) {
    return {
      executed: false,
      generatedAt: new Date().toISOString(),
      dryRun,
      databaseResult: null,
      blockers: [`Database apply RPC failed: ${error.message}`],
    };
  }

  const databaseResult = applyRpcResultSchema.parse(data);
  const publicReadModels = await buildPublicReadModelPayload({
    rootDir: input.rootDir,
    plan: input.plan,
  });
  const projectionChunkSize = 40;
  let publicReadModelCount = 0;

  for (let index = 0; index < publicReadModels.length; index += projectionChunkSize) {
    const chunk = publicReadModels.slice(index, index + projectionChunkSize);
    const { data: publicReadModelsData, error: publicReadModelsError } = await client.rpc(
      "apply_catalog_public_read_models",
      {
        input: {
          confirmation: confirmedPhrase,
          importBatchId: databaseResult.importBatchId,
          publicReadModels: chunk,
        },
      },
    );

    if (publicReadModelsError) {
      return {
        executed: false,
        generatedAt: new Date().toISOString(),
        dryRun,
        databaseResult,
        blockers: [`Catalog public read model apply RPC failed: ${publicReadModelsError.message}`],
      };
    }

    publicReadModelCount += publicReadModelsRpcResultSchema.parse(publicReadModelsData).recordCount;
  }

  return {
    executed: true,
    generatedAt: new Date().toISOString(),
    dryRun,
    databaseResult: {
      ...databaseResult,
      publicReadModels: {
        importBatchId: databaseResult.importBatchId,
        recordCount: publicReadModelCount,
      },
    },
    blockers: [],
  };
}

function applyResultMarkdown(result: CatalogApplyExecutionResult): string {
  return [
    "# Catalog Apply Result",
    "",
    `Generated at: ${result.generatedAt}`,
    "",
    `Executed: ${result.executed ? "yes" : "no"}`,
    "",
    result.blockers.length > 0 ? ["## Blockers", ...result.blockers.map((blocker) => `- ${blocker}`), ""].join("\n") : "",
    "## Dry Run Gate",
    buildCatalogApplyDryRunMarkdown(result.dryRun),
    result.databaseResult ? ["## Database Result", "```json", JSON.stringify(result.databaseResult, null, 2), "```", ""].join("\n") : "",
  ].join("\n");
}

export async function writeCatalogApplyResult(input: {
  jsonPath: string;
  reportPath: string;
  result: CatalogApplyExecutionResult;
}): Promise<void> {
  await mkdir(path.dirname(input.jsonPath), { recursive: true });
  await mkdir(path.dirname(input.reportPath), { recursive: true });
  await writeFile(input.jsonPath, `${JSON.stringify(input.result, null, 2)}\n`, "utf8");
  await writeFile(input.reportPath, applyResultMarkdown(input.result), "utf8");
}
