import { isAdminRole, type RoleCode } from "@/modules/auth/roles";

export type AdminAccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "unauthenticated" | "role_source_unavailable" | "forbidden";
    };

export function resolveAdminAccess(input: {
  isAuthenticated: boolean;
  roles: RoleCode[] | null;
}): AdminAccessDecision {
  if (!input.isAuthenticated) {
    return { allowed: false, reason: "unauthenticated" };
  }

  if (!input.roles) {
    return { allowed: false, reason: "role_source_unavailable" };
  }

  if (input.roles.some(isAdminRole)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "forbidden" };
}
