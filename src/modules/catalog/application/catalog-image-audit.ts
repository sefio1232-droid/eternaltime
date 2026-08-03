import {
  imageOrderFromAlt,
  isLikelyTechnicalAngle,
  isProminentCatalogImage,
} from "@/modules/catalog/application/catalog-image-presentation-policy";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

export type CatalogImageAuditIssue =
  | "no_image"
  | "only_technical_angle_available"
  | "primary_reselected_from_gallery"
  | "ok";

export type CatalogImageAuditEntry = {
  referenceDisplay: string;
  referenceNormalized: string;
  brandName: string;
  href: string;
  galleryCount: number;
  galleryImages: Array<{
    index: number;
    kind: CatalogImagePresentation["kind"];
    alt: string;
    detectedOrderFromAlt: number | null;
    likelyTechnicalAngle: boolean;
  }>;
  selectedPrimary: {
    kind: CatalogImagePresentation["kind"];
    alt: string;
    isProminent: boolean;
  };
  issue: CatalogImageAuditIssue;
  decision: string;
};

export type CatalogImageAuditReport = {
  generatedAt: string;
  totalWatches: number;
  withNoImage: number;
  withOnlyTechnicalAngle: number;
  primaryReselectedCount: number;
  entries: CatalogImageAuditEntry[];
};

function describeGalleryImage(image: CatalogImagePresentation, index: number) {
  const alt = image.alt;
  return {
    index,
    kind: image.kind,
    alt,
    detectedOrderFromAlt: imageOrderFromAlt(image),
    likelyTechnicalAngle: isLikelyTechnicalAngle(image, index),
  };
}

function auditWatch(watch: CatalogWatchDetail): CatalogImageAuditEntry {
  const gallery = watch.imageGallery.length > 0 ? watch.imageGallery : watch.primaryImage.kind !== "none" ? [watch.primaryImage] : [];
  const galleryImages = gallery.map((image, index) => describeGalleryImage(image, index));
  const selectedIndex = gallery.findIndex(
    (image) => image.kind === watch.primaryImage.kind && image.alt === watch.primaryImage.alt,
  );
  const isProminent = watch.primaryImage.kind !== "none" && isProminentCatalogImage(watch.primaryImage, Math.max(selectedIndex, 0));
  const anyProminentAvailable = gallery.some((image, index) => isProminentCatalogImage(image, index));

  let issue: CatalogImageAuditIssue = "ok";
  let decision = `Использовано изображение №${selectedIndex >= 0 ? selectedIndex + 1 : 1} из ${gallery.length}: фронтальное/приоритетное по эвристике alt-текста и порядка.`;

  if (gallery.length === 0) {
    issue = "no_image";
    decision = "Изображения отсутствуют в текущих данных источника; показан нейтральный статус отсутствия фото.";
  } else if (!anyProminentAvailable) {
    issue = "only_technical_angle_available";
    decision = `Все ${gallery.length} доступных изображений распознаны эвристикой как технический ракурс (задняя крышка/застёжка/боковой вид) или отсутствуют; выбрано первое доступное как единственный вариант.`;
  } else if (selectedIndex > 0) {
    issue = "primary_reselected_from_gallery";
    decision = `Изображение №1 в исходном порядке распознано как технический ракурс; вместо него выбрано изображение №${selectedIndex + 1}, определенное как более презентативное (фронтальное).`;
  }

  return {
    referenceDisplay: watch.referenceDisplay,
    referenceNormalized: watch.referenceNormalized,
    brandName: watch.brandName,
    href: watch.href,
    galleryCount: gallery.length,
    galleryImages,
    selectedPrimary: {
      kind: watch.primaryImage.kind,
      alt: watch.primaryImage.alt,
      isProminent,
    },
    issue,
    decision,
  };
}

export function buildCatalogImageAudit(dataset: CatalogReadDataset): CatalogImageAuditReport {
  const entries = dataset.watches.map(auditWatch);

  return {
    generatedAt: new Date().toISOString(),
    totalWatches: entries.length,
    withNoImage: entries.filter((entry) => entry.issue === "no_image").length,
    withOnlyTechnicalAngle: entries.filter((entry) => entry.issue === "only_technical_angle_available").length,
    primaryReselectedCount: entries.filter((entry) => entry.issue === "primary_reselected_from_gallery").length,
    entries,
  };
}

function countGalleryBuckets(entries: CatalogImageAuditEntry[]): Record<number, number> {
  const buckets: Record<number, number> = {};
  for (const entry of entries) {
    buckets[entry.galleryCount] = (buckets[entry.galleryCount] ?? 0) + 1;
  }
  return buckets;
}

const referenceNoiseIndicators = ["бля", "повtор", "повтор", "одни и", "хз", "жду"];

function findReferenceNoise(entries: CatalogImageAuditEntry[]): CatalogImageAuditEntry[] {
  return entries.filter((entry) =>
    referenceNoiseIndicators.some((indicator) => entry.referenceDisplay.toLocaleLowerCase("ru").includes(indicator)),
  );
}

