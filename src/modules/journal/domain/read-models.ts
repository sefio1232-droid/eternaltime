export type JournalArticleCategory = "Выбор" | "Коллекционирование" | "Механизмы";

export type JournalArticleLayoutVariant = "feature" | "guide" | "essay" | "analysis";

export type JournalPresentationBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; id: string; text: string }
  | { type: "section-intro"; text: string }
  | { type: "ordered-section"; id: string; number: string; title: string; paragraphs: string[] }
  | { type: "statement"; text: string }
  | { type: "pull-quote"; text: string }
  | { type: "definition"; term: string; text: string }
  | { type: "key-point"; text: string }
  | { type: "comparison"; title: string; paragraphs: string[] }
  | { type: "side-note"; text: string }
  | { type: "divider" }
  | { type: "conclusion"; title: string; paragraphs: string[] }
  | { type: "related-link"; slug: string; label: string };

export type JournalWatchReference = {
  brandSlug: string;
  referenceSlug: string;
};

export type JournalArticleSection = {
  heading?: string;
  paragraphs: string[];
};

export type JournalArticleSummary = {
  slug: string;
  title: string;
  dek: string;
  excerpt: string;
  category: JournalArticleCategory;
  tags: string[];
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  readingTimeMinutes: number;
  featured: boolean;
  layoutVariant: JournalArticleLayoutVariant;
};

export type JournalArticle = JournalArticleSummary & {
  body: JournalArticleSection[];
  presentationBlocks: JournalPresentationBlock[];
  relatedArticleSlugs: string[];
  relatedWatchRefs: JournalWatchReference[];
  editorialWatchRefs: JournalWatchReference[];
  sourceFile: string;
  brandMentions: string[];
  modelMentions: string[];
  heroImage?: {
    src: string;
    alt: string;
    caption?: string;
  };
};

export type JournalInventory = {
  publishedCount: number;
  unpublishedDraftCount: number;
};

export type UpcomingEditorialStory = {
  id: string;
  number: "01" | "02" | "03";
  category: "ВЫБОР" | "МАТЕРИАЛЫ" | "МЕХАНИЗМЫ";
  title: string;
  description: string;
  status: "upcoming";
};
