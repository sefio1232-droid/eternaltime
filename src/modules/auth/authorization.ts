import "server-only";

import { resolveAdminAccess } from "@/modules/auth/access-policy";
import { getUserRoles } from "@/modules/auth/role-source.server";
import { getCurrentUser, type AuthenticatedUser } from "@/modules/auth/server";

export type AccessResult =
  | { allowed: true; user: AuthenticatedUser }
  | {
      allowed: false;
      reason:
        | "auth_unconfigured"
        | "unauthenticated"
        | "role_source_unavailable"
        | "forbidden";
    };

export async function requireAuthenticatedUser(): Promise<AccessResult> {
  const currentUser = await getCurrentUser();

  if (currentUser.status === "unconfigured") {
    return { allowed: false, reason: "auth_unconfigured" };
  }

  if (!currentUser.user) {
    return { allowed: false, reason: "unauthenticated" };
  }

  return { allowed: true, user: currentUser.user };
}

export async function requireAdminAccess(): Promise<AccessResult> {
  const authenticated = await requireAuthenticatedUser();

  if (!authenticated.allowed) {
    return authenticated;
  }

  const roleSource = await getUserRoles(authenticated.user.id);

  if (roleSource.status !== "configured") {
    return { allowed: false, reason: "role_source_unavailable" };
  }

  const decision = resolveAdminAccess({
    isAuthenticated: true,
    roles: roleSource.roles,
  });

  if (!decision.allowed) {
    return { allowed: false, reason: decision.reason };
  }

  return { allowed: true, user: authenticated.user };
}
