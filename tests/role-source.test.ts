import { describe, expect, it } from "vitest";
import { parseUserRoleRows } from "@/modules/auth/role-source";

describe("parseUserRoleRows", () => {
  it("returns unique known role codes from joined user_roles rows", () => {
    expect(
      parseUserRoleRows([
        { roles: { code: "admin" } },
        { roles: { code: "admin" } },
        { roles: { code: "catalog_manager" } },
        { roles: { code: "unknown_future_role" } },
      ]),
    ).toEqual(["admin", "catalog_manager"]);
  });
});
