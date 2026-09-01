import { describe, expect, it } from "vitest";
import {
  answeredSelectionKeys,
  normalizeSelectionFeatures,
  parseSelectionAnswers,
  parseSelectionStep,
  selectionAnswersToSearchParams,
} from "@/modules/selection/application/selection-query";
import {
  buildSelectionCatalogDiagnostics,
  buildSelectionImageCandidates,
  buildSelectionRecommendations,
  evaluateBudgetFit,
  selectionMovementMatchesPreference,
  selectionDialColorBucketFromRaw,
  resolveSelectionStep,
  selectionBudgetContainsPrice,
  selectionFormDefinition,
} from "@/modules/selection/application/selection-service";
import { normalizeCaseSizeGroup } from "@/modules/catalog/application/catalog-filter-taxonomy";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { SelectionAnswers } from "@/modules/selection/domain/types";

function image(kind: "none" | "remote" = "none", src = "/watch-front.png"): CatalogImagePresentation {
  if (kind === "remote") {
    return { kind: "remote", url: `https://example.test${src}`, src, alt: "Watch front" };
  }

  return { kind: "none", alt: "Watch" };
}

function watch(input: {
  id: string;
  title: string;
  priceMinor: number | null;
  specs: Record<string, string>;
  brandName?: string;
  brandSlug?: string;
  collection?: string;
  href?: string;
  primaryImage?: CatalogImagePresentation;
  imageGallery?: CatalogImagePresentation[];
}): CatalogWatchDetail {
  const specifications = Object.entries(input.specs).map(([key, value]) => ({
    key,
    label: key,
    value,
    group: key.includes("water")
      ? ("water_resistance" as const)
      : key.includes("movement")
        ? ("mechanism" as const)
        : key.includes("strap") || key.includes("bracelet") || key.includes("attachment")
          ? ("strap" as const)
          : key.includes("crystal")
            ? ("glass" as const)
            : key.includes("function")
              ? ("functions" as const)
              : ("other" as const),
  }));

  return {
    id: input.id,
    href: input.href ?? `/watches/${input.brandSlug ?? "test"}/${input.id}`,
    brandName: input.brandName ?? "Test",
    brandSlug: input.brandSlug ?? "test",
    title: input.title,
    officialName: input.title,
    referenceDisplay: input.id.toUpperCase(),
    referenceNormalized: input.id.toUpperCase(),
    referenceSlug: input.id,
    brandCollectionName: input.collection ?? "Selection Fixture",
    brandLineName: null,
    watchModelName: input.title,
    publicPrice: input.priceMinor === null ? null : { amountMinor: input.priceMinor, currencyCode: "RUB" },
    primaryImage: input.primaryImage ?? image("remote", `/${input.id}-front.png`),
    imageGallery: input.imageGallery ?? [input.primaryImage ?? image("remote", `/${input.id}-front.png`)],
    keySpecifications: specifications.slice(0, 3),
    specifications,
    siblingReferences: [],
  };
}

function dataset(watches: CatalogWatchDetail[] = fixtureWatches()): CatalogReadDataset {
  const brandCounts = new Map<string, { name: string; count: number }>();
  for (const item of watches) {
    const current = brandCounts.get(item.brandSlug);
    brandCounts.set(item.brandSlug, { name: item.brandName, count: (current?.count ?? 0) + 1 });
  }

  return {
    source: "preview",
    generatedAt: "2026-08-29T00:00:00.000Z",
    brands: [...brandCounts.entries()].map(([slug, value]) => ({ slug, name: value.name, watchCount: value.count })),
    watches,
  };
}

