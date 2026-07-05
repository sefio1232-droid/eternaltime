import type { MetadataRoute } from "next";
import { foundationPublicRoutes } from "@/config/navigation";
import { getPublicEnv } from "@/config/public-env";

export default function sitemap(): MetadataRoute.Sitemap {
  const env = getPublicEnv();
  const now = new Date();

  return foundationPublicRoutes.map((route) => ({
    url: `${env.appUrl}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
