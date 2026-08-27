import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CitizenOfficialPhotoManifest, CitizenOfficialPhotoManifestEntry } from "@/modules/catalog/infrastructure/citizen-official-photo-types";
import type { SeikoOfficialPhotoManifest, SeikoOfficialPhotoManifestEntry } from "@/modules/catalog/infrastructure/seiko-official-photo-types";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts", "catalog-citizen-seiko-final-audit");

type AuditBrand = "citizen" | "seiko";
type OfficialEntry = CitizenOfficialPhotoManifestEntry | SeikoOfficialPhotoManifestEntry;

type PrimaryAuditRow = {
  brand: AuditBrand;
  reference: string;
  normalized_reference: string;
  image_count: number;
  primary_image: string | null;
  primary_role: OfficialEntry["view"] | "none" | "unknown";
  front_available: boolean;
  source: "Citizen" | "Seiko" | "none";
  status: string;
  warning: string | null;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8")) as T;
}

function imageSrc(image: CatalogImagePresentation): string | null {
  return image.kind === "none" ? null : image.src;
}

function isPurchasable(watch: CatalogWatchDetail): boolean {
  return Boolean(
    watch.publicPrice &&
      watch.publicPrice.currencyCode === "RUB" &&
      Number.isInteger(watch.publicPrice.amountMinor) &&
      watch.publicPrice.amountMinor > 0,
  );
}

