import { describe, expect, it } from "vitest";
import { developmentSiteUrl, resolveConfiguredSiteUrl } from "@/config/site-url";

function authCallbackUrl(siteUrl: string, returnTo = "/collection"): string {
  const url = new URL("/auth/callback", siteUrl);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

describe("auth site URL resolution", () => {
  it("uses the explicit production site URL for magic-link callbacks", () => {
    const resolved = resolveConfiguredSiteUrl({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://eternaltime.shop/",
    });

    expect(resolved.url).toBe("https://eternaltime.shop");
    expect(authCallbackUrl(resolved.url!)).toBe("https://eternaltime.shop/auth/callback?returnTo=%2Fcollection");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over legacy aliases when both are present", () => {
    const resolved = resolveConfiguredSiteUrl({
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://eternaltime.shop",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });

    expect(resolved).toMatchObject({
      url: "https://eternaltime.shop",
      source: "NEXT_PUBLIC_SITE_URL",
    });
  });

  it("uses localhost:3004 only for local development defaults", () => {
    expect(resolveConfiguredSiteUrl({ NODE_ENV: "development" }).url).toBe(developmentSiteUrl);
  });

  it("never falls back to localhost in production", () => {
    const resolved = resolveConfiguredSiteUrl({ NODE_ENV: "production" });

    expect(resolved.url).toBeNull();
    expect(JSON.stringify(resolved.issues)).toContain("localhost fallback is disabled in production");
  });
});
