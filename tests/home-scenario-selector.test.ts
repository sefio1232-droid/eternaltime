import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHomeOrbitWatches,
  buildHomeScenarios,
  forwardOrbitDistance,
  harmonizedVisualScale,
  homeScenarioDefinitions,
  orbitAnchorNameFromDistance,
  orbitDistance,
  orbitPresentationForDistance,
  rejectedHomeHeroAssets,
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
    watch({ reference: "T120.417.11.041.03", brandName: "Tissot", title: "Tissot Seastar 1000 Chronograph", price: 91000 }),
    watch({ reference: "EFK-100D-2A", brandName: "Casio", title: "Casio Edifice Automatic", price: 48000 }),
    watch({ reference: "T120.807.33.051.00", brandName: "Tissot", title: "Tissot Seastar 1000 40mm", price: 89000 }),
    watch({ reference: "T137.407.33.051.00", brandName: "Tissot", title: "Tissot PRX Powermatic 80 Gold", price: 120000 }),
  ],
};

const expectedScenarioRefs = [
  ["T150.210.11.041.00", "T150.417.11.041.00", "EFK-100D-2A", "T129.410.11.053.00"],
  ["T150.410.16.051.00", "RA-AC0M03S10B", "T129.410.11.053.00", "T150.210.11.041.00"],
  ["T120.417.11.041.03", "GBD-H1000-1A4", "RA-AC0Q03S10B", "T120.417.17.051.02"],
  ["EFK-100D-2A", "RA-AC0M03S10B", "RA-AC0Q03S10B", "T137.407.11.041.00"],
  ["T120.417.11.041.03", "T120.807.33.051.00", "MTG-B3000DN-1A", "GBD-H1000-1A4"],
  ["T137.407.33.051.00", "T137.407.11.041.00", "MTG-B3000DN-1A", "T120.417.17.051.02"],
];

