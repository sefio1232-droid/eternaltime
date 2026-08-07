import type { MetadataRoute } from "next";
import { foundationPublicRoutes } from "@/config/navigation";
import { getPublicEnv } from "@/config/public-env";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";

export default function sitemap(): MetadataRoute.Sitemap {
  const env = getPublicEnv();
  const staticRoutes: MetadataRoute.Sitemap = foundationPublicRoutes.map((route) => ({
    url: `${env.appUrl}${route}`,
    changeFrequency: route === "/journal" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/journal" || route === "/faq" ? 0.7 : 0.6,
  }));
  const articleRoutes: MetadataRoute.Sitemap = listPublishedJournalArticles().map((article) => ({
    url: `${env.appUrl}/journal/${article.slug}`,
    changeFrequency: "monthly",
    priority: article.featured ? 0.7 : 0.6,
    ...(article.updatedAt || article.publishedAt ? { lastModified: article.updatedAt ?? article.publishedAt } : {}),
  }));

  return [...staticRoutes, ...articleRoutes];
}
