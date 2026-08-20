import path from "node:path";
import {
  assertKnownApplyStatuses,
  buildControlledCatalogApplyPlan,
  loadCatalogImportPreview,
  writeCatalogImageUploadPlan,
} from "../application/database-apply-plan";
import { buildCatalogApplyDryRun, writeCatalogApplyDryRun } from "../application/database-apply-dry-run";
import { loadCatalogCliEnv } from "./env";

const rootDir = process.cwd();
loadCatalogCliEnv(rootDir);

const previewPath = path.join(rootDir, "imports", "generated", "catalog-import-preview.json");
const dryRunJsonPath = path.join(rootDir, "imports", "generated", "catalog-apply-dry-run.json");
const dryRunReportPath = path.join(rootDir, "imports", "reports", "catalog-apply-dry-run.md");
const imagePlanPath = path.join(rootDir, "imports", "generated", "catalog-image-upload-plan.json");

async function main(): Promise<void> {
  const preview = await loadCatalogImportPreview(previewPath);
  const plan = buildControlledCatalogApplyPlan({ preview, previewPath });
  assertKnownApplyStatuses(plan);
  const summary = await buildCatalogApplyDryRun({ rootDir, plan });
  await writeCatalogApplyDryRun({ jsonPath: dryRunJsonPath, reportPath: dryRunReportPath, summary });
  await writeCatalogImageUploadPlan({ imagePlanPath, imageUploadPlan: plan.imageUploadPlan });

  console.log(`Catalog apply dry run written: ${dryRunJsonPath}`);
  console.log(`Catalog apply dry-run report written: ${dryRunReportPath}`);
  console.log(`Catalog image upload plan written: ${imagePlanPath}`);
  console.log(`eligible=${summary.totals.eligibleRecords}`);
  console.log(`manual_review=${summary.totals.manualReviewRecords}`);
  console.log(`intentionally_skipped_missing_reference=${summary.totals.intentionallySkippedRecords}`);
  console.log(`blocked=${summary.totals.blockedRecords}`);
  console.log(`database_comparison=${summary.databaseComparisonStatus}`);

  if (!summary.actualApplyAllowed) {
    console.log("Actual apply is blocked:");
    for (const blocker of summary.actualApplyBlockers) {
      console.log(`- ${blocker}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown catalog apply dry-run failure.");
  process.exitCode = 1;
});