describe("homepage production multi-watch hero", () => {
  it("defines six approved scenarios with four curated slots each", () => {
    expect(homeScenarioDefinitions).toHaveLength(6);
    expect(homeScenarioDefinitions.map((scenario) => scenario.title)).toEqual([
      "На каждый день",
      "Под рубашку",
      "Для путешествий",
      "Первая механика",
      "Для спорта",
      "Следующее дополнение в коллекцию",
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
    expect(scenarios[0]?.hero.mainWatch.reference).toBe("T150.210.11.041.00");
    expect(scenarios[0]?.hero.slots[1]?.catalogMatched).toBe(true);
    expect(scenarios[0]?.hero.slots[1]?.href).toBe("/watches/tissot/t1504171104100");
    expect(scenarios[0]?.hero.slots[1]?.priceLabel?.replace(/\u00a0/g, " ")).toBe("45 678 ₽");
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

    expect(halfway(7).distance).toBe(0.5);
    expect(halfway(7).presentation.x).toBeLessThan(at6(7).presentation.x);
    expect(halfway(7).presentation.x).toBeGreaterThan(at7(7).presentation.x);
    expect(halfway(7).presentation.scale).toBeGreaterThan(at6(7).presentation.scale);
    expect(halfway(7).presentation.scale).toBeLessThan(at7(7).presentation.scale);

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
    expect(scenarios[0]?.hero.mainWatch.href).toBe("/watches?q=T150.210.11.041.00");
    expect(model).not.toContain("imports/generated");
    expect(model).not.toContain("catalog-import-preview");
  });

  it("classifies assets and prevents low-resolution frame-only images from central display", () => {
    const scenarios = buildHomeScenarios(fixtureDataset);

    for (const scenario of scenarios) {
      expect(scenario.hero.mainWatch.asset.qualityClass).not.toBe("FRAME_ONLY");
      expect(scenario.hero.mainWatch.asset.qualityClass).not.toBe("REJECTED");
      expect(scenario.hero.mainWatch.asset.sourceWidth).toBeGreaterThanOrEqual(900);
    }

    expect(scenarios[2]?.hero.mainWatch.asset.qualityClass).toBe("HERO_GRADE");
    expect(scenarios[5]?.hero.mainWatch.asset.motionMode).toBe("ORBIT_FRAME_SET");
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

    expect(mtg?.asset.motionMode).toBe("PARALLAX_ONLY");
    expect(mtg?.asset.frameCount).toBe(1);
    expect(mtg?.asset.framePaths).toHaveLength(0);
  });

  it("mounts the production hero on the homepage without touching design-lab routes", () => {
    const home = file("src/app/(public)/page.tsx");
    const hero = file("src/components/home/home-product-hero.tsx");
    const sitemap = file("src/app/sitemap.ts");

    expect(home).toContain("const scenarios = buildHomeScenarios(dataset)");
    expect(home).toContain("const orbitWatches = buildHomeOrbitWatches(scenarios)");
    expect(home).toContain("<HomeProductHero scenarios={scenarios} orbitWatches={orbitWatches} />");
    expect(hero).toContain('data-home-layout="production-single-24-watch-orbit"');
    expect(hero).toContain('data-testid="homepage-product-stage"');
    expect(hero).toContain('params.get("heroReview") === "1"');
    expect(sitemap).not.toContain("design-lab/home-hero");
  });

  it("uses a continuous 10 second orbit driver and keeps compact accessible orbit controls", () => {
    const hero = file("src/components/home/home-product-hero.tsx");

    expect(hero).toContain("const AUTO_STEP_PERIOD_MS = 10000");
    expect(hero).toContain("elapsedMs / currentStepPeriodMs");
    expect(hero).toContain("window.requestAnimationFrame(step)");
    expect(hero).toContain("setOrbitPosition");
    expect(hero).toContain("orbitPositionRef");
    expect(hero).not.toContain("setActiveScenarioId");
    expect(hero).not.toContain("handleScenarioKeyDown");
    expect(hero).not.toContain("handleHeroKeyDown");
    expect(hero).toContain("data-home-orbit-controls");
    expect(hero).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(hero).toContain('window.matchMedia("(pointer: fine)")');
    expect(hero).toContain("setAutoCycleEnabled(nextCanAnimate)");
    expect(hero).toContain('document.addEventListener("visibilitychange"');
    expect(hero).toContain("styles.orbitControls");
    expect(hero).toContain("styles.reviewControls");
    expect(hero).toContain("RESET");
    expect(hero).toContain("PREVIOUS WATCH");
    expect(hero).toContain("NEXT WATCH");
    expect(hero).toContain("PLAY");
    expect(hero).toContain("PAUSE");
    expect(hero).toContain("SHOW REFERENCE");
    expect(hero).toContain("SIDE BY SIDE");
    expect(hero).toContain("/generated/home-hero/review/homepage-multi-watch-approved.png");
    expect(hero).toContain('params.get("heroMotion") === "0"');
  });

  it("configures autoplay as one complete 10 second step period", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const moduleStyles = file("src/components/home/home-product-hero.module.css");

    expect(hero).toContain("data-home-step-period={AUTO_STEP_PERIOD_MS}");
    expect(hero).toContain('data-home-motion-mode="continuous-orbit"');
    expect(hero).toContain("data-home-current-step-period={Math.round(currentStepPeriodMs)}");
    expect(hero).toContain("manualPausedRef.current = false");
    expect(moduleStyles).toContain("animation: homeHeroCycleProgress 10000ms linear infinite");
  });

  it("uses fractional orbit motion instead of left/top slot swapping", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const moduleStyles = file("src/components/home/home-product-hero.module.css");

    expect(hero).toContain("const [orbitPosition, setOrbitPosition] = useState(0)");
    expect(hero).toContain("shortestSignedCircularDistance(watch.globalIndex, orbitPosition, total)");
    expect(hero).toContain("orbitPresentationForDistance(distance)");
    expect(hero).toContain('data-home-orbit-position={orbitPosition.toFixed(3)}');
    expect(hero).toContain("FAST_TRAVEL_MAX_MS = 1650");
    expect(moduleStyles).toContain("container-type: size");
    expect(moduleStyles).toContain("translate3d(var(--orbit-x), var(--orbit-y), 0)");
    expect(moduleStyles).not.toContain("top 820ms");
    expect(moduleStyles).not.toContain("left 820ms");
  });

  it("does not pause auto-cycle on normal hover and does pause on deliberate interaction", () => {
    const hero = file("src/components/home/home-product-hero.tsx");

    expect(hero).not.toContain("hoverPausedRef");
    expect(hero).not.toContain('type PauseSource = "hover"');
    expect(hero).toContain("handleInteractivePointerDown");
    expect(hero).toContain('draggingPausedRef.current = true');
    expect(hero).toContain("markManualPause(WATCH_MANUAL_PAUSE_MS)");
    expect(hero).toContain("markManualPause(SCENARIO_MANUAL_PAUSE_MS)");
    expect(hero).toContain("fastTravelTo(targetOrbitIndexForScenario(index as HomeScenarioIndex))");
    expect(hero).toContain('"documentHidden"');
    expect(hero).toContain('"reducedMotion"');
    expect(hero).toContain('"reviewPaused"');
  });

  it("keeps product meta specs in a value-label grid without generic characteristic labels", () => {
    const model = file("src/components/home/home-scenario-model.ts");
    const hero = file("src/components/home/home-product-hero.tsx");
    const moduleStyles = file("src/components/home/home-product-hero.module.css");

    expect(model).not.toContain('label: "Характеристика"');
    expect(model).toContain('label: "ЦИФЕРБЛАТ"');
    expect(model).toContain('label: "БРАСЛЕТ"');
    expect(model).toContain('label: "ДИАМЕТР"');
    expect(hero).toContain("<strong>{spec.value}</strong>");
    expect(hero).toContain("<span>{spec.label}</span>");
    expect(moduleStyles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(moduleStyles).toContain("-webkit-line-clamp: 2");
  });

  it("renders real public hero images and no abstract poster primitives", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const moduleStyles = file("src/components/home/home-product-hero.module.css");

    expect(hero).toContain("next/image");
    expect(hero).toContain("slot.watch.imageSrc");
    expect(hero).toContain("slotClassByName[slot.slotName]");
    expect(hero).toContain("ВАШЕ ВРЕМЯ. ВАШ СТИЛЬ.");
    expect(hero).toContain("Подбираем часы под ваш ритм жизни");
    expect(hero).not.toContain("homepage-stage-plane");
    expect(hero).not.toContain("homepage-stage-arc");
    expect(hero).not.toContain("technical");
    expect(moduleStyles).toContain(".centerActive");
    expect(moduleStyles).toContain(".reviewPanel");
  });

  it("keeps mobile useful with left center and right slots", () => {
    const styles = file("src/components/home/home-product-hero.module.css");

    expect(styles).toContain("@media (max-width: 767px)");
    expect(styles).toContain(".leftWatch");
    expect(styles).toContain(".centerActive");
    expect(styles).toContain(".rightWatch");
    expect(styles).toContain(".exitLeft");
    expect(styles).toContain(".queueNear");
    expect(styles).toContain(".queueFar");
    expect(styles).toContain("display: none");
  });

  it("keeps the repaired production DOM free of legacy stage copy and duplicate product meta", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const moduleStyles = file("src/components/home/home-product-hero.module.css");

    expect(hero).toContain("data-home-hero-left-message");
    expect(hero).toContain("data-home-product-meta");
    expect(hero).toContain("data-home-scenario-rail");
    expect(hero).not.toContain("home-product-hero-watch-note");
    expect(hero).not.toContain("homepage-stage-scenario-info");
    expect(hero).not.toContain("data-home-scenario-copy");
    expect(hero).not.toContain("hero.sceneDescription");
    expect(hero).not.toContain("activeScenario.criteria.map");
    expect(hero).not.toContain("hero.accentWord");
    expect(moduleStyles).toContain("grid-template-areas");
    expect(moduleStyles).toContain("\"message stage\"");
    expect(moduleStyles).toContain("\"rail rail\"");
  });

  it("defines scenario color fields, an integrated background word layer, six orbit positions, and isolated review UI", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const moduleStyles = file("src/components/home/home-product-hero.module.css");

    expect(hero).toContain("buildVisibleSlots");
    expect(hero).toContain('data-home-slot-count={visibleSlots.length}');
    expect(hero).toContain("data-home-scenario-color-field");
    expect(hero).toContain("data-home-background-word-layer");
    expect(hero).toContain("{activeScenarioDisplay.backgroundWord}");
    expect(hero).not.toContain("homepage-stage-accent");
    expect(moduleStyles).toContain(".scenarioColorField");
    expect(moduleStyles).toContain(".colorPlate");
    expect(moduleStyles).toContain(".stageTexture");
    expect(moduleStyles).toContain(".backgroundWordLayer");
    expect(hero).toContain("queueNear");
    expect(hero).toContain("queueFar");
    expect(hero).toContain("scenarioToneStyle(activeScenarioIndex)");
    expect(hero).toContain("scenarioWordLayoutByIndex");
    expect(moduleStyles).toContain("--home-accent-rgb");
    expect(moduleStyles).toContain("--home-word-x");
    expect(moduleStyles).toContain(".referenceOverlay");
    expect(moduleStyles).toContain(".reviewPanel");
    expect(moduleStyles.indexOf(".reviewPanel")).toBeGreaterThan(moduleStyles.indexOf(".referenceOverlay"));
  });

  it("keeps product meta background and rail derived from the center watch", () => {
    const hero = file("src/components/home/home-product-hero.tsx");

    expect(hero).toContain("const activeWatch = orbitWatches[wrapOrbitIndex(activeOrbitIndex, orbitTotal)]");
    expect(hero).toContain('const activeOrbitIndex = travelState === "idle" ? roundedOrbitIndex : settledOrbitIndex');
    expect(hero).toContain("const activeScenarioIndex = scenarioIndexFromOrbitIndex(activeOrbitIndex)");
    expect(hero).toContain("const activeScenarioPosition = scenarioPositionFromOrbitIndex(activeOrbitIndex)");
    expect(hero).toContain("{activeScenarioDisplay.backgroundWord}");
    expect(hero).toContain("scenarioIndex === activeScenarioIndex");
    expect(hero).toContain("{activeWatch.model}");
  });

  it("supports accelerated scenario travel and disables multi-frame asset playback in normal render", () => {
    const hero = file("src/components/home/home-product-hero.tsx");

    expect(hero).toContain('const [travelState, setTravelState] = useState<TravelState>("idle")');
    expect(hero).toContain('animateOrbitTo(target, direction, distance, fastTravelDuration(distance, speedPercent, motionForcedOff), "fast-travel")');
    expect(hero).toContain("const direction = 1");
    expect(hero).toContain("forwardOrbitDistance(current, target, orbitTotal)");
    expect(hero).toContain("moveOrbitBy(-1)");
    expect(hero).toContain("slot.watch.imageSrc");
    expect(hero).not.toContain("framePaths");
    expect(hero).not.toContain("ORBIT_FRAME_SET");
  });

  it("keeps normal homepage orbit controls compact while preserving scenario rail jumps", () => {
    const hero = file("src/components/home/home-product-hero.tsx");
    const moduleStyles = file("src/components/home/home-product-hero.module.css");

    expect(hero).toContain("data-home-orbit-controls");
    expect(hero).toContain("styles.orbitControls");
    expect(hero).not.toContain("handleScenarioKeyDown");
    expect(hero).not.toContain("handleHeroKeyDown");
    expect(hero).not.toContain("handleWatchButtonClick");
    expect(hero).not.toContain("scenarioButtonRefs");
    expect(moduleStyles).toContain(".orbitControls");
    expect(moduleStyles).not.toContain(".accessibleControls");
    expect(hero).toContain("fastTravelTo(targetOrbitIndexForScenario(scenarioIndex))");
  });

  it("keeps production hero assets front-only and records rejected side or angled frames", () => {
    const scenarios = buildHomeScenarios(fixtureDataset);
    const orbit = buildHomeOrbitWatches(scenarios);

    expect(orbit).toHaveLength(24);
    expect(orbit.every((watch) => watch.assetView === "front")).toBe(true);
    expect(orbit.every((watch) => watch.isExactReferenceAsset)).toBe(true);
    expect(orbit.every((watch) => watch.isHeroApprovedAsset)).toBe(true);
    expect(rejectedHomeHeroAssets.some((asset) => asset.reference === "T129.410.11.053.00" && asset.path.includes("frame-01"))).toBe(true);
    expect(rejectedHomeHeroAssets.some((asset) => asset.view === "side" || asset.view === "three-quarter")).toBe(true);
  });

  it("renders the complete homepage ecosystem after the production hero", () => {
    const home = file("src/app/(public)/page.tsx");

    expect(home).toContain("<HomeProductHero scenarios={scenarios} orbitWatches={orbitWatches} />");
    expect(home).toContain("<HomeEcosystemIntro scenarios={scenarios} />");
    expect(home).toContain("<HomeSelectionProfile scenarios={scenarios} />");
    expect(home).toContain("<HomeCompareStory scenarios={scenarios} />");
    expect(home).toContain("<HomePurchaseJourney />");
    expect(home).toContain("<HomeCollectionStory scenarios={scenarios} />");
    expect(home).toContain("<HomeCollectionIntelligence scenarios={scenarios} />");
    expect(home).toContain("<HomeJournalPreview articles={articles} />");
    expect(home).toContain("<HomeFinalCall />");
    expect(home).not.toContain("HomeSelectionStory");
    expect(home).not.toContain("home-service-strip");
    expect(home).not.toContain("home-scenarios-section");
    expect(home).not.toContain("home-catalog-section");
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

  it("uses generated orbit-normalized alpha-bound assets", () => {
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

    expect(existsSync(manifestPath)).toBe(true);
    expect(manifest.count).toBeGreaterThanOrEqual(16);
    expect(model).toContain("orbitNormalizedAssetPath");
    expect(model).toContain("/generated/home-hero/orbit-normalized/");
    expect(manifest.records.every((record) => record.noArtificialUpscale)).toBe(true);
    expect(manifest.records.every((record) => record.visibleBounds.width > 0 && record.visibleBounds.height > 0)).toBe(true);
    expect(manifest.records.some((record) => record.reference === "T129.410.11.053.00")).toBe(true);
    expect(manifest.records.some((record) => record.reference === "RA-AC0M03S10B")).toBe(true);
  });
});
