import type { CatalogImportPreview, MergedCatalogCandidate } from "../domain/types";

export type CatalogPublicHygieneReport = {
  generatedAt: string;
  currentPublicCandidateCount: number;
  nonProductRows: MergedCatalogCandidate[];
};

function escapeCell(value: string | null | undefined): string {
  return (value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCatalogPublicHygieneReport(preview: CatalogImportPreview): CatalogPublicHygieneReport {
  return {
    generatedAt: new Date().toISOString(),
    currentPublicCandidateCount: preview.records.filter(
      (record) =>
        record.applyEligibility.status === "eligible" &&
        record.sourceRowClassification?.action !== "exclude_from_public_read_and_apply",
    ).length,
    nonProductRows: preview.records.filter(
      (record) => record.sourceRowClassification?.action === "exclude_from_public_read_and_apply",
    ),
  };
}

export function renderCatalogPublicHygieneMarkdown(report: CatalogPublicHygieneReport): string {
  const lines: string[] = [
    "# Catalog Public Hygiene",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `Current public candidate count: ${report.currentPublicCandidateCount}`,
    `Detected non-product source rows: ${report.nonProductRows.length}`,
    "",
    "## Detected Non-Product Rows",
    "",
  ];

  if (report.nonProductRows.length === 0) {
    lines.push("No non-product rows detected.", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push(
    "| Candidate | Classification | Source package | Worksheet context | Public title | Raw reference | Reasons | Resulting action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  );

  for (const row of report.nonProductRows) {
    const sourceRows = row.sourceRows
      .map((sourceRow) => `${sourceRow.sourceFile} / ${sourceRow.sheet} row ${sourceRow.rowNumber}`)
      .join("; ");
    const sourcePackages = [...new Set(row.sourceRows.map((sourceRow) => sourceRow.sourceFile))].join("; ");

    lines.push(
      `| ${escapeCell(row.candidateId)} | ${escapeCell(row.sourceRowClassification.kind)} | ${escapeCell(sourcePackages)} | ${escapeCell(sourceRows)} | ${escapeCell(row.identity.title)} | ${escapeCell(row.identity.referenceRaw)} | ${escapeCell(row.sourceRowClassification.indicators.join("; "))} | ${escapeCell(row.sourceRowClassification.action)} |`,
    );
  }

  lines.push("");

  return `${lines.join("\n")}\n`;
}