export function renderCatalogImageAuditMarkdown(report: CatalogImageAuditReport): string {
  const lines: string[] = [];
  lines.push("# Catalog Image Audit");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(
    "Regenerate with `npx tsx src/modules/catalog/cli/catalog-image-audit.ts` (no package.json script was added, per this phase's scope). " +
      "Reads the exact same `imports/generated/catalog-import-preview.json` / `catalog-image-upload-plan.json` and the exact same " +
      "`catalogReadDatasetFromPreview` adapter the production catalog pages use, so this audit reflects real, currently-served data — not a sample or mock.",
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total public watches audited: ${report.totalWatches}`);
  lines.push(`- Watches with no image at all: ${report.withNoImage}`);
  lines.push(`- Watches where every available image is a likely technical angle (back/clasp/side): ${report.withOnlyTechnicalAngle}`);
  lines.push(`- Watches where the Phase 2 front-image-preference fix changed the selected primary image: ${report.primaryReselectedCount}`);
  const buckets = countGalleryBuckets(report.entries);
  lines.push(
    `- Gallery size distribution among watches with at least one image: ${Object.entries(buckets)
      .filter(([count]) => Number(count) > 0)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([count, n]) => `${count} image(s): ${n} watches`)
      .join(", ")}`,
  );
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push(
    "Every watch's own image gallery (never another reference's images) is scored with the existing, already-approved heuristic in `catalog-image-presentation-policy.ts` " +
      "(`isLikelyTechnicalAngle` / `isProminentCatalogImage`), which reads alt-text keywords (`caseback`, `clasp`, `side`, `задн`, `крышк`, `застёж`, `вид сбоку`) and photo " +
      "order (index ≥ 4 defaults to technical) — the same logic already trusted for the watch detail hero image. No AI classification, no new heuristic, no cross-reference " +
      "substitution, no upscaling.",
  );
  lines.push("");
  lines.push("## Rules followed (Phase 2 task requirements)");
  lines.push("");
  lines.push("1. If an exact front image is already available in the current data, it is used as primary — implemented in `preview-catalog-adapter.ts` via `selectBestCatalogHeroImage`.");
  lines.push("2. A back view is never chosen as primary when a front view is available in the same gallery.");
  lines.push("3. A side/angle view is never chosen as primary when a front view is available in the same gallery.");
  lines.push("4. No image is ever taken from a different reference's gallery — `imageGalleryForCandidate` filters strictly by `candidateId`, unchanged this phase.");
  lines.push("5. No image is artificially upscaled — only CSS containment/composition, never dimension manipulation of the source file.");
  lines.push("6. No AI classification or new unverified heuristic was introduced — this audit reuses the existing, already-shipped alt-text/order heuristic verbatim.");
  lines.push("7. The Catalog Read Repository contract was not rewritten — `CatalogWatchCard.primaryImage` keeps the exact same type; only its selection logic in the infrastructure adapter changed.");
  lines.push("8. Unresolved watches (no image, or only technical-angle images) are listed below, not silently hidden or fabricated.");
  lines.push("");

  if (report.withNoImage > 0) {
    lines.push("## Watches with no image (unresolved — flagged, not fixed this phase)");
    lines.push("");
    lines.push("| Brand | Reference | URL |");
    lines.push("| --- | --- | --- |");
    for (const entry of report.entries.filter((item) => item.issue === "no_image")) {
      lines.push(`| ${entry.brandName} | ${entry.referenceDisplay} | ${entry.href} |`);
    }
    lines.push("");
  }

  if (report.withOnlyTechnicalAngle > 0) {
    lines.push("## Watches where only technical-angle images are available (unresolved — flagged, not fixed this phase)");
    lines.push("");
    lines.push("| Brand | Reference | Images | URL |");
    lines.push("| --- | --- | --- | --- |");
    for (const entry of report.entries.filter((item) => item.issue === "only_technical_angle_available")) {
      lines.push(`| ${entry.brandName} | ${entry.referenceDisplay} | ${entry.galleryCount} | ${entry.href} |`);
    }
    lines.push("");
  }

  if (report.primaryReselectedCount > 0) {
    lines.push("## Watches where the front-image-preference fix changed the primary image");
    lines.push("");
    lines.push("| Brand | Reference | Decision | URL |");
    lines.push("| --- | --- | --- | --- |");
    for (const entry of report.entries.filter((item) => item.issue === "primary_reselected_from_gallery")) {
      lines.push(`| ${entry.brandName} | ${entry.referenceDisplay} | ${entry.decision} | ${entry.href} |`);
    }
    lines.push("");
  }

  const referenceNoise = findReferenceNoise(report.entries);
  if (referenceNoise.length > 0) {
    lines.push("## Other data-quality observation (not an image issue, flagged for the import owner)");
    lines.push("");
    lines.push(
      "While building this audit, a small number of public `referenceDisplay` values were found to contain what look like leftover " +
        "source-spreadsheet reviewer notes/typos (e.g. Russian words meaning \"duplicate\" or \"same ones\") rather than a clean manufacturer " +
        "reference. These render as-is on the live catalog cards and detail pages today. This is a source-data/import quality issue, not an " +
        "image-selection issue, and `src/modules/imports/**` is out of scope for this catalog-list worktree — flagged here for whoever owns the " +
        "import pipeline.",
    );
    lines.push("");
    lines.push("| Brand | Reference (as shown publicly) | URL |");
    lines.push("| --- | --- | --- |");
    for (const entry of referenceNoise) {
      lines.push(`| ${entry.brandName} | ${entry.referenceDisplay} | ${entry.href} |`);
    }
    lines.push("");
  }

  lines.push("## Generated artifacts");
  lines.push("");
  lines.push("- `public/generated/catalog-review/catalog-image-audit.json` — full machine-readable audit (every watch, not just the issues above).");
  lines.push(
    "- `public/generated/catalog-review/catalog-first-page-contact-sheet.html` — an HTML contact sheet (not a flattened JPEG) for the first 48 watches in default order. " +
      "A rasterized JPEG montage would require adding an image-processing dependency (sharp/canvas/jimp); this phase's instructions explicitly disallow adding heavy " +
      "dependencies, so an HTML review page was used instead. Open it through the running dev server so `development_zip` image sources resolve.",
  );
  lines.push("- Neither artifact is linked from, or reachable through, any production page or navigation.");
  lines.push("");

  return lines.join("\n");
}
