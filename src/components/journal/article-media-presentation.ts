import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

export type ArticleMediaVariant = "none" | "landscape" | "contained" | "side" | "compact";

const compactArticleSlugs = new Set(["orient-bambino-first-mechanical-watch"]);
const sideArticleSlugs = new Set(["choose-watch-size-for-wrist", "watches-for-shirt-and-everyday"]);

export function resolveArticleMediaVariant(
  image: CatalogImagePresentation | null,
  articleSlug: string,
): ArticleMediaVariant {
  if (!image || image.kind === "none") return "none";
  if (compactArticleSlugs.has(articleSlug)) return "compact";
  if (sideArticleSlugs.has(articleSlug)) return "side";

  // ZIP catalog photography has no trusted intrinsic dimensions in the read model.
  // Keep it contained so a small source is never promoted to a fullscreen hero.
  if (image.kind === "development_zip") return "contained";

  return "landscape";
}
