import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";
import type { PublicCommerceState } from "@/modules/commerce/domain/public-commerce-state";
import type { Money } from "@/modules/catalog/domain/money";

export const candidateStatuses = ["saved", "considering", "finalist"] as const;
export type CandidateStatus = (typeof candidateStatuses)[number];

export const candidateStatusLabels: Record<CandidateStatus, string> = {
  saved: "Сохранено",
  considering: "Рассматриваю",
  finalist: "Финалисты",
};

export type CandidateSummary = {
  id: string;
  watchReferenceId: string;
  status: CandidateStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  watch: {
    href: string;
    brandName: string;
    brandSlug: string;
    displayName: string;
    referenceDisplay: string;
    referenceNormalized: string;
    referenceSlug: string;
    image: CatalogImagePresentation;
    publicPrice: Money | null;
    publicCommerceState: PublicCommerceState;
  } | null;
};
