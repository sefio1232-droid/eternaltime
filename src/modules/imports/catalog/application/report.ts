import type {
  CatalogImportPipelineResult,
  ImageCandidate,
  MergedCatalogCandidate,
  ParsedCatalogSource,
  ValidationIssue,
} from "../domain/types";

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce<Record<T, number>>(
    (counts, value) => ({
      ...counts,
      [value]: (counts[value] ?? 0) + 1,
    }),
    {} as Record<T, number>,
  );
}

function markdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "_None._\n";
  }

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`),
    "",
  ].join("\n");
}

function issueExamples(issues: ValidationIssue[], limit = 12): string {
  if (issues.length === 0) {
    return "_No issue examples._\n";
  }

  return issues
    .slice(0, limit)
    .map((issue) => {
      const source = issue.source
        ? `${issue.source.sourceFile}${issue.source.sheet ? ` / ${issue.source.sheet}` : ""}${
            issue.source.rowNumber ? ` row ${issue.source.rowNumber}` : ""
          }`
        : "unknown source";
      return `- ${issue.severity} ${issue.code}: ${issue.message} (${source})`;
    })
    .join("\n");
}

function sourceRows(sources: ParsedCatalogSource[]): string[][] {
  return sources.map((source) => [
    source.sourceFile,
    source.sourceType,
    source.detection.reasons.join("; "),
    source.detection.workbookSheets.join(", "),
  ]);
}

function rawRowRows(sources: ParsedCatalogSource[]): string[][] {
  return sources.map((source) => [source.sourceFile, source.sourceType, String(source.rows.length + source.imageRows.length)]);
}

function brandCounts(candidates: MergedCatalogCandidate[]): string[][] {
  const counts = countBy(candidates.map((candidate) => candidate.identity.brand ?? "Unknown"));
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([brand, count]) => [brand, String(count)]);
}

function priceColumns(candidates: MergedCatalogCandidate[]): string[][] {
  const counts = countBy(
    candidates.flatMap((candidate) =>
      candidate.pricing.allSources.map((source) => `${source.rawFieldName} (${source.currency ?? "n/a"})`),
    ),
  );
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([column, count]) => [column, String(count)]);
}

function imageStats(candidates: MergedCatalogCandidate[]): {
  all: ImageCandidate[];
  validLocal: number;
  broken: number;
  remote: number;
  withoutCandidate: number;
} {
  const all = candidates.flatMap((candidate) => candidate.images.candidates);
  return {
    all,
    validLocal: all.filter((candidate) => candidate.actualZipEntry && candidate.status === "valid").length,
    broken: all.filter((candidate) => candidate.status === "broken").length,
    remote: all.filter((candidate) => candidate.remoteImageUrl).length,
    withoutCandidate: candidates.filter((candidate) => candidate.images.candidates.length === 0).length,
  };
}

function orientImageRows(candidates: MergedCatalogCandidate[], sources: ParsedCatalogSource[]): string[][] {
  const orientCandidates = candidates.filter((candidate) => candidate.identity.brandNormalized === "orient");
  const orientZipEntries = sources
    .filter((source) => source.sourceType === "orient_package")
    .flatMap((source) => source.zipEntries.filter((entry) => /\.(?:jpg|jpeg|png|webp)$/i.test(entry)));
  const orientImages = orientCandidates.flatMap((candidate) => candidate.images.candidates);

  return [
    ["Workbook image paths", String(orientImages.filter((candidate) => candidate.excelImagePath).length)],
    ["Actual ZIP image entries", String(orientZipEntries.length)],
    ["Broken image paths", String(orientImages.filter((candidate) => candidate.status === "broken").length)],
    ["References without image candidate", String(orientCandidates.filter((candidate) => candidate.images.candidates.length === 0).length)],
  ];
}

function characteristicRows(candidates: MergedCatalogCandidate[]): string[][] {
  const counts = new Map<string, number>();

  for (const candidate of candidates) {
    for (const row of candidate.sourceRows) {
      const rawCharacteristics = Object.entries(row.values).find(([header]) =>
        header.normalize("NFKC").toLowerCase().includes("характеристики"),
      )?.[1];

      if (!rawCharacteristics) {
        continue;
      }

      for (const segment of rawCharacteristics.split("|")) {
        const rawKey = segment.split(":")[0]?.trim();
        if (!rawKey) {
          continue;
        }
        counts.set(rawKey, (counts.get(rawKey) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => [key, String(count)]);
}

export function buildCatalogAuditReport(result: CatalogImportPipelineResult): string {
  const candidates = result.mergedCandidates;
  const allIssues = candidates.flatMap((candidate) => candidate.validationIssues);
  const issueCounts = countBy(allIssues.map((issue) => issue.code));
  const eligibilityCounts = countBy(candidates.map((candidate) => candidate.applyEligibility.status));
  const images = imageStats(candidates);
  const rowsWithErrors = candidates.filter((candidate) =>
    candidate.validationIssues.some((issue) => issue.severity === "error"),
  ).length;
  const rowsWithWarnings = candidates.filter((candidate) =>
    candidate.validationIssues.some((issue) => issue.severity === "warning"),
  ).length;
  const manualReviewCount = candidates.filter((candidate) => candidate.applyEligibility.status === "manual_review").length;
  const multipleRubCandidates = candidates.filter((candidate) => candidate.pricing.rubPriceSources.length > 1).length;
  const maximumRubSelected = candidates.filter((candidate) => {
    const selected = candidate.pricing.selectedPublicPriceSource?.normalizedAmountMinor;
    if (!selected || candidate.pricing.rubPriceSources.length < 2) {
      return false;
    }
    return candidate.pricing.rubPriceSources.some((source) => source.normalizedAmountMinor !== selected);
  }).length;

  return [
    "# Catalog Source Audit",
    "",
    `Generated at: ${result.generatedAt}`,
    "",
    "## Source Discovery",
    markdownTable(["File", "Detected source type", "Reason", "Workbook sheets"], sourceRows(result.sources)),
    "## Row Counts",
    markdownTable(
      ["Metric", "Count"],
      [
        ["Raw rows", String(result.normalizedRows.length)],
        ["Normalized candidates", String(candidates.length)],
        ["Rows with errors", String(rowsWithErrors)],
        ["Rows with warnings", String(rowsWithWarnings)],
        ["Rows requiring manual review", String(manualReviewCount)],
      ],
    ),
    markdownTable(["Source file", "Source type", "Raw rows"], rawRowRows(result.sources)),
    "## Brand Counts",
    markdownTable(["Brand", "Normalized candidates"], brandCounts(candidates)),
    "## Reference Audit",
    markdownTable(
      ["Reference issue", "Count"],
      Object.entries(issueCounts)
        .filter(([code]) => code.includes("reference") || code.includes("duplicate"))
        .map(([code, count]) => [code, String(count)]),
    ),
    issueExamples(allIssues.filter((issue) => issue.code.includes("reference") || issue.code.includes("duplicate"))),
    "",
    "## Price Audit",
    markdownTable(["Detected price column", "Occurrences"], priceColumns(candidates)),
    markdownTable(
      ["Metric", "Count"],
      [
        ["Rows with RUB price candidates", String(candidates.filter((candidate) => candidate.pricing.publicPriceCandidate).length)],
        ["Rows with multiple RUB price candidates", String(multipleRubCandidates)],
        ["Rows where maximum-RUB rule selected public price", String(maximumRubSelected)],
        ["Rows without valid public price candidate", String(candidates.filter((candidate) => !candidate.pricing.publicPriceCandidate).length)],
      ],
    ),
    "PUBLIC PRICE CANDIDATE = MAXIMUM VALID RECOGNIZED RUB PRICE. Разница is internal analytical data and is not a public price.",
    "",
    "## Image Audit",
    markdownTable(
      ["Metric", "Count"],
      [
        ["Image candidates", String(images.all.length)],
        ["Local ZIP matches", String(images.validLocal)],
        ["Broken paths", String(images.broken)],
        ["Remote URL candidates", String(images.remote)],
        ["References without image candidate", String(images.withoutCandidate)],
      ],
    ),
    "### Orient Image Audit",
    markdownTable(["Metric", "Count"], orientImageRows(candidates, result.sources)),
    "## Characteristics Audit",
    markdownTable(["Raw key", "Usage count"], characteristicRows(candidates)),
    "## Merge Audit",
    markdownTable(
      ["Metric", "Count"],
      [
        ["Records merged across sources", String(candidates.filter((candidate) => candidate.sourceRows.length > 1).length)],
        ["Source conflicts", String(allIssues.filter((issue) => issue.code === "source_conflict").length)],
        ["Fields resolved by source priority", String(allIssues.filter((issue) => issue.code === "source_conflict").length)],
        ["Rows requiring manual review", String(manualReviewCount)],
      ],
    ),
    "## Apply Eligibility",
    markdownTable(
      ["Status", "Count"],
      Object.entries(eligibilityCounts).map(([status, count]) => [status, String(count)]),
    ),
    "## Limited Issue Examples",
    issueExamples(allIssues),
    "",
  ].join("\n");
}
