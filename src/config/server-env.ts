import "server-only";

export type ServerEnv = {
  nodeEnv: "development" | "test" | "production";
};

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const nodeEnv = source.NODE_ENV;

  if (nodeEnv === "production" || nodeEnv === "test") {
    return { nodeEnv };
  }

  return { nodeEnv: "development" };
}
