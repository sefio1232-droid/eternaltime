import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPublishedJournalArticle, validateJournalArticleSources } from "@/modules/journal/application/journal-repository";
import { journalArticleSources } from "@/modules/journal/content/articles";
import {
  emptyLocalAccountProfile,
  parseLocalAccountProfile,
  serializeLocalAccountProfile,
  validateLocalAccountProfile,
} from "@/modules/account/profile/local-account-profile";

function file(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("premium editorial and account foundation", () => {
  it("assigns deterministic validated layout variants without changing publication state", () => {
    expect(validateJournalArticleSources()).toEqual([]);
    expect(journalArticleSources.map((article) => [article.slug, article.layoutVariant, article.status])).toEqual([
      ["kak-vybrat-brend-chasov", "guide", "published"],
      ["zakaz-chasov-iz-kitaya", "analysis", "draft"],
      ["chasy-kak-investitsiya", "essay", "published"],
      ["pochemu-mekhanicheskie-chasy-populyarny", "feature", "published"],
    ]);
    expect(getPublishedJournalArticle("zakaz-chasov-iz-kitaya")).toBeNull();
  });

  it("builds presentation blocks only from public source paragraphs", () => {
    for (const source of journalArticleSources.filter((article) => article.status === "published")) {
      const article = getPublishedJournalArticle(source.slug)!;
      const publicText = source.body
        .filter((section) => section.visibility !== "internal-review")
        .flatMap((section) => [section.heading, ...section.paragraphs])
        .filter(Boolean);
      const blockText = article.presentationBlocks.flatMap((block) => {
        if ("paragraphs" in block) return block.paragraphs;
        if ("text" in block) return [block.text];
        return [];
      });
      for (const paragraph of source.body.flatMap((section) => section.visibility === "internal-review" ? [] : section.paragraphs)) {
        expect(blockText).toContain(paragraph);
      }
      expect(publicText.length).toBeGreaterThan(10);
    }
  });

  it("keeps two explicit unique related stories on every published article", () => {
    for (const source of journalArticleSources.filter((article) => article.status === "published")) {
      expect(source.relatedArticleSlugs).toHaveLength(2);
      expect(new Set(source.relatedArticleSlugs).size).toBe(2);
      expect(source.relatedArticleSlugs).not.toContain(source.slug);
    }
  });

  it("exposes the required account routes and redirects collection to its canonical surface", () => {
    const layout = file("src/app/(account)/account/layout.tsx");
    const overview = file("src/app/(account)/account/page.tsx");
    const profile = file("src/app/(account)/account/profile/page.tsx");
    const requests = file("src/app/(account)/account/requests/page.tsx");
    const collection = file("src/app/(account)/account/collection/page.tsx");
    expect(layout).toContain("AccountShell");
    expect(layout).not.toContain("requireAuthenticatedUser");
    expect(overview).toContain("AccountOverview");
    expect(profile).toContain("AccountProfileEditor");
    expect(requests).toContain('redirect("/account/orders")');
    expect(file("src/app/(account)/account/orders/page.tsx")).toContain("AccountOrders");
    expect(file("src/app/(shop)/cart/page.tsx")).toContain("CartExperience");
    expect(collection).toContain('redirect("/collection")');
  });

  it("uses a versioned local profile schema with validation and no server integration", () => {
    const raw = serializeLocalAccountProfile({ ...emptyLocalAccountProfile, name: "Сергей", email: "user@example.test" });
    expect(parseLocalAccountProfile(raw)).toMatchObject({ name: "Сергей", email: "user@example.test" });
    expect(parseLocalAccountProfile('{"version":2,"profile":{}}')).toBeNull();
    expect(validateLocalAccountProfile({ ...emptyLocalAccountProfile, email: "invalid" })).toEqual({ email: "Проверьте формат электронной почты." });
    expect(file("src/components/account/account-foundation.tsx")).not.toMatch(/supabase|createUser|orderId/i);
  });

  it("keeps account pages noindex and out of the sitemap", () => {
    expect(file("src/app/(account)/account/layout.tsx")).toContain("index: false");
    expect(file("src/app/sitemap.ts")).not.toContain('"/account"');
  });
});
