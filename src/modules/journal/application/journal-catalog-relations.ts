import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { JournalArticle } from "@/modules/journal/domain/read-models";

export function resolveJournalArticleRelatedWatches(
  article: JournalArticle,
  dataset: CatalogReadDataset | null,
): CatalogWatchDetail[] {
  if (!dataset) {
    return [];
  }

  return article.relatedWatchRefs
    .map((reference) =>
      dataset.watches.find(
        (watch) => watch.brandSlug === reference.brandSlug && watch.referenceSlug === reference.referenceSlug,
      ),
    )
    .filter((watch): watch is CatalogWatchDetail => Boolean(watch));
}

export function findJournalArticleVisualWatch(
  article: JournalArticle,
  dataset: CatalogReadDataset | null,
): CatalogWatchDetail | null {
  return resolveJournalArticleRelatedWatches(article, dataset).find((watch) => watch.primaryImage.kind !== "none") ?? null;
}
