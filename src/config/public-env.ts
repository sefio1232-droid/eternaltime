import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional().or(z.literal("")),
});

export type PublicEnvIssue = {
  key: string;
  message: string;
};

export type PublicEnv = {
  appUrl: string;
  supabase: {
    isConfigured: boolean;
    url: string;
    publishableKey: string;
  };
  issues: PublicEnvIssue[];
};

export function getPublicEnv(source: Record<string, string | undefined> = process.env): PublicEnv {
  const parsed = publicEnvSchema.safeParse(source);

  if (!parsed.success) {
    return {
      appUrl: "http://localhost:3000",
      supabase: {
        isConfigured: false,
        url: "",
        publishableKey: "",
      },
      issues: parsed.error.issues.map((issue) => ({
        key: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const supabaseUrl = parsed.data.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabasePublishableKey = parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
  const hasPartialSupabaseConfig = Boolean(supabaseUrl || supabasePublishableKey) && !isSupabaseConfigured;

  return {
    appUrl: parsed.data.NEXT_PUBLIC_APP_URL,
    supabase: {
      isConfigured: isSupabaseConfigured,
      url: supabaseUrl,
      publishableKey: supabasePublishableKey,
    },
    issues: hasPartialSupabaseConfig
      ? [
          {
            key: "NEXT_PUBLIC_SUPABASE",
            message: "Supabase URL and publishable key must be provided together.",
          },
        ]
      : [],
  };
}
