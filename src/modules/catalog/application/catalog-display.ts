import { mechanismGroupCardLabels, normalizeMechanismGroup } from "@/modules/catalog/application/catalog-mechanism-taxonomy";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import type { CatalogPublicSpecification, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

function normalizeDisplayText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/**
 * Fixes a common source-spreadsheet typing artifact in imported SEO/overlay prose — a stray space
 * before sentence punctuation (e.g. "винтажный шарм . Часы" -> "винтажный шарм. Часы") — without
 * touching wording, word order, or meaning. Never invents or removes content, only whitespace.
 */
export function cleanImportedProseText(text: string): string {
  return normalizeDisplayText(text).replace(/\s+([.,;:!?])/gu, "$1");
}

function startsWithBrand(value: string, brandName: string): boolean {
  return normalizeDisplayText(value).toLocaleLowerCase("ru").startsWith(`${normalizeDisplayText(brandName).toLocaleLowerCase("ru")} `);
}

/**
 * Strips a trailing, exact (case-insensitive) occurrence of the manufacturer reference from a
 * display string. The raw import's own title/model-name field bakes the reference in verbatim for
 * roughly 60% of the real catalog (e.g. "Casio A130WE-7ADF", "Orient Kamasu FAA02002D9") — since
 * the reference is always shown again on its own line elsewhere (catalog card, hero), repeating it
 * inside the title reads as the same fact twice and risks an awkward mid-code line wrap on long
 * references. Returns an empty string when nothing but the reference was there to begin with
 * (callers decide how to fall back); never invents or reorders words, and a value that doesn't end
 * with the reference is returned unchanged (normalized only).
 */
function stripRedundantReferenceFromTitle(value: string, referenceDisplay: string): string {
  const normalizedValue = normalizeDisplayText(value);
  const reference = normalizeDisplayText(referenceDisplay);

  if (!reference || !normalizedValue.toLocaleLowerCase("ru").endsWith(reference.toLocaleLowerCase("ru"))) {
    return normalizedValue;
  }

  const withoutReference = normalizedValue.slice(0, normalizedValue.length - reference.length);
  return withoutReference.replace(/[\s,.\-–—]+$/u, "").trim();
}

export function displayWatchTitle(input: { brandName: string; title: string; referenceDisplay?: string }): string {
  const brandName = normalizeDisplayText(input.brandName);
  let title = normalizeDisplayText(input.title);

  if (!title) {
    return brandName;
  }

  if (input.referenceDisplay) {
    const stripped = stripRedundantReferenceFromTitle(title, input.referenceDisplay);
    // Only adopt the stripped form when a real model name remains beyond the brand — a
    // reference-only product (no distinct marketing name) still needs *something* identifying in
    // the title, so this falls back to the untouched brand+reference title rather than a title
    // that is just the brand name alone.
    if (stripped && stripped.toLocaleLowerCase("ru") !== brandName.toLocaleLowerCase("ru")) {
      title = stripped;
    }
  }

  if (startsWithBrand(title, brandName)) {
    return title;
  }

  return `${brandName} ${title}`;
}

export function displayWatchSeoTitle(input: { brandName: string; title: string; referenceDisplay: string }): string {
  const title = displayWatchTitle(input);
  const normalizedTitle = normalizeManufacturerReference(title);
  const normalizedReference = normalizeManufacturerReference(input.referenceDisplay);

  if (normalizedReference && normalizedTitle.includes(normalizedReference)) {
    return title;
  }

  return `${title} ${normalizeDisplayText(input.referenceDisplay)}`;
}

/**
 * Model heading for contexts where the brand is already shown as a separate line (e.g. the
 * catalog card). Strips a redundant leading brand name from the title instead of prepending one,
 * the inverse of displayWatchTitle, and — when `referenceDisplay` is supplied — a redundant
 * trailing reference too (see `stripRedundantReferenceFromTitle`), since the card/hero already
 * show the reference again on its own line. Falls back to the brand-stripped title when removing
 * the reference would leave nothing (a reference-only product with no distinct marketing name),
 * never inventing or reordering words.
 */
export function displayWatchModelHeading(input: { brandName: string; title: string; referenceDisplay?: string }): string {
  const title = normalizeDisplayText(input.title);
  const brandName = normalizeDisplayText(input.brandName);

  if (!title) {
    return brandName;
  }

  const withoutBrand = startsWithBrand(title, brandName) ? title.slice(brandName.length).trim() || title : title;

  if (input.referenceDisplay) {
    const withoutReference = stripRedundantReferenceFromTitle(withoutBrand, input.referenceDisplay);
    if (withoutReference) {
      return withoutReference;
    }
  }

  return withoutBrand;
}

export function formatCatalogDisplayValue(value: string): string {
  const normalized = normalizeDisplayText(value)
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*,\s*/g, ", ");

  if (!normalized.includes(" / ")) {
    return normalized;
  }

  const parts = normalized.split(" / ").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return normalized;
  }

  return parts
    .map((part, index) => {
      const lower = part.toLocaleLowerCase("ru");
      return index === 0 ? lower.charAt(0).toLocaleUpperCase("ru") + lower.slice(1) : lower;
    })
    .join(", ");
}