function fixtureWatches(): CatalogWatchDetail[] {
  return [
    watch({
      id: "watch-a",
      title: "Classic Automatic 40",
      priceMinor: 4_000_000,
      specs: {
        movement_type_raw: "automatic mechanical",
        dial_color_raw: "white",
        case_diameter_raw: "40 mm",
        bracelet_material_raw: "stainless steel bracelet",
        water_resistance_raw: "100 m",
        crystal_type_raw: "sapphire crystal",
        case_thickness_raw: "10 mm",
        functions_raw: "date",
      },
      primaryImage: image("remote"),
    }),
    watch({
      id: "watch-b",
      title: "Classic Quartz 32",
      priceMinor: 2_500_000,
      specs: {
        movement_type_raw: "quartz",
        dial_color_raw: "black",
        case_diameter_raw: "32 mm",
        strap_material_raw: "leather strap",
        water_resistance_raw: "30 m",
        crystal_type_raw: "mineral glass",
      },
      primaryImage: image("remote", "/classic-quartz-front.png"),
    }),
    watch({
      id: "watch-c",
      title: "Solar Sport Chronograph 42",
      priceMinor: 4_500_000,
      specs: {
        movement_type_raw: "solar quartz Eco-Drive",
        dial_color_raw: "blue",
        case_diameter_raw: "42.1 mm",
        bracelet_material_raw: "stainless steel bracelet",
        water_resistance_raw: "200 m",
        crystal_type_raw: "sapphire crystal",
        functions_raw: "chronograph, timer, alarm, date",
      },
      primaryImage: image("remote", "/solar-sport-front.png"),
    }),
  ];
}

const baseAnswers: SelectionAnswers = {
  scenario: "daily",
  fit: "medium",
  character: "modern",
  movement: "neutral",
  dialColor: "neutral",
  features: ["none"],
  budget: "unknown",
};

describe("selection query", () => {
  it("uses the new seven-step public flow with a dedicated dial color step", () => {
    expect(selectionFormDefinition.steps.map((step) => step.code)).toEqual([
      "scenario",
      "fit",
      "character",
      "movement",
      "dial-color",
      "features",
      "budget",
    ]);
    expect(selectionFormDefinition.steps).toHaveLength(7);
    expect(selectionFormDefinition.steps.find((step) => step.code === "dial-color")?.title).toBe("Какой цвет циферблата вам ближе?");
    expect(selectionFormDefinition.steps.some((step) => step.code === "features" && step.multiple)).toBe(true);
    expect(selectionFormDefinition.steps.flatMap((step) => step.options).some((option) => option.code === "gender")).toBe(false);
  });

  it("normalizes legacy query values without crashing old URLs", () => {
    expect(
      parseSelectionAnswers({
        scenario: "everyday",
        budget: "any",
        movement: "ana_digi",
        character: "instrumental",
        wrist: "small",
        attachment: "bracelet",
        practical: "high_water",
      }),
    ).toEqual({
      scenario: "daily",
      fit: "compact",
      character: "sporty",
      movement: "quartz",
      dialColor: "neutral",
      features: ["water-resistance", "steel-bracelet"],
      budget: "unknown",
    });
    expect(parseSelectionStep({ step: "practical" })).toBe("features");
  });

  it("keeps feature multi-select coherent", () => {
    expect(normalizeSelectionFeatures(["none", "sapphire", "water-resistance", "sapphire"])).toEqual([
      "sapphire",
      "water-resistance",
    ]);
    expect(normalizeSelectionFeatures(["none"])).toEqual(["none"]);
  });

  it("serializes URL state reload-safely", () => {
    const answers = parseSelectionAnswers({
      scenario: "daily",
      fit: "medium",
      character: "modern",
      movement: "solar",
      dialColor: "blue",
      features: "sapphire,steel-bracelet",
      budget: "range_30000_50000",
    });
    const answered = answeredSelectionKeys({
      scenario: "daily",
      fit: "medium",
      dialColor: "blue",
      features: "sapphire,steel-bracelet",
      budget: "range_30000_50000",
    });
    const params = selectionAnswersToSearchParams(answers, answered);

    expect(answered).toEqual(["scenario", "fit", "dialColor", "features", "budget"]);
    expect(params.toString()).toBe("scenario=daily&fit=medium&dialColor=blue&features=sapphire%2Csteel-bracelet&budget=range_30000_50000");
  });

  it("resolves progress through seven steps", () => {
    expect(resolveSelectionStep({ requestedStep: "start", hasAnswers: false, searchParams: {} })).toBe("start");
    expect(resolveSelectionStep({
      requestedStep: "start",
      hasAnswers: true,
      searchParams: { scenario: "daily" },
      answeredKeys: ["scenario"],
    })).toBe("fit");
    expect(resolveSelectionStep({
      requestedStep: "start",
      hasAnswers: true,
      searchParams: {
        scenario: "daily",
        fit: "medium",
        character: "modern",
        movement: "neutral",
        dialColor: "neutral",
        features: "none",
        budget: "unknown",
      },
      answeredKeys: ["scenario", "fit", "character", "movement", "dialColor", "features", "budget"],
    })).toBe("results");
  });
});

