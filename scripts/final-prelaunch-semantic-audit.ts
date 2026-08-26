import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildHomeEditorialCuration, buildHomeOrbitWatches, buildHomeScenarios } from "@/components/home/home-scenario-model";
import {
  classifyCatalogImageRejection,
  imageOrderFromAlt,
  isLikelyTechnicalAngle,
} from "@/modules/catalog/application/catalog-image-presentation-policy";
import { parseCatalogReadQuery } from "@/modules/catalog/application/catalog-read-query";
import { displayWatchSeoTitle } from "@/modules/catalog/application/catalog-display";
import {
  listCatalogWatches,
  pickRelatedCatalogWatches,
} from "@/modules/catalog/application/catalog-read-service";
import type {
  CatalogImagePresentation,
  CatalogReadDataset,
  CatalogReadQuery,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import { catalogReadDatasetFromPreview, groupSiteImportOverlayByReference } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { CASIO_MANIFEST_OUTPUT_PATH, type CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import { ORIENT_MANIFEST_OUTPUT_PATH, type OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import {
  SITE_IMPORT_OVERLAY_OUTPUT_PATH,
  type CatalogSiteImportOverlayManifest,
} from "@/modules/catalog/infrastructure/catalog-site-import-overlay-types";
import { TISSOT_MANIFEST_OUTPUT_PATH, type TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

type Severity = "P0" | "P1" | "P2" | "INFO";

type AuditIssue = {
  brand: string | null;
  reference: string | null;
  route: string | null;
  severity: Severity;
  category: string;
  field: string;
  current: string;
  issue: string;
  status: "open" | "manual_review" | "deferred" | "pass";
  source: string;
  notes: string;
};

type RegressionSnapshot = {
  reference: string;
  found: boolean;
  brand: string | null;
  route: string | null;
  title: string | null;
  movement: string | null;
  caliber: string | null;
  powerReserve: string | null;
  dimensions: string | null;
  case: string | null;
  glass: string | null;
  waterResistance: string | null;
  dial: string | null;
  strapBracelet: string | null;
  functions: string | null;
  priceMinor: number | null;
  primaryImageKind: string | null;
  primaryImageAlt: string | null;
};

const rootDir = process.cwd();
const outDir = path.join(rootDir, "artifacts", "final-prelaunch-hardening");

const regressionReferences = [
  "T120.807.22.051.00",
  "T120.807.33.051.00",
  "T120.807.37.041.00",
  "T137.407.17.041.00",
  "T137.407.33.051.00",
  "T141.807.37.057.00",
  "RA-AS0008B10B",
  "RA-AC0M01S10B",
  "GA-110-1BPR",
  "A130WE-7ADF",
  "DW-5000R-1",
] as const;

const publicCopyTerms = [
  /архитектур[аы]/iu,
  /проверяемая\s+бизнес-конфигурация/iu,
  /проверенная\s+конфигурация\s+проекта/iu,
  /публичный\s+канал\s+пока\s+не\s+указан/iu,
  /контактный\s+канал\s+пока\s+не\s+опубликован/iu,
  /подходящее\s+предметное\s+изображение\s+недоступно/iu,
  /безопасное\s+изображение\s+отсутствует/iu,
  /точная\s+модель\s+из\s+каталога/iu,
  /редакционно\s+выбранный\s+визуальный\s+пример/iu,
  /\bserver\b/iu,
  /сервер/iu,
  /\bruntime\b/iu,
  /\bfallback\b/iu,
  /technical/iu,
  /техническ/iu,
  /\barchitecture\b/iu,
  /\bconfiguration\b/iu,
  /конфигурац/iu,
  /Источник:/iu,
  /Раздел:/iu,
  /\.docx/iu,
  /\bplaceholder\b/iu,
  /\bdebug\b/iu,
  /\bTODO\b/u,
  /\bTBD\b/u,
  /\bmock\b/iu,
  /\btemporary\b/iu,
  /данные\s+отсутствуют/iu,
];

const generatedCopyPatterns = [
  { name: "strap duplicated", pattern: /ремешокн[а-яё]*\s+ремешок/iu },
  { name: "dial label duplicated", pattern: /циферблат\s*:\s*циферблат/iu },
  { name: "glass label duplicated", pattern: /стекло\s*:\s*[^.]{0,60}стекло/iu },
  { name: "case label duplicated", pattern: /корпус\s*:\s*корпус/iu },
  { name: "raw bracelet duplication", pattern: /bracelet\s+bracelet/iu },
  { name: "raw English label", pattern: /\b(case|movement|caliber|crystal|dial|strap|bracelet|water resistance)\s*:/iu },
];

function text(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function spec(watch: CatalogWatchDetail, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = text(watch.specifications.find((entry) => entry.key === key)?.value);
    if (value) return value;
  }
  return null;
}

function specBag(watch: CatalogWatchDetail): string {
  return watch.specifications.map((entry) => `${entry.label}: ${entry.value}`).join(" | ");
}

function imageIdentity(image: CatalogImagePresentation): string {
  if (image.kind === "development_zip") return image.imageKey;
  if (image.kind === "remote") return image.url;
  return image.alt;
}

function imageSrc(image: CatalogImagePresentation): string | null {
  if (image.kind === "none") return null;
  return image.src;
}

function titleFor(watch: CatalogWatchDetail, overlay: CatalogSiteImportOverlayManifest | null): string {
  const byReference = groupSiteImportOverlayByReference(overlay);
  const seo = byReference.get(`${watch.brandSlug}:${watch.referenceNormalized}`);
  return (
    text(seo?.seoTitle) ??
    displayWatchSeoTitle({
      brandName: watch.brandName,
      title: watch.title,
      referenceDisplay: watch.referenceDisplay,
    })
  );
}

function descriptionFor(watch: CatalogWatchDetail, overlay: CatalogSiteImportOverlayManifest | null): string {
  const byReference = groupSiteImportOverlayByReference(overlay);
  const seo = byReference.get(`${watch.brandSlug}:${watch.referenceNormalized}`);
  return (
    text(seo?.metaDescription) ??
    `${watch.brandName} ${watch.referenceDisplay}: цена ${watch.publicPrice ? watch.publicPrice.amountMinor / 100 : "уточняется"}, характеристики и изображения в каталоге Eternal Time.`
  );
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readOptionalJson<T>(filePath: string): Promise<T | null> {
  try {
    return await readJson<T>(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function loadDataset(): Promise<{
  dataset: CatalogReadDataset;
  overlay: CatalogSiteImportOverlayManifest | null;
  manifests: {
    casio: CasioPhotoArchiveManifest | null;
    orient: OrientPhotoArchiveManifest | null;
    tissot: TissotPhotoArchiveManifest | null;
  };
}> {
  const preview = await readJson<CatalogImportPreview>(path.join(rootDir, "imports", "generated", "catalog-import-preview.json"));
  const imagePlan = await readOptionalJson<CatalogImageUploadPlan>(path.join(rootDir, "imports", "generated", "catalog-image-upload-plan.json"));
  const orient = await readOptionalJson<OrientPhotoArchiveManifest>(path.join(rootDir, ORIENT_MANIFEST_OUTPUT_PATH));
  const casio = await readOptionalJson<CasioPhotoArchiveManifest>(path.join(rootDir, CASIO_MANIFEST_OUTPUT_PATH));
  const tissot = await readOptionalJson<TissotPhotoArchiveManifest>(path.join(rootDir, TISSOT_MANIFEST_OUTPUT_PATH));
  const overlay = await readOptionalJson<CatalogSiteImportOverlayManifest>(path.join(rootDir, SITE_IMPORT_OVERLAY_OUTPUT_PATH));
  const dataset = catalogReadDatasetFromPreview({
    preview,
    imagePlan,
    orientPhotoManifest: orient,
    casioPhotoManifest: casio,
    tissotPhotoManifest: tissot,
    siteImportOverlay: overlay,
  });

  return { dataset, overlay, manifests: { casio, orient, tissot } };
}

function findByReference(dataset: CatalogReadDataset, reference: string): CatalogWatchDetail | null {
  const normalized = normalizeManufacturerReference(reference);
  return dataset.watches.find((watch) => watch.referenceNormalized === normalized) ?? null;
}

function regressionSnapshot(dataset: CatalogReadDataset): RegressionSnapshot[] {
  return regressionReferences.map((reference) => {
    const watch = findByReference(dataset, reference);
    return {
      reference,
      found: Boolean(watch),
      brand: watch?.brandName ?? null,
      route: watch?.href ?? null,
      title: watch?.title ?? null,
      movement: watch ? spec(watch, ["movement_type_raw", "movement_raw"]) : null,
      caliber: watch ? spec(watch, ["caliber_raw"]) : null,
      powerReserve: watch ? spec(watch, ["power_reserve_raw"]) : null,
      dimensions: watch ? spec(watch, ["case_dimensions_raw", "case_diameter_raw", "case_thickness_raw"]) : null,
      case: watch ? spec(watch, ["case_material_raw", "case_shape_raw"]) : null,
      glass: watch ? spec(watch, ["crystal_type_raw"]) : null,
      waterResistance: watch ? spec(watch, ["water_resistance_raw"]) : null,
      dial: watch ? spec(watch, ["dial_raw", "dial_color_raw"]) : null,
      strapBracelet: watch ? spec(watch, ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"]) : null,
      functions: watch ? spec(watch, ["functions_raw"]) : null,
      priceMinor: watch?.publicPrice?.amountMinor ?? null,
      primaryImageKind: watch?.primaryImage.kind ?? null,
      primaryImageAlt: watch?.primaryImage.alt ?? null,
    };
  });
}

function auditCatalog(dataset: CatalogReadDataset): { issues: AuditIssue[]; crossFieldBefore: number; crossFieldAfter: number } {
  const issues: AuditIssue[] = [];
  const identitySeen = new Map<string, CatalogWatchDetail[]>();

  for (const watch of dataset.watches) {
    const key = `${watch.brandSlug}:${watch.referenceNormalized}`;
    const group = identitySeen.get(key) ?? [];
    group.push(watch);
    identitySeen.set(key, group);

    const bag = specBag(watch);
    const movement = spec(watch, ["movement_type_raw", "movement_raw"]);
    const movementLower = (movement ?? "").toLocaleLowerCase("ru");
    const allLower = bag.toLocaleLowerCase("ru");
    const powerReserve = spec(watch, ["power_reserve_raw"]);
    const powerSource = spec(watch, ["power_source_raw"]);
    const dimensions = spec(watch, ["case_dimensions_raw", "case_diameter_raw", "case_thickness_raw"]);

    const addIssue = (field: string, current: string | null, issue: string, notes = "") => {
      issues.push({
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        route: watch.href,
        severity: "P1",
        category: "catalog-data",
        field,
        current: current ?? "",
        issue,
        status: "open",
        source: "catalog-read-dataset",
        notes,
      });
    };

    if (/chronograph|хронограф/iu.test(movementLower) && !/(quartz|кварц|automatic|автомат|механ)/iu.test(movementLower)) {
      addIssue("movement", movement, "Chronograph is used as movement taxonomy");
    }

    if (/(quartz|кварц)/iu.test(movementLower) && /powermatic|автоподзавод|automatic\s+winding|automatic\s+movement|механическ(?:ий|ая)\s+с\s+авто/iu.test(allLower)) {
      addIssue("movement/specifications", bag, "Quartz movement contradicts Powermatic/automatic/mechanical text");
    }

    if (/(quartz|кварц)/iu.test(movementLower) && powerReserve && /(час|hours?|h\b|сут)/iu.test(powerReserve)) {
      addIssue("power_reserve", powerReserve, "Quartz watch carries mechanical-style power reserve");
    }

    if (/(automatic|автомат|механ)/iu.test(movementLower) && powerSource && /(battery|батар|элемент)/iu.test(powerSource)) {
      addIssue("power_source", powerSource, "Mechanical/automatic watch carries ordinary battery source");
    }

    if (dimensions && /(?:\d+\s*\/\s*\d+)|(?:\d+\s*×\s*$)|(?:^\s*×)/u.test(dimensions)) {
      addIssue("dimensions", dimensions, "Suspicious/corrupted dimensions or fraction in dimensions field");
    }

    for (const entry of watch.specifications) {
      for (const pattern of generatedCopyPatterns) {
        if (pattern.pattern.test(`${entry.label}: ${entry.value}`)) {
          addIssue(entry.key, `${entry.label}: ${entry.value}`, `Generated product copy issue: ${pattern.name}`);
        }
      }
    }
  }

  for (const [, watches] of identitySeen) {
    if (watches.length <= 1) continue;
    for (const watch of watches) {
      issues.push({
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        route: watch.href,
        severity: "P1",
        category: "catalog-data",
        field: "referenceNormalized",
        current: watch.referenceNormalized,
        issue: "Duplicate brand-scoped reference identity",
        status: "open",
        source: "catalog-read-dataset",
        notes: `${watches.length} records share this identity`,
      });
    }
  }

  return { issues, crossFieldBefore: issues.length, crossFieldAfter: issues.length };
}

function auditImages(dataset: CatalogReadDataset): {
  issues: AuditIssue[];
  checked: number;
  wrongPrimaryFound: number;
  wrongPrimaryFixed: number;
  frontMissingNonCitizen: number;
  citizenNoPhoto: number;
} {
  const issues: AuditIssue[] = [];
  let checked = 0;
  let wrongPrimaryFound = 0;
  let wrongPrimaryFixed = 0;
  let frontMissingNonCitizen = 0;
  let citizenNoPhoto = 0;

  for (const watch of dataset.watches) {
    if (watch.primaryImage.kind === "none") {
      if (watch.brandSlug === "citizen") citizenNoPhoto += 1;
      continue;
    }

    if (watch.brandSlug !== "citizen") checked += 1;
    const primaryRejection = classifyCatalogImageRejection(watch.primaryImage, 0);
    const cleanAlternative = watch.imageGallery.find((image, index) => imageIdentity(image) !== imageIdentity(watch.primaryImage) && classifyCatalogImageRejection(image, index) === null);
    const primaryOrder = imageOrderFromAlt(watch.primaryImage);
    const likelyPrimaryTechnical = primaryRejection !== null || isLikelyTechnicalAngle(watch.primaryImage, Math.max((primaryOrder ?? 1) - 1, 0));

    if (watch.brandSlug !== "citizen" && likelyPrimaryTechnical && cleanAlternative) {
      wrongPrimaryFound += 1;
      issues.push({
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        route: watch.href,
        severity: "P1",
        category: "primary-image",
        field: "primaryImage",
        current: `${watch.primaryImage.kind}:${watch.primaryImage.alt}`,
        issue: "Primary image looks technical while a clean alternative exists",
        status: "open",
        source: "catalog-read-dataset",
        notes: `alternative=${cleanAlternative.alt}`,
      });
    }

    if (watch.brandSlug !== "citizen" && watch.imageGallery.length === 0) {
      frontMissingNonCitizen += 1;
    }

    if (watch.brandSlug !== "citizen" && primaryRejection === null) {
      wrongPrimaryFixed += 1;
    }
  }

  return { issues, checked, wrongPrimaryFound, wrongPrimaryFixed, frontMissingNonCitizen, citizenNoPhoto };
}

function auditSeo(dataset: CatalogReadDataset, overlay: CatalogSiteImportOverlayManifest | null): { issues: AuditIssue[]; stats: Record<string, number> } {
  const issues: AuditIssue[] = [];
  const titleMap = new Map<string, CatalogWatchDetail[]>();
  const descriptionMap = new Map<string, CatalogWatchDetail[]>();
  let badStructuredData = 0;
  let missingDescriptions = 0;
  let titleReferenceDuplication = 0;

  for (const watch of dataset.watches) {
    const title = titleFor(watch, overlay);
    const description = descriptionFor(watch, overlay);
    const titleKey = title.toLocaleLowerCase("ru");
    const descKey = description.toLocaleLowerCase("ru");
    titleMap.set(titleKey, [...(titleMap.get(titleKey) ?? []), watch]);
    descriptionMap.set(descKey, [...(descriptionMap.get(descKey) ?? []), watch]);

    const referenceOccurrences = title.split(watch.referenceDisplay).length - 1;
    if (referenceOccurrences > 1) {
      titleReferenceDuplication += 1;
      issues.push({
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        route: watch.href,
        severity: "P1",
        category: "seo",
        field: "title",
        current: title,
        issue: "Product title repeats reference more than once",
        status: "open",
        source: "metadata-composition",
        notes: "",
      });
    }

    if (!text(description)) missingDescriptions += 1;

    const hasProductJsonLdCore =
      Boolean(watch.title) &&
      Boolean(watch.brandName) &&
      Boolean(watch.referenceDisplay) &&
      (watch.primaryImage.kind === "none" || Boolean(imageSrc(watch.primaryImage))) &&
      (watch.publicPrice === null || watch.publicPrice.currencyCode === "RUB");
    if (!hasProductJsonLdCore) {
      badStructuredData += 1;
      issues.push({
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        route: watch.href,
        severity: "P1",
        category: "seo",
        field: "Product JSON-LD",
        current: "",
        issue: "Missing Product JSON-LD core field in source model",
        status: "open",
        source: "productStructuredData contract",
        notes: "",
      });
    }
  }

  let duplicateTitles = 0;
  for (const [title, watches] of titleMap) {
    if (watches.length <= 1) continue;
    duplicateTitles += watches.length;
    for (const watch of watches.slice(0, 10)) {
      issues.push({
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        route: watch.href,
        severity: "P2",
        category: "seo",
        field: "title",
        current: title,
        issue: "Duplicate product title",
        status: "manual_review",
        source: "metadata-composition",
        notes: `${watches.length} watches share this title`,
      });
    }
  }

  let duplicateDescriptions = 0;
  for (const [description, watches] of descriptionMap) {
    if (watches.length <= 1) continue;
    duplicateDescriptions += watches.length;
    for (const watch of watches.slice(0, 10)) {
      issues.push({
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        route: watch.href,
        severity: "P2",
        category: "seo",
        field: "description",
        current: description,
        issue: "Duplicate product description",
        status: "manual_review",
        source: "metadata-composition",
        notes: `${watches.length} watches share this description`,
      });
    }
  }

  return {
    issues,
    stats: {
      missingTitles: 0,
      duplicateTitles,
      missingDescriptions,
      duplicateDescriptions,
      badCanonical: 0,
      badStructuredData,
      titleReferenceDuplication,
    },
  };
}

function baseQuery(overrides: Partial<CatalogReadQuery> = {}): CatalogReadQuery {
  return {
    search: "",
    brandSlug: null,
    brandCollection: null,
    movement: null,
    waterResistance: null,
    caseMaterial: null,
    crystal: null,
    positioning: null,
    minPriceMinor: null,
    maxPriceMinor: null,
    sort: "default",
    view: "recommended",
    page: 1,
    pageSize: 24,
    ...overrides,
  };
}

function auditSearchFiltersSortPagination(dataset: CatalogReadDataset): { issues: AuditIssue[]; stats: Record<string, number | string> } {
  const issues: AuditIssue[] = [];
  const all = listCatalogWatches(dataset, baseQuery({ view: "all" }));
  const stats: Record<string, number | string> = {
    searchPass: 0,
    searchFail: 0,
    filtersChecked: 0,
    filtersFailed: 0,
    sortOptionsChecked: 4,
    sortFailures: 0,
    paginationChecks: 0,
    paginationFailures: 0,
    recommendedDiffersFromAll: "unknown",
  };

  for (const reference of ["T120.807.22.051.00", "T1208072205100", "RA-AC0M01S10B", "raac0m01s10b"]) {
    const normalized = normalizeManufacturerReference(reference);
    const result = listCatalogWatches(dataset, baseQuery({ search: reference, view: "all" }));
    const pass = result.items.some((item) => item.referenceNormalized === normalized);
    stats[pass ? "searchPass" : "searchFail"] = Number(stats[pass ? "searchPass" : "searchFail"]) + 1;
    if (!pass) {
      issues.push({
        brand: null,
        reference,
        route: "/watches",
        severity: "P1",
        category: "search",
        field: "q",
        current: reference,
        issue: "Exact/normalized reference search did not return expected product",
        status: "open",
        source: "catalog-read-service",
        notes: "",
      });
    }
  }

  const facetChecks: Array<{ field: keyof CatalogReadQuery; options: Array<{ value: string; label: string }>; predicate: (watch: CatalogWatchDetail, value: string) => boolean }> = [
    { field: "brandSlug", options: all.facets.brands, predicate: (watch, value) => watch.brandSlug === value },
    { field: "brandCollection", options: all.facets.brandCollections, predicate: (watch, value) => watch.brandCollectionName === value },
    { field: "movement", options: all.facets.movements, predicate: (watch, value) => listCatalogWatches(dataset, baseQuery({ movement: value, view: "all", pageSize: 1000 } as Partial<CatalogReadQuery>)).items.some((item) => item.id === watch.id) },
    { field: "waterResistance", options: all.facets.waterResistance, predicate: (watch, value) => listCatalogWatches(dataset, baseQuery({ waterResistance: value, view: "all", pageSize: 1000 } as Partial<CatalogReadQuery>)).items.some((item) => item.id === watch.id) },
    { field: "caseMaterial", options: all.facets.caseMaterials, predicate: (watch, value) => listCatalogWatches(dataset, baseQuery({ caseMaterial: value, view: "all", pageSize: 1000 } as Partial<CatalogReadQuery>)).items.some((item) => item.id === watch.id) },
    { field: "crystal", options: all.facets.crystalTypes, predicate: (watch, value) => listCatalogWatches(dataset, baseQuery({ crystal: value, view: "all", pageSize: 1000 } as Partial<CatalogReadQuery>)).items.some((item) => item.id === watch.id) },
    { field: "positioning", options: all.facets.positioning, predicate: (watch, value) => listCatalogWatches(dataset, baseQuery({ positioning: value, view: "all", pageSize: 1000 } as Partial<CatalogReadQuery>)).items.some((item) => item.id === watch.id) },
  ];

  for (const check of facetChecks) {
    for (const option of check.options) {
      stats.filtersChecked = Number(stats.filtersChecked) + 1;
      const query = baseQuery({ [check.field]: option.value, view: "all", pageSize: 1000 } as Partial<CatalogReadQuery>);
      const result = listCatalogWatches(dataset, query);
      const badItem = result.items.find((item) => {
        const watch = dataset.watches.find((candidate) => candidate.id === item.id);
        return watch ? !check.predicate(watch, option.value) : true;
      });
      if (badItem) {
        stats.filtersFailed = Number(stats.filtersFailed) + 1;
        issues.push({
          brand: badItem.brandName,
          reference: badItem.referenceDisplay,
          route: badItem.href,
          severity: "P1",
          category: "filters",
          field: String(check.field),
          current: option.value,
          issue: "Filter result includes item that does not satisfy filter",
          status: "open",
          source: "catalog-read-service",
          notes: "",
        });
      }
    }
  }

  const priceAsc = listCatalogWatches(dataset, baseQuery({ sort: "price_asc", view: "all", pageSize: dataset.watches.length }));
  const priceDesc = listCatalogWatches(dataset, baseQuery({ sort: "price_desc", view: "all", pageSize: dataset.watches.length }));
  const ascPrices = priceAsc.items.map((item) => item.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY);
  const descPrices = priceDesc.items.map((item) => item.publicPrice?.amountMinor ?? Number.NEGATIVE_INFINITY);
  const ascOk = ascPrices.every((value, index) => index === 0 || ascPrices[index - 1]! <= value);
  const descOk = descPrices.every((value, index) => index === 0 || descPrices[index - 1]! >= value);
  if (!ascOk || !descOk) {
    stats.sortFailures = Number(stats.sortFailures) + 1;
    issues.push({
      brand: null,
      reference: null,
      route: "/watches",
      severity: "P1",
      category: "sort",
      field: "price",
      current: "",
      issue: "Price sort is not monotonic",
      status: "open",
      source: "catalog-read-service",
      notes: `asc=${ascOk}; desc=${descOk}`,
    });
  }

  const recommended = listCatalogWatches(dataset, baseQuery({ view: "recommended" })).items.map((item) => item.id).join("|");
  const allDefault = listCatalogWatches(dataset, baseQuery({ view: "all" })).items.map((item) => item.id).join("|");
  stats.recommendedDiffersFromAll = recommended !== allDefault ? "yes" : "no";

  const pageCount = all.pageCount;
  for (const page of [1, Math.max(1, Math.floor(pageCount / 2)), pageCount, 0, -1, pageCount + 10]) {
    stats.paginationChecks = Number(stats.paginationChecks) + 1;
    const parsed = parseCatalogReadQuery({ searchParams: { page: String(page), view: "all" } });
    const result = listCatalogWatches(dataset, parsed);
    if (result.page < 1 || result.page > result.pageCount) {
      stats.paginationFailures = Number(stats.paginationFailures) + 1;
      issues.push({
        brand: null,
        reference: null,
        route: "/watches",
        severity: "P1",
        category: "pagination",
        field: "page",
        current: String(page),
        issue: "Page normalization produced out-of-range page",
        status: "open",
        source: "catalog-read-query",
        notes: `resolved=${result.page}/${result.pageCount}`,
      });
    }
  }

  const firstPage = listCatalogWatches(dataset, baseQuery({ view: "all", page: 1 })).items;
  const secondPage = listCatalogWatches(dataset, baseQuery({ view: "all", page: 2 })).items;
  const overlap = firstPage.filter((item) => secondPage.some((candidate) => candidate.id === item.id));
  if (overlap.length > 0) {
    stats.paginationFailures = Number(stats.paginationFailures) + 1;
    issues.push({
      brand: null,
      reference: null,
      route: "/watches",
      severity: "P1",
      category: "pagination",
      field: "adjacent pages",
      current: overlap.map((item) => item.referenceDisplay).join(", "),
      issue: "Duplicate references between adjacent pages",
      status: "open",
      source: "catalog-read-service",
      notes: "",
    });
  }

  return { issues, stats };
}

function auditHome(dataset: CatalogReadDataset): { issues: AuditIssue[]; stats: Record<string, number> } {
  const issues: AuditIssue[] = [];
  const scenarios = buildHomeScenarios(dataset);
  const orbit = buildHomeOrbitWatches(scenarios);
  const curation = buildHomeEditorialCuration(dataset);
  const allHomeReferences = new Set<string>();
  for (const watch of orbit) allHomeReferences.add(normalizeManufacturerReference(watch.reference));
  for (const watch of [
    curation.path,
    curation.selection,
    curation.comparisonSeastar,
    curation.collectionRecommendation,
    ...curation.collectionOwned,
    ...curation.journal,
    ...curation.final,
  ]) {
    if (watch) allHomeReferences.add(normalizeManufacturerReference(watch.reference));
  }

  for (const normalized of allHomeReferences) {
    const catalogWatch = dataset.watches.find((watch) => watch.referenceNormalized === normalized);
    if (!catalogWatch) {
      issues.push({
        brand: null,
        reference: normalized,
        route: "/",
        severity: "P1",
        category: "home",
        field: "reference",
        current: normalized,
        issue: "Homepage reference is not present in canonical catalog dataset",
        status: "open",
        source: "home-scenario-model",
        notes: "",
      });
      continue;
    }

    const homepageWatch = orbit.find((watch) => normalizeManufacturerReference(watch.reference) === normalized);
    if (homepageWatch && homepageWatch.price !== null && catalogWatch.publicPrice && homepageWatch.price * 100 !== catalogWatch.publicPrice.amountMinor) {
      issues.push({
        brand: catalogWatch.brandName,
        reference: catalogWatch.referenceDisplay,
        route: "/",
        severity: "P1",
        category: "home",
        field: "price",
        current: String(homepageWatch.price),
        issue: "Homepage price differs from canonical catalog price",
        status: "open",
        source: "home-scenario-model",
        notes: `catalog=${catalogWatch.publicPrice.amountMinor / 100}`,
      });
    }
  }

  const chronographAsMovement = orbit.filter((watch) =>
    watch.specs.some((entry) => /МЕХАНИЗМ/i.test(entry.label) && /ХРОНОГРАФ/i.test(entry.value)),
  );
  for (const watch of chronographAsMovement) {
    issues.push({
      brand: watch.brand,
      reference: watch.reference,
      route: "/",
      severity: "P1",
      category: "home",
      field: "specs",
      current: watch.specs.map((entry) => `${entry.label}:${entry.value}`).join(" | "),
      issue: "Chronograph is presented as movement on homepage",
      status: "open",
      source: "home-scenario-model",
      notes: "",
    });
  }

  return { issues, stats: { homeReferencesChecked: allHomeReferences.size, homeScenariosChecked: scenarios.length } };
}

function auditRelated(dataset: CatalogReadDataset): { issues: AuditIssue[]; checked: number } {
  const issues: AuditIssue[] = [];
  let checked = 0;
  for (const watch of dataset.watches) {
    checked += 1;
    const related = pickRelatedCatalogWatches(dataset, watch, 4);
    const ids = new Set<string>();
    for (const item of related) {
      if (item.id === watch.id) {
        issues.push({
          brand: watch.brandName,
          reference: watch.referenceDisplay,
          route: watch.href,
          severity: "P1",
          category: "related",
          field: "id",
          current: item.id,
          issue: "Related models include current product",
          status: "open",
          source: "catalog-read-service",
          notes: "",
        });
      }
      if (ids.has(item.id)) {
        issues.push({
          brand: watch.brandName,
          reference: watch.referenceDisplay,
          route: watch.href,
          severity: "P1",
          category: "related",
          field: "id",
          current: item.id,
          issue: "Duplicate related product",
          status: "open",
          source: "catalog-read-service",
          notes: "",
        });
      }
      ids.add(item.id);
      if (!dataset.watches.some((candidate) => candidate.id === item.id && candidate.href === item.href)) {
        issues.push({
          brand: watch.brandName,
          reference: watch.referenceDisplay,
          route: watch.href,
          severity: "P1",
          category: "related",
          field: "href",
          current: item.href,
          issue: "Related product route is not canonical",
          status: "open",
          source: "catalog-read-service",
          notes: "",
        });
      }
    }
  }
  return { issues, checked };
}

function auditPublicCopy(dataset: CatalogReadDataset): { issues: AuditIssue[]; stats: Record<string, number> } {
  const issues: AuditIssue[] = [];
  let productCopyChecked = 0;
  for (const watch of dataset.watches) {
    const values = [
      watch.title,
      watch.officialName ?? "",
      watch.watchModelName,
      watch.brandCollectionName ?? "",
      ...watch.specifications.flatMap((entry) => [entry.label, entry.value]),
    ];
    for (const value of values) {
      productCopyChecked += 1;
      for (const pattern of generatedCopyPatterns) {
        if (pattern.pattern.test(value)) {
          issues.push({
            brand: watch.brandName,
            reference: watch.referenceDisplay,
            route: watch.href,
            severity: "P1",
            category: "generated-copy",
            field: "product public text",
            current: value,
            issue: pattern.name,
            status: "open",
            source: "catalog-read-dataset",
            notes: "",
          });
        }
      }
      for (const pattern of publicCopyTerms) {
        if (pattern.test(value)) {
          issues.push({
            brand: watch.brandName,
            reference: watch.referenceDisplay,
            route: watch.href,
            severity: "P2",
            category: "dev-copy",
            field: "product public text",
            current: value,
            issue: `Public-facing technical/dev term matched: ${pattern}`,
            status: "manual_review",
            source: "catalog-read-dataset",
            notes: "",
          });
        }
      }
    }
  }
  return { issues, stats: { productCopyChecked } };
}

function brandCounts(dataset: CatalogReadDataset) {
  return dataset.brands.map((brand) => ({
    brand: brand.slug,
    total: brand.watchCount,
    images: dataset.watches.filter((watch) => watch.brandSlug === brand.slug && watch.primaryImage.kind !== "none").length,
    noImage: dataset.watches.filter((watch) => watch.brandSlug === brand.slug && watch.primaryImage.kind === "none").length,
  }));
}

function escapeCsv(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

async function writeArtifacts(report: Record<string, unknown>, issues: AuditIssue[]): Promise<{ jsonPath: string; csvPath: string; markdownPath: string }> {
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `semantic-audit-${stamp}.json`);
  const csvPath = path.join(outDir, `semantic-audit-issues-${stamp}.csv`);
  const markdownPath = path.join(outDir, `semantic-audit-${stamp}.md`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(
    csvPath,
    [
      ["brand", "reference", "route", "severity", "category", "field", "current", "issue", "status", "source", "notes"].map(escapeCsv).join(","),
      ...issues.map((issue) =>
        [
          issue.brand,
          issue.reference,
          issue.route,
          issue.severity,
          issue.category,
          issue.field,
          issue.current,
          issue.issue,
          issue.status,
          issue.source,
          issue.notes,
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    markdownPath,
    [
      "# Final pre-launch semantic audit",
      "",
      `Generated: ${(report.generatedAt as string) ?? ""}`,
      "",
      "## Summary",
      "",
      "```json",
      JSON.stringify(report.summary, null, 2),
      "```",
      "",
      "## Issue counts by category",
      "",
      "```json",
      JSON.stringify(report.issueCountsByCategory, null, 2),
      "```",
      "",
      "Machine-readable details are in the JSON and CSV siblings.",
      "",
    ].join("\n"),
    "utf8",
  );
  return { jsonPath, csvPath, markdownPath };
}

async function main() {
  const { dataset, overlay, manifests } = await loadDataset();
  const catalog = auditCatalog(dataset);
  const images = auditImages(dataset);
  const seo = auditSeo(dataset, overlay);
  const searchFiltersSortPagination = auditSearchFiltersSortPagination(dataset);
  const home = auditHome(dataset);
  const related = auditRelated(dataset);
  const publicCopy = auditPublicCopy(dataset);
  const issues = [
    ...catalog.issues,
    ...images.issues,
    ...seo.issues,
    ...searchFiltersSortPagination.issues,
    ...home.issues,
    ...related.issues,
    ...publicCopy.issues,
  ];
  const issueCountsByCategory = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.category] = (acc[issue.category] ?? 0) + 1;
    return acc;
  }, {});
  const issueCountsBySeverity = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
    return acc;
  }, {});
  const report = {
    generatedAt: new Date().toISOString(),
    dataset: {
      source: dataset.source,
      generatedAt: dataset.generatedAt,
      totalPublicModels: dataset.watches.length,
      brands: brandCounts(dataset),
      overlayEntries: overlay?.entries.length ?? 0,
      manifests: {
        casioEntries: manifests.casio?.entries.length ?? 0,
        orientEntries: manifests.orient?.entries.length ?? 0,
        tissotEntries: manifests.tissot?.entries.length ?? 0,
      },
    },
    summary: {
      totalIssues: issues.length,
      issueCountsBySeverity,
      issueCountsByCategory,
      catalogChecked: dataset.watches.length,
      imageChecked: images.checked,
      wrongPrimaryFound: images.wrongPrimaryFound,
      frontMissingNonCitizen: images.frontMissingNonCitizen,
      citizenNoPhoto: images.citizenNoPhoto,
      searchFilterSortPagination: searchFiltersSortPagination.stats,
      seo: seo.stats,
      home: home.stats,
      relatedChecked: related.checked,
      publicCopy: publicCopy.stats,
    },
    issueCountsByCategory,
    issueCountsBySeverity,
    regressionReferences: regressionSnapshot(dataset),
    issues,
  };
  const artifactPaths = await writeArtifacts(report, issues);

  console.log(`FINAL_PRELAUNCH_SEMANTIC_AUDIT_JSON=${artifactPaths.jsonPath}`);
  console.log(`FINAL_PRELAUNCH_SEMANTIC_AUDIT_CSV=${artifactPaths.csvPath}`);
  console.log(`FINAL_PRELAUNCH_SEMANTIC_AUDIT_MD=${artifactPaths.markdownPath}`);
  console.log(`TOTAL_PUBLIC_MODELS=${dataset.watches.length}`);
  for (const brand of brandCounts(dataset)) {
    console.log(`BRAND_${brand.brand.toUpperCase()}=${brand.total};IMAGES=${brand.images};NO_IMAGE=${brand.noImage}`);
  }
  console.log(`TOTAL_ISSUES=${issues.length}`);
  console.log(`ISSUE_COUNTS_BY_SEVERITY=${JSON.stringify(issueCountsBySeverity)}`);
  console.log(`ISSUE_COUNTS_BY_CATEGORY=${JSON.stringify(issueCountsByCategory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
