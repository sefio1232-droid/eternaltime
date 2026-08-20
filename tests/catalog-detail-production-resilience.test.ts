import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("catalog detail production resilience", () => {
  it("does not let collection count failures crash public watch detail pages", () => {
    const action = source("src/components/collection/collection-watch-action.tsx");

    expect(action).toContain("safeCountActiveByReference");
    expect(action).toContain("try {");
    expect(action).toContain("repository.countActiveByReference");
    expect(action).toContain("catch (error)");
    expect(action).toContain("available: false");
    expect(action).toContain("Коллекция временно недоступна");
  });

  it("keeps the Next image cache writable for the production service user", () => {
    const deployScript = source("scripts/deploy-production.ps1");

    expect(deployScript).toContain('install -d -m 0755 "`$RELEASE_DIR/.next/cache/images"');
    expect(deployScript).toContain('chown -R "`$APP_USER":"`$APP_USER" "`$RELEASE_DIR/.next/cache"');
  });
});
