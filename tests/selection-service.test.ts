import { describe, expect, it } from "vitest";
import {
  answeredSelectionKeys,
  parseSelectionAnswers,
  parseSelectionStep,
  selectionAnswersToSearchParams,
} from "@/modules/selection/application/selection-query";
import {
  buildSelectionCatalogDiagnostics,
  buildSelectionImageCandidates,
  buildSelectionRecommendations,
  resolveSelectionStep,
  selectionBudgetContainsPrice,
  selectionFormDefinition,
} from "@/modules/selection/application/selection-service";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

function image(kind: "none" | "remote" = "none", src = "/watch.png"): CatalogImagePresentation {
  if (kind === "remote") {
    return { kind: "remote", url: `https://example.test${src}`, src, alt: "Watch" };
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
    group: key.includes("water") ? ("water_resistance" as const) : ("other" as const),
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
    generatedAt: "2026-07-31T00:00:00.000Z",
    brands: [...brandCounts.entries()].map(([slug, value]) => ({ slug, name: value.name, watchCount: value.count })),
    watches,
  };
}

function fixtureWatches(): CatalogWatchDetail[] {
  return [
    watch({
      id: "auto-classic",
      title: "Classic Automatic 38",
      priceMinor: 6400000,
      specs: {
        movement_type_raw: "Автоматический",
        case_diameter_raw: "38 мм",
        strap_material_raw: "Кожа",
        water_resistance_raw: "50 м",
        crystal_type_raw: "Сапфир",
      },
      primaryImage: image("remote"),
    }),
    watch({
      id: "digital-sport",
      title: "Digital Sport Chronograph",
      priceMinor: 1800000,
      specs: {
        movement_type_raw: "Кварцевый",
        case_diameter_raw: "44 мм",
        strap_material_raw: "Резина",
        water_resistance_raw: "200 м",
        functions_raw: "Хронограф, таймер, будильник",
      },
    }),
    watch({
      id: "formal-large",
      title: "Dress Mechanical 43",
      priceMinor: 8200000,
      specs: {
        movement_type_raw: "Механический",
        case_diameter_raw: "43 мм",
        strap_material_raw: "Кожа",
        water_resistance_raw: "30 м",
      },
    }),
    watch({
      id: "premium-auto",
      title: "Premium Automatic",
      priceMinor: 16000000,
      specs: {
        movement_type_raw: "Автоматический",
        case_diameter_raw: "40 мм",
        bracelet_material_raw: "Сталь",
        water_resistance_raw: "100 м",
      },
    }),
  ];
}

describe("selection query", () => {
  it("normalizes legacy query values to current answer codes", () => {
    expect(
      parseSelectionAnswers({
        scenario: "daily",
        budget: "under_70000",
        wrist: "small",
        movement: "mechanical",
        water: "swim",
        style: "technical",
      }),
    ).toEqual({
      scenario: "everyday",
      character: "instrumental",
      budget: "range_50000_100000",
      movement: "mechanical",
      fit: "compact",
      attachment: "any",
      practical: "high_water",
    });
  });

  it("resolves a shared scenario-only link to the next unanswered step", () => {
    expect(parseSelectionStep({ step: "missing" })).toBe("start");
    expect(
      resolveSelectionStep({
        requestedStep: "start",
        hasAnswers: true,
        searchParams: { scenario: "everyday" },
      }),
    ).toBe("character");
  });

  it("keeps legacy automatic URLs compatible with the single mechanical choice", () => {
    expect(parseSelectionAnswers({ movement: "automatic" }).movement).toBe("mechanical");
    const movementStep = selectionFormDefinition.steps.find((step) => step.code === "movement");
    const mechanicalChoices = movementStep?.options.filter((option) =>
      ["automatic", "mechanical"].includes(option.code),
    );

    expect(mechanicalChoices).toHaveLength(1);
    expect(mechanicalChoices?.[0]?.label).toBe("Механические");
  });

  it("serializes only answered values so skipped defaults do not become answers", () => {
    const answers = parseSelectionAnswers({ scenario: "everyday", budget: "range_50000_100000" });
    const answered = answeredSelectionKeys({ scenario: "everyday", budget: "range_50000_100000" });
    const params = selectionAnswersToSearchParams(answers, answered);

    expect(params.toString()).toBe("scenario=everyday&budget=range_50000_100000");
    expect(selectionAnswersToSearchParams(parseSelectionAnswers({}), []).toString()).toBe("");
    expect(parseSelectionStep({ step: "budget" })).toBe("budget");
  });
});

