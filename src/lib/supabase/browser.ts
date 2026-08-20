"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/config/public-env";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const env = getPublicEnv();

  if (!env.supabase.isConfigured) {
    return null;
  }

  return createBrowserClient<Database>(env.supabase.url, env.supabase.publishableKey);
}
