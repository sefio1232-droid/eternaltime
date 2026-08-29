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
  resolveSelectionStep,
  selectionBudgetContainsPrice,
  selectionFormDefinition,
} from "@/modules/selection/application/selection-service";
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
    primaryImage: input.primaryImage ?? image(),
    imageGallery: input.imageGallery ?? [input.primaryImage ?? image()],
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
        case_diameter_raw: "42 mm",
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
  features: ["none"],
  budget: "unknown",
};

describe("selection query", () => {
  it("uses the new six-step public flow", () => {
    expect(selectionFormDefinition.steps.map((step) => step.code)).toEqual([
      "scenario",
      "fit",
      "character",
      "movement",
      "features",
      "budget",
    ]);
    expect(selectionFormDefinition.steps).toHaveLength(6);
    expect(selectionFormDefinition.steps.some((step) => step.code === "features" && step.multiple)).toBe(true);
    expect(selectionFormDefinition.steps.flatMap((step) => step.options).some((option) => option.code === "gender")).toBe(false);
    expect(selectionFormDefinition.steps.flatMap((step) => step.options).some((option) => option.code === "color")).toBe(false);
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
      features: "sapphire,steel-bracelet",
      budget: "range_30000_50000",
    });
    const answered = answeredSelectionKeys({
      scenario: "daily",
      fit: "medium",
      features: "sapphire,steel-bracelet",
      budget: "range_30000_50000",
    });
    const params = selectionAnswersToSearchParams(answers, answered);

    expect(answered).toEqual(["scenario", "fit", "features", "budget"]);
    expect(params.toString()).toBe("scenario=daily&fit=medium&features=sapphire%2Csteel-bracelet&budget=range_30000_50000");
  });

  it("resolves progress through six steps", () => {
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
        features: "none",
        budget: "unknown",
      },
      answeredKeys: ["scenario", "fit", "character", "movement", "features", "budget"],
    })).toBe("results");
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
        features: ["sapphire", "steel-bracelet"],
        budget: "range_15000_30000",
      },
      limit: 2,
    });

    expect(recommendations.map((item) => item.watch.id)).toEqual(["ideal-22k", "ideal-25k"]);
    expect(recommendations.some((item) => item.watch.id === "cheap-6k")).toBe(false);
    expect(recommendations.some((item) => item.watch.id === "cheap-4k")).toBe(false);
  });

  it("ranks deterministic fixtures according to different answer sets", () => {
    const resultA = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "first-mechanical",
        fit: "medium",
        character: "classic",
        movement: "mechanical",
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
    expect(recommendation?.isPreliminary).toBe(true);
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
        features: ["sapphire", "steel-bracelet"],
        budget: "range_30000_50000",
      },
    });

    expect(recommendations[0]?.watch.id).toBe("within-budget");
    expect(recommendations.find((item) => item.watch.id === "over-budget")?.criteria.find((criterion) => criterion.key === "budget")?.status).toBe("conflict");
  });

  it("keeps results stable and canonical", () => {
    const answers: SelectionAnswers = {
      scenario: "daily",
      fit: "medium",
      character: "modern",
      movement: "quartz",
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
    const item = watch({ id: "missing-image", title: "Missing Image", priceMinor: 2_000_000, specs: {} });
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
