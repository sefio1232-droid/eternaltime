import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHomeEditorialCuration,
  buildHomeOrbitWatches,
  buildHomeScenarios,
  forwardOrbitDistance,
  getHomeWatchHref,
  harmonizedVisualScale,
  homeScenarioDefinitions,
  orbitAnchorNameFromDistance,
  orbitDistance,
  orbitPresentationForDistance,
  scenarioIndexFromOrbitIndex,
  shortestSignedCircularDistance,
  shortestOrbitDirection,
  targetOrbitIndexForScenario,
  visibleOrbitIndexes,
  wrapOrbitIndex,
} from "@/components/home/home-scenario-model";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

const root = process.cwd();
const file = (path: string) => readFileSync(join(root, path), "utf8");

function watch(input: { reference: string; brandName: string; title: string; price?: number }): CatalogWatchDetail {
  const brandSlug = input.brandName.toLowerCase();
  const referenceSlug = input.reference.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return {
    id: referenceSlug,
    href: `/watches/${brandSlug}/${referenceSlug}`,
    brandName: input.brandName,
    brandSlug,
    title: input.title,
    officialName: input.title,
    referenceDisplay: input.reference,
    referenceNormalized: input.reference,
    referenceSlug,
    brandCollectionName: input.title.split(" ").slice(0, 2).join(" "),
    brandLineName: null,
    watchModelName: input.title,
    publicPrice: input.price ? { amountMinor: input.price * 100, currencyCode: "RUB" } : null,
    primaryImage: { kind: "none", alt: input.title },
    imageGallery: [],
    keySpecifications: [],
    specifications: [],
    siblingReferences: [],
  };
}

const fixtureDataset: CatalogReadDataset = {
  source: "preview",
  generatedAt: "2026-07-16T00:00:00.000Z",
  brands: [],
  watches: [
    watch({ reference: "T150.417.11.041.00", brandName: "Tissot", title: "Tissot PR 100 Chronograph 40mm", price: 45678 }),
    watch({ reference: "T150.410.16.051.00", brandName: "Tissot", title: "Tissot PR 100 40mm", price: 44000 }),
    watch({ reference: "T120.417.17.051.03", brandName: "Tissot", title: "Tissot Seastar 1000 Chronograph", price: 68000 }),
    watch({ reference: "EFK-100D-2A", brandName: "Casio", title: "Casio Edifice Automatic", price: 48000 }),
    watch({ reference: "T120.807.33.051.00", brandName: "Tissot", title: "Tissot Seastar 1000 40mm", price: 89000 }),
    watch({ reference: "T137.407.33.051.00", brandName: "Tissot", title: "Tissot PRX Powermatic 80 Gold", price: 120000 }),
  ],
};

const expectedScenarioRefs = [
  ["T150.410.16.051.00", "T150.417.11.041.00", "T150.210.11.041.00", "EFK-100D-2A"],
  ["T150.410.16.051.00", "T150.210.11.041.00", "T150.417.11.041.00", "EFK-100D-2A"],
  ["T120.417.17.051.03", "MTG-B3000DN-1A", "EFK-100D-2A", "T150.417.11.041.00"],
  ["EFK-100D-2A", "T137.407.33.051.00", "T120.417.17.051.03", "T150.410.16.051.00"],
  ["T120.417.17.051.03", "MTG-B3000DN-1A", "EFK-100D-2A", "T150.417.11.041.00"],
  ["T137.407.33.051.00", "MTG-B3000DN-1A", "T120.417.17.051.03", "T150.410.16.051.00"],
];

