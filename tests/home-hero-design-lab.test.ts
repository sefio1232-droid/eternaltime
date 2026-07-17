import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { homeHeroScenarios, rejectedHomeHeroAlternatives } from "../src/app/design-lab/home-hero/home-hero-curation";

const root = process.cwd();
const file = (path: string) => readFileSync(join(root, path), "utf8");

describe("isolated homepage hero design lab", () => {
  it("keeps the design lab isolated from the production homepage and sitemap", () => {
    const home = file("src/app/(public)/page.tsx");
    const sitemap = file("src/app/sitemap.ts");
    const labPage = file("src/app/design-lab/home-hero/page.tsx");

    expect(home).not.toContain("design-lab/home-hero");
    expect(home).not.toContain("HomeHeroDesignLab");
    expect(sitemap).not.toContain("design-lab");
    expect(labPage).toContain("index: false");
    expect(labPage).toContain("follow: false");
    expect(labPage).toContain('process.env.NODE_ENV === "production"');
    expect(labPage).toContain("notFound()");
  });

  it("renders six manual static hero scenarios without autoplay or parallax", () => {
    const lab = file("src/app/design-lab/home-hero/home-hero-design-lab.tsx");
    const styles = file("src/app/design-lab/home-hero/home-hero-design-lab.module.css");

    expect(lab).toContain("homeHeroScenarios");
    expect(lab).toContain("activeScenarioId");
    expect(lab).toContain("setActiveScenarioId");
    expect(lab).toContain("All scenarios review");
    expect(lab).toContain("No autoplay, no timer, no parallax, no mouse tracking, no production integration.");
    expect(lab).not.toContain("/design-lab/home-hero/reference");
    expect(lab).not.toContain("Show reference");
    expect(lab).not.toContain("Side by side");
    expect(lab).not.toContain('type="range"');
    expect(lab).not.toContain("depthWatch");
    expect(lab).not.toContain("setInterval");
    expect(lab).not.toContain("setTimeout");
    expect(lab).not.toContain("onPointerMove");
    expect(lab).not.toContain("requestAnimationFrame");
    expect(lab).toContain("backgroundPrimaryLayer");
    expect(lab).toContain("backgroundSecondaryLayer");
    expect(lab).toContain("secondaryWatchLayer");
    expect(lab).toContain("mainWatchLayer");
    expect(lab).toContain("specificationLayer");
    expect(lab).toContain("informationRailLayer");
    expect(lab).toContain("Product information rail");
    expect(styles).not.toContain(".depthWatch");
    expect(styles).not.toContain("transition:");
    expect(styles).not.toContain(":hover");
    expect(styles).not.toContain("skew");
    expect(styles).not.toContain("perspective");
  });

  it("uses the final approved product-system curation and keeps MT-G rejected", () => {
    const curation = file("src/app/design-lab/home-hero/home-hero-curation.ts");

    expect(homeHeroScenarios).toHaveLength(6);
    expect(homeHeroScenarios.map((scenario) => scenario.id)).toEqual(["01", "02", "03", "04", "05", "06"]);
    expect(homeHeroScenarios[0]?.primaryWord).toBe("РИТМ");
    expect(homeHeroScenarios[0]?.primaryWord).not.toBe("МЕХАНИКА");
    expect(homeHeroScenarios.map((scenario) => scenario.primaryWord)).toEqual([
      "РИТМ",
      "КЛАССИКА",
      "ДВИЖЕНИЕ",
      "МЕХАНИЗМ",
      "ЭНЕРГИЯ",
      "ХАРАКТЕР",
    ]);

    expect(curation).toContain("PR 100 Chronograph");
    expect(curation).toContain("T150.417.11.041.00");
    expect(curation).toContain("Classic Dream 40mm");
    expect(curation).toContain("PR 100 40mm");
    expect(curation).toContain("Seastar 1000 Chronograph 45.5mm");
    expect(curation).toContain("GBD-H1000-1A4");
    expect(curation).toContain("EFK-100D-2A");
    expect(curation).toContain("Bambino 38");
    expect(curation).toContain("Seastar 1000 40mm");
    expect(curation).toContain("PRX Powermatic 80 40mm");
    expect(curation).toContain("too aggressive and visually noisy for the homepage system");
    expect(rejectedHomeHeroAlternatives).toHaveLength(1);
    expect(rejectedHomeHeroAlternatives[0]?.reference).toBe("MTG-B3000DN-1A");
    expect(curation).not.toContain("casio-mtg-b3000dn-1a-main.png");
    expect(curation).not.toContain("casio-mtg-b3000dn-1a-perspective.png");
  });

  it("keeps product specifications typed, sourced, and limited to two callouts", () => {
    for (const scenario of homeHeroScenarios) {
      expect(scenario.specs.length).toBeLessThanOrEqual(2);
      expect(scenario.visual.mainWatch.width).toBeTruthy();
      expect(scenario.visual.mainWatch.height).toBeTruthy();
      expect(scenario.visual.mainWatch.x).toBeTruthy();
      expect(scenario.visual.mainWatch.y).toBeTruthy();
      expect(scenario.visual.mainWatch.maxHeight).toBeTruthy();
      expect(scenario.visual.mainWatch.shadow).toBeTruthy();
      expect(scenario.visual.mainWatch.safeInsetTop).toBeTruthy();
      expect(scenario.visual.mainWatch.safeInsetRight).toBeTruthy();
      expect(scenario.visual.mainWatch.safeInsetBottom).toBeTruthy();
      expect(scenario.visual.mainWatch.safeInsetLeft).toBeTruthy();
      expect(scenario.visual.secondaryWatch.scale).toBeTruthy();
      expect(scenario.visual.secondaryWatch.imageOffsetY).toBeTruthy();

      for (const spec of scenario.specs) {
        expect(spec.value).toBeTruthy();
        expect(spec.label).toBeTruthy();
        expect(spec.sourceField).toMatch(/^(identity|specifications)\./);
        expect(spec.x).toMatch(/%$/);
        expect(spec.y).toMatch(/%$/);
        expect(spec.lineLength).toMatch(/px$/);
      }
    }

    expect(homeHeroScenarios[3]?.qualityNote).toBe("SECONDARY ASSET REQUIRES REPLACEMENT BEFORE PRODUCTION");
    expect(homeHeroScenarios[3]?.secondary.assetQuality).toContain("Low-resolution source: 328x492");
    expect(homeHeroScenarios[3]?.visual.secondaryWatch.height).toBe("160px");
  });

  it("points every scenario to prepared candidate assets", () => {
    const curation = file("src/app/design-lab/home-hero/home-hero-curation.ts");
    const manifestPath = join(root, "public/generated/home-hero/candidates/home-hero-candidate-manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    expect(manifest.scenarios).toHaveLength(6);
    expect(curation).toContain('const candidateRoot = "/generated/home-hero/candidates"');
    expect(curation).toContain("/01-everyday/secondary-01.png");
    expect(curation).toContain("/01-everyday/main-01.png");
    expect(curation).toContain("/02-under-shirt/main-01.png");
    expect(curation).toContain("/03-travel/alt-01.png");
    expect(curation).toContain("/04-first-mechanical/main-01.png");
    expect(curation).toContain("/04-first-mechanical/secondary-01.png");
    expect(curation).toContain("/05-sport/main-01.png");
    expect(curation).toContain("/06-collection/main-01.png");
    expect(curation).toContain("Low-resolution source: 328x492");

    for (const scenario of manifest.scenarios) {
      for (const item of scenario.items) {
        const outputPath = join(root, item.localPath);
        expect(existsSync(outputPath)).toBe(true);
        expect(statSync(outputPath).size).toBeGreaterThan(20_000);
      }
    }
  });

  it("documents and scripts the repeatable asset pipeline", () => {
    const packageJson = file("package.json");
    const assetScript = file("scripts/prepare-home-hero-assets.mjs");
    const candidateScript = file("scripts/prepare-home-hero-candidates.mjs");
    const assetDocs = file("docs/HOME_HERO_IMAGE_ASSETS.md");
    const shortlistDocs = file("docs/HOME_HERO_WATCH_SHORTLIST.md");
    const sourceDocs = file("docs/HOME_HERO_IMAGE_SOURCES.md");

    expect(packageJson).toContain('"home-hero:prepare-assets"');
    expect(packageJson).toContain('"home-hero:prepare-candidates"');
    expect(assetScript).toContain("removeEdgeConnectedBackground");
    expect(candidateScript).toContain("home-hero-candidate-manifest.json");
    expect(assetDocs).toContain("public/generated/home-hero/home-hero-assets-preview.jpg");
    expect(shortlistDocs).toContain("Tissot PR 100 40mm Chronograph");
    expect(sourceDocs).toContain("Orient Bambino 38");
  });
});
