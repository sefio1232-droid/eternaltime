import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/config/public-env";

export default function robots(): MetadataRoute.Robots {
  const env = getPublicEnv();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/admin", "/cart", "/checkout", "/api"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
