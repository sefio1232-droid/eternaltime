import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deployScript = readFileSync("scripts/deploy-production.ps1", "utf8");

describe("production deploy workflow", () => {
  it("keeps the default deploy code-only through remote git instead of uploading the source archive", () => {
    expect(deployScript).toContain("[switch]$UploadSourceArchive");
    expect(deployScript).toContain("Default code-only deploy checks out $sourceCommit");
    expect(deployScript).toContain("Source archive upload skipped for default remote-git code-only deploy.");
    expect(deployScript).toContain('UPLOAD_SOURCE_ARCHIVE="$uploadSourceArchiveValue"');
    expect(deployScript).toContain('git clone --no-tags --single-branch --branch "`$REPO_BRANCH" "`$REPO_URL" "`$RELEASE_DIR"');
  });

  it("keeps catalog asset transfer behind the explicit DeployCatalogAssets flag", () => {
    expect(deployScript).toContain("[switch]$DeployCatalogAssets");
    expect(deployScript).toContain('DEPLOY_CATALOG_ASSETS="$deployCatalogAssetsValue"');
    expect(deployScript).toContain("Catalog asset upload skipped for default code-only deploy.");
    expect(deployScript).toContain('catalog asset sync skipped; preserving `$ASSET_DIR');
  });
});
