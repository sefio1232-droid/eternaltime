import type { MetadataRoute } from "next";
import { foundationPublicRoutes } from "@/config/navigation";
import { getPublicEnv } from "@/config/public-env";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";

export default function sitemap(): MetadataRoute.Sitemap {
  const env = getPublicEnv();
  const now = new Date();
  const articleRoutes = listPublishedJournalArticles().map((article) => `/journal/${article.slug}`);

  return [...foundationPublicRoutes, ...articleRoutes].map((route) => ({
    url: `${env.appUrl}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
