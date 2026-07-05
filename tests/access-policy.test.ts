import { describe, expect, it } from "vitest";
import { resolveAdminAccess } from "@/modules/auth/access-policy";

describe("resolveAdminAccess", () => {
  it("fails closed when a user is not authenticated", () => {
    expect(resolveAdminAccess({ isAuthenticated: false, roles: ["admin"] })).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
  });

  it("fails closed when the role source is not available yet", () => {
    expect(resolveAdminAccess({ isAuthenticated: true, roles: null })).toEqual({
      allowed: false,
      reason: "role_source_unavailable",
    });
  });

  it("allows only explicit admin role membership", () => {
    expect(resolveAdminAccess({ isAuthenticated: true, roles: ["customer"] })).toEqual({
      allowed: false,
      reason: "forbidden",
    });
    expect(resolveAdminAccess({ isAuthenticated: true, roles: ["admin"] })).toEqual({
      allowed: true,
    });
  });
});
