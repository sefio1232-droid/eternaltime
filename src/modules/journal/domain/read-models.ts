export type JournalArticleCategory =
  | "История"
  | "Механика"
  | "Гид"
  | "Материалы"
  | "Стиль";

export type JournalArticleSummary = {
  slug: string;
  title: string;
  dek: string;
  category: JournalArticleCategory;
  publishedAt: string;
  readingTimeMinutes: number;
};

export type JournalArticle = JournalArticleSummary & {
  body: Array<{
    heading?: string;
    paragraphs: string[];
  }>;
  relatedWatchRefs: Array<{
    brandSlug: string;
    referenceSlug: string;
  }>;
};

export type JournalInventory = {
  publishedCount: number;
  unpublishedDraftCount: number;
};
