import type { CatalogWatchCard } from "@/modules/catalog/domain/read-models";

export type EditorialSelection = {
  slug: string;
  title: string;
  dek: string;
  criteriaLabel: string;
  watches: CatalogWatchCard[];
};
