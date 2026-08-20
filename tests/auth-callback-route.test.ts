import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("auth callback route origin handling", () => {
  it("does not base redirects on the internal request URL", () => {
    const source = readFileSync("src/app/auth/callback/route.ts", "utf8");

    expect(source).toContain("buildAuthRedirectUrl");
    expect(source).not.toContain("new URL(returnTo, request.url)");
    expect(source).not.toContain("request.url)");
  });
});
