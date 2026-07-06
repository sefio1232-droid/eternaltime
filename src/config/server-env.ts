import "server-only";

export type ServerEnv = {
  nodeEnv: "development" | "test" | "production";
  catalogReadSource: "database" | "preview";
};

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const nodeEnv = source.NODE_ENV;
  const catalogReadSource = source.CATALOG_READ_SOURCE === "preview" ? "preview" : "database";

  if (nodeEnv === "production" || nodeEnv === "test") {
    return { nodeEnv, catalogReadSource };
  }

  return { nodeEnv: "development", catalogReadSource };
}
