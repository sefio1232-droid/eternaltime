import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildImportApplyPlan } from "./apply-plan";
import { mergeNormalizedCatalogRows } from "./merge-sources";
import { normalizeCatalogRow, normalizeImageCatalogRow } from "./normalize-row";
import { buildCatalogAuditReport } from "./report";
import { mapCatalogHeader } from "../domain/headers";
import { isImagePathLike } from "../domain/images";
import type { CatalogImportPipelineResult, CatalogImportPreview, RawCatalogRow } from "../domain/types";
import { discoverCatalogRawSourceFiles } from "../infrastructure/source-discovery";
import { loadParsedCatalogSource } from "../infrastructure/source-loader";

export type CatalogImportPipelineOptions = {
  rawDir: string;
  generatedAt?: string;
};

export async function runCatalogImportPipeline(
  options: CatalogImportPipelineOptions,
): Promise<CatalogImportPipelineResult> {
  const sourceFiles = await discoverCatalogRawSourceFiles(options.rawDir);
  const sources = await Promise.all(sourceFiles.map((file) => loadParsedCatalogSource(file)));
  const normalizedRows = sources.flatMap((source) =>
    [
      ...source.rows.map((row) => normalizeCatalogRow(row, source.zipEntries)),
      ...source.imageRows
        .filter((row) => hasImageManifestPayload(row))
        .map((row) => normalizeImageCatalogRow(row, source.zipEntries)),
    ],
  );
  const mergedCandidates = mergeNormalizedCatalogRows(normalizedRows);
  const applyPlan = buildImportApplyPlan(mergedCandidates);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const preview: CatalogImportPreview = {
    generatedAt,
    sources: sources.map((source) => ({
      filename: source.sourceFile,
      sourceType: source.sourceType,
      reasons: source.detection.reasons,
      workbookSheets: source.detection.workbookSheets,
      rawRowCount: source.rows.length + source.imageRows.length,
    })),
    records: mergedCandidates,
    applyPlan,
  };
  const resultWithoutReport = {
    generatedAt,
    sources,
    normalizedRows,
    mergedCandidates,
    applyPlan,
    preview,
    auditReportMarkdown: "",
  };

  return {
    ...resultWithoutReport,
    auditReportMarkdown: buildCatalogAuditReport(resultWithoutReport),
  };
}

function hasImageManifestPayload(row: RawCatalogRow): boolean {
  const hasReference = Object.keys(row.values).some((header) => mapCatalogHeader(header) === "reference");
  const hasImageValue = Object.entries(row.values).some(([header, value]) => {
    const canonical = mapCatalogHeader(header);
    const trimmedValue = value.trim();

    return (
      canonical === "image" ||
      isImagePathLike(trimmedValue) ||
      /^https?:\/\//i.test(trimmedValue)
    );
  });

  return hasReference && hasImageValue;
}

export async function writeCatalogAuditReport(input: {
  reportPath: string;
  result: CatalogImportPipelineResult;
}): Promise<void> {
  await mkdir(path.dirname(input.reportPath), { recursive: true });
  await writeFile(input.reportPath, input.result.auditReportMarkdown, "utf8");
}

export async function writeCatalogPreview(input: {
  previewPath: string;
  result: CatalogImportPipelineResult;
}): Promise<void> {
  await mkdir(path.dirname(input.previewPath), { recursive: true });
  await writeFile(input.previewPath, `${JSON.stringify(input.result.preview, null, 2)}\n`, "utf8");
}
