import path from "node:path";

export function catalogImageNodeEnv(input?: {
  nodeEnv?: "development" | "test" | "production";
}): "development" | "test" | "production" {
  if (input?.nodeEnv) return input.nodeEnv;
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return process.env.NODE_ENV;
  return "development";
}

export function resolveCatalogImageAssetRoot(input?: {
  rootDir?: string;
  nodeEnv?: "development" | "test" | "production";
}): string | null {
  const explicitRoot = process.env.CATALOG_IMAGE_ASSET_ROOT?.trim();
  if (explicitRoot) return path.resolve(/* turbopackIgnore: true */ explicitRoot);

  const nodeEnv = catalogImageNodeEnv({ nodeEnv: input?.nodeEnv });
  if (nodeEnv === "production") return null;

  return path.resolve(/* turbopackIgnore: true */ input?.rootDir ?? process.cwd());
}
