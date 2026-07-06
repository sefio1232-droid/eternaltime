import { normalizeManufacturerReference } from "../../../catalog/domain/reference-normalization";
import type { ReferenceValidation, SourceProvenance } from "./types";

const placeholderReferencePattern = /^(?:-|--|—|n\/a|na|нет|без|unknown|неизвестно)$/i;

export function validateManufacturerReference(rawReference: string, provenance?: SourceProvenance): ReferenceValidation {
  const raw = rawReference.normalize("NFKC").trim();
  const issues: ReferenceValidation["issues"] = [];

  if (!raw || placeholderReferencePattern.test(raw)) {
    issues.push({
      severity: "error",
      code: "missing_reference",
      message: "Manufacturer reference is missing or placeholder-like.",
      source: provenance,
      field: "manufacturerReference",
      rawValue: rawReference,
    });

    return { raw, normalized: null, suspicious: true, issues };
  }

  try {
    const normalized = normalizeManufacturerReference(raw);
    const suspicious = /^[0-9]{1,2}$/.test(normalized);

    if (suspicious) {
      issues.push({
        severity: "error",
        code: "suspicious_reference",
        message: "Manufacturer reference is too short or numeric-only and requires manual review.",
        source: provenance,
        field: "manufacturerReference",
        rawValue: rawReference,
      });
    }

    return { raw, normalized, suspicious, issues };
  } catch {
    issues.push({
      severity: "error",
      code: "missing_reference",
      message: "Manufacturer reference could not be normalized.",
      source: provenance,
      field: "manufacturerReference",
      rawValue: rawReference,
    });

    return { raw, normalized: null, suspicious: true, issues };
  }
}

export function normalizedBrandKey(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}
