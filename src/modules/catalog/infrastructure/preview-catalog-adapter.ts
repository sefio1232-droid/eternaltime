import { createCatalogDevImageKey } from "@/modules/catalog/infrastructure/dev-image-keys";
import { createMoney } from "@/modules/catalog/domain/money";
import { referenceSlugFromNormalized } from "@/modules/catalog/domain/reference-normalization";
import { slugifyCatalogText } from "@/modules/catalog/domain/slug";
import type {
  CatalogImagePresentation,
  CatalogPublicSpecification,
  CatalogReadDataset,
  CatalogSpecificationGroup,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import type {
  CatalogImageUploadPlan,
  CatalogImageUploadPlanItem,
} from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview, MergedCatalogCandidate } from "@/modules/imports/catalog/domain/types";

type SpecificationDefinition = {
  label: string;
  group: CatalogSpecificationGroup;
};

const specificationDefinitions: Record<string, SpecificationDefinition> = {
  movement_raw: { label: "Механизм", group: "mechanism" },
  movement_type_raw: { label: "Тип механизма", group: "mechanism" },
  power_source_raw: { label: "Питание", group: "mechanism" },
  case_material_raw: { label: "Материал корпуса", group: "case" },
  case_shape_raw: { label: "Форма корпуса", group: "case" },
  case_diameter_raw: { label: "Диаметр корпуса", group: "dimensions" },
  case_dimensions_raw: { label: "Размер корпуса", group: "dimensions" },
  weight_raw: { label: "Вес", group: "dimensions" },
  dial_raw: { label: "Циферблат", group: "dial" },
  crystal_type_raw: { label: "Стекло", group: "glass" },
  attachment_material_raw: { label: "Ремешок или браслет", group: "strap" },
  strap_material_raw: { label: "Ремешок", group: "strap" },
  bracelet_material_raw: { label: "Браслет", group: "strap" },
  water_resistance_raw: { label: "Водозащита", group: "water_resistance" },
  functions_raw: { label: "Функции", group: "functions" },
  watch_type_raw: { label: "Тип", group: "other" },
  brand_country_raw: { label: "Страна бренда", group: "other" },
};

const specificationOrder = [
  "movement_type_raw",
  "movement_raw",
  "power_source_raw",
  "case_material_raw",
  "case_shape_raw",
  "case_diameter_raw",
  "case_dimensions_raw",
  "weight_raw",
  "dial_raw",
  "crystal_type_raw",
  "attachment_material_raw",
  "strap_material_raw",
  "bracelet_material_raw",
  "water_resistance_raw",
  "functions_raw",
  "watch_type_raw",
  "brand_country_raw",
];

const keySpecificationPriority = [
  "movement_type_raw",
  "movement_raw",
  "case_material_raw",
  "water_resistance_raw",
  "crystal_type_raw",
  "case_dimensions_raw",
];

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function publicSpecifications(candidate: MergedCatalogCandidate): CatalogPublicSpecification[] {
  const sourceValues = {
    ...candidate.specifications.firstClass,
    ...candidate.specifications.controlledAttributes,
  };
  const result: CatalogPublicSpecification[] = [];
  const seen = new Set<string>();

  for (const key of specificationOrder) {
    const value = textValue(sourceValues[key]);
    const definition = specificationDefinitions[key];
    if (!value || !definition || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      key,
      label: definition.label,
      value,
      group: definition.group,
    });
  }

  return result;
}

function keySpecifications(specifications: CatalogPublicSpecification[]): CatalogPublicSpecification[] {
  const byKey = new Map(specifications.map((specification) => [specification.key, specification]));
  const picked: CatalogPublicSpecification[] = [];

  for (const key of keySpecificationPriority) {
    const specification = byKey.get(key);
    if (specification) {
      picked.push(specification);
    }

    if (picked.length === 3) {
      return picked;
    }
  }

  return picked;
}

function imageAlt(title: string, referenceDisplay: string, order: number): string {
  return `${title}, ${referenceDisplay}, фото ${order}`;
}

function imagePresentationFromPlanItem(
  item: CatalogImageUploadPlanItem,
  title: string,
  referenceDisplay: string,
): CatalogImagePresentation | null {
  const alt = imageAlt(title, referenceDisplay, item.intendedOrder);

  if (item.actualZipEntry) {
    const imageKey = createCatalogDevImageKey(item);
    return {
      kind: "development_zip",
      imageKey,
      src: `/api/catalog/dev-images/${imageKey}`,
      alt,
    };
  }

  if (item.remoteImageUrl) {
    return {
      kind: "remote",
      url: item.remoteImageUrl,
      src: item.remoteImageUrl,
      alt,
    };
  }

  return null;
}

