/**
 * Presentation-layer sanitation for public catalog display text (reference/title strings).
 *
 * Some source rows carry leftover spreadsheet review annotations glued onto an otherwise valid
 * manufacturer reference or title (e.g. "ECB-950YMP-1A блять повтор"). This never happens to the
 * raw source data or the manufacturer reference identity used for matching/canonical URLs — it
 * only cleans the string actually shown to a public visitor. If no known annotation is detected,
 * the original (NFKC-normalized, trimmed) text is returned unchanged.
 */

export type CatalogPublicSanitationResult = {
  sanitized: string;
  raw: string;
  wasSanitized: boolean;
  removedSuffix: string | null;
};

function normalize(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

// Known source-spreadsheet review/annotation phrases. Source data mixes Latin "T"/"t" into
// otherwise-Cyrillic words (e.g. "бляTь повTор", "одни и Tе же") — patterns below accept either
// the Cyrillic "т" or a substituted Latin "T"/"t" in those positions so real examples match.
const annotationPatterns: RegExp[] = [
  /бля[тT]ь\s*пов[тT]ор/iu,
  /пов[тT]ор/iu,
  /одни\s+и\s+[тT]е\s*ж?е?/iu,
  /дубль/iu,
  /duplicate/iu,
  /manual\s*review/iu,
  /review\s*note/iu,
  /провер(?:ить|ять|ка)/iu,
  // Note: JS regex `\b` only recognizes ASCII word characters and does not work as a word
  // boundary around Cyrillic text, so these short tokens use explicit non-letter lookarounds
  // instead of `\b` to avoid matching as a silent substring of an unrelated word.
  /(?<![а-яё])хз(?![а-яё])/iu,
  /(?<![а-яё])жду(?![а-яё])/iu,
  /пытаюсь\s+угадать/iu,
];

const bracketedAnnotationPattern = /[([][^)\]]*[)\]]/gu;

function stripBracketedAnnotations(value: string): { text: string; removed: string[] } {
  const removed: string[] = [];
  const text = value.replace(bracketedAnnotationPattern, (match) => {
    if (annotationPatterns.some((pattern) => pattern.test(match))) {
      removed.push(match);
      return " ";
    }
    return match;
  });
  return { text: normalize(text), removed };
}

/**
 * Sanitizes a single public display string. Only removes a detected annotation and everything
 * after it (matching the documented algorithm: keep the clean prefix, drop confirmed
 * review-note suffixes) — never rewrites the middle of a string, never invents a replacement,
 * and never returns an empty result (falls back to the original text if sanitization would
 * otherwise strip everything).
 */
export function sanitizeCatalogPublicText(rawInput: string): CatalogPublicSanitationResult {
  const raw = normalize(rawInput);
  if (!raw) {
    return { sanitized: raw, raw, wasSanitized: false, removedSuffix: null };
  }

  const { text: bracketStripped, removed: bracketRemovals } = stripBracketedAnnotations(raw);

  let earliestIndex = -1;
  let matchedLength = 0;
  for (const pattern of annotationPatterns) {
    const match = bracketStripped.match(pattern);
    if (match && match.index !== undefined && (earliestIndex === -1 || match.index < earliestIndex)) {
      earliestIndex = match.index;
      matchedLength = match[0].length;
    }
  }

  if (earliestIndex === -1) {
    if (bracketRemovals.length > 0 && bracketStripped) {
      return { sanitized: bracketStripped, raw, wasSanitized: true, removedSuffix: bracketRemovals.join(" ") };
    }
    return { sanitized: raw, raw, wasSanitized: false, removedSuffix: null };
  }

  const prefix = normalize(bracketStripped.slice(0, earliestIndex));
  const removedSuffix = normalize(bracketStripped.slice(earliestIndex) || bracketStripped.slice(earliestIndex, earliestIndex + matchedLength));

  if (!prefix) {
    // Stripping would remove everything — refuse and keep the original text rather than
    // producing an empty public value.
    return { sanitized: raw, raw, wasSanitized: false, removedSuffix: null };
  }

  return { sanitized: prefix, raw, wasSanitized: true, removedSuffix: removedSuffix || null };
}

export type CatalogPublicSanitationLogEntry = {
  candidateId: string;
  referenceNormalized: string;
  field: "referenceDisplay" | "title" | "officialName" | "watchModelName";
  raw: string;
  sanitized: string;
  removedSuffix: string | null;
};

