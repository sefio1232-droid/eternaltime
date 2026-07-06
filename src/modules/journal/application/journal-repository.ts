import { journalArticleSources, type JournalArticleSource } from "../content/articles";
import type { JournalArticle, JournalArticleSummary, JournalInventory } from "../domain/read-models";

function articleText(article: JournalArticleSource): string {
  return article.body
    .flatMap((section) => [section.heading ?? "", ...section.paragraphs])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateReadingTimeMinutes(article: JournalArticleSource): number {
  const wordCount = articleText(article).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 180));
}

function toPublicArticle(article: JournalArticleSource): JournalArticle {
  return {
    slug: article.slug,
    title: article.title,
    dek: article.dek,
    category: article.category,
    publishedAt: article.publishedAt,
    readingTimeMinutes: calculateReadingTimeMinutes(article),
    body: article.body,
    relatedWatchRefs: article.relatedWatchRefs ?? [],
  };
}

export function listPublishedJournalArticles(): JournalArticleSummary[] {
  return journalArticleSources
    .filter((article) => article.status === "published")
    .map(toPublicArticle)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      dek: article.dek,
      category: article.category,
      publishedAt: article.publishedAt,
      readingTimeMinutes: article.readingTimeMinutes,
    }))
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.title.localeCompare(right.title, "ru"));
}

export function getPublishedJournalArticle(slug: string): JournalArticle | null {
  const article = journalArticleSources.find((source) => source.slug === slug && source.status === "published");
  return article ? toPublicArticle(article) : null;
}

export function getJournalInventory(): JournalInventory {
  return {
    publishedCount: journalArticleSources.filter((article) => article.status === "published").length,
    unpublishedDraftCount: journalArticleSources.filter((article) => article.status === "draft").length,
  };
}
