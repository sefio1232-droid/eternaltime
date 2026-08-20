import type {
  MergedCatalogCandidate,
  SourceRowClassification,
  ValidationIssue,
} from "./types";

const markerWordPatterns = [
  /(?:^|\s)ниже(?:\s|$)/u,
  /(?:^|\s)далее(?:\s|$)/u,
  /(?:^|\s)буду[тt]?(?:\s|$)/u,
  /(?:^|\s)были(?:\s|$)/u,
  /(?:^|\s)следующ/u,
  /(?:^|\s)штук/u,
  /(?:^|\s)хз(?:\s|$)/u,
  /(?:^|\s)пытаюсь(?:\s|$)/u,
  /(?:^|\s)угадать(?:\s|$)/u,
  /(?:^|\s)че(?:\s|$)/u,
];

const noteWordPatterns = [
  /(?:^|\s)коммент/u,
  /(?:^|\s)провер/u,
  /(?:^|\s)уточн/u,
  /(?:^|\s)ссылк/u,
  /(?:^|\s)сылк/u,
  /(?:^|\s)одинаков/u,
  /(?:^|\s)заголовок(?:\s|$)/u,
  /(?:^|\s)раздел(?:\s|$)/u,
  /(?:^|\s)сепаратор(?:\s|$)/u,
  /(?:^|\s)separator(?:\s|$)/u,
  /(?:^|\s)note(?:\s|$)/u,
  /(?:^|\s)жду(?:\s|$)/u,
  /(?:^|\s)сес/u,
  /(?:^|\s)скаже/u,
  /(?:^|\s)магаз/u,
  /(?:^|\s)трога/u,
  /(?:^|\s)ебал/u,
];

function normalizeHumanText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function hasProductReferenceShape(rawReference: string | null, normalizedReference: string | null): boolean {
  const raw = rawReference?.normalize("NFKC").trim() ?? "";
  const normalized = normalizedReference?.normalize("NFKC").trim() ?? "";

  if (!raw || !normalized) {
    return false;
  }

  const compactAscii = normalized.replace(/[^A-Z0-9]/g, "");
  const containsLatin = /[A-Z]/.test(compactAscii);
  const containsDigit = /\d/.test(compactAscii);
  const hasSeparators = /[-./]/.test(raw);

  return compactAscii.length >= 4 && containsDigit && (containsLatin || hasSeparators);
}

export function containsSourceMarkerLanguage(value: string | null | undefined): boolean {
  return containsPattern(normalizeHumanText(value), markerWordPatterns);
}

export function containsSourceNoteLanguage(value: string | null | undefined): boolean {
  return containsPattern(normalizeHumanText(value), noteWordPatterns);
}

export function cleanPublicIdentityTitle(input: {
  brand: string | null;
  title: string | null;
  referenceRaw: string | null;
  referenceNormalized: string | null;
}): { title: string | null; issue: ValidationIssue | null } {
  if (!input.title || !input.brand || !input.referenceRaw) {
    return { title: input.title, issue: null };
  }

  if (
    !hasProductReferenceShape(input.referenceRaw, input.referenceNormalized) ||
    (!containsSourceMarkerLanguage(input.title) && !containsSourceNoteLanguage(input.title))
  ) {
    return { title: input.title, issue: null };
  }

  return {
    title: `${input.brand} ${input.referenceRaw}`,
    issue: {
      severity: "warning",
      code: "source_note_title_fallback",
      message: "Public identity title fell back to Brand + Manufacturer Reference because source title contains worksheet note language.",
      field: "title",
      rawValue: input.title,
    },
  };
}

function countProductFacts(candidate: MergedCatalogCandidate): number {
  let facts = 0;

  if (candidate.pricing.publicPriceCandidate) {
    facts += 1;
  }

  if (candidate.images.candidates.some((image) => image.status === "valid")) {
    facts += 1;
  }

  if (
    Object.keys(candidate.specifications.firstClass).length > 0 ||
    Object.keys(candidate.specifications.controlledAttributes).length > 0
  ) {
    facts += 1;
  }

  return facts;
}

