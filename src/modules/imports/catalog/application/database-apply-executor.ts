import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
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
      blockers: ["Supabase service role client is unavailable."],
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

  return {
    executed: true,
    generatedAt: new Date().toISOString(),
    dryRun,
    databaseResult: applyRpcResultSchema.parse(data),
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
