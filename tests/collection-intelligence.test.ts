import { describe, expect, it } from "vitest";
import {
  analyzeCollection,
  buildCollectionProfile,
  chooseCollectionRecommendation,
  detectCollectionGaps,
  detectCollectionOverlaps,
} from "@/modules/collection-intelligence/domain/analyze";
import {
  buildCollectionGrowthRecommendationSet,
  buildCollectionRecommendationSet,
  collectionRecommendationPriceFloorMinor,
  determineNextCollectionDirection,
  getRecommendationPriceBoundaries,
  scoreCollectionCandidate,
} from "@/modules/collection-intelligence/domain/recommendations";
import type {
  CollectionAnalysisItem,
  CollectionRecommendationCandidate,
} from "@/modules/collection-intelligence/domain/types";
import type { CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import {
  archiveLocalCollectionWatch,
  buildLocalCollectionCatalogCandidates,
  createDemoLocalCollection,
  createLocalCatalogWatch,
  createLocalManualWatch,
  deleteLocalCollectionWatch,
  localCollectionDemoStorageKey,
  localCollectionDemoStorageKeyFor,
  localCollectionPhotoMaxBytes,
  localCollectionStorageKey,
  localCollectionStorageVersion,
  parseLocalCollectionDemoScenario,
  parseLocalCollection,
  serializeLocalCollection,
  updateLocalCollectionWatch,
  validateLocalPhotoMetadata,
} from "@/modules/user-watch-collection/application/local-collection";
import {
  isCleanCollectionPersistedImageUrl,
  isCleanCollectionPrimaryImage,
  resolveLocalCollectionWatchImage,
  selectCollectionPrimaryImage,
} from "@/modules/user-watch-collection/application/local-collection-images";
import {
  buildCollectionProfileMatrix,
  collectionCandidateMediaPresentation,
  collectionShelfLayoutForCount,
  collectionWatchMediaPresentation,
} from "@/modules/user-watch-collection/application/local-collection-presentation";

const baseItem: CollectionAnalysisItem = {
  id: "watch-1",
  displayName: "Watch 1",
  sourceKind: "manual",
  ownershipStatus: "owned",
  catalogReferenceId: null,
  catalogHref: null,
  brandName: null,
  modelName: null,
  referenceDisplay: null,
  imageUrl: null,
  acquiredAt: null,
  roles: ["daily", "sport"],
  movementType: "quartz",
  dialColorFamily: "black",
  materialFamily: "steel",
  sizeBand: "medium",
  attachmentType: "steel_bracelet",
  wearFrequency: "daily",
  condition: "good",
  waterReady: true,
};

const formalCandidate: CollectionRecommendationCandidate = {
  catalogReferenceId: "catalog/formal-001",
  href: "/watches/catalog/formal-001",
  displayName: "Verified Formal Watch",
  modelName: "Verified Formal",
  familyKey: "catalogbrand:verifiedformal",
  brandName: "Catalog Brand",
  referenceDisplay: "FORMAL-001",
  imageUrl: "/catalog/formal-001.webp",
  publicPriceMinor: 4_500_000,
  currencyCode: "RUB",
  roles: ["business", "formal"],
  movementType: "automatic",
  dialColorFamily: "silver",
  materialFamily: "steel",
  sizeBand: "medium",
  attachmentType: "leather_strap",
  displayType: "analog",
  caseStyle: "classic",
  waterReady: false,
  dataCompleteness: 1,
};

function item(overrides: Partial<CollectionAnalysisItem>): CollectionAnalysisItem {
  return { ...baseItem, ...overrides };
}

function recommendationCandidate(
  overrides: Partial<CollectionRecommendationCandidate>,
): CollectionRecommendationCandidate {
  const reference = overrides.referenceDisplay ?? "CANDIDATE-001";
  const brandName = overrides.brandName ?? "Candidate Brand";
  const modelName = overrides.modelName ?? "Candidate Model";
  return {
    ...formalCandidate,
    catalogReferenceId: overrides.catalogReferenceId ?? `catalog/${reference.toLowerCase()}`,
    href: overrides.href ?? `/watches/candidate/${reference.toLowerCase()}`,
    displayName: overrides.displayName ?? `${brandName} ${modelName}`,
    modelName,
    familyKey: overrides.familyKey ?? `${brandName.toLowerCase().replace(/\s/g, "")}:${modelName.toLowerCase().replace(/\s/g, "")}`,
    brandName,
    referenceDisplay: reference,
    ...overrides,
  };
}

function catalogWatch(overrides: Partial<CatalogWatchDetail> = {}): CatalogWatchDetail {
  return {
    id: "casio/ae1200wh1av",
    href: "/watches/casio/ae1200wh1av",
    brandName: "Casio",
    brandSlug: "casio",
    title: "Casio AE-1200WH-1AV",
    officialName: "Casio AE-1200WH-1AV",
    referenceDisplay: "AE-1200WH-1AV",
    referenceNormalized: "AE1200WH1AV",
    referenceSlug: "ae1200wh1av",
    brandCollectionName: "Casio Collection",
    brandLineName: null,
    watchModelName: "AE-1200",
    publicPrice: null,
    primaryImage: {
      kind: "development_zip",
      imageKey: "casio-ae1200",
      src: "/api/catalog/dev-images/casio-ae1200",
      alt: "Casio AE-1200WH-1AV",
    },
    imageGallery: [],
    keySpecifications: [],
    specifications: [
      { key: "movement_type_raw", label: "Movement", value: "Кварцевый", group: "mechanism" },
      { key: "case_dimensions_raw", label: "Size", value: "45 × 42,1 × 12,5 мм", group: "dimensions" },
      { key: "water_resistance_raw", label: "Water", value: "100 м / 10 bar", group: "water_resistance" },
      {
        key: "functions_raw",
        label: "Functions",
        value: "Multi Time, мировое время 48 городов",
        group: "functions",
      },
      { key: "case_material_raw", label: "Case", value: "полимер", group: "case" },
      { key: "attachment_material_raw", label: "Strap", value: "полимерный ремешок", group: "strap" },
    ],
    siblingReferences: [],
    ...overrides,
  };
}

describe("Collection Intelligence", () => {
  it("builds profile counts for manual, catalog-linked, and archived watches", () => {
    const profile = buildCollectionProfile([
      item({ id: "manual-active", sourceKind: "manual" }),
      item({
        id: "catalog-active",
        sourceKind: "catalog",
        catalogReferenceId: "ref-owned",
        catalogHref: "/watches/demo/ref-owned",
      }),
      item({ id: "sold-watch", ownershipStatus: "previously_owned", sourceKind: "manual" }),
    ]);

    expect(profile.activeCount).toBe(2);
    expect(profile.archivedCount).toBe(1);
    expect(profile.manualCount).toBe(1);
    expect(profile.catalogLinkedCount).toBe(1);
  });

  it("lets manual watches participate in coverage like catalog-linked watches", () => {
    const profile = buildCollectionProfile([
      item({ id: "manual", sourceKind: "manual", roles: ["formal"] }),
      item({ id: "catalog", sourceKind: "catalog", roles: ["travel"], catalogReferenceId: "ref-2" }),
    ]);

    expect(profile.roleDistribution.formal).toBe(1);
    expect(profile.roleDistribution.travel).toBe(1);
    expect(profile.profileCompleteness).toBe(1);
  });

  it("ignores unknown traits instead of treating them as negative facts", () => {
    const profile = buildCollectionProfile([
      item({
        roles: ["daily"],
        movementType: "unknown",
        dialColorFamily: "unknown",
        materialFamily: "unknown",
        sizeBand: "unknown",
        waterReady: null,
      }),
    ]);

    expect(profile.movementDistribution.unknown).toBeUndefined();
    expect(profile.dialDistribution.unknown).toBeUndefined();
    expect(profile.lowConfidenceDimensions).toContain("movement_type");
  });

  it("excludes previously owned watches from current analysis", () => {
    const profile = buildCollectionProfile([
      item({ id: "active-daily", roles: ["daily"], waterReady: true }),
      item({ id: "archived-formal", ownershipStatus: "previously_owned", roles: ["formal"], waterReady: false }),
    ]);

    expect(profile.activeCount).toBe(1);
    expect(profile.roleDistribution.formal).toBe(0);
    expect(detectCollectionGaps(profile)).toHaveLength(0);
  });

  it("detects a formal/business gap when enough active evidence does not cover it", () => {
    const profile = buildCollectionProfile([
      item({ id: "active-one", roles: ["daily", "sport"] }),
      item({ id: "active-two", roles: ["daily", "outdoor"], movementType: "solar" }),
    ]);

    expect(detectCollectionGaps(profile).map((gap) => gap.code)).toContain("business_or_formal");
  });

  it("reports overlap from repeated roles, not merely from a shared brand", () => {
    const diverseByRole = buildCollectionProfile([
      item({ id: "one", brandName: "Same Brand", roles: ["daily"] }),
      item({ id: "two", brandName: "Same Brand", roles: ["formal"] }),
      item({ id: "three", brandName: "Same Brand", roles: ["travel"] }),
    ]);
    const repeatedRole = buildCollectionProfile([
      item({ id: "one", roles: ["daily"] }),
      item({ id: "two", roles: ["daily"] }),
      item({ id: "three", roles: ["daily"] }),
    ]);

    expect(detectCollectionOverlaps(diverseByRole).some((overlap) => overlap.dimension === "role")).toBe(false);
    expect(detectCollectionOverlaps(repeatedRole).map((overlap) => overlap.code)).toContain("role_overlap_daily");
  });

  it("returns an initial non-blocking recommendation state for one incomplete watch", () => {
    const manual = createLocalManualWatch(
      { displayName: "Grandfather watch", withoutBrand: true, role: "formal" },
      "2026-07-24T00:00:00.000Z",
    );
    const candidates = [
      recommendationCandidate({
        referenceDisplay: "TRAVEL-1",
        brandName: "Casio",
        roles: ["travel", "daily"],
        displayType: "digital",
        caseStyle: "digital_sport",
        movementType: "quartz",
        attachmentType: "rubber_strap",
        dialColorFamily: "black",
        publicPriceMinor: 2_000_000,
      }),
      recommendationCandidate({
        referenceDisplay: "TRAVEL-2",
        brandName: "Orient",
        roles: ["travel"],
        caseStyle: "diver",
        waterReady: true,
        movementType: "automatic",
        attachmentType: "steel_bracelet",
        dialColorFamily: "blue",
        publicPriceMinor: 5_000_000,
      }),
      recommendationCandidate({
        referenceDisplay: "SPORT-1",
        brandName: "Citizen",
        roles: ["sport"],
        displayType: "analog",
        caseStyle: "diver",
        waterReady: true,
        movementType: "solar",
        attachmentType: "rubber_strap",
        dialColorFamily: "green",
        publicPriceMinor: 3_500_000,
      }),
      recommendationCandidate({
        referenceDisplay: "MECH-1",
        brandName: "Tissot",
        roles: ["daily"],
        movementType: "automatic",
        caseStyle: "integrated_sport",
        attachmentType: "steel_bracelet",
        dialColorFamily: "blue",
        publicPriceMinor: 7_500_000,
      }),
      formalCandidate,
    ];
    const analysis = analyzeCollection([manual], candidates);

    expect(analysis.status).toBe("ready");
    expect(analysis.confidence).toBe("initial");
    expect(analysis.summary?.label).toBe("Начальный профиль");
    expect(analysis.summary?.text).toContain("Профиль строится по одной модели");
    expect(analysis.summary?.text).not.toContain("в коллекции нет");
    expect(analysis.gaps).toHaveLength(0);
    expect(analysis.direction).not.toBeNull();
    expect(analysis.recommendationSet?.candidates).toHaveLength(4);
    expect(analysis.recommendationSet?.candidates.slice(0, 2).every((entry) => entry.position === "exact")).toBe(true);
    expect(analysis.recommendationSet?.candidates.slice(2).every((entry) => entry.position === "exploratory")).toBe(true);
  });

  it("returns an explicit empty state without fabricated analysis", () => {
    const analysis = analyzeCollection([], [formalCandidate]);

    expect(analysis.status).toBe("empty");
    expect(analysis.confidence).toBe("initial");
    expect(analysis.gaps).toHaveLength(0);
    expect(analysis.overlaps).toHaveLength(0);
    expect(analysis.summary).toBeNull();
    expect(analysis.recommendation).toBeNull();
  });

  it("builds a deterministic evidence-only summary for an established collection", () => {
    const watches = [
      item({ id: "one", roles: ["daily"], movementType: "quartz", attachmentType: "steel_bracelet" }),
      item({ id: "two", roles: ["daily"], movementType: "quartz", attachmentType: "steel_bracelet" }),
      item({ id: "three", roles: ["travel"], movementType: "automatic", attachmentType: "leather_strap" }),
      item({ id: "four", roles: ["formal"], movementType: "manual", attachmentType: "leather_strap" }),
    ];
    const first = analyzeCollection(watches, [formalCandidate]);
    const second = analyzeCollection(watches, [formalCandidate]);

    expect(first.summary).toEqual(second.summary);
    expect(first.summary?.label).toBe("Профиль коллекции");
    expect(first.summary?.text).toContain("Основа коллекции — повседневные часы");
    expect(first.summary?.text).toContain("Коллекцию логично дополнить");
  });

  it("excludes an already-owned reference from recommendations", () => {
    const ownedWatch = createLocalCatalogWatch(formalCandidate, "2026-07-24T00:00:00.000Z");
    const alternative = { ...formalCandidate, catalogReferenceId: "catalog/formal-002", displayName: "Alternative" };
    const gaps = [
      {
        code: "business_or_formal",
        dimension: "role" as const,
        severity: "high" as const,
        title: "Business role",
        explanation: "Missing business role.",
      },
    ];

    const recommendation = chooseCollectionRecommendation([ownedWatch], gaps, [formalCandidate, alternative]);

    expect(recommendation?.candidate?.catalogReferenceId).toBe(alternative.catalogReferenceId);
  });

  it("keeps the recommended watch type but returns no concrete model without a confirmed rule match", () => {
    const gaps = [
      {
        code: "business_or_formal",
        dimension: "role" as const,
        severity: "high" as const,
        title: "Business role",
        explanation: "Missing business role.",
      },
    ];
    const unmatched: CollectionRecommendationCandidate = { ...formalCandidate, roles: ["sport"] };

    const recommendation = chooseCollectionRecommendation([], gaps, [unmatched]);

    expect(recommendation?.candidate).toBeNull();
    expect(recommendation?.scenarioCode).toBe("business_or_formal");
  });

  it("produces the same deterministic result for identical mixed input", () => {
    const mixed = [
      item({ id: "manual", sourceKind: "manual", roles: ["daily"] }),
      item({ id: "catalog", sourceKind: "catalog", roles: ["sport"], catalogReferenceId: "owned-sport" }),
    ];

    expect(analyzeCollection(mixed, [formalCandidate])).toEqual(analyzeCollection(mixed, [formalCandidate]));
  });
});

describe("local collection persistence", () => {
  it("uses a versioned storage envelope and reads the existing array format", () => {
    const watch = createLocalManualWatch({
      displayName: "Manual watch",
      brandName: "Independent",
      role: "daily",
    });
    const serialized = serializeLocalCollection([watch]);

    expect(localCollectionStorageKey).toContain(".v2");
    expect(localCollectionDemoStorageKey).not.toBe(localCollectionStorageKey);
    expect(JSON.parse(serialized)).toMatchObject({ version: localCollectionStorageVersion });
    expect(parseLocalCollection(serialized)).toHaveLength(1);
    expect(parseLocalCollection(JSON.stringify([watch]))).toHaveLength(1);
    expect(parseLocalCollection(JSON.stringify({ version: 1, watches: [watch] }))).toHaveLength(1);
  });

  it("validates local photographs without reading browser File APIs in domain code", () => {
    expect(validateLocalPhotoMetadata({ type: "image/webp", size: localCollectionPhotoMaxBytes })).toEqual({
      valid: true,
    });
    expect(validateLocalPhotoMetadata({ type: "image/gif", size: 100 })).toMatchObject({ valid: false });
    expect(
      validateLocalPhotoMetadata({ type: "image/jpeg", size: localCollectionPhotoMaxBytes + 1 }),
    ).toMatchObject({ valid: false });
  });

  it("falls back safely for corrupted or structurally invalid storage", () => {
    expect(parseLocalCollection("{broken")).toBeNull();
    expect(parseLocalCollection(JSON.stringify({ version: 99, watches: [] }))).toBeNull();
    expect(parseLocalCollection(JSON.stringify([{ id: "bad" }]))).toBeNull();
  });

  it("creates, updates, archives, and deletes local watches without changing catalog data", () => {
    const created = createLocalManualWatch({
      displayName: "My watch",
      withoutBrand: true,
      role: "weekend",
    });
    const updated = updateLocalCollectionWatch([created], created.id, (watch) => ({
      ...watch,
      displayName: "My updated watch",
    }));
    const archived = archiveLocalCollectionWatch(updated, created.id, "2026-07-24T00:00:00.000Z");
    const deleted = deleteLocalCollectionWatch(archived, created.id);

    expect(updated[0]?.displayName).toBe("My updated watch");
    expect(archived[0]?.ownershipStatus).toBe("previously_owned");
    expect(deleted).toHaveLength(0);
  });

  it("builds demo records from passed real catalog candidates without requiring them", () => {
    const withCatalog = createDemoLocalCollection([formalCandidate], "2026-07-24T00:00:00.000Z");
    const withoutCatalog = createDemoLocalCollection([], "2026-07-24T00:00:00.000Z");

    expect(withCatalog.some((watch) => watch.catalogReferenceId === formalCandidate.catalogReferenceId)).toBe(true);
    expect(withoutCatalog.every((watch) => watch.sourceKind === "manual")).toBe(true);
  });

  it("maps catalog read models into explainable candidates with canonical links and actual images", () => {
    const candidates = buildLocalCollectionCatalogCandidates([catalogWatch()]);
    const candidate = candidates[0];

    expect(candidate).toMatchObject({
      catalogReferenceId: "casio/ae1200wh1av",
      href: "/watches/casio/ae1200wh1av",
      brandName: "Casio",
      movementType: "quartz",
      waterReady: true,
    });
    expect(candidate?.roles).toContain("travel");
    expect(candidate?.imageUrl).toBe("/api/catalog/dev-images/casio-ae1200");
  });
});

describe("collection demo scenarios and adaptive presentation", () => {
  const scenarioCandidates = Array.from({ length: 4 }, (_, index) => ({
    ...formalCandidate,
    catalogReferenceId: `scenario-${index + 1}`,
    referenceDisplay: `SCENARIO-${index + 1}`,
    displayName: `Scenario watch ${index + 1}`,
    modelName: `Scenario model ${index + 1}`,
    familyKey: `scenario:family-${index + 1}`,
  }));

  it("parses named demo scenarios and keeps demo=1 as the many alias", () => {
    expect(parseLocalCollectionDemoScenario("empty")).toBe("empty");
    expect(parseLocalCollectionDemoScenario("one")).toBe("one");
    expect(parseLocalCollectionDemoScenario("two")).toBe("two");
    expect(parseLocalCollectionDemoScenario("three")).toBe("three");
    expect(parseLocalCollectionDemoScenario("many")).toBe("many");
    expect(parseLocalCollectionDemoScenario("mixed")).toBe("mixed");
    expect(parseLocalCollectionDemoScenario("archived")).toBe("archived");
    expect(parseLocalCollectionDemoScenario("four")).toBe("four");
    expect(parseLocalCollectionDemoScenario("1")).toBe("many");
    expect(parseLocalCollectionDemoScenario("unknown")).toBeNull();
  });

  it("builds deterministic empty, one, two, three, and many fixtures", () => {
    expect(createDemoLocalCollection(scenarioCandidates, undefined, "empty")).toHaveLength(0);
    expect(createDemoLocalCollection(scenarioCandidates, undefined, "one")).toHaveLength(1);
    expect(createDemoLocalCollection(scenarioCandidates, undefined, "two")).toHaveLength(2);
    expect(createDemoLocalCollection(scenarioCandidates, undefined, "three")).toHaveLength(3);
    expect(createDemoLocalCollection(scenarioCandidates, undefined, "many")).toHaveLength(6);
  });

  it("keeps mixed and archived fixtures explicit and excludes history from active analysis", () => {
    const mixed = createDemoLocalCollection(scenarioCandidates, undefined, "mixed");
    const archived = createDemoLocalCollection(scenarioCandidates, undefined, "archived");

    expect(new Set(mixed.map((watch) => watch.sourceKind))).toEqual(new Set(["catalog", "manual"]));
    expect(mixed.some((watch) => watch.ownershipStatus === "previously_owned")).toBe(true);
    expect(archived).toHaveLength(2);
    expect(analyzeCollection(archived, scenarioCandidates).profile.activeCount).toBe(1);
  });

  it("provides a dedicated four-watch route fixture for the standard shelf", () => {
    const four = createDemoLocalCollection(scenarioCandidates, undefined, "four");

    expect(four).toHaveLength(4);
    expect(four.every((watch) => watch.ownershipStatus === "owned")).toBe(true);
    expect(collectionShelfLayoutForCount(four.length)).toBe("standard");
  });

  it("uses isolated session keys for every named scenario", () => {
    expect(localCollectionDemoStorageKeyFor("many")).toBe(localCollectionDemoStorageKey);
    expect(localCollectionDemoStorageKeyFor("one")).not.toBe(localCollectionDemoStorageKeyFor("two"));
    expect(localCollectionDemoStorageKeyFor("empty")).toContain(".empty");
  });

  it("selects a dedicated shelf composition for 0, 1, 2, 3, 4, and 5+ watches", () => {
    expect([0, 1, 2, 3, 4, 5, 8].map(collectionShelfLayoutForCount)).toEqual([
      "empty",
      "single",
      "split",
      "triad",
      "standard",
      "many",
      "many",
    ]);
  });

  it("maps only known collection traits to the compact profile matrix", () => {
    const profile = buildCollectionProfile([
      item({
        id: "daily-one",
        brandName: "Tissot",
        roles: ["daily"],
        movementType: "automatic",
        sizeBand: "medium",
        attachmentType: "steel_bracelet",
        dialColorFamily: "black",
        wearFrequency: "daily",
      }),
      item({
        id: "sport",
        brandName: "Casio",
        roles: ["sport"],
        movementType: "quartz",
        sizeBand: "large",
        attachmentType: "rubber_strap",
        dialColorFamily: "green",
        wearFrequency: "weekly",
      }),
    ]);
    const matrix = buildCollectionProfileMatrix(profile);

    expect(matrix.map((group) => group.code)).toEqual([
      "roles",
      "movements",
      "attachments",
      "sizes",
      "colors",
      "wear",
      "brands",
    ]);
    expect(matrix.find((group) => group.code === "roles")?.values).toEqual([
      "На каждый день — 1",
      "Для спорта — 1",
    ]);
    expect(matrix.flatMap((group) => group.values)).not.toContain("Не указано");
  });

  it("omits unknown profile dimensions instead of inventing precision", () => {
    const profile = buildCollectionProfile([
      item({
        id: "unknown",
        roles: [],
        movementType: "unknown",
        sizeBand: "unknown",
        attachmentType: "unknown",
        dialColorFamily: "unknown",
        wearFrequency: "unknown",
      }),
    ]);
    const matrix = buildCollectionProfileMatrix(profile);

    expect(matrix).toEqual([]);
  });
});

describe("multi-factor collection recommendations", () => {
  const coveredRoles = ["daily", "business", "formal", "travel", "sport"] as CollectionAnalysisItem["roles"];

  it("uses several factors to choose the next intent instead of role alone", () => {
    const quartzProfile = buildCollectionProfile([
      item({ id: "q1", roles: coveredRoles, movementType: "quartz", attachmentType: "steel_bracelet" }),
      item({ id: "q2", roles: coveredRoles, movementType: "quartz", attachmentType: "steel_bracelet" }),
    ]);
    const mechanicalProfile = buildCollectionProfile([
      item({ id: "m1", roles: coveredRoles, movementType: "automatic", attachmentType: "steel_bracelet" }),
      item({ id: "m2", roles: coveredRoles, movementType: "manual", attachmentType: "steel_bracelet" }),
    ]);

    expect(determineNextCollectionDirection(quartzProfile)?.intent).toBe("first-mechanical");
    expect(determineNextCollectionDirection(mechanicalProfile)?.intent).toBe("strap-diversity");
  });

  it("keeps the collection recommendation price floor at 15,000 RUB", () => {
    expect(collectionRecommendationPriceFloorMinor).toBe(1_500_000);
    const set = buildCollectionRecommendationSet(
      [item({ roles: ["daily", "sport"] })],
      [
        recommendationCandidate({ referenceDisplay: "LOW", publicPriceMinor: 1_499_900 }),
        recommendationCandidate({ referenceDisplay: "OK", publicPriceMinor: 1_500_000 }),
      ],
      "formal",
    );
    expect(set.candidates.map((entry) => entry.candidate.referenceDisplay)).toEqual(["OK"]);
    expect(set.candidates.every((entry) => (entry.candidate.publicPriceMinor ?? 0) >= 1_500_000)).toBe(true);
  });

  it("penalizes a candidate above the P90 boundary", () => {
    const ordinary = Array.from({ length: 10 }, (_, index) =>
      recommendationCandidate({
        referenceDisplay: `P${index}`,
        publicPriceMinor: 2_000_000 + index * 100_000,
      }),
    );
    const extreme = recommendationCandidate({ referenceDisplay: "EXTREME", publicPriceMinor: 20_000_000 });
    const all = [...ordinary, extreme];
    const boundaries = getRecommendationPriceBoundaries(all);
    const profile = buildCollectionProfile([item({ roles: ["daily"] })]);
    const score = scoreCollectionCandidate(extreme, [item({ roles: ["daily"] })], profile, "formal", boundaries);

    expect(boundaries.p90Minor).toBeLessThan(extreme.publicPriceMinor ?? 0);
    expect(score?.penalties).toContain("Цена выше P90 доступной подборки");
  });

  it("excludes owned references and penalizes the same reference family", () => {
    const owned = item({
      catalogReferenceId: "owned-ref",
      brandName: "Family Brand",
      modelName: "Shared Model",
      roles: ["daily"],
    });
    const ownedCandidate = recommendationCandidate({
      catalogReferenceId: "owned-ref",
      brandName: "Other",
      modelName: "Other",
    });
    const familyCandidate = recommendationCandidate({
      catalogReferenceId: "family-new",
      brandName: "Family Brand",
      modelName: "Shared Model",
      familyKey: "familybrand:sharedmodel",
    });
    const candidates = [ownedCandidate, familyCandidate];
    const boundaries = getRecommendationPriceBoundaries(candidates);
    const profile = buildCollectionProfile([owned]);

    expect(scoreCollectionCandidate(ownedCandidate, [owned], profile, "formal", boundaries)).toBeNull();
    expect(
      scoreCollectionCandidate(familyCandidate, [owned], profile, "formal", boundaries)?.penalties,
    ).toContain("Близкая reference family уже есть");
  });

  it("builds up to three distribution-based price segments and prefers different brands", () => {
    const candidates = [
      recommendationCandidate({ referenceDisplay: "A", brandName: "Alpha", publicPriceMinor: 2_000_000 }),
      recommendationCandidate({ referenceDisplay: "B", brandName: "Beta", publicPriceMinor: 3_000_000 }),
      recommendationCandidate({ referenceDisplay: "C", brandName: "Gamma", publicPriceMinor: 5_000_000 }),
      recommendationCandidate({ referenceDisplay: "D", brandName: "Delta", publicPriceMinor: 8_000_000 }),
      recommendationCandidate({ referenceDisplay: "E", brandName: "Epsilon", publicPriceMinor: 10_000_000 }),
    ];
    const set = buildCollectionRecommendationSet([item({ roles: ["daily"] })], candidates, "formal");

    expect(new Set(set.candidates.map((entry) => entry.priceSegment)).size).toBeLessThanOrEqual(3);
    expect(new Set(set.candidates.map((entry) => entry.candidate.brandName)).size).toBe(set.candidates.length);
  });

  it("returns a deterministic order and an explicit no-match state", () => {
    const candidates = [
      recommendationCandidate({ referenceDisplay: "ONE", brandName: "One" }),
      recommendationCandidate({ referenceDisplay: "TWO", brandName: "Two" }),
    ];
    const watches = [item({ roles: ["daily"] })];

    expect(buildCollectionRecommendationSet(watches, candidates, "formal")).toEqual(
      buildCollectionRecommendationSet(watches, candidates, "formal"),
    );
    expect(buildCollectionRecommendationSet(watches, [], "travel").state).toBe("no_match");
  });

  it("preserves optional unknown traits as neutral recommendation evidence", () => {
    const incomplete = item({
      movementType: "unknown",
      dialColorFamily: "unknown",
      materialFamily: "unknown",
      sizeBand: "unknown",
      attachmentType: "unknown",
      waterReady: null,
    });
    const candidate = recommendationCandidate({ referenceDisplay: "NEUTRAL" });
    const set = buildCollectionRecommendationSet([incomplete], [candidate], "formal");

    expect(set.candidates).toHaveLength(1);
    expect(set.candidates[0]?.penalties).not.toContain("Повторяет сценарий, механизм и цвет");
    expect(set.candidates[0]?.reasons.some((reason) => reason.includes("механизм"))).toBe(false);
    expect(set.candidates[0]?.reasons.some((reason) => reason.includes("ремень"))).toBe(false);
  });

  it("explains recommendation gains with the candidate's actual known traits", () => {
    const owner = item({
      roles: ["daily"],
      movementType: "quartz",
      attachmentType: "steel_bracelet",
      sizeBand: "medium",
      dialColorFamily: "black",
    });
    const candidate = recommendationCandidate({
      referenceDisplay: "SPECIFIC",
      brandName: "Orient",
      roles: ["formal"],
      movementType: "automatic",
      attachmentType: "leather_strap",
      sizeBand: "small",
      dialColorFamily: "silver",
    });
    const scored = scoreCollectionCandidate(
      candidate,
      [owner],
      buildCollectionProfile([owner]),
      "formal",
      getRecommendationPriceBoundaries([candidate]),
    );

    expect(scored?.reasons).toContain("Добавляет сценарий «для особых случаев»");
    expect(scored?.reasons).toContain("Добавляет автоматический механизм");
    expect(scored?.reasons).not.toContain("Добавляет ещё один сценарий использования");
  });

  it("builds a deterministic four-position cold-start set with exact and exploratory choices", () => {
    const owner = item({
      brandName: "Known",
      roles: ["daily"],
      movementType: "unknown",
      attachmentType: "unknown",
      dialColorFamily: "unknown",
      sizeBand: "unknown",
    });
    const candidates = [
      recommendationCandidate({ referenceDisplay: "F1", brandName: "Alpha", roles: ["formal"], publicPriceMinor: 2_000_000 }),
      recommendationCandidate({ referenceDisplay: "F2", brandName: "Beta", roles: ["formal"], publicPriceMinor: 7_000_000, attachmentType: "leather_strap" }),
      recommendationCandidate({ referenceDisplay: "T1", brandName: "Gamma", roles: ["travel"], displayType: "digital", caseStyle: "digital_sport", publicPriceMinor: 3_500_000 }),
      recommendationCandidate({ referenceDisplay: "S1", brandName: "Delta", roles: ["sport"], caseStyle: "diver", waterReady: true, publicPriceMinor: 5_500_000, dialColorFamily: "green" }),
      recommendationCandidate({ referenceDisplay: "M1", brandName: "Epsilon", roles: ["daily"], movementType: "automatic", publicPriceMinor: 8_000_000 }),
    ];
    const first = buildCollectionGrowthRecommendationSet([owner], candidates, "formal", "initial");
    const second = buildCollectionGrowthRecommendationSet([owner], candidates, "formal", "initial");

    expect(first).toEqual(second);
    expect(first.candidates).toHaveLength(4);
    expect(first.candidates.filter((entry) => entry.position === "exact")).toHaveLength(2);
    expect(first.candidates.filter((entry) => entry.position === "exploratory")).toHaveLength(2);
    expect(new Set(first.candidates.map((entry) => entry.candidate.brandName)).size).toBeGreaterThanOrEqual(2);
    expect(first.candidates.every((entry) => (entry.candidate.publicPriceMinor ?? 0) >= 1_500_000)).toBe(true);
    expect(first.candidates.every((entry) => entry.candidate.imageUrl !== null)).toBe(true);
  });

  it("builds a three-model set with price, brand, strap, mechanism, and color diversity", () => {
    const candidates = [
      recommendationCandidate({ referenceDisplay: "A1", brandName: "Alpha", publicPriceMinor: 2_000_000, movementType: "automatic", attachmentType: "leather_strap", dialColorFamily: "silver", caseStyle: "classic" }),
      recommendationCandidate({ referenceDisplay: "B1", brandName: "Beta", publicPriceMinor: 3_000_000, movementType: "quartz", attachmentType: "steel_bracelet", dialColorFamily: "blue", caseStyle: "integrated_sport" }),
      recommendationCandidate({ referenceDisplay: "C1", brandName: "Gamma", publicPriceMinor: 4_500_000, movementType: "solar", attachmentType: "rubber_strap", dialColorFamily: "green", caseStyle: "other" }),
      recommendationCandidate({ referenceDisplay: "D1", brandName: "Delta", publicPriceMinor: 6_000_000, movementType: "manual", attachmentType: "textile_strap", dialColorFamily: "champagne", caseStyle: "field" }),
      recommendationCandidate({ referenceDisplay: "E1", brandName: "Epsilon", publicPriceMinor: 8_000_000, movementType: "automatic", attachmentType: "steel_bracelet", dialColorFamily: "black", caseStyle: "chronograph" }),
      recommendationCandidate({ referenceDisplay: "F1", brandName: "Zeta", publicPriceMinor: 10_000_000, movementType: "quartz", attachmentType: "leather_strap", dialColorFamily: "white", caseStyle: "classic" }),
    ];
    const set = buildCollectionRecommendationSet([item({ roles: ["daily"] })], candidates, "formal");

    expect(set.candidates).toHaveLength(3);
    expect(new Set(set.candidates.map((entry) => entry.priceSegment))).toEqual(
      new Set(["rational", "balanced", "upper"]),
    );
    expect(new Set(set.candidates.map((entry) => entry.candidate.brandName)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(set.candidates.map((entry) => entry.candidate.attachmentType)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(set.candidates.map((entry) => entry.candidate.movementType)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(set.candidates.map((entry) => entry.candidate.dialColorFamily)).size).toBeGreaterThanOrEqual(2);
  });

  it("caps one brand at two recommendations and excludes duplicate families and normalized models", () => {
    const candidates = [
      recommendationCandidate({ referenceDisplay: "A1", brandName: "Alpha", modelName: "Shared Model", familyKey: "alpha:family-one", publicPriceMinor: 2_000_000 }),
      recommendationCandidate({ referenceDisplay: "A2", brandName: "Alpha", modelName: "Shared-Model", familyKey: "alpha:family-two", publicPriceMinor: 3_000_000 }),
      recommendationCandidate({ referenceDisplay: "A3", brandName: "Alpha", modelName: "Another", familyKey: "alpha:family-two", publicPriceMinor: 4_000_000 }),
      recommendationCandidate({ referenceDisplay: "A4", brandName: "Alpha", modelName: "Fourth", familyKey: "alpha:family-four", publicPriceMinor: 5_000_000 }),
      recommendationCandidate({ referenceDisplay: "B1", brandName: "Beta", modelName: "Beta One", publicPriceMinor: 6_000_000 }),
      recommendationCandidate({ referenceDisplay: "C1", brandName: "Gamma", modelName: "Gamma One", publicPriceMinor: 8_000_000 }),
    ];
    const set = buildCollectionRecommendationSet([item({ roles: ["daily"] })], candidates, "formal", 8);
    const alphaCount = set.candidates.filter((entry) => entry.candidate.brandName === "Alpha").length;

    expect(alphaCount).toBeLessThanOrEqual(2);
    expect(new Set(set.candidates.map((entry) => entry.candidate.familyKey)).size).toBe(set.candidates.length);
    const normalizedModels = set.candidates.map((entry) =>
      `${entry.candidate.brandName}:${entry.candidate.modelName}`.toLowerCase().replace(/[^a-zа-я0-9]/g, ""),
    );
    expect(new Set(normalizedModels).size).toBe(normalizedModels.length);
  });

  it("keeps the curated three-segment core first on the full recommendation page", () => {
    const candidates = Array.from({ length: 9 }, (_, index) =>
      recommendationCandidate({
        referenceDisplay: `ORDER-${index}`,
        brandName: `Brand ${index}`,
        modelName: `Model ${index}`,
        publicPriceMinor: 2_000_000 + index * 1_000_000,
        attachmentType: index % 2 === 0 ? "steel_bracelet" : "leather_strap",
        movementType: index % 2 === 0 ? "automatic" : "quartz",
        dialColorFamily: index % 2 === 0 ? "blue" : "silver",
      }),
    );
    const set = buildCollectionRecommendationSet([item({ roles: ["daily"] })], candidates, "formal", 9);

    expect(set.candidates.slice(0, 3).map((entry) => entry.priceSegment)).toEqual([
      "rational",
      "balanced",
      "upper",
    ]);
  });

  it("returns two honest matches instead of filling a set with a third same-brand model", () => {
    const candidates = ["ONE", "TWO", "THREE"].map((referenceDisplay, index) =>
      recommendationCandidate({
        referenceDisplay,
        brandName: "Only Brand",
        modelName: `Model ${index}`,
        familyKey: `only:${index}`,
        publicPriceMinor: 2_000_000 + index * 1_000_000,
      }),
    );
    const set = buildCollectionRecommendationSet([item({ roles: ["daily"] })], candidates, "formal");

    expect(set.candidates).toHaveLength(2);
  });

  it("replaces a denied caseback primary image with a front gallery image", () => {
    const frontImage = {
      kind: "development_zip" as const,
      imageKey: "front-image",
      src: "/api/catalog/dev-images/front-image",
      alt: "Casio GA-700SK-1ADR фото 2",
    };
    const [candidate] = buildLocalCollectionCatalogCandidates([
      catalogWatch({
        primaryImage: {
          kind: "development_zip",
          imageKey: "65b7e43cdff3f5069b8b5f173dc46b38",
          src: "/api/catalog/dev-images/65b7e43cdff3f5069b8b5f173dc46b38",
          alt: "Casio GA-700SK-1ADR фото 1",
        },
        imageGallery: [frontImage],
      }),
    ]);

    expect(candidate?.imageUrl).toBe(frontImage.src);
  });

  it("rejects semantic caseback and reverse-strap assets as collection primary images", () => {
    expect(
      isCleanCollectionPrimaryImage({
        kind: "remote",
        url: "https://example.test/watch-caseback.webp",
        src: "https://example.test/watch-caseback.webp",
        alt: "Caseback detail",
      }),
    ).toBe(false);
    expect(
      isCleanCollectionPrimaryImage({
        kind: "remote",
        url: "https://example.test/strap-inside.webp",
        src: "https://example.test/strap-inside.webp",
        alt: "Reverse strap",
      }),
    ).toBe(false);
  });

  it("curates confirmed Casio casebacks and falls through to a clean front gallery frame", () => {
    const cleanFront = {
      kind: "development_zip" as const,
      imageKey: "c84aac701687019f465988f9886f1254",
      src: "/api/catalog/dev-images/c84aac701687019f465988f9886f1254",
      alt: "Casio GWG-B1000-1A4 фото 2",
    };
    const selected = selectCollectionPrimaryImage(
      catalogWatch({
        primaryImage: {
          kind: "development_zip",
          imageKey: "196ed398503fb2d14fa53887c5607b39",
          src: "/api/catalog/dev-images/196ed398503fb2d14fa53887c5607b39",
          alt: "Casio GWG-B1000-1A4 фото 1",
        },
        imageGallery: [cleanFront],
      }),
    );

    expect(selected).toEqual(cleanFront);
    expect(
      selectCollectionPrimaryImage(
        catalogWatch({
          primaryImage: {
            kind: "development_zip",
            imageKey: "7ea639026b6476dc348005fb720a9326",
            src: "/api/catalog/dev-images/7ea639026b6476dc348005fb720a9326",
            alt: "Casio GWG-B1000EC-1A фото 1",
          },
          imageGallery: [],
        }),
      ).kind,
    ).toBe("none");
  });

  it("rejects the confirmed dark Tissot frame and non-front gallery variants", () => {
    const selected = selectCollectionPrimaryImage(
      catalogWatch({
        primaryImage: {
          kind: "remote",
          url: "https://example.test/83927d60-f5d9-4bdc-b534-0cc8206d2794_T150_410_16_031_00.png",
          src: "https://example.test/83927d60-f5d9-4bdc-b534-0cc8206d2794_T150_410_16_031_00.png",
          alt: "Tissot PR 100 front",
        },
        imageGallery: [
          {
            kind: "remote",
            url: "https://example.test/T150_410_16_031_00_PROFIL.png",
            src: "https://example.test/T150_410_16_031_00_PROFIL.png",
            alt: "Tissot PR 100 profile",
          },
          {
            kind: "remote",
            url: "https://example.test/T150_410_16_031_00_B1.png",
            src: "https://example.test/T150_410_16_031_00_B1.png",
            alt: "Tissot PR 100 lifestyle",
          },
        ],
      }),
    );

    expect(selected.kind).toBe("none");
    expect(
      isCleanCollectionPersistedImageUrl(
        "https://example.test/83927d60-f5d9-4bdc-b534-0cc8206d2794_T150_410_16_031_00.png",
      ),
    ).toBe(false);
  });

  it("selects the confirmed front product frame for Casio AE-1200WH-1BV", () => {
    const frontImage = {
      kind: "development_zip" as const,
      imageKey: "9cef68de91f996e8a7d01c5da945aa04",
      src: "/api/catalog/dev-images/9cef68de91f996e8a7d01c5da945aa04",
      alt: "Casio AE-1200WH-1BV фото 2",
    };
    const selected = selectCollectionPrimaryImage(
      catalogWatch({
        referenceDisplay: "AE-1200WH-1BV",
        primaryImage: {
          kind: "development_zip",
          imageKey: "18ed5922d050fad407b9b2ddc9fe3cc8",
          src: "/api/catalog/dev-images/18ed5922d050fad407b9b2ddc9fe3cc8",
          alt: "Casio AE-1200WH-1BV фото 1",
        },
        imageGallery: [
          frontImage,
          {
            kind: "development_zip",
            imageKey: "fdfab10ce549bc39e6fa84814dbe462c",
            src: "/api/catalog/dev-images/fdfab10ce549bc39e6fa84814dbe462c",
            alt: "Casio AE-1200WH-1BV фото 3",
          },
        ],
      }),
    );

    expect(selected).toEqual(frontImage);
  });

  it("reconciles a persisted catalog image with the current canonical candidate", () => {
    const currentCandidate = recommendationCandidate({
      catalogReferenceId: "catalog/ae1200wh1bv",
      href: "/watches/casio/ae1200wh1bv",
      brandName: "Casio",
      referenceDisplay: "AE-1200WH-1BV",
      imageUrl: "/api/catalog/dev-images/9cef68de91f996e8a7d01c5da945aa04",
    });
    const persisted = {
      ...createLocalCatalogWatch(currentCandidate, "2026-01-01T00:00:00.000Z"),
      imageUrl: "/api/catalog/dev-images/18ed5922d050fad407b9b2ddc9fe3cc8",
    };

    expect(resolveLocalCollectionWatchImage(persisted, [currentCandidate]).imageUrl).toBe(
      currentCandidate.imageUrl,
    );
  });

  it("rejects a dirty persisted fallback when no current catalog match exists", () => {
    const persisted = {
      ...createLocalCatalogWatch(formalCandidate, "2026-01-01T00:00:00.000Z"),
      catalogReferenceId: "missing-catalog-reference",
      catalogHref: "/watches/missing",
      brandName: "Missing Brand",
      referenceDisplay: "MISSING-001",
      imageUrl: "https://example.test/watch-caseback.webp",
    };

    expect(isCleanCollectionPersistedImageUrl(persisted.imageUrl)).toBe(false);
    expect(resolveLocalCollectionWatchImage(persisted, []).imageUrl).toBeNull();
    expect(isCleanCollectionPersistedImageUrl("https://example.test/reverse-strap.webp")).toBe(false);
    expect(isCleanCollectionPersistedImageUrl("javascript:broken-image")).toBe(false);
  });

  it("keeps manual uploaded photos separate from catalog image reconciliation", () => {
    const manual = {
      ...createLocalManualWatch(
        {
          displayName: "Personal watch",
          role: "daily",
          photoDataUrl: "data:image/webp;base64,AAAA",
        },
        "2026-01-01T00:00:00.000Z",
      ),
      imageUrl: "/catalog/legacy-product.webp",
    };
    const resolved = resolveLocalCollectionWatchImage(manual, [formalCandidate]);

    expect(resolved.photoDataUrl).toBe("data:image/webp;base64,AAAA");
    expect(resolved.imageUrl).toBeNull();
  });

  it("keeps four recommendations after a higher-ranked dirty-image candidate is excluded", () => {
    const candidates = [
      recommendationCandidate({
        referenceDisplay: "DIRTY",
        imageUrl: null,
        publicPriceMinor: 2_000_000,
      }),
      ...["CLEAN-1", "CLEAN-2", "CLEAN-3", "CLEAN-4"].map((referenceDisplay, index) =>
        recommendationCandidate({
          referenceDisplay,
          catalogReferenceId: `clean-${index}`,
          brandName: `Clean Brand ${index}`,
          familyKey: `clean:${index}`,
          publicPriceMinor: 2_500_000 + index * 100_000,
          roles: ["formal"],
          movementType: (["automatic", "quartz", "solar", "manual"] as const)[index],
          attachmentType: (["leather_strap", "steel_bracelet", "rubber_strap", "textile_strap"] as const)[index],
          dialColorFamily: (["silver", "blue", "green", "champagne"] as const)[index],
          caseStyle: (["classic", "integrated_sport", "other", "field"] as const)[index],
        }),
      ),
    ];

    const set = buildCollectionRecommendationSet([item({ roles: ["daily"] })], candidates, "formal", 4);

    expect(set.candidates).toHaveLength(4);
    expect(set.candidates.some((entry) => entry.candidate.referenceDisplay === "DIRTY")).toBe(false);
  });

  it("assigns deterministic media categories for catalog, manual, rectangular, and missing watches", () => {
    expect(collectionCandidateMediaPresentation(formalCandidate)).toBe("analog-strap");
    expect(
      collectionCandidateMediaPresentation(
        recommendationCandidate({ displayName: "Cartier Tank", modelName: "Tank", imageUrl: "/tank.webp" }),
      ),
    ).toBe("rectangular");
    expect(
      collectionWatchMediaPresentation(
        createLocalManualWatch(
          { displayName: "Personal watch", role: "daily", photoDataUrl: "data:image/webp;base64,AAAA" },
          "2026-01-01T00:00:00.000Z",
        ),
      ),
    ).toBe("manual-watch");
    expect(
      collectionWatchMediaPresentation(
        createLocalManualWatch(
          { displayName: "Personal watch", role: "daily" },
          "2026-01-01T00:00:00.000Z",
        ),
      ),
    ).toBe("missing-image");
  });

  it("uses a missing-image state instead of a technical-only catalog image", () => {
    const [candidate] = buildLocalCollectionCatalogCandidates([
      catalogWatch({
        primaryImage: {
          kind: "remote",
          url: "https://example.test/watch-caseback.webp",
          src: "https://example.test/watch-caseback.webp",
          alt: "Watch caseback",
        },
        imageGallery: [],
      }),
    ]);

    expect(candidate?.imageUrl).toBeNull();
    expect(
      buildCollectionRecommendationSet([item({ roles: ["daily"] })], candidate ? [candidate] : [], "travel")
        .candidates,
    ).toHaveLength(0);
  });
});
