import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import { classifyCatalogImageRejection } from "@/modules/catalog/application/catalog-image-presentation-policy";
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

export function validateJournalEditorialWatches(
  article: JournalArticle,
  dataset: CatalogReadDataset,
): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const reference of article.editorialWatchRefs) {
    const key = `${reference.brandSlug}:${reference.referenceSlug}`;
    if (seen.has(key)) issues.push(`${article.slug}: duplicate editorial reference ${key}`);
    seen.add(key);

    const watch = dataset.watches.find(
      (candidate) => candidate.brandSlug === reference.brandSlug && candidate.referenceSlug === reference.referenceSlug,
    );
    if (!watch) {
      issues.push(`${article.slug}: unknown exact editorial reference ${key}`);
      continue;
    }
    if (watch.href !== `/watches/${reference.brandSlug}/${reference.referenceSlug}`) {
      issues.push(`${article.slug}: invalid canonical href for ${key}`);
    }
    const rejection = classifyCatalogImageRejection(watch.primaryImage);
    if (rejection) issues.push(`${article.slug}: unsafe primary image for ${key} (${rejection})`);
  }

  return issues;
}

export function resolveJournalArticleEditorialWatches(
  article: JournalArticle,
  dataset: CatalogReadDataset | null,
): CatalogWatchDetail[] {
  if (!dataset) return [];
  const issues = validateJournalEditorialWatches(article, dataset);
  if (issues.length > 0) throw new Error(`Invalid Journal editorial watches:\n${issues.join("\n")}`);
  return article.editorialWatchRefs.map((reference) => {
    const watch = dataset.watches.find(
      (candidate) => candidate.brandSlug === reference.brandSlug && candidate.referenceSlug === reference.referenceSlug,
    );
    if (!watch) throw new Error(`Missing validated editorial watch ${reference.brandSlug}:${reference.referenceSlug}`);
    return watch;
  });
}
