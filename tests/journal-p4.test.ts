import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getPublishedJournalArticle,
  listPublishedJournalArticles,
  validateJournalArticleSources,
} from "@/modules/journal/application/journal-repository";
import { journalArticleSources } from "@/modules/journal/content/articles";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const p4Slugs = [
  "razmer-chasov-i-geometriya-posadki",
  "vodonepronitsaemost-chasov-bez-mifov",
  "mekhanika-kvarts-i-solar-v-povsednevnom-vladenii",
] as const;

const bannedEditorialPhrases = [
  "Важно отметить",
  "Стоит отметить",
  "Давайте",
  "Не просто",
  "Не только",
  "Идеальный",
  "Уникальный",
  "Без компромиссов",
  "Погрузимся",
  "Разберемся",
  "Разберёмся",
  "В мире",
] as const;

describe("P4 Journal 2.0", () => {
  it("publishes exactly three new editorial guides from the P4 brief", () => {
    const p4Articles = journalArticleSources.filter((article) => article.sourceFile === "P4 editorial brief");

    expect(p4Articles.map((article) => article.slug)).toEqual([...p4Slugs]);
    expect(p4Articles.every((article) => article.status === "published")).toBe(true);
    expect(p4Articles.every((article) => article.relatedWatchReferences.length === 0)).toBe(true);
    expect(p4Articles.every((article) => article.editorialWatchReferences.length >= 3)).toBe(true);
    expect(validateJournalArticleSources()).toEqual([]);
  });

  it("keeps new article prose calm, useful and free of banned filler phrases or hardcoded prices", () => {
    for (const slug of p4Slugs) {
      const article = getPublishedJournalArticle(slug);
      expect(article).toBeTruthy();
      const text = JSON.stringify(article);
      for (const phrase of bannedEditorialPhrases) {
        expect(text).not.toContain(phrase);
      }
      expect(text).not.toMatch(/\d[\d\s]*(?:₽|руб)/i);
      expect(article?.author).toBeUndefined();
      expect(article?.publishedAt).toBeUndefined();
    }
  });

  it("exposes published P4 articles through repository, sitemap/static params and metadata", () => {
    const publishedSlugs = listPublishedJournalArticles().map((article) => article.slug);
    for (const slug of p4Slugs) expect(publishedSlugs).toContain(slug);

    const indexPage = read("src/app/(public)/journal/page.tsx");
    const articlePage = read("src/app/(public)/journal/[slug]/page.tsx");
    const sitemap = read("src/app/sitemap.ts");

    for (const slug of p4Slugs) expect(indexPage).toContain(slug);
    expect(sitemap).toContain("listPublishedJournalArticles");
    expect(articlePage).toContain("generateStaticParams");
    expect(articlePage).toContain('\"@type\": \"Article\"');
    expect(articlePage).toContain("article.seo?.title");
    expect(articlePage).toContain("article.seo?.description");
  });

  it("turns Journal product embeds into canonical, commerce-aware funnel links", () => {
    const plate = read("src/components/journal/editorial-watch-plate.tsx");
    const articlePage = read("src/app/(public)/journal/[slug]/page.tsx");

    expect(plate).toContain("TrackedLink");
    expect(plate).toContain("eventName=\"journal_product_click\"");
    expect(plate).toContain("watch.href");
    expect(plate).toContain("watch.publicCommerceState?.kind");
    expect(articlePage).toContain("eventName=\"journal_selection_click\"");
  });
});
