export const ownershipStatuses = ["owned", "previously_owned"] as const;
export type OwnershipStatus = (typeof ownershipStatuses)[number];

export type UserWatchSourceKind = "catalog" | "manual";

export type UserWatchSummary = {
  id: string;
  displayName: string;
  sourceKind: UserWatchSourceKind;
  ownershipStatus: OwnershipStatus;
  brandName: string | null;
  modelName: string | null;
  referenceDisplay: string | null;
  watchReferenceHref: string | null;
  acquiredAt: string | null;
  acquisitionSource: string | null;
  primaryImageUrl: string | null;
};

export type UserWatchDetail = UserWatchSummary & {
  watchReferenceId: string | null;
  customBrandName: string | null;
  customModelName: string | null;
  customReference: string | null;
  acquisitionPriceMinor: number | null;
  acquisitionCurrencyCode: string | null;
  personalNote: string | null;
  createdAt: string;
};

export type CreateCatalogUserWatchInput = {
  watchReferenceId: string;
  displayName?: string;
  allowDuplicate: boolean;
};

export type CreateManualUserWatchInput = {
  displayName: string;
  brandName?: string;
  modelName?: string;
  reference?: string;
  note?: string;
};

export type UpdateOwnershipInput = {
  displayName: string;
  acquiredAt?: string;
  acquisitionPriceMinor?: number;
  acquisitionCurrencyCode?: string;
  acquisitionSource?: string;
  ownershipStatus: OwnershipStatus;
  personalNote?: string;
};
