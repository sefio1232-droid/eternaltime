import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serializeError, serverLog } from "@/lib/logging/logger";
import { parseUserRoleRows } from "@/modules/auth/role-source";
import type { RoleCode } from "@/modules/auth/roles";

export type UserRolesResult =
  | { status: "configured"; roles: RoleCode[] }
  | { status: "unconfigured"; roles: null }
  | { status: "error"; roles: null };

export async function getUserRoles(userId: string): Promise<UserRolesResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unconfigured", roles: null };
  }

  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("roles!inner(code)")
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (error) {
      serverLog("warn", "Failed to load user roles.", {
        userId,
        error: error.message,
      });

      return { status: "error", roles: null };
    }

    return { status: "configured", roles: parseUserRoleRows(data) };
  } catch (error) {
    serverLog("error", "Unexpected user role source failure.", {
      userId,
      error: serializeError(error).message,
    });

    return { status: "error", roles: null };
  }
}
