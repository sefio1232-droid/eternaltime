import type { ServerEnv } from "@/config/server-env";

export type CatalogReadSourcePolicy =
  | {
      allowed: true;
      source: "preview" | "database";
    }
  | {
      allowed: false;
      code: "catalog_source_not_configured";
      message: string;
    };

export function resolveCatalogReadSourcePolicy(env: ServerEnv): CatalogReadSourcePolicy {
  if (env.catalogReadSource === "preview") {
    if (env.nodeEnv === "production") {
      return {
        allowed: false,
        code: "catalog_source_not_configured",
        message: "Preview catalog source is disabled in production.",
      };
    }

    return { allowed: true, source: "preview" };
  }

  return { allowed: true, source: "database" };
}
