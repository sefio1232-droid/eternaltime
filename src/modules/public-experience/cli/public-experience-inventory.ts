import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildPublicExperienceInventory,
  renderPublicExperienceInventoryMarkdown,
} from "../application/public-experience-inventory";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const rootDir = process.cwd();
const previewPath = path.join(rootDir, "imports", "generated", "catalog-import-preview.json");
const imagePlanPath = path.join(rootDir, "imports", "generated", "catalog-image-upload-plan.json");
const reportPath = path.join(rootDir, "imports", "reports", "public-experience-inventory.md");

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
  const inventory = buildPublicExperienceInventory({ preview, imagePlan });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderPublicExperienceInventoryMarkdown(inventory), "utf8");

  console.log(`Public experience inventory written: ${reportPath}`);
  console.log(`Public catalog count: ${inventory.catalogCount}`);
  console.log(`Published Journal articles: ${inventory.publishedJournalArticleCount}`);
  console.log(`Editorial selections: ${inventory.editorialSelectionCount}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown public experience inventory error.";
  console.error(`Public experience inventory failed: ${message}`);
  process.exitCode = 1;
});