function classificationIssue(classification: SourceRowClassification): ValidationIssue {
  return {
    severity: "error",
    code: "non_product_source_row",
    message: `Source row was classified as ${classification.kind} and is excluded from public catalog read/apply.`,
    field: "sourceRowClassification",
    rawValue: classification.indicators.join("; "),
  };
}

export function classifyCatalogSourceRow(candidate: MergedCatalogCandidate): SourceRowClassification {
  const title = normalizeHumanText(candidate.identity.title);
  const officialName = normalizeHumanText(candidate.identity.officialName);
  const rawReference = normalizeHumanText(candidate.identity.referenceRaw);
  const combinedIdentity = [title, officialName, rawReference].filter(Boolean).join(" ");
  const indicators: string[] = [];
  const hasMarkerLanguage = containsPattern(combinedIdentity, markerWordPatterns);
  const hasNoteLanguage = containsPattern(combinedIdentity, noteWordPatterns);
  const rawReferenceHasMarkerLanguage = containsPattern(rawReference, markerWordPatterns);
  const rawReferenceHasNoteLanguage = containsPattern(rawReference, noteWordPatterns);
  const productReferenceShape = hasProductReferenceShape(
    candidate.identity.referenceRaw,
    candidate.identity.referenceNormalized,
  );
  const productFactCount = countProductFacts(candidate);
  const referenceLooksLikeSentence =
    rawReference.split(" ").length >= 3 || /[а-я]/u.test(rawReference);

  if (hasMarkerLanguage) {
    indicators.push("identity text contains spreadsheet marker language");
  }

  if (hasNoteLanguage) {
    indicators.push("identity text contains source note language");
  }

  if (!productReferenceShape) {
    indicators.push("manufacturer reference does not have product reference shape");
  }

  if (referenceLooksLikeSentence) {
    indicators.push("manufacturer reference resembles a sentence or worksheet note");
  }

  if (productFactCount === 0) {
    indicators.push("row has no public price, valid image, or parsed watch specifications");
  }

  if ((hasMarkerLanguage || hasNoteLanguage) && !productReferenceShape && productFactCount === 0) {
    return {
      kind: hasMarkerLanguage ? "source_marker" : "source_note",
      indicators,
      action: "exclude_from_public_read_and_apply",
    };
  }

  if (hasMarkerLanguage && referenceLooksLikeSentence && productFactCount === 0) {
    return {
      kind: "unresolved_non_product",
      indicators,
      action: "exclude_from_public_read_and_apply",
    };
  }

  if ((rawReferenceHasMarkerLanguage || rawReferenceHasNoteLanguage) && referenceLooksLikeSentence) {
    return {
      kind: rawReferenceHasMarkerLanguage ? "source_marker" : "source_note",
      indicators,
      action: "exclude_from_public_read_and_apply",
    };
  }

  return {
    kind: "product_candidate",
    indicators: productReferenceShape
      ? ["manufacturer reference has product reference shape"]
      : ["no deterministic non-product source-row indicators matched"],
    action: "allow_public_read_and_apply",
  };
}

export function applySourceRowClassification(candidate: MergedCatalogCandidate): MergedCatalogCandidate {
  const classification = classifyCatalogSourceRow(candidate);

  if (classification.action === "allow_public_read_and_apply") {
    return {
      ...candidate,
      sourceRowClassification: classification,
    };
  }

  const issue = classificationIssue(classification);

  return {
    ...candidate,
    sourceRowClassification: classification,
    validationIssues: [...candidate.validationIssues, issue],
    applyEligibility: {
      status: "blocked",
      referenceApplyEligible: false,
      commercialApplyEligible: false,
      reasons: [
        ...candidate.applyEligibility.reasons,
        `excluded because source row classification is ${classification.kind}`,
      ],
    },
  };
}
