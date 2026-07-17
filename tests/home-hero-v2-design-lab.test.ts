import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const file = (path: string) => readFileSync(join(root, path), "utf8");

describe("homepage hero v2 static art direction prototype", () => {
  it("keeps v2 isolated from production homepage, old lab, and sitemap", () => {
    const home = file("src/app/(public)/page.tsx");
    const sitemap = file("src/app/sitemap.ts");
    const oldLab = file("src/app/design-lab/home-hero/home-hero-design-lab.tsx");
    const page = file("src/app/design-lab/home-hero-v2/page.tsx");

    expect(home).not.toContain("home-hero-v2");
    expect(home).not.toContain("HomeHeroV2DesignLab");
    expect(oldLab).not.toContain("home-hero-v2");
    expect(oldLab).not.toContain("HomeHeroV2DesignLab");
    expect(sitemap).not.toContain("design-lab");
    expect(page).toContain("index: false");
    expect(page).toContain("follow: false");
    expect(page).toContain('process.env.NODE_ENV === "production"');
    expect(page).toContain("notFound()");
  });

  it("renders the approved single-scenario cinematic product hero structure", () => {
    const lab = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.module.css");

    expect(lab).toContain("Homepage Hero V2 Static Art Direction Prototype");
    expect(lab).toContain("Tissot");
    expect(lab).toContain("PR 100 Chronograph");
    expect(lab).toContain("T150.417.11.041.00");
    expect(lab).toContain("/generated/home-hero/candidates/01-everyday/secondary-01.png");
    expect(lab).toContain("На каждый");
    expect(lab).toContain("день");
    expect(lab).toContain("Ритм");
    expect(lab).toContain("Open previous hero lab");
    expect(lab).toContain("/design-lab/home-hero");
    expect(styles).toContain("grid-template-columns: minmax(400px, 40%) minmax(0, 60%)");
    expect(styles).toContain("min-height: calc(100svh - 76px)");
  });

  it("uses future-safe static layers without actual motion systems", () => {
    const lab = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.module.css");

    for (const layer of [
      "dialGraphicBackLayer",
      "backgroundWordLayer",
      "watchShadowLayer",
      "mainWatchLayer",
      "specificationLayer",
      "productMetaLayer",
      "foregroundTickLayer",
    ]) {
      expect(lab).toContain(layer);
      expect(styles).toContain(`.${layer}`);
    }

    expect(lab).not.toContain("useState");
    expect(lab).not.toContain("useEffect");
    expect(lab).not.toContain("setInterval");
    expect(lab).not.toContain("setTimeout");
    expect(lab).not.toContain("onPointerMove");
    expect(lab).not.toContain("requestAnimationFrame");
    expect(styles).not.toContain("transition:");
    expect(styles).not.toContain("skew");
    expect(styles).not.toContain("perspective");
  });

  it("removes secondary watch and right product rail patterns from v2", () => {
    const lab = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.module.css");

    expect(lab).not.toContain("secondaryWatch");
    expect(lab).not.toContain("Альтернатива");
    expect(lab).not.toContain("Alternative");
    expect(lab).not.toContain("informationRail");
    expect(lab).not.toContain("Product information rail");
    expect(styles).not.toContain("secondaryWatch");
    expect(styles).not.toContain("informationRail");
  });

  it("keeps provenance details out of the hero but in the dev review panel", () => {
    const lab = file("src/app/design-lab/home-hero-v2/home-hero-v2-design-lab.tsx");

    expect(lab).toContain("confirmedSpecs");
    expect(lab).toContain("sourceField");
    expect(lab).toContain("Dev-only review");
    expect(lab).toContain("identity.title");
    expect(lab).toContain("specifications.firstClass.movement_raw");
    expect(lab).not.toContain("ДИАМЕТР ИЗ НАЗВАНИЯ МОДЕЛИ");
    expect(lab).not.toContain("SOURCE FIELD");
    expect(lab).not.toContain("MECHANISM RAW");
    expect(lab).not.toContain("Water resistance");
  });
});
