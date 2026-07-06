import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCatalogPublicHygieneReport,
  renderCatalogPublicHygieneMarkdown,
} from "../application/public-hygiene-report";
import type { CatalogImportPreview } from "../domain/types";

const rootDir = process.cwd();
const previewPath = path.join(rootDir, "imports", "generated", "catalog-import-preview.json");
const reportPath = path.join(rootDir, "imports", "reports", "catalog-public-hygiene.md");

async function main() {
  const preview = JSON.parse(await readFile(previewPath, "utf8")) as CatalogImportPreview;
  const report = buildCatalogPublicHygieneReport(preview);
  const markdown = renderCatalogPublicHygieneMarkdown(report);

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, markdown, "utf8");

  console.log(`Catalog public hygiene report written: ${reportPath}`);
  console.log(`Current public candidate count: ${report.currentPublicCandidateCount}`);
  console.log(`Detected non-product source rows: ${report.nonProductRows.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown catalog public hygiene error.";
  console.error(`Catalog public hygiene failed: ${message}`);
  process.exitCode = 1;
});
