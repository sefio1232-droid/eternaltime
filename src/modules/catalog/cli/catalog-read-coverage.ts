import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCatalogReadCoverage,
  renderCatalogReadCoverageMarkdown,
} from "@/modules/catalog/application/catalog-read-coverage";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const rootDir = process.cwd();
const previewPath = path.join(rootDir, "imports", "generated", "catalog-import-preview.json");
const imagePlanPath = path.join(rootDir, "imports", "generated", "catalog-image-upload-plan.json");
const reportPath = path.join(rootDir, "imports", "reports", "catalog-read-coverage.md");

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

async function main() {
  const preview = await readJsonFile<CatalogImportPreview>(previewPath);
  const imagePlan = await readOptionalJsonFile<CatalogImageUploadPlan>(imagePlanPath);
  const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
  const report = buildCatalogReadCoverage(dataset);
  const markdown = renderCatalogReadCoverageMarkdown(report);

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, markdown, "utf8");

  console.log(`Catalog read coverage report written: ${reportPath}`);
  console.log(`Eligible public read records: ${report.eligibleRecordCount}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown catalog read coverage error.";
  console.error(`Catalog read coverage failed: ${message}`);
  process.exitCode = 1;
});