function imageGalleryForCandidate(input: {
  candidate: MergedCatalogCandidate;
  imagePlanItems: CatalogImageUploadPlanItem[];
  title: string;
  referenceDisplay: string;
}): CatalogImagePresentation[] {
  return input.imagePlanItems
    .filter((item) => item.candidateId === input.candidate.candidateId && item.imageValidationState === "valid")
    .sort((left, right) => left.intendedOrder - right.intendedOrder)
    .map((item) => imagePresentationFromPlanItem(item, input.title, input.referenceDisplay))
    .filter((image): image is Exclude<CatalogImagePresentation, { kind: "none" }> => image !== null);
}

function missingImage(title: string): CatalogImagePresentation {
  return {
    kind: "none",
    alt: `${title}: изображение пока недоступно`,
  };
}

function readModelFromCandidate(input: {
  candidate: MergedCatalogCandidate;
  imagePlanItems: CatalogImageUploadPlanItem[];
}): Omit<CatalogWatchDetail, "siblingReferences"> | null {
  const { candidate } = input;

  if (candidate.applyEligibility.status !== "eligible") {
    return null;
  }

  const brandName = textValue(candidate.identity.brand);
  const title = textValue(candidate.identity.title);
  const referenceDisplay = textValue(candidate.identity.referenceRaw);
  const referenceNormalized = textValue(candidate.identity.referenceNormalized);
  const watchModelName = textValue(candidate.hierarchy.watchModelCandidate);

  if (!brandName || !title || !referenceDisplay || !referenceNormalized || !watchModelName) {
    return null;
  }

  if (referenceNormalized === "7") {
    return null;
  }

  const brandSlug = slugifyCatalogText(brandName);
  if (!brandSlug) {
    return null;
  }

  const referenceSlug = referenceSlugFromNormalized(referenceNormalized);
  const specifications = publicSpecifications(candidate);
  const imageGallery = imageGalleryForCandidate({
    candidate,
    imagePlanItems: input.imagePlanItems,
    title,
    referenceDisplay,
  });
  const primaryImage = imageGallery[0] ?? missingImage(title);
  const price = candidate.pricing.publicPriceCandidate
    ? createMoney(candidate.pricing.publicPriceCandidate.amountMinor, candidate.pricing.publicPriceCandidate.currencyCode)
    : null;

  return {
    id: `${brandSlug}/${referenceSlug}`,
    href: `/watches/${brandSlug}/${referenceSlug}`,
    brandName,
    brandSlug,
    title,
    officialName: textValue(candidate.identity.officialName),
    referenceDisplay,
    referenceNormalized,
    referenceSlug,
    brandCollectionName: textValue(candidate.hierarchy.brandCollection),
    brandLineName: textValue(candidate.hierarchy.brandLine),
    watchModelName,
    publicPrice: price,
    primaryImage,
    imageGallery,
    keySpecifications: keySpecifications(specifications),
    specifications,
  };
}

function attachSiblings(watches: Array<Omit<CatalogWatchDetail, "siblingReferences">>): CatalogWatchDetail[] {
  return watches.map((watch) => {
    const siblingReferences = watches
      .filter(
        (sibling) =>
          sibling.id !== watch.id &&
          sibling.brandSlug === watch.brandSlug &&
          sibling.watchModelName === watch.watchModelName,
      )
      .slice(0, 8)
      .map((sibling) => ({
        id: sibling.id,
        href: sibling.href,
        title: sibling.title,
        referenceDisplay: sibling.referenceDisplay,
        referenceNormalized: sibling.referenceNormalized,
        referenceSlug: sibling.referenceSlug,
        publicPrice: sibling.publicPrice,
        primaryImage: sibling.primaryImage,
      }));

    return {
      ...watch,
      siblingReferences,
    };
  });
}

export function catalogReadDatasetFromPreview(input: {
  preview: CatalogImportPreview;
  imagePlan: CatalogImageUploadPlan | null;
}): CatalogReadDataset {
  const imagePlanItems = input.imagePlan?.items ?? [];
  const baseWatches = input.preview.records
    .map((candidate) => readModelFromCandidate({ candidate, imagePlanItems }))
    .filter((watch): watch is Omit<CatalogWatchDetail, "siblingReferences"> => watch !== null);
  const watches = attachSiblings(baseWatches);
  const brandCounts = watches.reduce<Map<string, { name: string; count: number }>>((counts, watch) => {
    const existing = counts.get(watch.brandSlug);
    counts.set(watch.brandSlug, {
      name: watch.brandName,
      count: (existing?.count ?? 0) + 1,
    });
    return counts;
  }, new Map());

  return {
    source: "preview",
    generatedAt: input.preview.generatedAt,
    watches,
    brands: [...brandCounts.entries()]
      .map(([slug, value]) => ({ slug, name: value.name, watchCount: value.count }))
      .sort((left, right) => right.watchCount - left.watchCount || left.name.localeCompare(right.name, "ru")),
  };
}
