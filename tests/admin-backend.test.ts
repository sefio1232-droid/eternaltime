import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveAdminAccess } from "@/modules/auth/access-policy";

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

describe("admin backend authorization", () => {
  it("denies unauthenticated and ordinary authenticated users", () => {
    expect(resolveAdminAccess({ isAuthenticated: false, roles: ["admin"] })).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
    expect(resolveAdminAccess({ isAuthenticated: true, roles: ["customer"] })).toEqual({
      allowed: false,
      reason: "forbidden",
    });
  });

  it("allows an admin role to reach admin operations", () => {
    expect(resolveAdminAccess({ isAuthenticated: true, roles: ["admin"] })).toEqual({ allowed: true });
  });

  it("does not treat an email address as an admin privilege", () => {
    const ownerEmail = "s3rgushik@yandex.ru";
    const policySource = read("src/modules/auth/access-policy.ts");
    const authorizationSource = read("src/modules/auth/authorization.ts");

    expect(resolveAdminAccess({ isAuthenticated: true, roles: [] })).toEqual({
      allowed: false,
      reason: "forbidden",
    });
    expect(resolveAdminAccess({ isAuthenticated: true, roles: ["customer"] })).toEqual({
      allowed: false,
      reason: "forbidden",
    });
    expect(`${policySource}\n${authorizationSource}`).not.toContain(ownerEmail);
  });

  it("protects admin pages and data repositories server-side", () => {
    const layout = read("src/app/(admin)/admin/layout.tsx");
    const repository = read("src/modules/admin/infrastructure/admin-repository.server.ts");
    const orderDetailPage = read("src/app/(admin)/admin/orders/[orderNumber]/page.tsx");

    expect(layout).toContain("requireAdminAccess");
    expect(repository).toContain("await requireAdminAccess()");
    expect(repository).toContain("createSupabaseAdminClient");
    expect(orderDetailPage).toContain("getAdminOrderDetail");
    expect(orderDetailPage).not.toContain("getOrderDetailByNumber");
  });

  it("lists real admin orders and users through Supabase, not mocks", () => {
    const repository = read("src/modules/admin/infrastructure/admin-repository.server.ts");
    const ordersPage = read("src/app/(admin)/admin/orders/page.tsx");
    const usersPage = read("src/app/(admin)/admin/users/page.tsx");

    expect(repository).toContain('.from("orders")');
    expect(repository).toContain("order_items(*)");
    expect(repository).toContain("order_shipments(*)");
    expect(repository).toContain("payment_attempts(*)");
    expect(repository).toContain("client.auth.admin.listUsers");
    expect(usersPage).toContain("listAdminUsersForPanel");
    expect(ordersPage).toContain("listAdminOrdersForPanel");
    expect(`${repository}\n${ordersPage}\n${usersPage}`.toLowerCase()).not.toContain("mock");
  });

  it("requires server-side admin authorization before every admin API operation", () => {
    const adminApiRoutes = [
      "src/app/api/admin/orders/[orderNumber]/status/route.ts",
      "src/app/api/admin/orders/[orderNumber]/refund/route.ts",
      "src/app/api/admin/orders/[orderNumber]/shipment/create/route.ts",
      "src/app/api/admin/orders/[orderNumber]/shipment/refresh/route.ts",
    ];

    for (const route of adminApiRoutes) {
      const source = read(route);
      const guardIndex = source.indexOf("await requireAdminAccess()");
      const deniedIndex = source.indexOf("!access.allowed");

      expect(guardIndex).toBeGreaterThan(-1);
      expect(deniedIndex).toBeGreaterThan(guardIndex);
      expect(source).toMatch(/status: access\.reason === "unauthenticated" \? 401 : 403/);
    }
  });

  it("keeps admin owner bootstrap explicit and does not create fake auth users", () => {
    const script = read("scripts/bootstrap-admin.mjs");

    expect(script).toContain("s3rgushik@yandex.ru");
    expect(script).toContain("listUsers");
    expect(script).toContain('.from("user_roles")');
    expect(script).toContain('.from("roles")');
    expect(script).not.toContain("createUser");
    expect(script).not.toContain("inviteUserByEmail");
  });

  it("does not hardcode the owner email as an authorization source in app routes or middleware", () => {
    const appFiles = [
      "src/app/(admin)/admin/layout.tsx",
      "src/app/(admin)/admin/page.tsx",
      "src/app/(admin)/admin/orders/page.tsx",
      "src/app/(admin)/admin/orders/[orderNumber]/page.tsx",
      "src/app/(admin)/admin/users/page.tsx",
      "src/lib/supabase/middleware.ts",
      "src/modules/auth/authorization.ts",
      "src/modules/auth/access-policy.ts",
    ];

    for (const file of appFiles) {
      expect(read(file)).not.toContain("s3rgushik@yandex.ru");
    }
  });

  it("does not expose auth secrets to admin client UI files", () => {
    const uiFiles = [
      "src/app/(admin)/admin/page.tsx",
      "src/app/(admin)/admin/orders/page.tsx",
      "src/app/(admin)/admin/orders/[orderNumber]/page.tsx",
      "src/app/(admin)/admin/users/page.tsx",
      "src/components/commerce/orders-view.tsx",
    ];
    const forbidden = /password|hash|access_token|refresh_token|session|SUPABASE_SECRET_KEY|SERVICE_ROLE/i;

    for (const file of uiFiles) {
      expect(read(file)).not.toMatch(forbidden);
    }
  });
});
