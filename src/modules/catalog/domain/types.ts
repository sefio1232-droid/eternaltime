export const watchReferenceStatuses = ["draft", "published", "archival", "hidden"] as const;
export type WatchReferenceStatus = (typeof watchReferenceStatuses)[number];

export const referenceLifecycleStatuses = ["current", "discontinued", "catalog_only", "unknown"] as const;
export type ReferenceLifecycleStatus = (typeof referenceLifecycleStatuses)[number];

export const catalogOfferStatuses = ["active", "inactive", "coming_soon", "on_request", "sold_out"] as const;
export type CatalogOfferStatus = (typeof catalogOfferStatuses)[number];

export type PublishedBrandSummary = {
  id: string;
  name: string;
  slug: string;
};

export type PublishedReferenceSummary = {
  id: string;
  brandId: string;
  brandSlug: string;
  referenceCodeDisplay: string;
  referenceCodeNormalized: string;
  slug: string;
  displayName: string;
  status: Extract<WatchReferenceStatus, "published" | "archival">;
};
