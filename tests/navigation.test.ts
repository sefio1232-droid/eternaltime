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

  it("routes global search to the public catalog search surface", () => {
    expect(utilityNavigation.find((item) => item.label === "Поиск")?.href).toBe("/watches?q=");
    expect(publicNavigation.map((item) => item.href)).toEqual([
      "/watches",
      "/selection",
      "/brands",
      "/journal",
      "/collection",
    ]);
  });

  it("keeps protected route menus internally unique", () => {
    expectUniqueHrefs(accountNavigation.map((item) => item.href));
    expectUniqueHrefs(adminNavigation.map((item) => item.href));
  });
});