describe("selection service", () => {
  it.each([
    [1_500_000, "under_15000"],
    [1_500_100, "range_15000_30000"],
    [3_000_000, "range_15000_30000"],
    [3_000_100, "range_30000_50000"],
    [5_000_000, "range_30000_50000"],
    [5_000_100, "range_50000_100000"],
    [10_000_000, "range_50000_100000"],
    [10_000_100, "over_100000"],
  ] as const)("assigns the boundary price %i to exactly %s", (priceMinor, expectedBudget) => {
    const strictBudgets = [
      "under_15000",
      "range_15000_30000",
      "range_30000_50000",
      "range_50000_100000",
      "over_100000",
    ] as const;

    expect(strictBudgets.filter((budget) => selectionBudgetContainsPrice(budget, priceMinor))).toEqual([
      expectedBudget,
    ]);
  });

  it("returns a shortlist for a fully neutral request", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "universal",
        character: "universal",
        budget: "any",
        movement: "any",
        fit: "unknown",
        attachment: "any",
        practical: "none",
      },
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((item) => item.watch.href.startsWith("/watches/"))).toBe(true);
  });

  it("builds catalog diagnostics for runtime readiness", () => {
    const diagnostics = buildSelectionCatalogDiagnostics(
      dataset([
        ...fixtureWatches(),
        watch({
          id: "bad-href",
          title: "Unscorable",
          priceMinor: 1200000,
          specs: {},
          href: "/not-canonical",
        }),
      ]),
    );

    expect(diagnostics.totalRecords).toBe(5);
    expect(diagnostics.withCanonicalHref).toBe(4);
    expect(diagnostics.withPrice).toBe(5);
    expect(diagnostics.withCleanPrimaryImage).toBe(1);
    expect(diagnostics.scorableRecords).toBe(4);
    expect(diagnostics.exclusions).toMatchObject({
      missingCanonicalHref: 1,
      missingSpecifications: 1,
    });
  });

  it("ranks mechanical watches for the first mechanical scenario", () => {
    const [first] = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "first_mechanical",
        character: "classic",
        budget: "range_50000_100000",
        movement: "mechanical",
        fit: "medium",
        attachment: "leather",
        practical: "sapphire",
      },
    });

    expect(first?.watch.id).toBe("auto-classic");
    expect(first?.matchLabel).toBe("Сильное совпадение");
    expect(first?.criteria.some((criterion) => criterion.status === "match")).toBe(true);
  });

  it("ranks everyday mechanical watches inside the selected 50 000-100 000 range", () => {
    const [first] = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "everyday",
        character: "classic",
        budget: "range_50000_100000",
        movement: "mechanical",
        fit: "medium",
        attachment: "leather",
        practical: "none",
      },
    });

    expect(first?.watch.id).toBe("auto-classic");
    expect(first?.criteria.find((criterion) => criterion.key === "movement")?.status).toBe("match");
  });

  it("applies known selected budget conflicts as an exclusion", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "everyday",
        character: "universal",
        budget: "range_15000_30000",
        movement: "any",
        fit: "unknown",
        attachment: "any",
        practical: "none",
      },
    });

    expect(recommendations.map((recommendation) => recommendation.watch.id)).toEqual(["digital-sport"]);
  });

  it("keeps unknown hard data as a preliminary reserve", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "confirmed-price-auto",
          title: "Confirmed Price Automatic",
          priceMinor: 12_000_000,
          specs: {
            movement_type_raw: "Автоматический",
            case_diameter_raw: "40 мм",
            strap_material_raw: "Кожа",
            water_resistance_raw: "50 м",
          },
        }),
        watch({
          id: "unknown-price-auto",
          title: "Unknown Price Automatic",
          priceMinor: null,
          specs: {
            movement_type_raw: "Автоматический",
            case_diameter_raw: "40 мм",
            strap_material_raw: "Кожа",
            water_resistance_raw: "50 м",
          },
        }),
      ]),
      answers: {
        scenario: "first_mechanical",
        character: "classic",
        budget: "over_100000",
        movement: "mechanical",
        fit: "medium",
        attachment: "leather",
        practical: "none",
      },
    });

    expect(recommendations[0]?.watch.id).toBe("confirmed-price-auto");
    const preliminary = recommendations.find((item) => item.watch.id === "unknown-price-auto");
    expect(preliminary?.criteria.find((criterion) => criterion.key === "budget")?.status).toBe("unknown");
    expect(preliminary?.matchLabel).toBe("Предварительный вариант");
    expect(preliminary?.confidenceLabel).toBe("Некоторые характеристики требуют уточнения");
  });

  it("does not rank an unknown mechanism above a confirmed matching mechanism", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "unknown-mechanism",
          title: "Classic Unknown Movement",
          priceMinor: 7000000,
          specs: {
            case_diameter_raw: "40 мм",
            strap_material_raw: "Кожа",
            water_resistance_raw: "50 м",
            crystal_type_raw: "Сапфир",
          },
        }),
        watch({
          id: "known-mechanism",
          title: "Classic Automatic",
          priceMinor: 7000000,
          specs: {
            movement_type_raw: "Автоматический",
            case_diameter_raw: "40 мм",
            strap_material_raw: "Кожа",
            water_resistance_raw: "50 м",
          },
        }),
      ]),
      answers: {
        scenario: "everyday",
        character: "classic",
        budget: "range_50000_100000",
        movement: "mechanical",
        fit: "medium",
        attachment: "leather",
        practical: "none",
      },
    });

    expect(recommendations[0]?.watch.id).toBe("known-mechanism");
    const preliminary = recommendations.find((item) => item.watch.id === "unknown-mechanism");
    expect(preliminary?.criteria.find((item) => item.key === "movement")?.status).toBe("unknown");
    expect(preliminary?.isPreliminary).toBe(true);
    expect(preliminary?.matchLabel).not.toMatch(/Сильное|Хорошее/);
  });

  it("excludes a known conflicting mechanism", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "quartz-conflict",
          title: "Quartz Conflict",
          priceMinor: 7000000,
          specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" },
        }),
      ]),
      answers: {
        scenario: "everyday",
        character: "universal",
        budget: "range_50000_100000",
        movement: "mechanical",
        fit: "medium",
        attachment: "any",
        practical: "none",
      },
    });

    expect(recommendations).toEqual([]);
  });

  it("keeps an unknown diameter explicit and avoids a strong badge", () => {
    const [recommendation] = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "unknown-diameter",
          title: "Classic Automatic Unknown Size",
          priceMinor: 7000000,
          specs: {
            movement_type_raw: "Автоматический",
            strap_material_raw: "Кожа",
            water_resistance_raw: "50 м",
            crystal_type_raw: "Сапфир",
          },
        }),
      ]),
      answers: {
        scenario: "everyday",
        character: "classic",
        budget: "range_50000_100000",
        movement: "mechanical",
        fit: "medium",
        attachment: "leather",
        practical: "sapphire",
      },
    });

    expect(recommendation?.criteria.find((criterion) => criterion.key === "fit")?.status).toBe("unknown");
    expect(recommendation?.matchLabel).not.toBe("Сильное совпадение");
    expect(recommendation?.confidenceLabel).toBe("Не все характеристики указаны");
  });

  it("provides a silhouette fallback when no image exists", () => {
    const item = watch({ id: "missing-image", title: "Missing Image", priceMinor: 2000000, specs: {} });
    expect(buildSelectionImageCandidates(item)).toEqual([]);
  });

  it("rejects a broken primary URL and keeps the next clean image", () => {
    const broken = image("remote", "/broken-primary.png");
    const fallback = image("remote", "/clean-secondary.png");
    const item = watch({
      id: "broken-primary",
      title: "Broken Primary",
      priceMinor: 2000000,
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
      priceMinor: 2000000,
      specs: {},
      primaryImage: unavailable,
      imageGallery: [unavailable],
    });

    expect(buildSelectionImageCandidates(item)).toEqual([]);
  });

  it("rejects back, profile, packaging, macro, and technical image candidates", () => {
    const front = image("remote", "/watch-front.png");
    const item = watch({
      id: "technical-gallery",
      title: "Technical Gallery",
      priceMinor: 2000000,
      specs: {},
      primaryImage: front,
      imageGallery: [
        front,
        image("remote", "/watch_PROFIL.png"),
        image("remote", "/watch_B1.png"),
        image("remote", "/watch-caseback.png"),
        image("remote", "/watch-side.png"),
        image("remote", "/watch-clasp.png"),
        image("remote", "/watch-buckle.png"),
        image("remote", "/watch-packaging.png"),
        image("remote", "/watch-manual.png"),
        image("remote", "/watch-dial-macro.png"),
        image("remote", "/watch-movement.png"),
        image("remote", "/watch-404.png"),
      ],
    });

    expect(buildSelectionImageCandidates(item).map((candidate) => candidate.src)).toEqual(["/watch-front.png"]);
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

  it("does not offer collection development without collection data", () => {
    const scenarioStep = selectionFormDefinition.steps.find((step) => step.code === "scenario");
    expect(scenarioStep?.options.some((option) => option.code === "collection_gap")).toBe(false);
  });

  it("prefers water-ready technical watches for sport use", () => {
    const [first] = buildSelectionRecommendations({
      dataset: dataset(),
      answers: {
        scenario: "sport",
        character: "instrumental",
        budget: "any",
        movement: "quartz",
        fit: "large",
        attachment: "rubber",
        practical: "high_water",
      },
    });

    expect(first?.watch.id).toBe("digital-sport");
    expect(first?.criteria.find((criterion) => criterion.key === "practical")?.status).toBe("match");
  });

  it("returns an empty result when hard constraints are impossible", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "cheap-quartz",
          title: "Cheap Quartz",
          priceMinor: 1200000,
          specs: {
            movement_type_raw: "Кварцевый",
            case_diameter_raw: "36 мм",
            strap_material_raw: "Резина",
            water_resistance_raw: "30 м",
          },
        }),
      ]),
      answers: {
        scenario: "first_mechanical",
        character: "classic",
        budget: "under_15000",
        movement: "automatic",
        fit: "compact",
        attachment: "leather",
        practical: "sapphire",
      },
    });

    expect(recommendations).toEqual([]);
  });

  it("treats a known practical conflict as a hard exclusion", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "low-water",
          title: "Low Water Quartz",
          priceMinor: 2000000,
          specs: {
            movement_type_raw: "Кварцевый",
            water_resistance_raw: "30 м",
          },
        }),
      ]),
      answers: {
        scenario: "sport",
        character: "sporty",
        budget: "range_15000_30000",
        movement: "quartz",
        fit: "unknown",
        attachment: "any",
        practical: "high_water",
      },
    });

    expect(recommendations).toEqual([]);
  });

  it("ranks confirmed size and attachment above unknown values", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({
          id: "unknown-fit",
          title: "Unknown Fit",
          priceMinor: 2000000,
          specs: { movement_type_raw: "Кварцевый" },
        }),
        watch({
          id: "confirmed-fit",
          title: "Confirmed Fit",
          priceMinor: 2000000,
          specs: {
            movement_type_raw: "Кварцевый",
            case_diameter_raw: "40 мм",
            bracelet_material_raw: "Стальной браслет",
          },
        }),
      ]),
      answers: {
        scenario: "everyday",
        character: "universal",
        budget: "range_15000_30000",
        movement: "quartz",
        fit: "medium",
        attachment: "bracelet",
        practical: "none",
      },
    });

    expect(recommendations[0]?.watch.id).toBe("confirmed-fit");
  });

  it("limits brand repetition when enough alternatives exist", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "alpha-1", title: "Alpha Daily 1", priceMinor: 2000000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Alpha", brandSlug: "alpha" }),
        watch({ id: "alpha-2", title: "Alpha Daily 2", priceMinor: 2100000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Alpha", brandSlug: "alpha" }),
        watch({ id: "alpha-3", title: "Alpha Daily 3", priceMinor: 2200000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Alpha", brandSlug: "alpha" }),
        watch({ id: "beta-1", title: "Beta Daily 1", priceMinor: 2300000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Beta", brandSlug: "beta" }),
        watch({ id: "gamma-1", title: "Gamma Daily 1", priceMinor: 2400000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Gamma", brandSlug: "gamma" }),
      ]),
      answers: {
        scenario: "everyday",
        character: "universal",
        budget: "range_15000_30000",
        movement: "quartz",
        fit: "medium",
        attachment: "any",
        practical: "none",
      },
      limit: 4,
    });

    const alphaCount = recommendations.filter((recommendation) => recommendation.watch.brandSlug === "alpha").length;
    expect(recommendations).toHaveLength(4);
    expect(alphaCount).toBeLessThanOrEqual(2);
  });

  it("assigns cheaper, same-brand, and different-brand roles from real comparisons", () => {
    const recommendations = buildSelectionRecommendations({
      dataset: dataset([
        watch({ id: "alpha-main", title: "Daily One", priceMinor: 2_500_000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Alpha", brandSlug: "alpha" }),
        watch({ id: "alpha-peer", title: "Daily Two", priceMinor: 2_600_000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Alpha", brandSlug: "alpha" }),
        watch({ id: "beta-cheaper", title: "Daily Three", priceMinor: 1_900_000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Beta", brandSlug: "beta" }),
        watch({ id: "gamma-peer", title: "Daily Four", priceMinor: 2_600_000, specs: { movement_type_raw: "Кварцевый", case_diameter_raw: "40 мм" }, brandName: "Gamma", brandSlug: "gamma" }),
      ]),
      answers: {
        scenario: "everyday",
        character: "universal",
        budget: "any",
        movement: "quartz",
        fit: "medium",
        attachment: "any",
        practical: "none",
      },
      limit: 4,
    });

    const sameBrand = recommendations.find((item) => item.watch.id === "alpha-peer");
    const cheaper = recommendations.find((item) => item.watch.id === "beta-cheaper");
    const differentBrand = recommendations.find((item) => item.watch.id === "gamma-peer");
    expect(sameBrand?.roleLabel).toBe("Альтернатива той же марки");
    expect(sameBrand?.roleDescription).not.toContain("другого бренда");
    expect(cheaper?.roleLabel).toBe("Более доступный вариант");
    expect(differentBrand?.roleLabel).toBe("Другой бренд");
  });

  it("does not mutate or shorten the source dataset", () => {
    const source = dataset();
    const beforeIds = source.watches.map((item) => item.id);

    buildSelectionRecommendations({
      dataset: source,
      answers: {
        scenario: "everyday",
        character: "universal",
        budget: "any",
        movement: "any",
        fit: "unknown",
        attachment: "any",
        practical: "none",
      },
    });

    expect(source.watches.map((item) => item.id)).toEqual(beforeIds);
  });
});
