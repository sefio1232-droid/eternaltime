import path from "node:path";
import {
  assertKnownApplyStatuses,
  buildControlledCatalogApplyPlan,
  loadCatalogImportPreview,
  writeCatalogImageUploadPlan,
} from "../application/database-apply-plan";
import { executeControlledCatalogApply, writeCatalogApplyResult } from "../application/database-apply-executor";
import { catalogImportApplyConfirmationPhrase } from "../domain/database-apply-types";
import { loadCatalogCliEnv } from "./env";

const rootDir = process.cwd();
loadCatalogCliEnv(rootDir);

const previewPath = path.join(rootDir, "imports", "generated", "catalog-import-preview.json");
const applyJsonPath = path.join(rootDir, "imports", "generated", "catalog-apply-result.json");
const applyReportPath = path.join(rootDir, "imports", "reports", "catalog-apply-result.md");
const imagePlanPath = path.join(rootDir, "imports", "generated", "catalog-image-upload-plan.json");

function confirmationPhraseFromArgs(args: string[]): string | null {
  const prefix = "--confirm-apply=";
  const inline = args.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  return null;
}

async function main(): Promise<void> {
  const confirmationPhrase = confirmationPhraseFromArgs(process.argv.slice(2));
  const preview = await loadCatalogImportPreview(previewPath);
  const plan = buildControlledCatalogApplyPlan({ preview, previewPath });
  assertKnownApplyStatuses(plan);
  const result = await executeControlledCatalogApply({ rootDir, plan, confirmationPhrase });
  await writeCatalogApplyResult({ jsonPath: applyJsonPath, reportPath: applyReportPath, result });
  await writeCatalogImageUploadPlan({ imagePlanPath, imageUploadPlan: plan.imageUploadPlan });

  console.log(`Catalog apply result written: ${applyJsonPath}`);
  console.log(`Catalog apply report written: ${applyReportPath}`);
  console.log(`Catalog image upload plan written: ${imagePlanPath}`);

  if (!result.executed) {
    console.log("Catalog database apply was not executed.");
    console.log(`Required confirmation phrase: --confirm-apply=${catalogImportApplyConfirmationPhrase}`);
    for (const blocker of result.blockers) {
      console.log(`- ${blocker}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Catalog database apply executed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown catalog apply failure.");
  process.exitCode = 1;
});