describe("homepage production multi-watch hero", () => {
  it("builds exact-reference editorial curation from canonical catalog records", () => {
    const editorialDataset: CatalogReadDataset = {
      ...fixtureDataset,
      watches: [
        ...fixtureDataset.watches,
        watch({ reference: "T150.210.11.041.00", brandName: "Tissot", title: "Tissot PR 100 34mm" }),
        watch({ reference: "T120.417.17.051.03", brandName: "Tissot", title: "Tissot Seastar 1000 Chronograph" }),
        watch({ reference: "MTG-B3000DN-1A", brandName: "Casio", title: "Casio G-Shock MT-G" }),
        watch({ reference: "RA-AC0018E30B", brandName: "Orient", title: "Orient Classic Green" }),
        watch({ reference: "RA-AA0811E19B", brandName: "Orient", title: "Orient Mako III Green" }),
        watch({ reference: "RA-AC0022S30B", brandName: "Orient", title: "Orient Classic White" }),
        watch({ reference: "NJ0210-13L", brandName: "Citizen", title: "Citizen Automatic Dress Blue" }),
        watch({ reference: "NJ0210-56A", brandName: "Citizen", title: "Citizen Automatic Dress White" }),
      ],
    };
    const curation = buildHomeEditorialCuration(editorialDataset);
    const curatedWatches = [
      ...(curation.path ? [curation.path] : []),
      ...(curation.selection ? [curation.selection] : []),
      ...(curation.comparisonSeastar ? [curation.comparisonSeastar] : []),
      ...curation.collectionOwned,
      ...(curation.collectionRecommendation ? [curation.collectionRecommendation] : []),
      ...curation.journal,
      ...curation.final,
    ];

    expect(curation.selection?.reference).toBe("EFK-100D-2A");
    expect(curation.comparisonSeastar?.reference).toBe("T120.417.17.051.03");
    expect(curation.collectionOwned).toHaveLength(4);
    expect(curation.journal).toHaveLength(3);
    expect(curation.final).toHaveLength(2);
    expect(new Set(curatedWatches.map((item) => item.brandName))).toEqual(new Set(["Tissot", "Casio", "Orient", "Citizen"]));
    expect(curatedWatches.every((item) => getHomeWatchHref(item) === item.href)).toBe(true);
    expect(curatedWatches.filter((item) => item.reference === "T137.407.33.051.00")).toHaveLength(1);

    const ownedOrient = curation.collectionOwned.find((item) => item.reference === "RA-AC0018E30B");
    expect(ownedOrient?.asset.path).toBe("/generated/homepage-editorial-assets/orient-classic-raac0018e30b-cutout.png");
    expect(curation.collectionRecommendation?.asset.path).toBe("/generated/homepage-editorial-assets/orient-mako-raaa0811e19b-cutout.png");
    expect(existsSync(join(root, "public", ownedOrient?.asset.path.replace(/^\/+/, "") ?? ""))).toBe(true);
    expect(existsSync(join(root, "public", curation.collectionRecommendation?.asset.path.replace(/^\/+/, "") ?? ""))).toBe(true);
  });

  it("defines six approved scenarios with four curated slots each", () => {
    expect(homeScenarioDefinitions).toHaveLength(6);
    expect(homeScenarioDefinitions.map((scenario) => scenario.title)).toEqual([
      "\u041d\u0430 \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c",
      "\u041f\u043e\u0434 \u0440\u0443\u0431\u0430\u0448\u043a\u0443",
      "\u0414\u043b\u044f \u043f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u0439",
      "\u041f\u0435\u0440\u0432\u0430\u044f \u043c\u0435\u0445\u0430\u043d\u0438\u043a\u0430",
      "\u0414\u043b\u044f \u0441\u043f\u043e\u0440\u0442\u0430",
      "\u0412 \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u044e",
    ]);

    homeScenarioDefinitions.forEach((scenario, index) => {
      expect(scenario.slots).toHaveLength(4);
      expect(scenario.slots.map((slot) => slot.reference)).toEqual(expectedScenarioRefs[index]);
      expect(scenario.criteria).toHaveLength(3);
      expect(scenario.backgroundWord).toBeTruthy();
      expect(scenario.accentWord).toBeTruthy();
    });
  });

  it("builds server-side scenarios enriched from the Catalog Read Repository dataset", () => {
    const scenarios = buildHomeScenarios(fixtureDataset);

    expect(scenarios).toHaveLength(6);
    expect(scenarios[0]?.hero.mainWatch.reference).toBe("T150.410.16.051.00");
    expect(scenarios[0]?.hero.slots[1]?.catalogMatched).toBe(true);
    expect(scenarios[0]?.hero.slots[1]?.href).toBe("/watches/tissot/t1504171104100");
    expect(scenarios[0]?.hero.slots[1]?.priceLabel?.replace(/\u00a0/g, " ")).toBe("45 678 \u20bd");
    expect(scenarios[1]?.hero.mainWatch.catalogMatched).toBe(true);
    expect(scenarios[2]?.hero.mainWatch.catalogMatched).toBe(true);
    expect(scenarios[3]?.hero.mainWatch.catalogMatched).toBe(true);
  });

  it("builds one flat 24-watch orbit with four consecutive watches per scenario", () => {
    const scenarios = buildHomeScenarios(fixtureDataset);
    const orbit = buildHomeOrbitWatches(scenarios);

    expect(orbit).toHaveLength(24);
    for (let scenarioIndex = 0; scenarioIndex < 6; scenarioIndex += 1) {
      const group = orbit.slice(scenarioIndex * 4, scenarioIndex * 4 + 4);
      expect(group).toHaveLength(4);
      expect(group.map((watch) => watch.scenarioIndex)).toEqual([scenarioIndex, scenarioIndex, scenarioIndex, scenarioIndex]);
      expect(group.map((watch) => watch.scenarioPosition)).toEqual([0, 1, 2, 3]);
      expect(group.map((watch) => watch.reference)).toEqual(expectedScenarioRefs[scenarioIndex]);
    }
  });

  it("derives active scenario only from the center active orbit index", () => {
    const scenarios = buildHomeScenarios(fixtureDataset);
    const orbit = buildHomeOrbitWatches(scenarios);
    const index6 = visibleOrbitIndexes(6);
    const index7 = visibleOrbitIndexes(7);
    const index8 = visibleOrbitIndexes(8);

    expect(scenarioIndexFromOrbitIndex(6)).toBe(1);
    expect(orbit[index6.farRightIndex]?.scenarioIndex).toBe(2);
    expect(scenarioIndexFromOrbitIndex(7)).toBe(1);
    expect(orbit[index7.rightIndex]?.scenarioIndex).toBe(2);
    expect(orbit[index7.farRightIndex]?.scenarioIndex).toBe(2);
    expect(scenarioIndexFromOrbitIndex(8)).toBe(2);
    expect(orbit[index8.centerIndex]?.scenarioIndex).toBe(2);
  });

  it("calculates circular visible indexes and scenario targets", () => {
    expect(wrapOrbitIndex(24)).toBe(0);
    expect(wrapOrbitIndex(-1)).toBe(23);
    expect(visibleOrbitIndexes(0)).toEqual({
      farLeftIndex: 22,
      leftIndex: 23,
      centerIndex: 0,
      rightIndex: 1,
      farRightIndex: 2,
    });
    expect(visibleOrbitIndexes(23)).toEqual({
      farLeftIndex: 21,
      leftIndex: 22,
      centerIndex: 23,
      rightIndex: 0,
      farRightIndex: 1,
    });
    expect(targetOrbitIndexForScenario(4)).toBe(16);
    expect(shortestOrbitDirection(2, 20)).toBe(-1);
    expect(orbitDistance(2, 20, -1)).toBe(6);
    expect(forwardOrbitDistance(20, 0)).toBe(4);
  });

  it("maps the corrected forward orbit direction from right to center to left", () => {
    const at6 = (index: number) => {
      const distance = shortestSignedCircularDistance(index, 6);
      return { distance, presentation: orbitPresentationForDistance(distance) };
    };
    const halfway = (index: number) => {
      const distance = shortestSignedCircularDistance(index, 6.5);
      return { distance, presentation: orbitPresentationForDistance(distance) };
    };
    const at7 = (index: number) => {
      const distance = shortestSignedCircularDistance(index, 7);
      return { distance, presentation: orbitPresentationForDistance(distance) };
    };

    expect(at6(6).distance).toBe(0);
    expect(at6(6).presentation.anchorName).toBe("centerActive");
    expect(at6(7).presentation.anchorName).toBe("right");
    expect(at6(8).presentation.anchorName).toBe("queueNear");
    expect(at6(9).presentation.anchorName).toBe("queueFar");

    expect(halfway(6).distance).toBe(-0.5);
    expect(halfway(6).presentation.x).toBeLessThan(at6(6).presentation.x);
    expect(halfway(6).presentation.x).toBeGreaterThan(at7(6).presentation.x);
    expect(halfway(6).presentation.scale).toBeLessThan(at6(6).presentation.scale);
    expect(halfway(6).presentation.scale).toBeGreaterThan(at7(6).presentation.scale);
    expect(halfway(6).presentation.opacity).toBeGreaterThanOrEqual(0.85);

    expect(halfway(7).distance).toBe(0.5);
    expect(halfway(7).presentation.x).toBeLessThan(at6(7).presentation.x);
    expect(halfway(7).presentation.x).toBeGreaterThan(at7(7).presentation.x);
    expect(halfway(7).presentation.scale).toBeGreaterThan(at6(7).presentation.scale);
    expect(halfway(7).presentation.scale).toBeLessThan(at7(7).presentation.scale);
    expect(halfway(7).presentation.opacity).toBeGreaterThanOrEqual(0.85);

    expect(at7(6).distance).toBe(-1);
    expect(at7(6).presentation.anchorName).toBe("left");
    expect(at7(7).distance).toBe(0);
    expect(at7(7).presentation.anchorName).toBe("centerActive");
    expect(at7(8).presentation.anchorName).toBe("right");
    expect(at7(9).presentation.anchorName).toBe("queueNear");
    expect(orbitAnchorNameFromDistance(3)).toBe("queueFar");
  });

  it("does not require catalog matches to invent fake watch names or read import previews", () => {
    const scenarios = buildHomeScenarios({ ...fixtureDataset, watches: [] });
    const model = file("src/components/home/home-scenario-model.ts");

    expect(scenarios[0]?.hero.mainWatch.brandName).toBe("Tissot");
    expect(scenarios[0]?.hero.mainWatch.href).toBe("/watches?q=T150.410.16.051.00");
    expect(model).not.toContain("imports/generated");
    expect(model).not.toContain("catalog-import-preview");
  });

  it("exposes only canonical catalog detail links as watch presentation targets", () => {
    const [matchedScenario] = buildHomeScenarios(fixtureDataset);
    const [fallbackScenario] = buildHomeScenarios({ ...fixtureDataset, watches: [] });

    expect(getHomeWatchHref(matchedScenario!.hero.slots[1]!)).toBe("/watches/tissot/t1504171104100");
    expect(getHomeWatchHref(fallbackScenario!.hero.mainWatch)).toBeNull();
  });

  it("classifies assets and prevents low-resolution frame-only images from central display", () => {
    const scenarios = buildHomeScenarios(fixtureDataset);

    for (const scenario of scenarios) {
      expect(scenario.hero.mainWatch.asset.qualityClass).not.toBe("FRAME_ONLY");
      expect(scenario.hero.mainWatch.asset.qualityClass).not.toBe("REJECTED");
      expect(Math.max(scenario.hero.mainWatch.asset.sourceWidth, scenario.hero.mainWatch.asset.sourceHeight)).toBeGreaterThanOrEqual(1200);
    }

    expect(scenarios[2]?.hero.mainWatch.asset.qualityClass).toBe("HERO_GRADE");
    expect(scenarios[5]?.hero.mainWatch.asset.motionMode).toBe("STATIC_FRONT");
  });

  it("keeps every visible slot matched to its own exact model image metadata", () => {
    const scenarios = buildHomeScenarios(fixtureDataset);

    for (const scenario of scenarios) {
      const visible = scenario.hero.slots.filter((slot) => slot.asset.qualityClass !== "REJECTED" && slot.opacity > 0);
      expect(visible).toHaveLength(4);
      for (const slot of visible) {
        expect(slot.asset.sourceNote.toLowerCase()).not.toContain("visual fallback");
        expect(slot.asset.sourceNote.toLowerCase()).not.toContain("fallback while");
      }
    }
  });

  it("keeps hero watch visual mass harmonized across different asset shapes", () => {
    const smallOldDisplay = harmonizedVisualScale({ displayScale: 0.36, sourceWidth: 320, sourceHeight: 320 });
    const largeOldDisplay = harmonizedVisualScale({ displayScale: 1, sourceWidth: 1680, sourceHeight: 1680 });
    const tallAsset = harmonizedVisualScale({ displayScale: 0.48, sourceWidth: 920, sourceHeight: 1500 });

    expect(smallOldDisplay).toBeGreaterThan(1);
    expect(largeOldDisplay).toBeLessThan(1);
    expect(tallAsset).toBeGreaterThan(1);
    expect(Math.max(smallOldDisplay, largeOldDisplay, tallAsset) - Math.min(smallOldDisplay, largeOldDisplay, tallAsset)).toBeLessThanOrEqual(0.13);

    const scenarios = buildHomeScenarios(fixtureDataset);
    const orbit = buildHomeOrbitWatches(scenarios);
    const scales = orbit.map((watch) => watch.assetScale);
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(0.94);
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.07);
  });

  it("does not invent final MTG orbit frames", () => {
    const sport = buildHomeScenarios(fixtureDataset).find((scenario) => scenario.id === "sport");
    const mtg = sport?.hero.slots.find((slot) => slot.reference === "MTG-B3000DN-1A");

    expect(mtg?.asset.motionMode).toBe("STATIC_FRONT");
    expect(mtg?.asset.frameCount).toBe(1);
    expect(mtg?.asset.framePaths).toHaveLength(0);
  });

  it("mounts the production hero on the homepage without touching design-lab routes", () => {
    const home = file("src/app/(public)/page.tsx");

    expect(home).toContain("const scenarios = buildHomeScenarios(dataset)");
    expect(home).toContain("const editorialCuration = buildHomeEditorialCuration(dataset)");
    expect(home).toContain("const orbitWatches = buildHomeOrbitWatches(scenarios)");
    expect(home).toContain('<HomeProductHero scenarios={scenarios} orbitWatches={orbitWatches} reviewEnabled={process.env.NODE_ENV !== "production"} />');
    expect(home).toContain("<HomeEcosystemPath scenarios={scenarios} curation={editorialCuration} />");
    expect(home).toContain("<HomeSelection scenarios={scenarios} curation={editorialCuration} />");
    expect(home).toContain("<HomeComparisonPurchase scenarios={scenarios} curation={editorialCuration} />");
    expect(home).toContain("<HomeCollectionIntelligencePanel scenarios={scenarios} curation={editorialCuration} />");
    expect(home).toContain("<HomeJournalFinal articles={articles} scenarios={scenarios} curation={editorialCuration} />");
    expect(home).not.toContain("HomeEcosystemIntro");
    expect(home).not.toContain("HomeSelectionProfile");
    expect(home).not.toContain("HomeCandidateFunnel");
    expect(home).not.toContain("HomeFinalCall");
    expect(home).not.toContain("HomeSelectionStory");
    expect(home).not.toContain("home-service-strip");
    expect(home).not.toContain("home-scenarios-section");
    expect(home).not.toContain("home-catalog-section");
  });

  it("keeps the approved scenario rail names and removes rejected old rail labels", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const model = file("src/components/home/home-scenario-model.ts");

    for (const label of ["\u041d\u0430 \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c", "\u041f\u043e\u0434 \u0440\u0443\u0431\u0430\u0448\u043a\u0443", "\u0414\u043b\u044f \u043f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u0439", "\u041f\u0435\u0440\u0432\u0430\u044f \u043c\u0435\u0445\u0430\u043d\u0438\u043a\u0430", "\u0414\u043b\u044f \u0441\u043f\u043e\u0440\u0442\u0430", "\u0412 \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u044e"]) {
      expect(hero).toContain(`railTitle: "${label}"`);
    }

    expect(hero).not.toContain('railTitle: "\u041f\u043e\u0434 \u0440\u0430\u0431\u043e\u0442\u0443"');
    expect(hero).not.toContain('railTitle: "\u041f\u0440\u0435\u043c\u0438\u0443\u043c"');
    expect(model).toContain('title: "\u0412 \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u044e"');
  });

  it("documents the 24 production hero assets and rejected non-front frames", () => {
    const audit = file("docs/HOME_HERO_ASSET_AUDIT.md");

    expect(audit).toContain("Current Production Table");
    expect(audit.match(/\| .* \| (MAIN|ALT 1|ALT 2|ALT 3) \|/g)?.length).toBe(24);
    expect(audit).toContain("T150.417.11.041.00");
    expect(audit).toContain("MTG-B3000DN-1A");
    expect(audit).toContain("Rejected Normal-Hero Assets");
    expect(audit).toContain("side view, excluded");
    expect(audit).toContain("three-quarter/angled, excluded");
  });

  it("keeps legacy orbit-normalized assets out of the production homepage model", () => {
    const model = file("src/components/home/home-scenario-model.ts");
    const manifestPath = join(root, "public/generated/home-hero/orbit-normalized/orbit-normalized-assets-manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      count: number;
      records: Array<{
        reference: string;
        originalPath: string;
        normalizedPath: string;
        visibleBounds: { width: number; height: number };
        normalizedWidth: number;
        normalizedHeight: number;
        noArtificialUpscale: boolean;
        opticalScale: number;
      }>;
    };
    const scenarios = buildHomeScenarios(fixtureDataset);
    const orbit = buildHomeOrbitWatches(scenarios);

    expect(existsSync(manifestPath)).toBe(true);
    expect(manifest.count).toBeGreaterThanOrEqual(16);
    expect(model).not.toContain("orbitNormalizedAssetPath");
    expect(model).not.toContain("/generated/home-hero/orbit-normalized/");
    expect(
      orbit.every(
        (watch) =>
          watch.imageSrc.startsWith("/generated/homepage-premium-assets/") ||
          watch.imageSrc === "/generated/homepage-editorial-assets/tissot-seastar-t1204171705103.png",
      ),
    ).toBe(true);
    expect(manifest.records.every((record) => record.noArtificialUpscale)).toBe(true);
    expect(manifest.records.every((record) => record.visibleBounds.width > 0 && record.visibleBounds.height > 0)).toBe(true);
    expect(manifest.records.some((record) => record.reference === "T129.410.11.053.00")).toBe(true);
    expect(manifest.records.some((record) => record.reference === "RA-AC0M03S10B")).toBe(true);
  });

  it("uses the homepage premium asset manifest for production hero images", () => {
    const manifestPath = join(root, "public/generated/homepage-premium-assets/homepage-premium-assets-manifest.json");
    const contactSheetPath = join(root, "public/generated/homepage-premium-assets/homepage-premium-assets-contact-sheet.jpg");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      approved: Array<{ reference: string; generatedPath: string; decision: string; noArtificialUpscale: boolean }>;
      rejected: Array<{ reference: string; decision: string }>;
    };
    const scenarios = buildHomeScenarios(fixtureDataset);
    const orbit = buildHomeOrbitWatches(scenarios);
    const approvedPaths = new Set(manifest.approved.map((record) => record.generatedPath));

    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(contactSheetPath)).toBe(true);
    expect(manifest.approved).toHaveLength(7);
    expect(manifest.approved.every((record) => record.noArtificialUpscale)).toBe(true);
    expect(
      orbit.every(
        (watch) =>
          approvedPaths.has(watch.imageSrc) ||
          (watch.reference === "T120.417.17.051.03" &&
            watch.imageSrc === "/generated/homepage-editorial-assets/tissot-seastar-t1204171705103.png"),
      ),
    ).toBe(true);
    expect(manifest.rejected.some((record) => record.reference === "GBD-H1000-1A4" && record.decision === "REJECTED_LOW_RESOLUTION")).toBe(true);
  });

  it("keeps homepage journal production preview free of debug/contact images", () => {
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");

    expect(ecosystem).not.toContain("comparison.jpg");
    expect(ecosystem).not.toContain("main-watch-angle-comparison");
    expect(ecosystem).not.toContain("contact-sheet");
    expect(ecosystem).toContain("compactTeaser(lead.dek)");
  });

  it("uses explicit homepage placement identity instead of watch reference keys", () => {
    const home = file("src/components/home/home-ecosystem-sections.tsx");
    const hero = file("src/components/home/home-product-hero.tsx");

    expect(home).toContain("export type HomeWatchPlacement");
    expect(home).toContain("assertUniquePlacementIds");
    expect(home).toContain("assertNoDuplicateReferencesInComposition");
    expect(home).toContain("data-home-placement-id={placement.instanceId}");
    expect(hero).toContain("data-home-placement-id={placementId}");
    expect(hero).toContain("data-home-render-key={renderKey}");
    expect(home).not.toContain("key={watch.reference}");
    expect(hero).not.toContain("key={watch.reference}");
  });

  it("keeps homepage polish contracts for labels, model names, and review controls", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const heroCss = file("src/components/home/home-product-hero.module.css");
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");
    const ecosystemCss = file("src/components/home/home-ecosystem-sections.module.css");

    for (const rejectedLabel of ["DAILY-FIT", "SHIRT-FIT", "TRAVEL-FIT", "MECHANICAL-FIT"]) {
      expect(ecosystem).not.toContain(rejectedLabel);
    }
    for (const approvedLabel of ["Маршрут выбора", "Компактная посадка", "Спортивная роль", "Первая механика"]) {
      expect(ecosystem).toContain(approvedLabel);
    }

    expect(hero).toContain("Пауза");
    expect(hero).toContain("Продолжить");
    expect(hero).toContain("PAUSE MOTION");
    expect(hero).toContain("RESUME MOTION");
    expect(hero).toContain("SHOW TEXT BOUNDS");
    expect(hero).toContain("SHOW ASSET DIMENSIONS");
    expect(hero).toContain("SHOW FULL-BLEED BOUNDS");
    expect(hero).toContain("SHOW MATERIAL LAYERS");
    expect(hero).toContain("SHOW TYPOGRAPHY SCALE");
    expect(hero).toContain("SHOW WATCH RENDER SIZE");
    expect(hero).toContain("SHOW NATURAL SIZE");
    expect(hero).toContain("SHOW CTA VARIANTS");
    expect(hero).toContain("SHOW SECTION HEIGHT");
    expect(hero).toContain("SHOW BORDER COUNT");
    expect(hero).toContain("SHOW UPSCALE WARNINGS");
    expect(hero).toContain("SHOW OVERFLOW ELEMENTS");
    expect(hero).toContain("data-home-generated-dimensions");
    expect(ecosystem).toContain("data-home-source-dimensions");
    expect(ecosystem).toContain("data-home-generated-dimensions");

    expect(heroCss).not.toContain("text-overflow: ellipsis");
    expect(ecosystemCss).not.toContain("text-overflow: ellipsis");
    expect(ecosystemCss).toContain("--home-watch-section-scale");
    expect(ecosystemCss).toContain("scale(calc(var(--home-watch-section-scale) * 1.012))");
  });

  it("keeps the premium homepage reset away from boxed slide and table patterns", () => {
    const home = file("src/app/(public)/page.tsx");
    const heroCss = file("src/components/home/home-product-hero.module.css");
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");
    const ecosystemCss = file("src/components/home/home-ecosystem-sections.module.css");

    expect(home.indexOf("<HomeEcosystemPath scenarios={scenarios}")).toBeLessThan(home.indexOf("<HomeSelection scenarios={scenarios}"));
    expect(home.indexOf("<HomeCollectionIntelligencePanel scenarios={scenarios}")).toBeLessThan(home.indexOf("<HomeJournalFinal articles={articles} scenarios={scenarios}"));
    expect(home).not.toContain("<EditorialContainer>\n        <HomeEcosystemPath");
    expect(home).not.toContain("<EditorialContainer>\n        <HomeCollectionIntelligencePanel");

    expect(heroCss).toContain("--home-ivory: #f3f0e8");
    expect(heroCss).toContain("--home-paper-light: #fcfbf8");
    expect(heroCss).toContain("--home-champagne: #b98a45");
    expect(heroCss).toContain("font-size: clamp(4.375rem, 6vw, 5.75rem)");

    expect(ecosystemCss).toContain("--home-navy-light: #102f3d");
    expect(ecosystemCss).toContain("--home-dark-line: rgb(255 255 255 / 0.14)");
    expect(ecosystemCss).not.toContain("grid-template-columns: repeat(5");
    expect(ecosystemCss).not.toContain("100vw");
    expect(ecosystemCss).not.toContain("mutedCta");

    expect(ecosystem).toContain("journal-final-primary-prx-gold-t137407");
    expect(ecosystem).toContain("journal-final-secondary-citizen-nj0210");
    expect(ecosystem).toContain("className={styles.finalWatches}");
  });

  it("locks the final homepage composition into explicit normal-flow grid areas", () => {
    const home = file("src/app/(public)/page.tsx");
    const hero = file("src/components/home/home-product-hero.tsx");
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");
    const ecosystemCss = file("src/components/home/home-ecosystem-sections.module.css");
    const ruleBody = (className: string) => ecosystemCss.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

    expect(home.indexOf("<HomeEcosystemPath")).toBeLessThan(home.indexOf("<HomeSelection"));
    expect(home.indexOf("<HomeSelection")).toBeLessThan(home.indexOf("<HomeComparisonPurchase"));
    expect(home.indexOf("<HomeComparisonPurchase")).toBeLessThan(home.indexOf("<HomeCollectionIntelligencePanel"));
    expect(home.indexOf("<HomeCollectionIntelligencePanel")).toBeLessThan(home.indexOf("<HomeJournalFinal"));

    expect(hero).toContain("if (distance < -2.01 || distance > 2.01) return null");
    expect(hero).toContain("const AUTO_STEP_PERIOD_MS = 10000");
    expect(hero).toContain("SHOW COMPOSITION GRID");
    expect(hero).toContain("SHOW GRID AREAS");
    expect(hero).toContain("SHOW TEXT FLOW");
    expect(hero).toContain("SHOW WATCH STAGES");
    expect(hero).toContain("SHOW WATCH BASELINES");
    expect(hero).toContain("SHOW NEXT WATCH CONTAINER");
    expect(hero).toContain("SHOW OVERLAPS");
    expect(hero).toContain("SHOW OVERFLOW ELEMENT");
    expect(hero).toContain("SHOW TEXTURE OPACITY");
    expect(hero).toContain("SHOW SECTION HEIGHTS");

    expect(ecosystem).toContain("className={styles.pathSteps}");
    expect(ecosystem).toContain("className={styles.selectionProfile}");
    expect(ecosystem).toContain("className={styles.comparisonModels}");
    expect(ecosystem).toContain("comparison-purchase-pr100-34-t150210");
    expect(ecosystem).toContain("comparison-purchase-finalist-t150410");
    expect(ecosystem).toContain("comparison-purchase-seastar-t120417");
    expect(ecosystem).toContain("className={styles.comparisonRows}");
    expect(ecosystem).toContain("className={styles.purchaseJourney}");
    expect(ecosystem).toContain("className={styles.collectionCopy}");
    expect(ecosystem).toContain("className={styles.collectionAction}");
    expect(ecosystem).toContain("className={styles.collectionOwnedRow}");
    expect(ecosystem).toContain("className={styles.collectionGap}");
    expect(ecosystem).toContain("className={styles.collectionNext}");
    expect(ecosystem).not.toContain("className={styles.collectionNextRow}");
    expect(ecosystem).toContain("data-home-next-watch-container");
    expect(ecosystem).toContain('data-home-grid-area="collection-insights"');
    expect(ecosystem).toContain("className={styles.journalLeadVisual}");
    expect(ecosystem).toContain("className={`${styles.homeContent} ${styles.finalInner}`}");
    expect(ecosystem).not.toContain("className={styles.collectionRail}");
    expect(ecosystem).not.toContain("className={styles.pathPanel}");

    expect(ecosystemCss).toContain("--home-content-max: 1440px");
    expect(ecosystemCss).toContain("--home-gutter: clamp(24px, 3vw, 48px)");
    expect(ecosystemCss).toContain("--home-gap: clamp(20px, 2.1vw, 32px)");
    expect(ecosystemCss).not.toContain("repeat(5");
    expect(ecosystemCss).not.toContain("100vw");
    expect(ecosystemCss).not.toContain("text-overflow: ellipsis");
    expect(ecosystemCss).not.toContain("linear-gradient(104deg");
    expect(ruleBody("collectionCopy")).not.toContain("position: absolute");
    expect(ruleBody("collectionNext")).not.toContain("position: absolute");
    expect(ruleBody("comparisonRows")).not.toContain("position: absolute");
  });

  it("keeps production homepage independent from dev image endpoints", () => {
    const home = file("src/app/(public)/page.tsx");
    const hero = file("src/components/home/home-product-hero.tsx");
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");

    expect(home).not.toContain("/api/catalog/dev-images");
    expect(hero).not.toContain("/api/catalog/dev-images");
    expect(ecosystem).not.toContain("/api/catalog/dev-images");
  });

  it("eager-loads every visible hero orbit watch while keeping priority limited to the center LCP image", () => {
    const hero = file("src/components/home/home-product-hero.tsx");

    expect(hero).toContain('const isCenter = slot.slotName === "centerActive" && travelState === "idle"');
    expect(hero).toContain("priority={isCenter}");
    expect(hero).toContain('loading="eager"');
    expect(hero).toContain('sizes="96px"');
    expect(hero).not.toContain('loading={isCenter ? "eager" : "lazy"}');
  });

  it("compresses homepage copy while preserving the approved product journey", () => {
    const home = file("src/app/(public)/page.tsx");
    const hero = file("src/components/home/home-product-hero.tsx");
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");
    const cyrillicWords = ecosystem.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g) ?? [];

    const orderedSections = [
      "<HomeProductHero",
      "<HomeEcosystemPath",
      "<HomeSelection",
      "<HomeComparisonPurchase",
      "<HomeCollectionIntelligencePanel",
      "<HomeJournalFinal",
    ];
    orderedSections.forEach((section, index) => {
      if (index === 0) return;
      expect(home.indexOf(orderedSections[index - 1] ?? "")).toBeLessThan(home.indexOf(section));
    });

    expect(cyrillicWords.length).toBeLessThanOrEqual(290);
    expect(hero).toContain("Подбираем часы под ваш ритм,");
    expect(hero).toContain("стиль и будущую коллекцию.");
    for (const approvedCopy of [
      "Подбор, сравнение, покупка",
      "Учитываем образ жизни,",
      "Сравниваем",
      "главные различия",
      "Коллекция",
      "подсказывает",
      "следующий шаг",
      "Понять часы.",
      "Потом выбрать.",
    ]) {
      expect(ecosystem).toContain(approvedCopy);
    }
    for (const rejectedCopy of [
      "Сравниваем не шум",
      "Коллекция показывает, чего ей не хватает",
      "Eternal Time соединяет подбор, каталог",
    ]) {
      expect(ecosystem).not.toContain(rejectedCopy);
    }
  });

  it("reveals critical homepage content early without empty reserved media", () => {
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");
    const ecosystemCss = file("src/components/home/home-ecosystem-sections.module.css");
    const orchestrator = file("src/components/home/home-motion-orchestrator.tsx");
    const motionCss = file("src/components/home/home-motion-orchestrator.module.css");

    expect(orchestrator).toContain('threshold: 0.06, rootMargin: "0px 0px 18% 0px"');
    expect(orchestrator).toContain("observer.unobserve(target)");
    expect(motionCss).toContain("--home-reveal-initial-opacity: 0.62");
    expect(motionCss).toContain('[data-home-reveal="watch"]');
    expect(motionCss).toContain("--home-reveal-initial-opacity: 0.36");
    expect(motionCss).toContain("--home-reveal-initial-opacity: 0.55");
    expect(motionCss).toContain("--home-reveal-initial-opacity: 0.7");
    expect(motionCss).toContain("--home-reveal-duration: 760ms");
    expect(motionCss).toContain("--home-reveal-delay: 60ms");
    expect(motionCss).toContain(':global([data-home-reveal="line-y"]) { --home-reveal-duration: 650ms; }');
    expect(motionCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(motionCss).toContain("opacity: 1 !important");

    const selectionWatch = ecosystem.indexOf('className={styles.profileWatch} data-home-reveal="watch"');
    const comparisonIdentity = ecosystem.indexOf('className={styles.comparisonIdentity} data-home-reveal="caption"');
    expect(selectionWatch).toBeGreaterThan(ecosystem.indexOf('data-home-section="selection"'));
    expect(comparisonIdentity).toBeGreaterThan(ecosystem.indexOf('data-home-section="comparison-purchase"'));
    expect(ecosystem).toContain('data-home-reveal="journal-lead" data-home-reveal-index="1"');
    expect(ecosystemCss).toContain("transparent 36px");
    expect(ecosystemCss).not.toContain("height: 108px");
    expect(ecosystemCss).not.toContain("100vw");
    expect(ecosystemCss.match(/\.nextWatch\s*\{[\s\S]*?\}/)?.[0] ?? "").not.toContain("100vh");
  });

  it("keeps the final CTA concise and exposes density diagnostics in review mode", () => {
    const ecosystem = file("src/components/home/home-ecosystem-sections.tsx");
    const hero = file("src/components/home/home-product-hero.tsx");
    const finalCta = ecosystem.slice(ecosystem.indexOf('data-home-grid-area="final-cta"'));

    expect(finalCta).not.toContain('data-home-reveal="body"');
    for (const control of [
      "SHOW COPY LENGTH",
      "SHOW LINE COUNT",
      "SHOW VERTICAL PADDING",
      "SHOW EMPTY AREA ESTIMATE",
      "SHOW REVEAL INITIAL OPACITY",
      "SHOW REVEAL TRIGGER POINT",
      "SHOW TRANSITION ZONES",
      "SHOW DOCUMENT VIEWPORT COUNT",
      "SHOW LATE CONTENT",
      "SHOW INVISIBLE RESERVED SPACE",
    ]) {
      expect(hero).toContain(control);
    }
    for (const metric of [
      "homepage words",
      "body-copy words",
      "document / viewport",
      "transition zones",
      "vertical padding",
      "largest empty gap",
      "invisible reserved space",
    ]) {
      expect(hero).toContain(metric);
    }
  });
});
