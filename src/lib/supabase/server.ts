import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/config/public-env";

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = getPublicEnv();

  if (!env.supabase.isConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabase.url, env.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware refresh handles mutable cookie writes.
        }
      },
    },
  });
}