type SanitationSourceCandidate = {
  candidateId: string;
  applyEligibility: { status: string };
  sourceRowClassification?: { action?: string } | null;
  identity: {
    title: string | null;
    officialName: string | null;
    referenceRaw: string | null;
    referenceNormalized: string | null;
  };
  hierarchy?: {
    watchModelCandidate: string | null;
  };
};

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Re-derives the same eligible-record filter used by preview-catalog-adapter.ts (a small,
 * intentional duplication — same as the existing image-audit CLI script already does
 * independently — so this report generator has no production import-time dependency on the
 * live read path) and reports every referenceDisplay/title/officialName sanitization decision.
 * Used by the CLI report (public/generated/catalog-review/public-display-sanitation.json) and,
 * dev-only, by the catalog review drawer's "Show raw source data" toggle.
 */
export function buildCatalogPublicSanitationLog(candidates: SanitationSourceCandidate[]): CatalogPublicSanitationLogEntry[] {
  const entries: CatalogPublicSanitationLogEntry[] = [];

  for (const candidate of candidates) {
    if (candidate.applyEligibility.status !== "eligible") {
      continue;
    }
    if (candidate.sourceRowClassification?.action === "exclude_from_public_read_and_apply") {
      continue;
    }

    const referenceNormalized = textOrNull(candidate.identity.referenceNormalized);
    if (!referenceNormalized || referenceNormalized === "7") {
      continue;
    }

    const fields: Array<{ field: CatalogPublicSanitationLogEntry["field"]; raw: string | null }> = [
      { field: "referenceDisplay", raw: textOrNull(candidate.identity.referenceRaw) },
      { field: "title", raw: textOrNull(candidate.identity.title) },
      { field: "officialName", raw: textOrNull(candidate.identity.officialName) },
      { field: "watchModelName", raw: textOrNull(candidate.hierarchy?.watchModelCandidate) },
    ];

    for (const { field, raw } of fields) {
      if (!raw) {
        continue;
      }
      const result = sanitizeCatalogPublicText(raw);
      if (result.wasSanitized) {
        entries.push({
          candidateId: candidate.candidateId,
          referenceNormalized,
          field,
          raw: result.raw,
          sanitized: result.sanitized,
          removedSuffix: result.removedSuffix,
        });
      }
    }
  }

  return entries;
}

export type CatalogPublicSanitationDevEntry = {
  referenceNormalized: string;
  rawReferenceDisplay: string | null;
  sanitizedReferenceDisplay: string | null;
  rawTitle: string | null;
  sanitizedTitle: string | null;
  wasSanitized: boolean;
};

/**
 * Dev-only per-reference raw-vs-sanitized lookup for the catalog review drawer's
 * "Show raw source data" toggle. Never called in production (gated server-side before this
 * module is even reached — see src/app/(shop)/watches/page.tsx).
 */
export function buildCatalogPublicSanitationDevMap(
  candidates: SanitationSourceCandidate[],
): Map<string, CatalogPublicSanitationDevEntry> {
  const map = new Map<string, CatalogPublicSanitationDevEntry>();

  for (const candidate of candidates) {
    if (candidate.applyEligibility.status !== "eligible") {
      continue;
    }
    if (candidate.sourceRowClassification?.action === "exclude_from_public_read_and_apply") {
      continue;
    }

    const referenceNormalized = textOrNull(candidate.identity.referenceNormalized);
    if (!referenceNormalized || referenceNormalized === "7") {
      continue;
    }

    const rawReferenceDisplay = textOrNull(candidate.identity.referenceRaw);
    const rawTitle = textOrNull(candidate.identity.title);
    const referenceResult = rawReferenceDisplay ? sanitizeCatalogPublicText(rawReferenceDisplay) : null;
    const titleResult = rawTitle ? sanitizeCatalogPublicText(rawTitle) : null;

    map.set(referenceNormalized, {
      referenceNormalized,
      rawReferenceDisplay,
      sanitizedReferenceDisplay: referenceResult?.sanitized ?? null,
      rawTitle,
      sanitizedTitle: titleResult?.sanitized ?? null,
      wasSanitized: Boolean(referenceResult?.wasSanitized || titleResult?.wasSanitized),
    });
  }

  return map;
}
