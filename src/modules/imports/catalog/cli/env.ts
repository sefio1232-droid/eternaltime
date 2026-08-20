import { loadEnvConfig } from "@next/env";

let loaded = false;

export function loadCatalogCliEnv(rootDir: string): void {
  if (loaded) {
    return;
  }

  loadEnvConfig(rootDir);
  loaded = true;
}