function statusCounts<T extends { status: string }>(items: T[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}

function duplicateBrandScopedReferences(dataset: CatalogReadDataset): Array<{ key: string; count: number; ids: string[] }> {
  const byKey = new Map<string, CatalogWatchDetail[]>();
  for (const watch of dataset.watches) {
    const key = `${watch.brandSlug}:${watch.referenceNormalized}`;
    byKey.set(key, [...(byKey.get(key) ?? []), watch]);
  }

  return [...byKey.entries()]
    .filter(([, watches]) => watches.length > 1)
    .map(([key, watches]) => ({ key, count: watches.length, ids: watches.map((watch) => watch.id) }));
}

function globalReferenceCollisions(dataset: CatalogReadDataset): Array<{ reference: string; brands: string[]; ids: string[] }> {
  const byReference = new Map<string, CatalogWatchDetail[]>();
  for (const watch of dataset.watches) {
    byReference.set(watch.referenceNormalized, [...(byReference.get(watch.referenceNormalized) ?? []), watch]);
  }

  return [...byReference.entries()]
    .filter(([, watches]) => new Set(watches.map((watch) => watch.brandSlug)).size > 1)
    .map(([reference, watches]) => ({
      reference,
      brands: [...new Set(watches.map((watch) => watch.brandSlug))].sort(),
      ids: watches.map((watch) => watch.id),
    }));
}

function officialEntriesByReference(entries: OfficialEntry[]): Map<string, OfficialEntry[]> {
  const byReference = new Map<string, OfficialEntry[]>();
  for (const entry of entries) {
    byReference.set(entry.referenceNormalized, [...(byReference.get(entry.referenceNormalized) ?? []), entry]);
  }
  return byReference;
}

function primaryAuditRows(input: {
  brand: AuditBrand;
  watches: CatalogWatchDetail[];
  entries: OfficialEntry[];
  statuses: Map<string, string>;
}): PrimaryAuditRow[] {
  const entriesByReference = officialEntriesByReference(input.entries);

  return input.watches
    .map((watch) => {
      const entries = entriesByReference.get(watch.referenceNormalized) ?? [];
      const coverEntry = entries.find((entry) => entry.isCover) ?? entries[0] ?? null;
      const frontAvailable = entries.some((entry) => entry.view === "front");
      const primary = imageSrc(watch.primaryImage);
      const primaryEntry = primary ? entries.find((entry) => entry.publicPath === primary) ?? null : null;
      const primaryRole: PrimaryAuditRow["primary_role"] = primaryEntry?.view ?? (primary ? "unknown" : "none");
      const wrongPrimary =
        frontAvailable &&
        primary !== null &&
        primaryRole !== "front" &&
        (primaryRole === "caseback" || primaryRole === "detail" || primaryRole === "lifestyle" || primaryRole === "side");
      const crossModelWarning =
        primaryEntry && primaryEntry.referenceNormalized !== watch.referenceNormalized
          ? `primary belongs to ${primaryEntry.referenceNormalized}`
          : null;

      return {
        brand: input.brand,
        reference: watch.referenceDisplay,
        normalized_reference: watch.referenceNormalized,
        image_count: entries.length,
        primary_image: primary,
        primary_role: primaryRole,
        front_available: frontAvailable,
        source: coverEntry?.officialSource ?? "none",
        status: input.statuses.get(watch.referenceNormalized) ?? "not_in_manifest",
        warning: crossModelWarning ?? (wrongPrimary ? `front exists but primary is ${primaryRole}` : null),
      };
    })
    .sort((left, right) => left.reference.localeCompare(right.reference));
}

function specCoverage(watches: CatalogWatchDetail[]): Record<string, number> {
  const wanted = new Set([
    "movement_raw",
    "movement_type_raw",
    "caliber_raw",
    "case_material_raw",
    "case_diameter_raw",
    "case_dimensions_raw",
    "crystal_type_raw",
    "water_resistance_raw",
    "bracelet_material_raw",
    "strap_material_raw",
    "dial_color_raw",
    "functions_raw",
    "power_reserve_raw",
    "battery_life_raw",
  ]);

  const coverage: Record<string, number> = {};
  for (const watch of watches) {
    for (const spec of watch.specifications) {
      if (wanted.has(spec.key)) {
        coverage[spec.key] = (coverage[spec.key] ?? 0) + 1;
      }
    }
  }
  return Object.fromEntries(Object.entries(coverage).sort(([left], [right]) => left.localeCompare(right)));
}

function writeAuditMarkdown(report: {
  generatedAt: string;
  citizen: {
    total: number;
    images: number;
    withImages: number;
    withoutImages: string[];
    manualReview: string[];
    statuses: Record<string, number>;
  };
  seiko: {
    total: number;
    images: number;
    withImages: number;
    withoutImages: string[];
    withoutRubPrice: number;
    purchasableWithoutRubPrice: string[];
    statuses: Record<string, number>;
  };
  catalog: {
    total: number;
    duplicateBrandScopedReferences: Array<{ key: string; count: number; ids: string[] }>;
    globalReferenceCollisions: Array<{ reference: string; brands: string[]; ids: string[] }>;
  };
  primaryAudit: PrimaryAuditRow[];
  specCoverage: Record<AuditBrand, Record<string, number>>;
}) {
  const lines = [
    "# Citizen + Seiko final staged audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Citizen",
    "",
    `- Total: ${report.citizen.total}`,
    `- Official images: ${report.citizen.images}`,
    `- With images: ${report.citizen.withImages}`,
    `- Without images: ${report.citizen.withoutImages.length}`,
    `- Manual review: ${report.citizen.manualReview.length}`,
    `- Statuses: ${JSON.stringify(report.citizen.statuses)}`,
    "",
    "## Seiko",
    "",
    `- Total: ${report.seiko.total}`,
    `- Official images: ${report.seiko.images}`,
    `- With images: ${report.seiko.withImages}`,
    `- Without images: ${report.seiko.withoutImages.length}`,
    `- Without RUB price: ${report.seiko.withoutRubPrice}`,
    `- Purchasable without RUB price: ${report.seiko.purchasableWithoutRubPrice.length}`,
    `- Statuses: ${JSON.stringify(report.seiko.statuses)}`,
    "",
    "## Catalog",
    "",
    `- Total staged public read models: ${report.catalog.total}`,
    `- Brand-scoped duplicate references: ${report.catalog.duplicateBrandScopedReferences.length}`,
    `- Cross-brand normalized reference collisions: ${report.catalog.globalReferenceCollisions.length}`,
    "",
    "## Seiko without verified official image",
    "",
    ...report.seiko.withoutImages.map((reference) => `- ${reference}`),
    "",
    "## Citizen manual review",
    "",
    ...report.citizen.manualReview.map((reference) => `- ${reference}`),
    "",
    "## Primary image warnings",
    "",
    ...report.primaryAudit.filter((row) => row.warning).map((row) => `- ${row.brand} ${row.reference}: ${row.warning}`),
  ];

  writeFileSync(path.join(artifactDir, "catalog-citizen-seiko-final-audit.md"), `${lines.join("\n")}\n`);
}

function main() {
  const preview = readJson<CatalogImportPreview>("imports/generated/catalog-import-preview.json");
  const imagePlan = readJson<CatalogImageUploadPlan>("imports/generated/catalog-image-upload-plan.json");
  const citizenManifest = readJson<CitizenOfficialPhotoManifest>("src/content/catalog/citizen-official-photo-manifest.json");
  const seikoManifest = readJson<SeikoOfficialPhotoManifest>("src/content/catalog/seiko-official-photo-manifest.json");
  const dataset = catalogReadDatasetFromPreview({
    preview,
    imagePlan,
    citizenOfficialPhotoManifest: citizenManifest,
    seikoOfficialPhotoManifest: seikoManifest,
  });

  const citizen = dataset.watches.filter((watch) => watch.brandSlug === "citizen");
  const seiko = dataset.watches.filter((watch) => watch.brandSlug === "seiko");
  const citizenStatus = new Map(citizenManifest.models.map((model) => [model.referenceNormalized, model.status]));
  const seikoStatus = new Map(seikoManifest.models.map((model) => [model.referenceNormalized, model.status]));
  const citizenWithoutImages = citizen.filter((watch) => watch.primaryImage.kind === "none").map((watch) => watch.referenceDisplay).sort();
  const seikoWithoutImages = seiko.filter((watch) => watch.primaryImage.kind === "none").map((watch) => watch.referenceDisplay).sort();
  const seikoWithoutRubPrice = seiko.filter((watch) => watch.publicPrice === null);
  const seikoPurchasableWithoutRubPrice = seikoWithoutRubPrice.filter(isPurchasable).map((watch) => watch.referenceDisplay).sort();
  const primaryAudit = [
    ...primaryAuditRows({
      brand: "citizen",
      watches: citizen,
      entries: citizenManifest.entries,
      statuses: citizenStatus,
    }),
    ...primaryAuditRows({
      brand: "seiko",
      watches: seiko,
      entries: seikoManifest.entries,
      statuses: seikoStatus,
    }),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    citizen: {
      total: citizen.length,
      images: citizenManifest.entries.length,
      withImages: citizen.filter((watch) => watch.primaryImage.kind !== "none").length,
      withoutImages: citizenWithoutImages,
      manualReview: citizenManifest.models.filter((model) => model.status === "manual_review").map((model) => model.reference).sort(),
      statuses: statusCounts(citizenManifest.models),
    },
    seiko: {
      total: seiko.length,
      images: seikoManifest.entries.length,
      withImages: seiko.filter((watch) => watch.primaryImage.kind !== "none").length,
      withoutImages: seikoWithoutImages,
      withoutRubPrice: seikoWithoutRubPrice.length,
      purchasableWithoutRubPrice: seikoPurchasableWithoutRubPrice,
      statuses: statusCounts(seikoManifest.models),
    },
    catalog: {
      total: dataset.watches.length,
      duplicateBrandScopedReferences: duplicateBrandScopedReferences(dataset),
      globalReferenceCollisions: globalReferenceCollisions(dataset),
    },
    primaryAudit,
    specCoverage: {
      citizen: specCoverage(citizen),
      seiko: specCoverage(seiko),
    },
    files: {
      citizenManifest: "src/content/catalog/citizen-official-photo-manifest.json",
      seikoManifest: "src/content/catalog/seiko-official-photo-manifest.json",
      citizenAssetsExist: existsSync(path.join(projectRoot, "public/generated/catalog/citizen-official")),
      seikoAssetsExist: existsSync(path.join(projectRoot, "public/generated/catalog/seiko-official")),
    },
  };

  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(path.join(artifactDir, "catalog-citizen-seiko-final-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeAuditMarkdown(report);

  console.log(`CITIZEN_TOTAL=${report.citizen.total}`);
  console.log(`CITIZEN_IMAGES=${report.citizen.images}`);
  console.log(`CITIZEN_MANUAL_REVIEW=${report.citizen.manualReview.length}`);
  console.log(`SEIKO_TOTAL=${report.seiko.total}`);
  console.log(`SEIKO_IMAGES=${report.seiko.images}`);
  console.log(`SEIKO_WITHOUT_IMAGES=${report.seiko.withoutImages.length}`);
  console.log(`SEIKO_WITHOUT_RUB_PRICE=${report.seiko.withoutRubPrice}`);
  console.log(`SEIKO_WITHOUT_RUB_PRICE_PURCHASABLE=${report.seiko.purchasableWithoutRubPrice.length}`);
  console.log(`BRAND_SCOPED_DUPLICATES=${report.catalog.duplicateBrandScopedReferences.length}`);
  console.log(`PRIMARY_WARNINGS=${report.primaryAudit.filter((row) => row.warning).length}`);
  console.log(`AUDIT_JSON=${path.relative(projectRoot, path.join(artifactDir, "catalog-citizen-seiko-final-audit.json"))}`);
}

main();
