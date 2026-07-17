import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const file = (path: string) => readFileSync(join(root, path), "utf8");

describe("homepage hero v3 kinetic editorial prototype", () => {
  it("keeps v3 isolated from production homepage, v1, v2, and sitemap", () => {
    const home = file("src/app/(public)/page.tsx");
    const sitemap = file("src/app/sitemap.ts");
    const originalLab = file("src/app/design-lab/home-hero/home-hero-design-lab.tsx");
    const v2Lab = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.tsx");
    const page = file("src/app/design-lab/home-hero-v3/page.tsx");

    expect(home).not.toContain("home-hero-v3");
    expect(home).not.toContain("HomeHeroV3DesignLab");
    expect(originalLab).not.toContain("home-hero-v3");
    expect(originalLab).not.toContain("HomeHeroV3DesignLab");
    expect(v2Lab).not.toContain("home-hero-v3");
    expect(v2Lab).not.toContain("HomeHeroV3DesignLab");
    expect(sitemap).not.toContain("home-hero-v3");
    expect(page).toContain("index: false");
    expect(page).toContain("follow: false");
    expect(page).toContain('process.env.NODE_ENV === "production"');
    expect(page).toContain("notFound()");
  });

  it("keeps the single approved product and v3 route scope", () => {
    const lab = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.module.css");

    expect(lab).toContain("use client");
    expect(lab).toContain("Homepage Hero V3 Kinetic Editorial Prototype");
    expect(lab).toContain("Tissot");
    expect(lab).toContain("PR 100 Chronograph");
    expect(lab).toContain("T150.417.11.041.00");
    expect(lab).toContain("publicPriceRub: 45678");
    expect(lab).toContain("/generated/home-hero/candidates/01-everyday/secondary-01.png");
    expect(styles).toContain("min-height: calc(100svh - 72px)");
    expect(styles).toContain("grid-template-columns: minmax(410px, 48%) minmax(0, 52%)");
    expect(styles).not.toContain(".largeScenarioNumber");
  });

  it("defines the kinetic layer model and controlled maximum offsets", () => {
    const lab = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.module.css");

    for (const layer of [
      "backgroundFieldLayer",
      "dialBackLayer",
      "backgroundWordLayer",
      "watchShadowLayer",
      "mainWatchLayer",
      "specLayer",
      "productMetaLayer",
      "dialForegroundLayer",
      "scenarioRailLayer",
    ]) {
      expect(lab).toContain(layer);
      expect(styles).toContain(`.${layer}`);
    }

    expect(lab).toContain("mainWatchLayer: { x: 18, y: 13, rotate: 0.5 }");
    expect(lab).toContain("dialForegroundLayer: { x: 26, y: 18 }");
    expect(lab).toContain("backgroundWordLayer: { x: 9, y: 5");
    expect(lab).toContain("pointermove");
    expect(lab).toContain("pointerleave");
    expect(lab).toContain("requestAnimationFrame");
    expect(lab).toContain("0.08");
    expect(styles).toContain("--watch-x");
    expect(styles).toContain("--foreground-x");
  });

  it("adds reduced motion support, idle motion, and a masked glint", () => {
    const lab = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.module.css");

    expect(lab).toContain("prefers-reduced-motion: reduce");
    expect(lab).toContain("matchMedia");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("@keyframes watchIdle");
    expect(styles).toContain("@keyframes foregroundIdle");
    expect(styles).toContain("@keyframes watchGlint");
    expect(styles).toContain('mask-image: url("/generated/home-hero/candidates/01-everyday/secondary-01.png")');
  });

  it("keeps product information controlled and avoids forbidden patterns", () => {
    const lab = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.module.css");

    expect(lab).toContain("40 мм");
    expect(lab).toContain("Диаметр");
    expect(lab).toContain("Хронограф");
    expect(lab).toContain("Функция");
    expect(lab).not.toContain("secondaryWatch");
    expect(lab).not.toContain("informationRail");
    expect(lab).not.toContain("Water resistance");
    expect(styles).not.toContain("secondaryWatch");
    expect(styles).not.toContain("informationRail");
    expect(styles).not.toContain("border-radius: 16px");
    expect(styles).not.toContain("box-shadow");
  });

  it("renders review motion controls and v3 comparison links", () => {
    const lab = file("src/app/design-lab/home-hero-v3/home-hero-v3-design-lab.tsx");

    expect(lab).toContain("Dev motion controls");
    expect(lab).toContain("Motion");
    expect(lab).toContain("Pointer parallax");
    expect(lab).toContain("Idle motion");
    expect(lab).toContain("Intensity");
    expect(lab).toContain("Reset pointer");
    expect(lab).toContain("Reduced motion");
    expect(lab).toContain("/design-lab/home-hero-v2");
    expect(lab).toContain("/design-lab/home-hero");
  });
});
