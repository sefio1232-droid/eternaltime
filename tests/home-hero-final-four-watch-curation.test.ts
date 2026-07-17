import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  finalHomeHeroCandidateManifestPath,
  finalHomeHeroFrontImageRequirements,
  finalHomeHeroReferenceImagePath,
  finalHomeHeroScenarios,
  getFinalHomeHeroReadySlots,
  getFinalHomeHeroSlotsNeedingAssetWork,
} from "../src/app/design-lab/home-hero/final-four-watch-curation";

const root = process.cwd();
const file = (targetPath: string) => readFileSync(join(root, targetPath), "utf8");

describe("final four-watch homepage hero curation", () => {
  it("records six scenarios with exactly four role-based watch slots", () => {
    expect(finalHomeHeroScenarios.map((scenario) => scenario.id)).toEqual(["01", "02", "03", "04", "05", "06"]);

    for (const scenario of finalHomeHeroScenarios) {
      expect(scenario.slots.map((slot) => slot.role)).toEqual([
        "centralMain",
        "alternativeLeft",
        "alternativeRight",
        "alternativeBack",
      ]);
    }

    expect(finalHomeHeroScenarios.flatMap((scenario) => scenario.slots)).toHaveLength(24);
    expect(finalHomeHeroCandidateManifestPath).toBe(
      "public/generated/home-hero/candidates/home-hero-candidate-manifest.json",
    );
    expect(finalHomeHeroReferenceImagePath).toContain("ChatGPT Image 16 июл. 2026 г.");
  });

  it("matches the approved final watch curation without substituting missing variants", () => {
    const byScenario = Object.fromEntries(finalHomeHeroScenarios.map((scenario) => [scenario.id, scenario]));

    expect(byScenario["01"]?.slots.map((slot) => slot.requestedWatch)).toEqual([
      "Tissot PR 100 Chronograph 40mm, blue dial, steel bracelet",
      "Tissot Classic Dream 40mm, black dial, steel bracelet",
      "Casio Edifice Automatic EFK-100D-2A, blue dial, steel bracelet",
      "Tissot PR 100 34mm, blue dial, steel bracelet",
    ]);

    expect(byScenario["03"]?.slots[2]).toMatchObject({
      model: "Mako 40",
      reference: "RA-AC0Q03S10B",
      assetPath: null,
      assetReadiness: "needs_catalog_confirmation",
    });
    expect(byScenario["04"]?.slots[3]).toMatchObject({
      model: "PRX Powermatic 80 40mm",
      variant: "blue dial, steel bracelet",
      reference: "T137.407.11.041.00",
      assetReadiness: "needs_hero_asset",
    });
    expect(byScenario["06"]?.slots[1]).toMatchObject({
      variant: "blue dial, steel bracelet",
      reference: "T137.407.11.041.00",
      assetReadiness: "needs_hero_asset",
    });
    expect(byScenario["06"]?.slots[0]).toMatchObject({
      variant: "gold case and bracelet, black dial",
      reference: "T137.407.33.051.00",
    });
    expect(byScenario["05"]?.slots[0]).toMatchObject({
      reference: "T120.807.33.051.00",
      assetReadiness: "needs_hero_asset",
    });
  });

  it("keeps front-image requirements explicit and never marks perspective or low-res assets as ready", () => {
    expect(finalHomeHeroFrontImageRequirements.minimumLongSidePx).toBe(1200);
    expect(finalHomeHeroFrontImageRequirements.forbidden).toContain("perspective_transform");
    expect(finalHomeHeroFrontImageRequirements.forbidden).toContain("small_source_upscale");

    for (const slot of getFinalHomeHeroReadySlots()) {
      expect(slot.photoView).toBe("front");
      expect(slot.sourceLongSidePx).toBeGreaterThanOrEqual(1200);
      expect(slot.issues).toEqual([]);
    }

    const notReady = getFinalHomeHeroSlotsNeedingAssetWork();
    expect(notReady).toHaveLength(21);
    expect(notReady.map((slot) => slot.assetReadiness)).toContain("needs_high_resolution_front_source");
    expect(notReady.map((slot) => slot.assetReadiness)).toContain("needs_strict_front_source");
    expect(notReady.map((slot) => slot.assetReadiness)).toContain("needs_hero_asset");
    expect(notReady.map((slot) => slot.assetReadiness)).toContain("needs_catalog_confirmation");
    expect(notReady.map((slot) => slot.assetReadiness)).toContain("blocked_by_scenario_rule");
  });

  it("keeps MT-G constrained to sport and blocks the collection conflict", () => {
    const mtgSlots = finalHomeHeroScenarios.flatMap((scenario) =>
      scenario.slots
        .filter((slot) => slot.reference === "MTG-B3000DN-1A")
        .map((slot) => ({ scenarioId: scenario.id, slot })),
    );

    expect(mtgSlots).toHaveLength(2);
    expect(mtgSlots.find((entry) => entry.scenarioId === "05")?.slot.assetReadiness).toBe(
      "needs_strict_front_source",
    );
    expect(mtgSlots.find((entry) => entry.scenarioId === "06")?.slot.assetReadiness).toBe(
      "blocked_by_scenario_rule",
    );
    expect(finalHomeHeroScenarios.find((scenario) => scenario.id === "06")?.scenarioIssues).toContain(
      "requested_mtg_slot_conflicts_with_mtg_only_sport_rule",
    );
  });

  it("points manifest-backed slots to existing prepared assets but keeps missing slots empty", () => {
    const allSlots = finalHomeHeroScenarios.flatMap((scenario) => scenario.slots);

    for (const slot of allSlots) {
      if (slot.assetReadiness === "needs_catalog_confirmation") {
        expect(slot.reference).toBeTruthy();
        expect(slot.publicPriceRub).toBeNull();
        expect(slot.assetPath).toBeNull();
        continue;
      }

      if (slot.assetReadiness === "needs_hero_asset") {
        expect(slot.reference).toBeTruthy();
        expect(slot.referenceSlug).toBeTruthy();
        expect(slot.assetPath).toBeNull();
        continue;
      }

      expect(slot.assetPath).toMatch(/^\/generated\/home-hero\/candidates\//);
      const outputPath = join(root, "public", slot.assetPath!.replace(/^\//, ""));
      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(20_000);
    }
  });

  it("documents the user-supplied ZIP motion-frame preparation pass", () => {
    const packageJson = file("package.json");
    const script = file("scripts/prepare-home-hero-final-assets.mjs");
    const docs = file("docs/HOME_HERO_FINAL_FOUR_WATCH_CURATION.md");

    expect(packageJson).toContain("home-hero:prepare-final-assets");
    expect(script).toContain("imports/raw/home-hero/final");
    expect(script).toContain("orbit_frame_set");
    expect(script).toContain("withoutEnlargement: true");
    expect(script).toContain("final-home-hero-assets-manifest.json");
    expect(docs).toContain("Motion Frame Intent");
    expect(docs).toContain("do not create fake rotation");
    expect(docs).toContain("No `MTG-B3000DN-1A.zip` was present");
  });
});
