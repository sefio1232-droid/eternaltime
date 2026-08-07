import type { Money } from "@/modules/catalog/domain/money";

export type CatalogReadSourceKind = "database" | "preview";

export type CatalogSortKey = "default" | "price_asc" | "price_desc" | "name_asc";

/**
 * Top-level catalog tab state. "recommended" is the default `/watches` experience (curated,
 * price-floored); "all" shows the full unfiltered catalog. Orthogonal to `brandSlug` — a brand
 * tab (`?brand=casio`) always behaves like "all" scoped to that brand, regardless of `view`.
 */
export type CatalogViewKey = "recommended" | "all";

export type CatalogSpecificationGroup =
  | "mechanism"
  | "case"
  | "dimensions"
  | "dial"
  | "glass"
  | "strap"
  | "water_resistance"
  | "functions"
  | "other";

export type CatalogPublicSpecification = {
  key: string;
  label: string;
  value: string;
  group: CatalogSpecificationGroup;
};

export type CatalogImagePresentation =
  | {
      kind: "development_zip";
      imageKey: string;
      src: string;
      alt: string;
    }
  | {
      kind: "remote";
      url: string;
      src: string;
      alt: string;
    }
  | {
      kind: "none";
      alt: string;
    };

export type CatalogWatchCard = {
  id: string;
  href: string;
  brandName: string;
  brandSlug: string;
  title: string;
  officialName: string | null;
  referenceDisplay: string;
  referenceNormalized: string;
  referenceSlug: string;
  brandCollectionName: string | null;
  watchModelName: string;
  publicPrice: Money | null;
  primaryImage: CatalogImagePresentation;
  keySpecifications: CatalogPublicSpecification[];
};

export type CatalogSiblingReference = {
  id: string;
  href: string;
  title: string;
  referenceDisplay: string;
  referenceNormalized: string;
  referenceSlug: string;
  publicPrice: Money | null;
  primaryImage: CatalogImagePresentation;
};

export type CatalogWatchDetail = CatalogWatchCard & {
  brandLineName: string | null;
  imageGallery: CatalogImagePresentation[];
  specifications: CatalogPublicSpecification[];
  siblingReferences: CatalogSiblingReference[];
};

export type CatalogFilterOption = {
  value: string;
  label: string;
  count: number;
};

export type CatalogPriceFacet = {
  minMinor: number | null;
  maxMinor: number | null;
  currencyCode: "RUB";
  pricedRecordCount: number;
};

export type CatalogFilterFacets = {
  brands: CatalogFilterOption[];
  brandCollections: CatalogFilterOption[];
  movements: CatalogFilterOption[];
  waterResistance: CatalogFilterOption[];
  caseMaterials: CatalogFilterOption[];
  crystalTypes: CatalogFilterOption[];
  /** Always includes an "unknown"/"Не указано" option — most brands have no source positioning
   * field at all (docs/CATALOG_SHOWROOM_RECOVERY.md "Positioning filter"), and hiding that low
   * coverage would misrepresent the data. */
  positioning: CatalogFilterOption[];
  price: CatalogPriceFacet;
};

export type CatalogReadQuery = {
  search: string;
  brandSlug: string | null;
  brandCollection: string | null;
  movement: string | null;
  waterResistance: string | null;
  caseMaterial: string | null;
  crystal: string | null;
  positioning: string | null;
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  sort: CatalogSortKey;
  view: CatalogViewKey;
  page: number;
  pageSize: number;
};

export type CatalogListResult = {
  source: CatalogReadSourceKind;
  totalRecords: number;
  items: CatalogWatchCard[];
  query: CatalogReadQuery;
  facets: CatalogFilterFacets;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type CatalogBrandSummary = {
  name: string;
  slug: string;
  watchCount: number;
};

export type CatalogBrandDiscovery = CatalogBrandSummary & {
  collectionNames: string[];
  representativeWatches: CatalogWatchCard[];
};

export type CatalogReadDataset = {
  source: CatalogReadSourceKind;
  generatedAt: string;
  watches: CatalogWatchDetail[];
  brands: CatalogBrandSummary[];
};

export type CatalogReadUnavailable = {
  code: "catalog_source_unavailable" | "catalog_source_not_configured";
  title: string;
  message: string;
};
