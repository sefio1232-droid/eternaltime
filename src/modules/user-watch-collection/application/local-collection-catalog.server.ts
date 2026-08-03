import "server-only";

import type { CollectionRecommendationCandidate } from "@/modules/collection-intelligence/domain/types";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { buildLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection";

export async function loadLocalCollectionCatalogCandidates(): Promise<CollectionRecommendationCandidate[]> {
  try {
    const dataset = await getCatalogReadDataset();
    return buildLocalCollectionCatalogCandidates(dataset.watches);
  } catch {
    return [];
  }
}
