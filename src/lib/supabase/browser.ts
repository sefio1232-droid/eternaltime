"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/config/public-env";

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const env = getPublicEnv();

  if (!env.supabase.isConfigured) {
    return null;
  }

  return createBrowserClient(env.supabase.url, env.supabase.publishableKey);
}