describe("selection dial color", () => {
  it.each([
    ["white", "light"],
    ["silver", "light"],
    ["champagne", "light"],
    ["ivory", "light"],
    ["mother_of_pearl", "light"],
    ["black", "dark"],
    ["dark grey", "dark"],
    ["blue", "blue"],
    ["mother_of_pearl_blue", "blue"],
    ["green", "green"],
    ["olive", "green"],
    ["pink", "other"],
    ["burgundy", "other"],
    ["gold-tone", "other"],
    ["brown", "other"],
    [null, "unknown"],
    ["", "unknown"],
  ] as const)("maps MASTER dial_color %s to %s", (raw, bucket) => {
    expect(selectionDialColorBucketFromRaw(raw)).toBe(bucket);
  });

  it("scores color as match, conflict, unknown and neutral without hard filtering", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "blue", title: "Blue", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm", dial_color_raw: "blue" } }),
        watch({ id: "black", title: "Black", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm", dial_color_raw: "black" } }),
        watch({ id: "unknown", title: "Unknown", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" } }),
      ]),
      answers: { ...baseAnswers, movement: "quartz", dialColor: "blue", budget: "range_15000_30000" },
      limit: 3,
    });

    expect(recommendations[0]?.watch.id).toBe("blue");
    expect(recommendations.find((item) => item.watch.id === "blue")?.criteria.find((criterion) => criterion.key === "dialColor")?.status).toBe("match");
    expect(recommendations.find((item) => item.watch.id === "black")?.criteria.find((criterion) => criterion.key === "dialColor")?.status).toBe("conflict");
    expect(recommendations.find((item) => item.watch.id === "unknown")?.criteria.find((criterion) => criterion.key === "dialColor")?.status).toBe("unknown");

    const neutral = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "any", title: "Any", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm", dial_color_raw: "black" } }),
      ]),
      answers: { ...baseAnswers, movement: "quartz", dialColor: "neutral", budget: "range_15000_30000" },
    });
    expect(neutral[0]?.criteria.find((criterion) => criterion.key === "dialColor")?.status).toBe("neutral");
  });
});

