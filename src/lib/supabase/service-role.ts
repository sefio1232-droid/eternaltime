import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/config/public-env";
import { getServerEnv } from "@/config/server-env";

export function createSupabaseServiceRoleClient(): SupabaseClient | null {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabase.url || !serverEnv.supabase.hasServiceRole) {
    return null;
  }

  return createClient(publicEnv.supabase.url, serverEnv.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