function stripLeadingSpecificationLabel(value: string, label: string): string {
  const normalizedLabel = normalizeDisplayText(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(`^${normalizedLabel}\\s*[:—-]\\s*`, "iu"), "").trim();
}

function dedupeDelimitedParts(value: string): string {
  const separator = value.includes(" / ") ? " / " : value.includes(", ") ? ", " : null;
  if (!separator) return value;

  const seen = new Set<string>();
  const parts = value
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLocaleLowerCase("ru").replace(/[()]/g, "").replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return parts.length > 0 ? parts.join(separator) : value;
}

/**
 * Read-model-facing sanitizer for public specification values. It removes only label/value
 * duplication and malformed generated adjectives (for example `Стекло: полимерное стекло` under
 * the already-visible row label `Стекло`, or `Кожаный ремешокный ремешок`). It never fills missing
 * specs or changes the underlying fact.
 */
export function sanitizeCatalogSpecificationValue(input: { key: string; label: string; value: string }): string {
  let value = normalizeDisplayText(input.value);

  value = stripLeadingSpecificationLabel(value, input.label);

  if (input.key === "crystal_type_raw") {
    value = value.replace(
      /(^|[^а-яё])((?:минеральн(?:ое|ый)|сапфиров(?:ое|ый)|акрилов(?:ое|ый)|полимерн(?:ое|ый)|органическ(?:ое|ий))\s+)стекл[оа](?=$|[^а-яё])/giu,
      "$1$2",
    );
    value = value.replace(
      /(^|[^а-яё])(hardlex|hesalite)\s+стекл[оа](?=$|[^а-яё])/giu,
      "$1$2",
    );
    value = value.replace(/\s+стекл[оа](?=$|[^а-яё])/giu, "");
    value = value.replace(/\s*\(([^)]*)\)\s*/gu, (match, inner: string) => {
      const normalizedInner = inner.trim().toLocaleLowerCase("ru");
      if (!normalizedInner) return " ";
      return value.toLocaleLowerCase("ru").replace(match.toLocaleLowerCase("ru"), " ").includes(normalizedInner)
        ? " "
        : ` (${inner.trim()}) `;
    });
  }

  if (input.key === "dial_raw") {
    value = value.replace(/^циферблат\s+/iu, "");
  }

  if (
    input.key === "attachment_material_raw" ||
    input.key === "strap_material_raw" ||
    input.key === "bracelet_material_raw" ||
    input.key === "strap_features_raw"
  ) {
    value = value
      .replace(/ремешокн(?:ый|ая|ое|ые)?\s+ремешок/giu, "ремешок")
      .replace(/браслетн(?:ый|ая|ое|ые)?\s+браслет/giu, "браслет");
  }

  return dedupeDelimitedParts(value).replace(/\s+/g, " ").trim();
}

// Note: JS regex `\b` only recognizes ASCII word characters, so it does not work as a word
// boundary around Cyrillic text — these patterns intentionally avoid `\b` and instead rely on
// the phrases themselves being distinctive enough not to appear as unwanted substrings.
const compactWordReplacements: Array<[RegExp, string]> = [
  [/нержавеющая\s+сталь/giu, "сталь"],
  [/нержавеющей\s+стали/giu, "стали"],
  [/механическ(?:ий|ая)\s+с\s+автоподзаводом/giu, "автомат"],
  [/(\d+)\s*метр(?:ов|а)?(?![а-яё])/giu, "$1 м"],
];