describe("selection algorithm", () => {
  it("uses public RUB price budget boundaries", () => {
    expect(selectionBudgetContainsPrice("under_15000", 14_999 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("under_15000", 15_001 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("range_15000_30000", 14_999 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("range_15000_30000", 12_000 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("range_15000_30000", 6_000 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("range_15000_30000", 30_000 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("range_15000_30000", 30_001 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("range_30000_50000", 30_000 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("range_30000_50000", 50_000 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("range_30000_50000", 50_001 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("range_30000_50000", 70_000 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("range_50000_100000", 50_000 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("range_50000_100000", 100_000 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("range_50000_100000", 100_001 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("over_100000", 99_999 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("over_100000", 25_000 * 100)).toBe(false);
    expect(selectionBudgetContainsPrice("over_100000", 100_001 * 100)).toBe(true);
    expect(selectionBudgetContainsPrice("unknown", 700_000 * 100)).toBe(true);
  });

  it("classifies budget as a target price band, not only as a maximum cap", () => {
    expect(evaluateBudgetFit("range_15000_30000", 22_000 * 100).status).toBe("ideal");
    expect(evaluateBudgetFit("range_15000_30000", 14_000 * 100).status).toBe("acceptable_low");
    expect(evaluateBudgetFit("range_15000_30000", 12_000 * 100).status).toBe("too_cheap");
    expect(evaluateBudgetFit("range_15000_30000", 6_000 * 100).status).toBe("too_cheap");
    expect(evaluateBudgetFit("range_15000_30000", 35_000 * 100).status).toBe("too_expensive");
    expect(evaluateBudgetFit("range_15000_30000", 100_000 * 100).score).toBeLessThan(0.1);
    expect(evaluateBudgetFit("range_30000_50000", 8_000 * 100).status).toBe("too_cheap");
    expect(evaluateBudgetFit("range_50000_100000", 15_000 * 100).status).toBe("too_cheap");
    expect(evaluateBudgetFit("over_100000", 25_000 * 100).status).toBe("too_cheap");
    expect(evaluateBudgetFit("unknown", null).tier).toBe("budget_neutral");
  });

  it("does not rank 4k or 6k watches as normal top recommendations for a 15-30k target band", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "ideal-22k",
          title: "Ideal 22k",
          priceMinor: 22_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "stainless steel bracelet",
            crystal_type_raw: "sapphire crystal",
          },
        }),
        watch({
          id: "ideal-25k",
          title: "Ideal 25k",
          priceMinor: 25_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "stainless steel bracelet",
            water_resistance_raw: "100 m",
          },
        }),
        watch({
          id: "cheap-6k",
          title: "Cheap 6k",
          priceMinor: 6_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "stainless steel bracelet",
            crystal_type_raw: "sapphire crystal",
            water_resistance_raw: "200 m",
            functions_raw: "chronograph, date",
          },
        }),
        watch({
          id: "cheap-4k",
          title: "Cheap 4k",
          priceMinor: 4_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "stainless steel bracelet",
            crystal_type_raw: "sapphire crystal",
            water_resistance_raw: "200 m",
            functions_raw: "chronograph, date",
          },
        }),
      ]),
      answers: {
        scenario: "daily",
        fit: "medium",
        character: "modern",
        movement: "quartz",
        dialColor: "neutral",
        features: ["sapphire", "steel-bracelet"],
        budget: "range_15000_30000",
      },
      limit: 2,
    });

    expect(recommendations.map((item) => item.watch.id)).toEqual(["ideal-22k", "ideal-25k"]);
    expect(recommendations.some((item) => item.watch.id === "cheap-6k")).toBe(false);
    expect(recommendations.some((item) => item.watch.id === "cheap-4k")).toBe(false);
  });

  it("excludes candidates without a valid selection image before ranking", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "missing-photo-perfect",
          title: "Missing Photo Perfect",
          priceMinor: 25_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
            dial_color_raw: "blue",
            bracelet_material_raw: "stainless steel bracelet",
            crystal_type_raw: "sapphire crystal",
            water_resistance_raw: "200 m",
          },
          primaryImage: image("none"),
          imageGallery: [image("none")],
        }),
        watch({
          id: "valid-photo-basic",
          title: "Valid Photo Basic",
          priceMinor: 25_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
          },
        }),
      ]),
      answers: { ...baseAnswers, fit: "medium", movement: "quartz", dialColor: "blue", budget: "range_15000_30000" },
      limit: 3,
    });

    expect(recommendations.map((item) => item.watch.id)).toEqual(["valid-photo-basic"]);
    expect(recommendations.every((item) => item.imageCandidates.length > 0)).toBe(true);
  });

  it("does not count placeholder, technical or broken metadata as a valid selection image", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "placeholder",
          title: "Placeholder",
          priceMinor: 25_000 * 100,
          specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" },
          primaryImage: image("remote", "/placeholder-watch.png"),
          imageGallery: [image("remote", "/placeholder-watch.png")],
        }),
        watch({
          id: "caseback",
          title: "Caseback",
          priceMinor: 25_000 * 100,
          specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" },
          primaryImage: image("remote", "/watch-caseback.png"),
          imageGallery: [image("remote", "/watch-caseback.png")],
        }),
        watch({
          id: "broken",
          title: "Broken",
          priceMinor: 25_000 * 100,
          specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" },
          primaryImage: image("remote", "/watch-broken-404.png"),
          imageGallery: [image("remote", "/watch-broken-404.png")],
        }),
        watch({
          id: "front",
          title: "Front",
          priceMinor: 25_000 * 100,
          specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" },
        }),
      ]),
      answers: { ...baseAnswers, fit: "medium", movement: "quartz", budget: "range_15000_30000" },
      limit: 4,
    });

    expect(recommendations.map((item) => item.watch.id)).toEqual(["front"]);
  });

  it.each([
    [37.9, "compact"],
    [38.0, "medium"],
    [42.0, "medium"],
    [42.1, "large"],
  ] as const)("uses MASTER size boundary %s mm => %s", (mm, bucket) => {
    expect(normalizeCaseSizeGroup(mm)).toBe(bucket);
  });

  it.each([
    ["compact", "compact-37", "37.9 mm"],
    ["medium", "medium-38", "38.0 mm"],
    ["medium", "medium-42", "42.0 mm"],
    ["large", "large-421", "42.1 mm"],
  ] as const)("keeps %s selection to exact size class only", (fit, expectedId, expectedSize) => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "compact-37", title: "Compact", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "37.9 mm" } }),
        watch({ id: "medium-38", title: "Medium 38", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "38.0 mm" } }),
        watch({ id: "medium-42", title: "Medium 42", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "42.0 mm" } }),
        watch({ id: "large-421", title: "Large", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "42.1 mm" } }),
        watch({ id: "unknown-size", title: "Unknown", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz" } }),
      ]),
      answers: { ...baseAnswers, fit, movement: "quartz", budget: "range_15000_30000" },
      limit: 5,
    });

    expect(recommendations.map((item) => item.watch.id)).toContain(expectedId);
    expect(recommendations.every((item) => item.sizeClass === fit)).toBe(true);
    expect(recommendations.every((item) => item.caseSizeMm !== null)).toBe(true);
    expect(recommendations.some((item) => item.watch.id === "unknown-size")).toBe(false);
    expect(recommendations.find((item) => item.watch.id === expectedId)?.criteria.find((criterion) => criterion.key === "fit")?.status).toBe("match");
    expect(expectedSize).toBeTruthy();
  });

  it("allows all known size classes when size is neutral", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "compact", title: "Compact", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "36 mm" } }),
        watch({ id: "medium", title: "Medium", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" } }),
        watch({ id: "large", title: "Large", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "44 mm" } }),
      ]),
      answers: { ...baseAnswers, fit: "unknown", movement: "quartz", budget: "range_15000_30000" },
      limit: 4,
    });

    expect(new Set(recommendations.map((item) => item.sizeClass))).toEqual(new Set(["compact", "medium", "large"]));
  });

  it("does not allow budget, color or character to override hard size", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "medium-perfect",
          title: "Medium Perfect",
          priceMinor: 20_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            dial_color_raw: "blue",
            case_diameter_raw: "40 mm",
            crystal_type_raw: "sapphire",
            bracelet_material_raw: "steel bracelet",
          },
        }),
        watch({
          id: "compact-basic",
          title: "Compact Basic",
          priceMinor: 35_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            dial_color_raw: "black",
            case_diameter_raw: "36 mm",
          },
        }),
      ]),
      answers: { scenario: "daily", fit: "compact", character: "modern", movement: "quartz", dialColor: "blue", features: ["sapphire", "steel-bracelet"], budget: "range_15000_30000" },
      limit: 3,
    });

    expect(recommendations.map((item) => item.watch.id)).toEqual(["compact-basic"]);
    expect(recommendations.every((item) => item.sizeClass === "compact")).toBe(true);
  });

  it("does not force result count to three when hard constraints leave fewer exact matches", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "compact-one", title: "Compact One", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "36 mm" } }),
        watch({ id: "medium-wrong", title: "Medium Wrong", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" } }),
      ]),
      answers: { ...baseAnswers, fit: "compact", movement: "quartz", budget: "range_15000_30000" },
      limit: 3,
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]?.watch.id).toBe("compact-one");
  });

  it("returns an empty exact-match state instead of wrong-size fallbacks", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "medium", title: "Medium", priceMinor: 25_000 * 100, specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" } }),
      ]),
      answers: { ...baseAnswers, fit: "compact", movement: "quartz", budget: "range_15000_30000" },
      limit: 3,
    });

    expect(recommendations).toEqual([]);
  });

  it("treats explicit movement choice as a hard eligibility constraint", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "mechanical", title: "Mechanical", priceMinor: 35_000 * 100, specs: { movement_type_raw: "automatic mechanical", case_diameter_raw: "40 mm" } }),
        watch({ id: "solar", title: "Solar", priceMinor: 35_000 * 100, specs: { movement_type_raw: "Eco-Drive solar", case_diameter_raw: "40 mm" } }),
        watch({ id: "unknown", title: "Unknown", priceMinor: 35_000 * 100, specs: { case_diameter_raw: "40 mm" } }),
      ]),
      answers: { ...baseAnswers, fit: "medium", movement: "mechanical", budget: "range_30000_50000" },
      limit: 3,
    });

    expect(recommendations.map((item) => item.watch.id)).toEqual(["mechanical"]);
    expect(recommendations.every((item) => item.movementKey === "mechanical")).toBe(true);
    expect(selectionMovementMatchesPreference("solar", "solar")).toBe(true);
    expect(selectionMovementMatchesPreference("mechanical", "solar")).toBe(false);
  });

  it("ranks deterministic fixtures according to different answer sets", () => {
    const resultA = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "first-mechanical",
        fit: "medium",
        character: "classic",
        movement: "mechanical",
        dialColor: "neutral",
        features: ["sapphire"],
        budget: "range_30000_50000",
      },
    });
    const resultB = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "work",
        fit: "compact",
        character: "classic",
        movement: "quartz",
        dialColor: "neutral",
        features: ["leather"],
        budget: "range_15000_30000",
      },
    });
    const resultC = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "sport",
        fit: "large",
        character: "sporty",
        movement: "solar",
        dialColor: "neutral",
        features: ["water-resistance", "chronograph"],
        budget: "range_30000_50000",
      },
    });

    expect(resultA[0]?.watch.id).toBe("watch-a");
    expect(resultB[0]?.watch.id).toBe("watch-b");
    expect(resultC[0]?.watch.id).toBe("watch-c");
  });

  it("treats unknown specs as unknown, not conflict", () => {
    const [recommendation] = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "unknown-glass",
          title: "Unknown Glass",
          priceMinor: 4_000_000,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
          },
        }),
      ]),
      answers: { ...baseAnswers, movement: "quartz", features: ["sapphire"], budget: "range_30000_50000" },
    });

    expect(recommendation?.criteria.find((criterion) => criterion.key === "feature:sapphire")?.status).toBe("unknown");
    expect(recommendation?.isPreliminary).toBe(false);
    expect(recommendation?.reasons.join(" ")).not.toContain("сапфир");
  });

  it("keeps strong verified matches above incomplete matches", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "verified",
          title: "Verified Match",
          priceMinor: 4_000_000,
          specs: {
            movement_type_raw: "solar Eco-Drive",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "stainless steel bracelet",
            water_resistance_raw: "200 m",
            crystal_type_raw: "sapphire",
            functions_raw: "chronograph, date",
          },
        }),
        watch({
          id: "incomplete",
          title: "Incomplete",
          priceMinor: 4_000_000,
          specs: {},
        }),
      ]),
      answers: {
        scenario: "sport",
        fit: "medium",
        character: "sporty",
        movement: "solar",
        dialColor: "neutral",
        features: ["sapphire", "water-resistance", "chronograph"],
        budget: "range_30000_50000",
      },
    });

    expect(recommendations[0]?.watch.id).toBe("verified");
  });

  it("penalizes known feature conflicts without turning missing data into conflicts", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "mineral",
          title: "Known Mineral",
          priceMinor: 4_000_000,
          specs: { crystal_type_raw: "mineral glass", movement_type_raw: "quartz", case_diameter_raw: "40 mm" },
        }),
        watch({
          id: "unknown",
          title: "Unknown Crystal",
          priceMinor: 4_000_000,
          specs: { movement_type_raw: "quartz", case_diameter_raw: "40 mm" },
        }),
      ]),
      answers: { ...baseAnswers, movement: "quartz", features: ["sapphire"], budget: "range_30000_50000" },
    });

    const mineral = recommendations.find((item) => item.watch.id === "mineral");
    const unknown = recommendations.find((item) => item.watch.id === "unknown");
    expect(mineral?.criteria.find((criterion) => criterion.key === "feature:sapphire")?.status).toBe("conflict");
    expect(unknown?.criteria.find((criterion) => criterion.key === "feature:sapphire")?.status).toBe("unknown");
  });

  it("does not use gender as a hidden filter or default male preference", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "seiko-women",
          title: "Seiko Compact Classic",
          priceMinor: 4_000_000,
          brandName: "Seiko",
          brandSlug: "seiko",
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "30 mm",
            strap_material_raw: "leather",
            crystal_type_raw: "sapphire",
          },
        }),
        watch({
          id: "unisex-compact",
          title: "Unisex Compact",
          priceMinor: 4_000_000,
          brandName: "Unisex",
          brandSlug: "unisex",
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "34 mm",
            strap_material_raw: "leather",
            crystal_type_raw: "sapphire",
          },
        }),
        watch({
          id: "men-compact",
          title: "Men Compact",
          priceMinor: 4_000_000,
          brandName: "Men",
          brandSlug: "men",
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "35 mm",
            strap_material_raw: "leather",
            crystal_type_raw: "sapphire",
          },
        }),
      ]),
      answers: {
        scenario: "work",
        fit: "compact",
        character: "classic",
        movement: "quartz",
        dialColor: "neutral",
        features: ["sapphire"],
        budget: "range_30000_50000",
      },
      limit: 3,
    });

    expect(recommendations.map((item) => item.watch.id)).toEqual(["men-compact", "seiko-women", "unisex-compact"]);
    expect(recommendations.some((item) => item.watch.brandSlug === "seiko")).toBe(true);
  });

  it("keeps medium or large women models eligible when size fits", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "seiko-medium",
          title: "Seiko Medium",
          priceMinor: 4_000_000,
          brandName: "Seiko",
          brandSlug: "seiko",
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "38 mm",
            bracelet_material_raw: "steel bracelet",
            water_resistance_raw: "100 m",
          },
        }),
      ]),
      answers: { ...baseAnswers, fit: "medium", movement: "quartz", budget: "range_30000_50000" },
    });

    expect(recommendations[0]?.watch.id).toBe("seiko-medium");
  });

  it("keeps budget conflicts below in-budget alternatives", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "within-budget",
          title: "Within Budget",
          priceMinor: 4_900_000,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "steel bracelet",
            crystal_type_raw: "sapphire",
          },
        }),
        watch({
          id: "over-budget",
          title: "Over Budget",
          priceMinor: 7_000_000,
          specs: {
            movement_type_raw: "quartz",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "steel bracelet",
            crystal_type_raw: "sapphire",
            water_resistance_raw: "200 m",
            functions_raw: "chronograph, date",
          },
        }),
      ]),
      answers: {
        scenario: "daily",
        fit: "medium",
        character: "modern",
        movement: "quartz",
        dialColor: "neutral",
        features: ["sapphire", "steel-bracelet"],
        budget: "range_30000_50000",
      },
    });

    expect(recommendations[0]?.watch.id).toBe("within-budget");
    expect(recommendations.find((item) => item.watch.id === "over-budget")?.criteria.find((criterion) => criterion.key === "budget")?.status).toBe("conflict");
  });

  it("does not let dial color override the budget phase", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "within-budget-black",
          title: "Within Budget Black",
          priceMinor: 25_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            dial_color_raw: "black",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "steel bracelet",
            crystal_type_raw: "sapphire",
          },
        }),
        watch({
          id: "far-over-budget-blue",
          title: "Far Over Budget Blue",
          priceMinor: 125_000 * 100,
          specs: {
            movement_type_raw: "quartz",
            dial_color_raw: "blue",
            case_diameter_raw: "40 mm",
            bracelet_material_raw: "steel bracelet",
            crystal_type_raw: "sapphire",
            water_resistance_raw: "200 m",
            functions_raw: "chronograph, date",
          },
        }),
      ]),
      answers: {
        scenario: "daily",
        fit: "medium",
        character: "modern",
        movement: "quartz",
        dialColor: "blue",
        features: ["sapphire", "steel-bracelet"],
        budget: "range_15000_30000",
      },
      limit: 2,
    });

    expect(recommendations[0]?.watch.id).toBe("within-budget-black");
    expect(recommendations.find((item) => item.watch.id === "far-over-budget-blue")?.criteria.find((criterion) => criterion.key === "dialColor")?.status).toBe("match");
    expect(recommendations.find((item) => item.watch.id === "far-over-budget-blue")?.criteria.find((criterion) => criterion.key === "budget")?.status).toBe("conflict");
  });

  it("keeps results stable and canonical", () => {
    const answers: SelectionAnswers = {
      scenario: "daily",
      fit: "medium",
      character: "modern",
      movement: "quartz",
      dialColor: "neutral",
      features: ["none"],
      budget: "range_15000_30000",
    };
    const first = buildSelectionRecommendations({ dataset: dataset(), answers });
    const second = buildSelectionRecommendations({ dataset: dataset(), answers });

    expect(first.map((item) => item.watch.id)).toEqual(second.map((item) => item.watch.id));
    expect(first.every((item) => item.watch.href.startsWith("/watches/"))).toBe(true);
  });

  it("does not mutate or shorten the source dataset", () => {
    const source = dataset();
    const beforeIds = source.watches.map((item) => item.id);

    buildSelectionRecommendations({ dataset: source, answers: baseAnswers });

    expect(source.watches.map((item) => item.id)).toEqual(beforeIds);
  });
});

