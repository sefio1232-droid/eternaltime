import type { CatalogSourceType, ImageCandidate, SourceProvenance, ValidationIssue } from "./types";

const imageExtensionPattern = /\.(?:jpg|jpeg|png|webp)$/i;

export function normalizeZipPath(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .trim()
    .toLowerCase();
}

export function isImagePathLike(input: string): boolean {
  return imageExtensionPattern.test(input.trim());
}

export function isStructurallyValidRemoteImageUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return (url.protocol === "http:" || url.protocol === "https:") && isImagePathLike(url.pathname);
  } catch {
    return false;
  }
}

export function findMatchingZipEntry(excelImagePath: string, zipEntries: string[]): string | null {
  const normalizedExcelPath = normalizeZipPath(excelImagePath);
  const normalizedEntries = zipEntries.map((entry) => ({
    raw: entry,
    normalized: normalizeZipPath(entry),
  }));

  const direct = normalizedEntries.find((entry) => entry.normalized === normalizedExcelPath);
  if (direct) {
    return direct.raw;
  }

  const suffix = normalizedEntries.find(
    (entry) => entry.normalized.endsWith(`/${normalizedExcelPath}`) || normalizedExcelPath.endsWith(`/${entry.normalized}`),
  );

  return suffix?.raw ?? null;
}

export function imageCandidateFromSource(input: {
  sourcePackage: string;
  sourceType: CatalogSourceType;
  rawImageSource: string;
  ordering: number;
  zipEntries: string[];
  provenance: SourceProvenance;
}): { candidate: ImageCandidate | null; issue: ValidationIssue | null } {
  const rawImageSource = input.rawImageSource.trim();

  if (!rawImageSource) {
    return { candidate: null, issue: null };
  }

  if (/^https?:\/\//i.test(rawImageSource)) {
    const validUrl = isStructurallyValidRemoteImageUrl(rawImageSource);

    return {
      candidate: {
        sourcePackage: input.sourcePackage,
        sourceType: input.sourceType,
        excelImagePath: null,
        actualZipEntry: null,
        remoteImageUrl: rawImageSource,
        ordering: input.ordering,
        isPrimaryCandidate: false,
        status: validUrl ? "valid" : "invalid_url",
        provenance: input.provenance,
      },
      issue: validUrl
        ? null
        : {
            severity: "warning",
            code: "invalid_remote_image_url",
            message: "Remote image URL is not structurally valid.",
            source: input.provenance,
            field: "image",
            rawValue: rawImageSource,
          },
    };
  }

  if (!isImagePathLike(rawImageSource)) {
    return { candidate: null, issue: null };
  }

  const actualZipEntry = findMatchingZipEntry(rawImageSource, input.zipEntries);
  const status = actualZipEntry ? "valid" : "broken";

  return {
    candidate: {
      sourcePackage: input.sourcePackage,
      sourceType: input.sourceType,
      excelImagePath: rawImageSource,
      actualZipEntry,
      remoteImageUrl: null,
      ordering: input.ordering,
      isPrimaryCandidate: false,
      status,
      provenance: input.provenance,
    },
    issue:
      status === "broken"
        ? {
            severity: "warning",
            code: "broken_image_source",
            message: "Excel image path does not match an actual ZIP image entry.",
            source: input.provenance,
            field: "image",
            rawValue: rawImageSource,
          }
        : null,
  };
}

export function imageCandidatesFromZipEntries(input: {
  sourcePackage: string;
  sourceType: CatalogSourceType;
  referenceRaw: string;
  zipEntries: string[];
  provenance: SourceProvenance;
}): ImageCandidate[] {
  const normalizedReference = normalizeZipPath(input.referenceRaw);
  return input.zipEntries
    .filter((entry) => isImagePathLike(entry) && normalizeZipPath(entry).includes(`/${normalizedReference}/`))
    .sort((left, right) => normalizeZipPath(left).localeCompare(normalizeZipPath(right)))
    .map((entry, index) => ({
      sourcePackage: input.sourcePackage,
      sourceType: input.sourceType,
      excelImagePath: null,
      actualZipEntry: entry,
      remoteImageUrl: null,
      ordering: index + 1,
      isPrimaryCandidate: false,
      status: "valid",
      provenance: {
        ...input.provenance,
        rawColumn: "__zip_entry",
        rawValue: entry,
      },
    }));
}

export function markPrimaryImageCandidate(candidates: ImageCandidate[]): ImageCandidate[] {
  let primaryAssigned = false;

  return candidates
    .slice()
    .sort((left, right) => left.ordering - right.ordering)
    .map((candidate) => {
      if (!primaryAssigned && candidate.status === "valid") {
        primaryAssigned = true;
        return { ...candidate, isPrimaryCandidate: true };
      }

      return { ...candidate, isPrimaryCandidate: false };
    });
}
