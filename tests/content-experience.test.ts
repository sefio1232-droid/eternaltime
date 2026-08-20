import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { faqItems, validateFaqItems } from "@/modules/faq/content/questions";
import {
  getJournalInventory,
  getPublishedJournalArticle,
  listPublishedJournalArticles,
  validateJournalArticleSources,
} from "@/modules/journal/application/journal-repository";
import { journalArticleSources, type JournalArticleSource } from "@/modules/journal/content/articles";

function file(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("content experience phase", () => {
  it("imports only the four supplied DOCX sources with the approved publication states", () => {
    expect(journalArticleSources).toHaveLength(4);
    expect(journalArticleSources.map((article) => article.sourceFile)).toEqual([
      "Гайды_по_брендам_часов_как_выбрать_марку_под_себя_и_не_переплатить.docx",
      "Заказ_часов_из_Китая_через_наш_интернет_магазин.docx",
      "Можно_ли_считать_часы_инвестицией.docx",
      "Почему_механические_часы_до_сих_пор_популярны.docx",
    ]);
    expect(journalArticleSources.map((article) => article.status)).toEqual(["published", "draft", "published", "published"]);
    expect(getJournalInventory()).toEqual({ publishedCount: 3, unpublishedDraftCount: 1 });
  });

  it("keeps exact titles, source structure, and unknown metadata unknown", () => {
    expect(journalArticleSources.map((article) => article.title)).toEqual([
      "Гайды по брендам часов: как выбрать марку под себя и не переплатить",
      "Заказ часов из Китая через наш интернет-магазин",
      "Можно ли считать часы инвестицией",
      "Почему механические часы до сих пор популярны",
    ]);
    expect(journalArticleSources.every((article) => article.body.length >= 10)).toBe(true);
    expect(journalArticleSources.every((article) => article.body.filter((section) => section.heading).length >= 9)).toBe(true);
    expect(journalArticleSources.every((article) => article.author === undefined && article.publishedAt === undefined)).toBe(true);
  });

  it("uses typographic covers and creates no unsupported Catalog relationships", () => {
    expect(journalArticleSources.every((article) => article.heroImage === undefined)).toBe(true);
    expect(journalArticleSources.every((article) => article.relatedWatchReferences.length === 0)).toBe(true);
    expect(file("src/app/(public)/journal/page.tsx")).toContain("JournalTypographicCover");
    expect(file("src/app/(public)/journal/[slug]/page.tsx")).toContain("JournalTypographicCover");
    expect(file("src/components/home/home-ecosystem-sections.tsx")).not.toContain("journalLeadWatch");
  });

  it("excludes drafts and held commercial claims from all public article reads", () => {
    const publicArticles = listPublishedJournalArticles();
    const investment = getPublishedJournalArticle("chasy-kak-investitsiya");
    expect(publicArticles.map((article) => article.slug)).toEqual([
      "pochemu-mekhanicheskie-chasy-populyarny",
      "kak-vybrat-brend-chasov",
      "chasy-kak-investitsiya",
    ]);
    expect(getPublishedJournalArticle("zakaz-chasov-iz-kitaya")).toBeNull();
    expect(JSON.stringify(investment)).not.toContain("Мы также ручаемся за качество и подлинность товара");
    expect(journalArticleSources.find((article) => article.slug === "chasy-kak-investitsiya")?.body.some((section) => section.visibility === "internal-review")).toBe(true);
  });

  it("validates slugs, relations, dates, categories, and local image policy", () => {
    expect(validateJournalArticleSources()).toEqual([]);
    const duplicate = structuredClone(journalArticleSources) as JournalArticleSource[];
    duplicate[1].slug = duplicate[0].slug;
    expect(validateJournalArticleSources(duplicate)).toContain(`${duplicate[0].slug}: duplicate slug`);

    const invalidRelation = structuredClone(journalArticleSources) as JournalArticleSource[];
    invalidRelation[0].relatedArticleSlugs = ["missing-article"];
    expect(validateJournalArticleSources(invalidRelation).some((issue) => issue.includes("unknown related article"))).toBe(true);

    const externalImage = structuredClone(journalArticleSources) as JournalArticleSource[];
    externalImage[0].heroImage = { src: "https://example.com/watch.jpg", alt: "Watch" };
    expect(validateJournalArticleSources(externalImage).some((issue) => issue.includes("hero image must be local"))).toBe(true);
  });

  it("keeps supplied Russian content on the required е spelling policy", () => {
    expect(/[ёЁ]/.test(JSON.stringify(journalArticleSources))).toBe(false);
    expect(/[ёЁ]/.test(JSON.stringify(faqItems))).toBe(false);
    expect(/[ёЁ]/.test(file("src/components/home/home-trust-plaques.tsx"))).toBe(false);
    expect(/[ёЁ]/.test(file("src/components/account/account-foundation.tsx"))).toBe(false);
  });

  it("publishes an exact visible FAQ data source and matching structured-data mapping", () => {
    expect(validateFaqItems()).toEqual([]);
    expect(faqItems).toHaveLength(10);
    expect(new Set(faqItems.map((item) => item.id)).size).toBe(faqItems.length);
    expect(faqItems.every((item) => item.answer.length > 40)).toBe(true);
    expect(faqItems.every((item) => !item.relatedLink || item.relatedLink.href.startsWith("/") || item.relatedLink.href.startsWith("mailto:"))).toBe(true);
    const page = file("src/app/(public)/faq/page.tsx");
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain("name: item.question");
    expect(page).toContain("text: item.answer");
  });

  it("does not invent commercial conditions and uses the approved contact in FAQ", () => {
    const answers = faqItems.map((item) => item.answer).join(" ");
    expect(answers).not.toMatch(/\+7\s?\(?\d{3}\)?/);
    expect(answers.match(/[\w.-]+@[\w.-]+/g)?.map((email) => email.replace(/[.,;:]+$/, ""))).toEqual(["timeeternal@mail.ru"]);
    expect(answers).not.toContain("гарантируем подлинность");
    expect(answers).toContain("Единый срок доставки не публикуется");
    expect(answers).toContain("Актуальные условия гарантии, возврата и обмена");
  });

  it("replaces the long brand story and six-step route with exactly two compact trust plaques", () => {
    const plaques = file("src/components/home/home-trust-plaques.tsx");
    const home = file("src/app/(public)/page.tsx");
    expect((plaques.match(/eyebrow:/g) ?? [])).toHaveLength(2);
    expect(plaques).toContain("Выбор начинается не с бренда");
    expect(plaques).toContain("Сделать выбор часов понятнее");
    expect(plaques).toContain('href: "/selection"');
    expect(plaques).toContain('href: "/collection"');
    expect(home).toContain("<HomeTrustPlaques />");
    expect(home).not.toContain("HomeBrandStory");
    expect(home).not.toContain("HomePurposeSpread");
    expect(home).not.toContain("HomeServiceRoute");
  });

  it("exposes Journal and FAQ through metadata, navigation, footer, and sitemap", () => {
    const navigation = file("src/config/navigation.ts");
    const footer = file("src/components/shell/public-shell.tsx");
    const sitemap = file("src/app/sitemap.ts");
    const articlePage = file("src/app/(public)/journal/[slug]/page.tsx");
    expect(navigation).toContain('"/faq"');
    expect(footer).toContain('href="/faq"');
    expect(sitemap).toContain("listPublishedJournalArticles");
    expect(sitemap).not.toContain("new Date()");
    expect(articlePage).toContain('"@type": "Article"');
    expect(articlePage).toContain("...(article.author ?");
    expect(articlePage).toContain("...(article.publishedAt ?");
  });
});