describe("selection diagnostics and images", () => {
  it("builds catalog diagnostics", () => {
    const diagnostics = buildSelectionCatalogDiagnostics(dataset());
    expect(diagnostics.totalRecords).toBe(3);
    expect(diagnostics.scorableRecords).toBe(3);
    expect(diagnostics.withPrice).toBe(3);
  });

  it("provides a silhouette fallback when no image exists", () => {
    const item = watch({
      id: "missing-image",
      title: "Missing Image",
      priceMinor: 2_000_000,
      specs: {},
      primaryImage: image("none"),
      imageGallery: [image("none")],
    });
    expect(buildSelectionImageCandidates(item)).toEqual([]);
  });

  it("rejects a broken primary URL and keeps the next clean image", () => {
    const broken = image("remote", "/broken-primary.png");
    const fallback = image("remote", "/clean-secondary.png");
    const item = watch({
      id: "broken-primary",
      title: "Broken Primary",
      priceMinor: 2_000_000,
      specs: {},
      primaryImage: broken,
      imageGallery: [broken, fallback],
    });

    expect(buildSelectionImageCandidates(item).map((candidate) => candidate.kind === "remote" ? candidate.src : null)).toEqual([
      "/clean-secondary.png",
    ]);
  });

  it("rejects a confirmed unavailable catalog image before presentation", () => {
    const unavailable = {
      kind: "remote" as const,
      url: "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0002S/product_en_file/file/RA-AB0002S_main.webp",
      src: "https://orient-watch.com/en/orient/collection/contemporary/others/RA-AB0002S/product_en_file/file/RA-AB0002S_main.webp",
      alt: "Orient RA-AB0002S",
    };
    const item = watch({
      id: "known-unavailable-primary",
      title: "Known Unavailable Primary",
      priceMinor: 2_000_000,
      specs: {},
      primaryImage: unavailable,
      imageGallery: [unavailable],
    });

    expect(buildSelectionImageCandidates(item)).toEqual([]);
  });

  it.each([
    "/watch-caseback.png",
    "/watch-profile.png",
    "/watch-side.png",
    "/watch-clasp.png",
    "/watch-buckle.png",
    "/watch-packaging.png",
    "/watch-manual.png",
    "/watch-dial-macro.png",
    "/watch-movement.png",
    "/watch-broken-404.png",
  ])("rejects %s even when it is the primary image", (src) => {
    const blocked = image("remote", src);
    const item = watch({
      id: `blocked-${src}`,
      title: "Blocked Primary",
      priceMinor: 2_000_000,
      specs: {},
      primaryImage: blocked,
      imageGallery: [blocked],
    });

    expect(buildSelectionImageCandidates(item)).toEqual([]);
  });
});
