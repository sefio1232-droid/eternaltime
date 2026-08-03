import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCatalogPublicSanitationLog } from "@/modules/catalog/application/catalog-public-sanitation";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const rootDir = process.cwd();
const previewPath = path.join(rootDir, "imports", "generated", "catalog-import-preview.json");
const reportPath = path.join(rootDir, "public", "generated", "catalog-review", "public-display-sanitation.json");

async function main() {
  const raw = await readFile(previewPath, "utf8");
  const preview = JSON.parse(raw) as CatalogImportPreview;
  const entries = buildCatalogPublicSanitationLog(preview.records);

  const report = {
    generatedAt: new Date().toISOString(),
    totalEligibleRecords: preview.records.filter((record) => record.applyEligibility.status === "eligible").length,
    sanitizedFieldCount: entries.length,
    entries,
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Public display sanitation report written: ${reportPath}`);
  console.log(`${entries.length} field(s) sanitized across ${new Set(entries.map((entry) => entry.candidateId)).size} watch(es).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown public display sanitation audit error.";
  console.error(`Public display sanitation audit failed: ${message}`);
  process.exitCode = 1;
});
