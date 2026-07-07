import { describe, expect, it } from "vitest";
import {
  accountNavigation,
  adminNavigation,
  foundationPublicRoutes,
  publicNavigation,
  utilityNavigation,
} from "@/config/navigation";

function expectUniqueHrefs(hrefs: string[]) {
  expect(new Set(hrefs).size).toBe(hrefs.length);
}

describe("foundation navigation", () => {
  it("keeps SEO sitemap routes public-only", () => {
    expect(foundationPublicRoutes.every((route) => !route.startsWith("/account"))).toBe(true);
    expect(foundationPublicRoutes.every((route) => !route.startsWith("/admin"))).toBe(true);
    expect(foundationPublicRoutes).not.toContain("/cart");
  });

  it("does not leak admin links into public navigation", () => {
    const publicHrefs = [...publicNavigation, ...utilityNavigation].map((item) => item.href);

    expect(publicHrefs.every((href) => !href.startsWith("/admin"))).toBe(true);
    expectUniqueHrefs(publicHrefs);
  });

  it("keeps the reset public header navigation focused", () => {
    expect(publicNavigation.map((item) => item.href)).toEqual([
      "/watches",
      "/selection",
      "/journal",
      "/brands",
    ]);
    expect(utilityNavigation.map((item) => item.href)).toEqual(["/collection", "/account"]);
  });

  it("keeps protected route menus internally unique", () => {
    expectUniqueHrefs(accountNavigation.map((item) => item.href));
    expectUniqueHrefs(adminNavigation.map((item) => item.href));
  });
});
