import type {
  CatalogReviewActionType,
  CatalogReviewQueue,
  CatalogReviewQueueEntry,
  MergedCatalogCandidate,
  ValidationIssue,
} from "../domain/types";

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function truncate(value: string | undefined, maxLength = 240): string | undefined {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function suggestedReviewActionType(issues: ValidationIssue[]): CatalogReviewActionType {
  const codes = new Set(issues.map((issue) => issue.code));

  if (codes.has("missing_reference")) {
    return "correct_reference";
  }

  if (codes.has("suspicious_reference")) {
    return "confirm_reference";
  }

  if (codes.has("duplicate_reference_conflict")) {
    return "resolve_duplicate";
  }

  if (codes.has("identity_source_conflict") || codes.has("source_metadata_conflict")) {
    return "resolve_source_conflict";
  }

  if (codes.has("missing_usable_title")) {
    return "resolve_hierarchy";
  }

  if (codes.has("unsupported_characteristic_key")) {
    return "review_characteristic";
  }

  return "other";
}

function conflictingValues(issues: ValidationIssue[]): CatalogReviewQueueEntry["relevantConflictingValues"] {
  return issues
    .filter((issue) => issue.code.includes("conflict") && issue.field && issue.rawValue)
    .map((issue) => ({
      field: issue.field ?? "unknown",
      values: unique(
        (issue.rawValue ?? "")
          .split("|")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    }));
}

export function buildCatalogReviewQueue(input: {
  generatedAt: string;
  candidates: MergedCatalogCandidate[];
}): CatalogReviewQueue {
  const entries = input.candidates
    .filter((candidate) => candidate.applyEligibility.status !== "eligible")
    .map((candidate) => {
      const issues = candidate.validationIssues.filter(
        (issue) =>
          issue.severity === "error" ||
          ["identity_source_conflict", "source_metadata_conflict", "duplicate_reference_conflict"].includes(issue.code),
      );
      const reviewIssues = issues.length > 0 ? issues : candidate.validationIssues;

      return {
        candidateId: candidate.candidateId,
        brand: candidate.identity.brand,
        sourceTitle: candidate.identity.title,
        rawReference: candidate.identity.referenceRaw,
        normalizedReference: candidate.identity.referenceNormalized,
        sourcePackages: unique(candidate.sourceProvenance.map((source) => source.sourceFile)),
        issues: reviewIssues.map((issue) => ({
          code: issue.code,
          severity: issue.severity,
          field: issue.field,
          message: issue.message,
          rawValue: truncate(issue.rawValue),
        })),
        relevantConflictingValues: conflictingValues(reviewIssues),
        suggestedReviewActionType: suggestedReviewActionType(reviewIssues),
      } satisfies CatalogReviewQueueEntry;
    });

  return {
    generatedAt: input.generatedAt,
    recordCount: entries.length,
    entries,
  };
}
