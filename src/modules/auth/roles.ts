export const roleCodes = [
  "customer",
  "admin",
  "catalog_manager",
  "content_manager",
  "order_manager",
] as const;

export type RoleCode = (typeof roleCodes)[number];

export function isAdminRole(role: RoleCode): boolean {
  return role === "admin";
}