/**
 * Compacts a raw catalog specification value for card display: strips parenthetical
 * translations/commentary (a very common source-data pattern, e.g. "Нержавеющая сталь
 * (Stainless Steel)"), shortens a small set of known-safe long words, normalizes list
 * separators (", " and " / ") to a single " · ", and finally hard-caps the length as a safety
 * net so no source oddity can ever break the card layout. Never invents data — only
 * abbreviates/reformats what is already present.
 */
export function formatCompactCatalogSpecValue(rawValue: string, maxLength = 32): string {
  let value = normalizeDisplayText(rawValue).replace(/\([^)]*\)/g, " ");

  for (const [pattern, replacement] of compactWordReplacements) {
    value = value.replace(pattern, replacement);
  }

  value = value
    .replace(/,(?=\s)/g, " ·")
    .replace(/\s*\/\s*/g, " · ")
    .replace(/\s*·\s*/g, " · ")
    .replace(/\s+/g, " ")
    .trim();

  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.5 ? truncated.slice(0, lastSpace) : truncated).trim()}…`;
}

const caseMaterialPatterns: Array<[RegExp, string]> = [
  [/титан|titanium/iu, "Титан"],
  [/карбон|carbon/iu, "Карбон"],
  [/нержавеющ|сталь|steel/iu, "Сталь"],
  [/полимер|пластик|смола|resin|plastic/iu, "Полимер"],
  [/кож[аи]|leather/iu, "Кожа"],
  [/каучук|силикон|rubber|silicone/iu, "Каучук"],
];

const waterResistanceMeterPattern = /(\d+)\s*(?:м(?![а-яё])|метр)/iu;
const knownWaterResistanceBuckets = new Set([30, 50, 100, 200]);

/**
 * Card-facing trait formatting: normalized short labels only (Автомат/Кварц/Solar/Механика/
 * Цифровые; Сталь/Титан/Полимер/Карбон/Кожа/Каучук; 30 м/50 м/100 м/200 м) — never a raw import
 * sentence. Falls back to the general compacting formatter for a specification this function has
 * no dedicated normalizer for (e.g. crystal type, case dimensions), and for any value inside a
 * known field that doesn't match a known label (never invents a label for data it can't read).
 */
export function formatCatalogCardTrait(spec: CatalogPublicSpecification): string {
  if (spec.key === "movement_raw" || spec.key === "movement_family_raw" || spec.key === "movement_type_raw") {
    const group = normalizeMechanismGroup(spec.value);
    if (group) {
      return mechanismGroupCardLabels[group];
    }
  }

  if (spec.key === "case_material_raw") {
    const match = caseMaterialPatterns.find(([pattern]) => pattern.test(spec.value));
    if (match) {
      return match[1];
    }
  }

  if (spec.key === "water_resistance_raw") {
    const meters = waterResistanceMeterPattern.exec(spec.value);
    const value = meters ? Number(meters[1]) : null;
    if (value !== null && knownWaterResistanceBuckets.has(value)) {
      return `${value} м`;
    }
  }

  return formatCompactCatalogSpecValue(spec.value);
}

export type CatalogCardPresentationCategory =
  | "compact-digital"
  | "standard-digital"
  | "analog-bracelet"
  | "analog-strap"
  | "diver"
  | "oversized-sport";

// Reference-code family prefixes are public, industry-standard model-line identifiers (not
// per-model overrides) — a rule for a whole Casio line, not hundreds of individual references.
// Movement/case-size fields are too sparse in the real dataset (<2% have a parsed diameter, and
// "movement_raw" rarely distinguishes digital from analog quartz — see
// docs/CATALOG_SHOWROOM_RECOVERY.md "Known limitations") to drive this on their own.
const compactDigitalReferencePattern = /^(A1[0-9]{2}|A7[0-9]{2}|A8[0-9]{2}|A9[0-9]{2}|F-?91|AE-?1[0-9]{3}|W-?2[0-9]{2}|LW-?|MQ-?)/i;
const oversizedSportReferencePattern = /^(G-?[A-Z]|GA-?|GBD-?|GBA-?|GST-?|GMW-?|GWG-?|MTG-?|DW-?)/i;
const diverKeywordPattern = /(дайвер|дайвинг|diver|водолаз)/i;

/**
 * Deterministic, data-driven card image presentation category — controls optical scale/padding
 * only (see catalog-watch-card.module.css), never which image is chosen. Falls back to
 * "analog-bracelet" (the catalog's most common real case) when no stronger signal is available,
 * rather than guessing.
 */
export function classifyCatalogCardPresentation(watch: {
  brandSlug: string;
  referenceDisplay: string;
  keySpecifications: CatalogPublicSpecification[];
}): CatalogCardPresentationCategory {
  const specText = watch.keySpecifications.map((spec) => spec.value).join(" ");
  if (diverKeywordPattern.test(specText)) {
    return "diver";
  }

  const waterSpec = watch.keySpecifications.find((spec) => spec.group === "water_resistance");
  if (waterSpec) {
    const meters = Number.parseInt(waterSpec.value, 10);
    if (Number.isFinite(meters) && meters >= 150) {
      return "diver";
    }
  }

  if (watch.brandSlug === "casio") {
    const code = watch.referenceDisplay.replace(/\s+/g, "");
    if (oversizedSportReferencePattern.test(code)) {
      return "oversized-sport";
    }
    if (compactDigitalReferencePattern.test(code)) {
      return "compact-digital";
    }
  }

  return "analog-bracelet";
}

function specByKeys(specifications: CatalogPublicSpecification[], keys: string[]): CatalogPublicSpecification | null {
  return specifications.find((specification) => keys.includes(specification.key)) ?? null;
}

export function buildFactualWatchDescription(watch: CatalogWatchDetail): string {
  const title = displayWatchTitle({ brandName: watch.brandName, title: watch.title, referenceDisplay: watch.referenceDisplay });
  const movement = specByKeys(watch.specifications, ["movement_type_raw", "movement_family_raw", "movement_raw"]);
  const caseMaterial = specByKeys(watch.specifications, ["case_material_raw"]);
  const crystal = specByKeys(watch.specifications, ["crystal_type_raw"]);
  const strap = specByKeys(watch.specifications, ["strap_material_raw", "bracelet_material_raw", "strap_bracelet_raw"]);
  const dial = specByKeys(watch.specifications, ["dial_color_raw", "dial_raw"]);
  const firstSentenceParts = [
    movement ? formatCatalogDisplayValue(movement.value).toLocaleLowerCase("ru") : null,
    caseMaterial ? `корпус: ${formatCatalogDisplayValue(caseMaterial.value).toLocaleLowerCase("ru")}` : null,
    crystal ? `стекло: ${formatCatalogDisplayValue(crystal.value).toLocaleLowerCase("ru")}` : null,
  ].filter(Boolean);
  const secondSentenceParts = [
    strap ? `браслет или ремешок: ${formatCatalogDisplayValue(strap.value).toLocaleLowerCase("ru")}` : null,
    dial ? `циферблат: ${formatCatalogDisplayValue(dial.value).toLocaleLowerCase("ru")}` : null,
  ].filter(Boolean);

  if (firstSentenceParts.length > 0) {
    const firstSentence = `${title} — ${firstSentenceParts.join(", ")}.`;
    return secondSentenceParts.length > 0 ? `${firstSentence} ${secondSentenceParts.join("; ")}.` : firstSentence;
  }

  if (watch.brandCollectionName) {
    return `${title} относится к коллекции ${formatCatalogDisplayValue(watch.brandCollectionName)}. На странице показаны только подтвержденные публичные характеристики модели.`;
  }

  return `${title}. На странице показаны только подтвержденные публичные характеристики модели.`;
}

/**
 * Splits a single overview/description string into a handful of short reading paragraphs, purely
 * by grouping consecutive sentences into evenly-sized chunks — never reordering, rewriting, or
 * guessing at topic boundaries (e.g. "which sentence is about the movement") the source text
 * doesn't itself mark. Used so a long SEO-overlay description (or the factual fallback) reads as
 * 2-3 short paragraphs instead of one solid wall of text. A single-sentence input is returned as
 * one paragraph unchanged.
 */
export function splitDescriptionIntoParagraphs(text: string, maxParagraphs = 3): string[] {
  const normalized = normalizeDisplayText(text);
  if (!normalized) {
    return [];
  }

  const sentences =
    normalized
      .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];

  if (sentences.length <= 1) {
    return [normalized];
  }

  const paragraphCount = Math.min(maxParagraphs, sentences.length);
  const sentencesPerParagraph = Math.ceil(sentences.length / paragraphCount);
  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(index, index + sentencesPerParagraph).join(" "));
  }

  return paragraphs;
}
