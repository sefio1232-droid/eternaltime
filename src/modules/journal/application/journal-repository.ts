import { journalArticleSources, type JournalArticleSource } from "../content/articles";
import { buildJournalPresentationBlocks } from "./journal-presentation";
import type { JournalArticle, JournalArticleSummary, JournalInventory } from "../domain/read-models";

const allowedCategories = new Set(["Выбор", "Коллекционирование", "Механизмы"]);
const allowedLayoutVariants = new Set(["feature", "guide", "essay", "analysis"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function publicBody(article: JournalArticleSource) {
  return article.body
    .filter((section) => section.visibility !== "internal-review")
    .map(({ heading, paragraphs }) => ({ heading, paragraphs }));
}

function articleText(article: JournalArticleSource): string {
  return publicBody(article)
    .flatMap((section) => [section.heading ?? "", ...section.paragraphs])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateReadingTimeMinutes(article: JournalArticleSource): number {
  const wordCount = articleText(article).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 180));
}

export function validateJournalArticleSources(sources: JournalArticleSource[] = journalArticleSources): string[] {
  const issues: string[] = [];
  const slugs = new Set<string>();
  const titles = new Set<string>();
  const knownSlugs = new Set(sources.map((article) => article.slug));
  const publishedSlugs = new Set(sources.filter((article) => article.status === "published").map((article) => article.slug));

  for (const article of sources) {
    const label = article.slug || article.title || "article";
    if (!slugPattern.test(article.slug)) issues.push(`${label}: invalid slug`);
    if (slugs.has(article.slug)) issues.push(`${label}: duplicate slug`);
    if (titles.has(article.title)) issues.push(`${label}: duplicate title`);
    slugs.add(article.slug);
    titles.add(article.title);

    if (!article.title.trim()) issues.push(`${label}: title is required`);
    if (!article.excerpt.trim()) issues.push(`${label}: excerpt is required`);
    if (!allowedCategories.has(article.category)) issues.push(`${label}: unknown category`);
    if (!allowedLayoutVariants.has(article.layoutVariant)) issues.push(`${label}: unknown layout variant`);
    if (!article.sourceFile.toLowerCase().endsWith(".docx")) issues.push(`${label}: source file must be a DOCX`);
    if (!publicBody(article).some((section) => section.paragraphs.some((paragraph) => paragraph.trim()))) {
      issues.push(`${label}: public body is empty`);
    }

    for (const [field, value] of [["publishedAt", article.publishedAt], ["updatedAt", article.updatedAt]] as const) {
      if (value && Number.isNaN(Date.parse(value))) issues.push(`${label}: invalid ${field}`);
    }
    if (article.publishedAt && article.updatedAt && article.updatedAt < article.publishedAt) {
      issues.push(`${label}: updatedAt precedes publishedAt`);
    }
    if (article.author !== undefined && !article.author.trim()) issues.push(`${label}: empty author`);

    if (article.heroImage) {
      if (!article.heroImage.src.startsWith("/") || article.heroImage.src.startsWith("//")) {
        issues.push(`${label}: hero image must be local`);
      }
      if (!article.heroImage.alt.trim()) issues.push(`${label}: hero image alt is required`);
    }

    const relatedSlugs = new Set<string>();
    for (const relatedSlug of article.relatedArticleSlugs) {
      if (relatedSlug === article.slug) issues.push(`${label}: article cannot relate to itself`);
      if (!knownSlugs.has(relatedSlug)) issues.push(`${label}: unknown related article ${relatedSlug}`);
      if (article.status === "published" && !publishedSlugs.has(relatedSlug)) {
        issues.push(`${label}: public article relates to unpublished article ${relatedSlug}`);
      }
      if (relatedSlugs.has(relatedSlug)) issues.push(`${label}: duplicate related article ${relatedSlug}`);
      relatedSlugs.add(relatedSlug);
    }

    const references = new Set<string>();
    for (const reference of article.relatedWatchReferences) {
      const key = `${reference.brandSlug}:${reference.referenceSlug}`;
      if (!slugPattern.test(reference.brandSlug) || !slugPattern.test(reference.referenceSlug)) {
        issues.push(`${label}: invalid brand-scoped reference ${key}`);
      }
      if (references.has(key)) issues.push(`${label}: duplicate brand-scoped reference ${key}`);
      references.add(key);
    }

    const editorialReferences = new Set<string>();
    for (const reference of article.editorialWatchReferences) {
      const key = `${reference.brandSlug}:${reference.referenceSlug}`;
      if (!slugPattern.test(reference.brandSlug) || !slugPattern.test(reference.referenceSlug)) {
        issues.push(`${label}: invalid editorial brand-scoped reference ${key}`);
      }
      if (editorialReferences.has(key)) issues.push(`${label}: duplicate editorial reference ${key}`);
      editorialReferences.add(key);
    }
  }

  if (sources.filter((article) => article.status === "published" && article.featured).length > 1) {
    issues.push("journal: more than one published article is featured");
  }

  return issues;
}

function assertValidJournalContent() {
  const issues = validateJournalArticleSources();
  if (issues.length > 0) throw new Error(`Invalid Journal content:\n${issues.join("\n")}`);
}

function toPublicArticle(article: JournalArticleSource): JournalArticle {
  return {
    slug: article.slug,
    title: article.title,
    dek: article.dek ?? article.excerpt,
    excerpt: article.excerpt,
    category: article.category,
    tags: article.tags,
    author: article.author,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    readingTimeMinutes: calculateReadingTimeMinutes(article),
    featured: article.featured,
    layoutVariant: article.layoutVariant,
    body: publicBody(article),
    presentationBlocks: buildJournalPresentationBlocks(article),
    relatedArticleSlugs: article.relatedArticleSlugs,
    relatedWatchRefs: article.relatedWatchReferences,
    editorialWatchRefs: article.editorialWatchReferences,
    sourceFile: article.sourceFile,
    brandMentions: article.brandMentions,
    modelMentions: article.modelMentions,
    heroImage: article.heroImage,
  };
}

function toSummary(article: JournalArticle): JournalArticleSummary {
  return {
    slug: article.slug,
    title: article.title,
    dek: article.dek,
    excerpt: article.excerpt,
    category: article.category,
    tags: article.tags,
    author: article.author,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    readingTimeMinutes: article.readingTimeMinutes,
    featured: article.featured,
    layoutVariant: article.layoutVariant,
  };
}

export function listPublishedJournalArticles(): JournalArticleSummary[] {
  assertValidJournalContent();
  return journalArticleSources
    .filter((article) => article.status === "published")
    .map(toPublicArticle)
    .sort((left, right) => Number(right.featured) - Number(left.featured) || left.title.localeCompare(right.title, "ru"))
    .map(toSummary);
}

export function getPublishedJournalArticle(slug: string): JournalArticle | null {
  assertValidJournalContent();
  const article = journalArticleSources.find((source) => source.slug === slug && source.status === "published");
  return article ? toPublicArticle(article) : null;
}

export function getJournalInventory(): JournalInventory {
  assertValidJournalContent();
  return {
    publishedCount: journalArticleSources.filter((article) => article.status === "published").length,
    unpublishedDraftCount: journalArticleSources.filter((article) => article.status === "draft").length,
  };
}
