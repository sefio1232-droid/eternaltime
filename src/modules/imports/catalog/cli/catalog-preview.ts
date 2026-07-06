import path from "node:path";
import { runCatalogImportPipeline, writeCatalogPreview, writeCatalogReviewQueue } from "../application/pipeline";
import { CatalogImportInputError } from "../infrastructure/source-discovery";

const rawDir = path.join(process.cwd(), "imports", "raw", "catalog");
const previewPath = path.join(process.cwd(), "imports", "generated", "catalog-import-preview.json");
const reviewQueuePath = path.join(process.cwd(), "imports", "generated", "catalog-review-queue.json");

async function main(): Promise<void> {
  try {
    const result = await runCatalogImportPipeline({ rawDir });
    await writeCatalogPreview({ previewPath, result });
    await writeCatalogReviewQueue({ reviewQueuePath, result });

    console.log(`Catalog import preview written: ${previewPath}`);
    console.log(`Catalog review queue written: ${reviewQueuePath}`);
    for (const source of result.sources) {
      console.log(`${source.sourceFile}: ${source.sourceType}`);
    }
  } catch (error) {
    if (error instanceof CatalogImportInputError) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}

main();
