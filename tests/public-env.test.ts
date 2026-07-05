import { describe, expect, it } from "vitest";
import { getPublicEnv } from "@/config/public-env";

describe("getPublicEnv", () => {
  it("uses safe defaults when Supabase is not configured", () => {
    const env = getPublicEnv({});

    expect(env.appUrl).toBe("http://localhost:3000");
    expect(env.supabase.isConfigured).toBe(false);
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
});
