import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/config/public-env";
import { getServerEnv } from "@/config/server-env";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseAdminClient(): SupabaseClient<Database> | null {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabase.url || !serverEnv.supabase.hasAdminSecret) {
    return null;
  }

  return createClient<Database>(publicEnv.supabase.url, serverEnv.supabase.adminSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
