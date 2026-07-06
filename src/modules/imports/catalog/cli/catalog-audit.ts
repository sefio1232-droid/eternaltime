import path from "node:path";
import { runCatalogImportPipeline, writeCatalogAuditReport } from "../application/pipeline";
import { CatalogImportInputError } from "../infrastructure/source-discovery";

const rawDir = path.join(process.cwd(), "imports", "raw", "catalog");
const reportPath = path.join(process.cwd(), "imports", "reports", "catalog-source-audit.md");

async function main(): Promise<void> {
  try {
    const result = await runCatalogImportPipeline({ rawDir });
    await writeCatalogAuditReport({ reportPath, result });

    console.log(`Catalog source audit written: ${reportPath}`);
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
