import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serializeError, serverLog } from "@/lib/logging/logger";

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

export type CurrentUserResult =
  | { status: "configured"; user: AuthenticatedUser | null }
  | { status: "unconfigured"; user: null };

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unconfigured", user: null };
  }

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return { status: "configured", user: null };
    }

    return {
      status: "configured",
      user: {
        id: data.user.id,
        email: data.user.email ?? undefined,
      },
    };
  } catch (error) {
    serverLog("error", "Failed to read current user from Supabase.", {
      error: serializeError(error).message,
    });

    return { status: "configured", user: null };
  }
}
