import { describe, expect, it } from "vitest";
import { getPublicEnv } from "@/config/public-env";

describe("getPublicEnv", () => {
  it("uses safe defaults when Supabase is not configured", () => {
    const env = getPublicEnv({});

    expect(env.appUrl).toBe("http://localhost:3004");
    expect(env.supabase.isConfigured).toBe(false);
    expect(env.issues).toEqual([]);
  });

  it("does not fall back to localhost in production when the site URL is missing", () => {
    const env = getPublicEnv({ NODE_ENV: "production" });

    expect(env.appUrl).toBe("");
    expect(JSON.stringify(env.issues)).toContain("localhost fallback is disabled in production");
  });

  it("supports the production site URL alias used for auth redirects", () => {
    const env = getPublicEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://eternaltime.shop/",
    });

    expect(env.appUrl).toBe("https://eternaltime.shop");
    expect(env.issues).toEqual([]);
  });

  it("reports partial Supabase configuration without treating it as configured", () => {
    const env = getPublicEnv({
      NEXT_PUBLIC_APP_URL: "https://eternal-time.example",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    });

    expect(env.supabase.isConfigured).toBe(false);
    expect(env.issues).toEqual([
      {
        key: "NEXT_PUBLIC_SUPABASE",
        message: "Supabase URL and publishable key must be provided together.",
      },
    ]);
  });

  it("does not expose the server admin secret through the public env contract", () => {
    const env = getPublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SECRET_KEY: "sb_secret_should_not_be_visible",
    });

    expect(env.supabase.isConfigured).toBe(true);
    expect(JSON.stringify(env)).not.toContain("sb_secret");
    expect(Object.keys(env.supabase)).toEqual(["isConfigured", "url", "publishableKey"]);
  });
});
