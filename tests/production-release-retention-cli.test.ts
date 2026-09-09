import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, symlinkSync, readdirSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const source = path.resolve("scripts/production-release-retention.mjs");
const preload = pathToFileURL(path.resolve("tests/fixtures/retention-cli-preload.mjs")).href;
// Deliberately keep this tiny fixture for debugging; no recursive cleanup or
// production path override is introduced into the operational CLI.
const fixture = mkdtempSync(path.join(os.tmpdir(), "eternal-retention-cli-"));
const release = path.join(fixture, "releases", "20260807120000");
mkdirSync(path.join(release, "scripts"), { recursive: true });
copyFileSync(source, path.join(release, "scripts", "production-release-retention.mjs"));
symlinkSync(release, path.join(fixture, "current"), process.platform === "win32" ? "junction" : "dir");
const actual = path.join(release, "scripts", "production-release-retention.mjs");
const linked = path.join(fixture, "current", "scripts", "production-release-retention.mjs");

function invoke(script: string, mode = "valid", extra: string[] = []) {
  return spawnSync(process.execPath, ["--import", preload, script, "--dry-run", ...extra], {
    cwd: fixture, encoding: "utf8", timeout: 10000,
    env: { ...process.env, RETENTION_CLI_TEST_MODE: mode },
  });
}
function plan(stdout: string) {
  return JSON.parse(stdout.slice(0, stdout.indexOf('\n{\n  "mode"')));
}

describe("retention executable path regression", () => {
  it("executes real CLI via a release path and a real current symlink with identical plans", () => {
    expect(realpathSync(linked)).toBe(realpathSync(actual));
    const direct = invoke(actual);
    const symlink = invoke(linked);
    expect(direct.status, direct.stderr).toBe(0);
    expect(symlink.status, symlink.stderr).toBe(0);
    expect(symlink.stdout).toBe(direct.stdout);
    expect(plan(direct.stdout)).toMatchObject({
      CURRENT: "/opt/eternal-time/releases/20260807120000", DRY_RUN: true,
      DELETE: [{ path: "/opt/eternal-time/releases/20260801120000", bytes: 1024 }],
    });
    expect(plan(direct.stdout).KEEP).toHaveLength(6);
    expect(symlink.stdout).toContain('"deleted": []');
    expect(readdirSync(path.join(release, "scripts"))).toEqual(["production-release-retention.mjs"]);
  });
  it("supports relative current and actual paths independently of caller cwd", () => {
    expect(invoke(path.relative(fixture, actual)).stdout).toBe(invoke(path.relative(fixture, linked)).stdout);
    expect(invoke(path.relative(fixture, linked)).status).toBe(0);
  });
  it.each(["broken", "outside", "root-escape"])("fails closed and visibly for %s current/root", (mode) => {
    for (const script of [actual, linked]) {
      const result = invoke(script, mode);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("RETENTION STOPPED:");
      expect(result.stdout).toBe("");
    }
  });
  it("does not accept any CLI override that escapes the fixed production root", () => {
    const result = invoke(linked, "valid", ["--root", fixture]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage:");
  });
  it("fails nonzero on an unresolvable CLI entry path, instead of a successful no-op", () => {
    const code = `process.argv[1] = ${JSON.stringify(path.join(fixture, "missing.mjs"))}; await import(${JSON.stringify(pathToFileURL(source).href)});`;
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", code], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("RETENTION STOPPED:");
  });
  it("importing the helper does not invoke its production CLI", () => {
    const code = `await import(${JSON.stringify(pathToFileURL(source).href)}); console.log('import-only');`;
    expect(execFileSync(process.execPath, ["--input-type=module", "--eval", code], { encoding: "utf8" }).trim()).toBe("import-only");
  });
});
