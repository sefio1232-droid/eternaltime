import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import { getPublishedJournalArticle, validateJournalArticleSources } from "@/modules/journal/application/journal-repository";
import { resolveJournalArticleEditorialWatches, validateJournalEditorialWatches } from "@/modules/journal/application/journal-catalog-relations";
import { journalArticleSources } from "@/modules/journal/content/articles";
import { clearLocalCart, emptyLocalCart, localCartSchemaVersion, parseLocalCart, removeLocalCartItem, summarizeLocalCart, updateLocalCartQuantity } from "@/modules/cart/application/local-cart";

function source(relativePath: string) { return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"); }
function watch(brandSlug: string, referenceSlug: string, image: CatalogImagePresentation = { kind: "remote", url: `https://images.example/${brandSlug}-${referenceSlug}.png`, src: `https://images.example/${brandSlug}-${referenceSlug}.png`, alt: `${brandSlug} ${referenceSlug}` }): CatalogWatchDetail {
  return { id: `${brandSlug}:${referenceSlug}`, href: `/watches/${brandSlug}/${referenceSlug}`, brandName: brandSlug[0]!.toUpperCase() + brandSlug.slice(1), brandSlug, title: `${brandSlug} ${referenceSlug}`, officialName: null, referenceDisplay: referenceSlug.toUpperCase(), referenceNormalized: referenceSlug.toUpperCase(), referenceSlug, brandCollectionName: null, watchModelName: referenceSlug.toUpperCase(), publicPrice: { amountMinor: 104_000, currencyCode: "RUB" }, primaryImage: image, keySpecifications: [], brandLineName: null, imageGallery: image.kind === "none" ? [] : [image], specifications: [], siblingReferences: [] };
}
function dataset(watches: CatalogWatchDetail[]): CatalogReadDataset { return { source: "preview", generatedAt: "2026-08-04T00:00:00.000Z", watches, brands: [] }; }

describe("Journal visual edition and customer account correction", () => {
  it("keeps editorial examples separate from factual related references", () => {
    const published = journalArticleSources.filter((article) => article.status === "published");
    expect(published.every((article) => article.relatedWatchReferences.length === 0)).toBe(true);
    expect(published.map((article) => [article.slug, article.editorialWatchReferences.length])).toEqual([
      ["kak-vybrat-brend-chasov", 4],
      ["chasy-kak-investitsiya", 3],
      ["pochemu-mekhanicheskie-chasy-populyarny", 3],
    ]);
    expect(journalArticleSources.find((article) => article.status === "draft")?.editorialWatchReferences).toEqual([]);
    expect(published.flatMap((article) => article.editorialWatchReferences).every((reference) => !("price" in reference))).toBe(true);
  });

  it("resolves only exact brand-scoped references and rejects missing or unsafe images", () => {
    const article = getPublishedJournalArticle("pochemu-mekhanicheskie-chasy-populyarny")!;
    const watches = article.editorialWatchRefs.map((reference) => watch(reference.brandSlug, reference.referenceSlug));
    const validDataset = dataset(watches);
    expect(validateJournalEditorialWatches(article, validDataset)).toEqual([]);
    expect(resolveJournalArticleEditorialWatches(article, validDataset).map((item) => item.href)).toEqual(watches.map((item) => item.href));
    expect(validateJournalEditorialWatches(article, dataset(watches.slice(1)))[0]).toContain("unknown exact editorial reference");
    const unsafe = [{ ...watches[0]!, primaryImage: { kind: "none", alt: "missing" } as const }, ...watches.slice(1)];
    expect(validateJournalEditorialWatches(article, dataset(unsafe)).join(" ")).toContain("unsafe primary image");
  });

  it("rejects duplicate editorial references at the content boundary", () => {
    const sources = journalArticleSources.map((article, index) => index === 0 ? { ...article, editorialWatchReferences: [article.editorialWatchReferences[0]!, article.editorialWatchReferences[0]!] } : article);
    expect(validateJournalArticleSources(sources).join(" ")).toContain("duplicate editorial reference");
  });

  it("keeps the local cart versioned, deterministic and free of fake defaults", () => {
    expect(emptyLocalCart).toEqual({ schemaVersion: localCartSchemaVersion, items: [] });
    const item = { identity: "casio:a130we7adf", brand: "Casio", brandSlug: "casio", reference: "A130WE-7ADF", referenceSlug: "a130we7adf", canonicalHref: "/watches/casio/a130we7adf", publicPriceSnapshot: { amountMinor: 570_000, currencyCode: "RUB" as const }, quantity: 1, addedAt: "2026-08-04T00:00:00.000Z", source: "catalog" as const };
    const cart = parseLocalCart(JSON.stringify({ schemaVersion: 1, items: [item] }));
    expect(summarizeLocalCart(cart)).toEqual({ itemCount: 1, knownTotalMinor: 570_000, unknownPriceCount: 0 });
    expect(updateLocalCartQuantity(cart, item.identity, 3).items[0]?.quantity).toBe(3);
    expect(removeLocalCartItem(cart, item.identity)).toEqual(emptyLocalCart);
    expect(clearLocalCart()).toEqual(emptyLocalCart);
    expect(parseLocalCart('{"schemaVersion":2,"items":[]}')).toEqual(emptyLocalCart);
  });

  it("exposes ecommerce customer language and keeps the legacy requests route as a redirect", () => {
    const navigation = source("src/config/navigation.ts");
    const profileMenu = source("src/components/shell/profile-menu.tsx");
    const overview = source("src/components/account/account-foundation.tsx");
    expect(navigation).toContain('{ label: "Корзина", href: "/cart" }');
    expect(navigation).toContain('{ label: "Заказы", href: "/account/orders" }');
    expect(navigation.split("export const utilityNavigation")[0]).not.toContain('href: "/brands"');
    expect(profileMenu).not.toContain('label: "Заявки"');
    expect(overview).not.toContain("Полнота профиля");
    expect(overview).toContain("Полнота данных коллекции");
    expect(source("src/app/(account)/account/requests/page.tsx")).toContain('redirect("/account/orders")');
  });
});
