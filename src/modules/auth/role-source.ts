import { z } from "zod";
import { isRoleCode, type RoleCode } from "@/modules/auth/roles";

const roleRowSchema = z.object({
  roles: z.object({
    code: z.string(),
  }),
});

export function parseUserRoleRows(value: unknown): RoleCode[] {
  const rows = z.array(roleRowSchema).parse(value);
  const roles = rows.map((row) => row.roles.code).filter(isRoleCode);

  return Array.from(new Set(roles));
}
