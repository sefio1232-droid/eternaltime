import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  classifyCatalogFacets,
  findSpecificationValue,
  normalizeCaseSizeMm,
  normalizeCaseSizeGroup,
} from "@/modules/catalog/application/catalog-filter-taxonomy";
import { createCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import { CASIO_MANIFEST_OUTPUT_PATH, type CasioPhotoArchiveManifest } from "@/modules/catalog/infrastructure/casio-photo-archive-types";
import { CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH, type CitizenOfficialPhotoManifest } from "@/modules/catalog/infrastructure/citizen-official-photo-types";
import { createOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import { ORIENT_MANIFEST_OUTPUT_PATH, type OrientPhotoArchiveManifest } from "@/modules/catalog/infrastructure/orient-photo-archive-types";
import { SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH, type SeikoOfficialPhotoManifest } from "@/modules/catalog/infrastructure/seiko-official-photo-types";
import { createTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import { TISSOT_MANIFEST_OUTPUT_PATH, type TissotPhotoArchiveManifest } from "@/modules/catalog/infrastructure/tissot-photo-archive-types";
import {
  buildSelectionImageCandidates,
  buildSelectionRecommendations,
  evaluateBudgetFit,
  selectionDialColorBucketFromRaw,
  selectionFormDefinition,
  selectionMovementMatchesPreference,
} from "@/modules/selection/application/selection-service";
import type { CatalogImagePresentation, CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type {
  SelectionAnswers,
  SelectionBudgetCode,
  SelectionCharacterCode,
  SelectionDialColorPreference,
  SelectionFeatureCode,
  SelectionFitCode,
  SelectionMovementPreference,
  SelectionScenarioCode,
} from "@/modules/selection/domain/types";

type CatalogPublicReadModelRow = {
  read_model_json: CatalogWatchDetail;
  updated_at: string;
};

type PhotoManifests = {
  casio: CasioPhotoArchiveManifest | null;
  orient: OrientPhotoArchiveManifest | null;
  tissot: TissotPhotoArchiveManifest | null;
  citizen: CitizenOfficialPhotoManifest | null;
  seiko: SeikoOfficialPhotoManifest | null;
};

type CandidateSnapshot = {
  reference: string;
  brand: string;
  publicPrice: number | null;
  primaryImage: string | null;
  imageValid: boolean;
  sizeMm: number | null;
  sizeClass: string | null;
  movement: string;
  dialColor: string;
  crystal: string | null;
  bandType: string | null;
  bandMaterial: string | null;
  waterResistance: string | null;
  functions: string | null;
  scenarioInputs: string[];
  characterInputs: string[];
  unknownFields: string[];
  eligibleBase: boolean;
};

const rootDir = process.cwd();
const reportDir = path.join(rootDir, "imports", "reports", "selection-hard-constraints-v4");

function comparableReference(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").toUpperCase().replace(/[^\p{Letter}\p{Number}]/gu, "");
}

async function readOptionalJson<T>(relativePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8")) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function imageAlt(title: string, referenceDisplay: string, order: number): string {
  return `${title}, ${referenceDisplay}, фото ${order}`;
}

function sortArchiveImages<T extends { position: "primary" | "gallery"; galleryIndex: number | null }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    if (left.position !== right.position) return left.position === "primary" ? -1 : 1;
    return (left.galleryIndex ?? 0) - (right.galleryIndex ?? 0);
  });
}

function sortOfficialImages<T extends { isCover: boolean; imageOrder: number }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    if (left.isCover !== right.isCover) return left.isCover ? -1 : 1;
    return left.imageOrder - right.imageOrder;
  });
}

function manifestImagesForWatch(watch: CatalogWatchDetail, manifests: PhotoManifests): CatalogImagePresentation[] {
  const ref = comparableReference(watch.referenceNormalized || watch.referenceDisplay || watch.referenceSlug);

  if (watch.brandSlug === "casio" && manifests.casio) {
    return sortArchiveImages(manifests.casio.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "development_zip" as const,
        imageKey: createCasioArchiveImageKey(entry.zipEntry),
        src: `/api/catalog/dev-images/${createCasioArchiveImageKey(entry.zipEntry)}`,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  if (watch.brandSlug === "orient" && manifests.orient) {
    return sortArchiveImages(manifests.orient.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "development_zip" as const,
        imageKey: createOrientArchiveImageKey(entry.zipEntry),
        src: `/api/catalog/dev-images/${createOrientArchiveImageKey(entry.zipEntry)}`,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  if (watch.brandSlug === "tissot" && manifests.tissot) {
    return sortArchiveImages(
      manifests.tissot.entries.filter((entry) =>
        comparableReference(entry.referenceNormalized) === ref ||
        comparableReference(entry.sourceReferenceNormalized) === ref
      ),
    ).map((entry, index) => ({
      kind: "development_zip" as const,
      imageKey: createTissotArchiveImageKey(entry.archiveFile, entry.zipEntry),
      src: `/api/catalog/dev-images/${createTissotArchiveImageKey(entry.archiveFile, entry.zipEntry)}`,
      alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
    }));
  }

  if (watch.brandSlug === "citizen" && manifests.citizen) {
    return sortOfficialImages(manifests.citizen.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "remote" as const,
        url: entry.publicPath,
        src: entry.publicPath,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  if (watch.brandSlug === "seiko" && manifests.seiko) {
    return sortOfficialImages(manifests.seiko.entries.filter((entry) => comparableReference(entry.referenceNormalized) === ref))
      .map((entry, index) => ({
        kind: "remote" as const,
        url: entry.publicPath,
        src: entry.publicPath,
        alt: imageAlt(watch.title, watch.referenceDisplay, index + 1),
      }));
  }

  return [];
}

function missingImage(title: string): CatalogImagePresentation {
  return { kind: "none", alt: `${title}, изображение недоступно` };
}

function applyProductionLikeImagePolicy(watch: CatalogWatchDetail, manifests: PhotoManifests): CatalogWatchDetail {
  const manifestImages = manifestImagesForWatch(watch, manifests);
  if (manifestImages.length > 0) {
    return { ...watch, primaryImage: manifestImages[0]!, imageGallery: manifestImages };
  }

  return {
    ...watch,
    primaryImage: watch.primaryImage.kind === "remote" ? missingImage(watch.title) : watch.primaryImage,
    imageGallery: watch.imageGallery
      .map((image) => image.kind === "remote" ? missingImage(watch.title) : image)
      .filter((image) => image.kind !== "none"),
  };
}

async function readDatasetFromDatabase(): Promise<CatalogReadDataset> {
  loadEnvConfig(rootDir);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("Supabase URL or server admin secret key is not configured.");

  const client = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client
    .from("catalog_public_read_models")
    .select("read_model_json,updated_at")
    .eq("status", "published")
    .order("brand_slug", { ascending: true })
    .order("reference_slug", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as CatalogPublicReadModelRow[];
  const watches = rows.map((row) => row.read_model_json);
  const brands = [...watches.reduce<Map<string, { slug: string; name: string; watchCount: number }>>((acc, watch) => {
    const current = acc.get(watch.brandSlug);
    acc.set(watch.brandSlug, {
      slug: watch.brandSlug,
      name: watch.brandName,
      watchCount: (current?.watchCount ?? 0) + 1,
    });
    return acc;
  }, new Map()).values()];

  return {
    source: "database",
    generatedAt: rows.map((row) => row.updated_at).sort().at(-1) ?? new Date(0).toISOString(),
    watches,
    brands,
  };
}

async function loadManifests(): Promise<PhotoManifests> {
  return {
    casio: await readOptionalJson<CasioPhotoArchiveManifest>(CASIO_MANIFEST_OUTPUT_PATH),
    orient: await readOptionalJson<OrientPhotoArchiveManifest>(ORIENT_MANIFEST_OUTPUT_PATH),
    tissot: await readOptionalJson<TissotPhotoArchiveManifest>(TISSOT_MANIFEST_OUTPUT_PATH),
    citizen: await readOptionalJson<CitizenOfficialPhotoManifest>(CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH),
    seiko: await readOptionalJson<SeikoOfficialPhotoManifest>(SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH),
  };
}

function actualMovementForWatch(watch: CatalogWatchDetail) {
  const group = classifyCatalogFacets(watch).movement;
  if (group === "automatic" || group === "hand_wound") return "mechanical";
  if (group === "analog_digital") return "analog-digital";
  return group ?? "unknown";
}

function candidateSnapshot(watch: CatalogWatchDetail): CandidateSnapshot {
  const sizeMm = normalizeCaseSizeMm(watch);
  const imageValid = buildSelectionImageCandidates(watch).length > 0;
  const values = {
    movement: actualMovementForWatch(watch),
    sizeClass: normalizeCaseSizeGroup(sizeMm),
    dialColor: selectionDialColorBucketFromRaw(findSpecificationValue(watch.specifications, ["dial_color_raw"])),
    crystal: findSpecificationValue(watch.specifications, ["crystal_type_raw"]),
    bandType: findSpecificationValue(watch.specifications, ["attachment_type_raw"]),
    bandMaterial: findSpecificationValue(watch.specifications, ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"]),
    waterResistance: findSpecificationValue(watch.specifications, ["water_resistance_raw"]),
    functions: findSpecificationValue(watch.specifications, ["functions_raw", "features_raw", "calendar_raw"]),
  };
  const unknownFields = Object.entries(values)
    .filter(([, value]) => value === null || value === "unknown")
    .map(([key]) => key);

  return {
    reference: watch.referenceDisplay,
    brand: watch.brandSlug,
    publicPrice: watch.publicPrice?.amountMinor ?? null,
    primaryImage: watch.primaryImage.kind === "none" ? null : watch.primaryImage.src,
    imageValid,
    sizeMm,
    sizeClass: values.sizeClass,
    movement: values.movement,
    dialColor: values.dialColor,
    crystal: values.crystal,
    bandType: values.bandType,
    bandMaterial: values.bandMaterial,
    waterResistance: values.waterResistance,
    functions: values.functions,
    scenarioInputs: [watch.brandCollectionName, watch.watchModelName, values.waterResistance, values.functions].filter((value): value is string => Boolean(value)),
    characterInputs: [watch.title, watch.brandCollectionName, values.bandMaterial, values.crystal].filter((value): value is string => Boolean(value)),
    unknownFields,
    eligibleBase: Boolean(watch.id && watch.href.startsWith("/watches/") && imageValid),
  };
}

const scenarios: SelectionScenarioCode[] = ["daily", "work", "occasion", "sport", "travel", "first-mechanical", "universal"];
const fits: SelectionFitCode[] = ["compact", "medium", "large", "unknown"];
const characters: SelectionCharacterCode[] = ["classic", "modern", "sporty", "expressive", "neutral"];
const movements: SelectionMovementPreference[] = ["mechanical", "quartz", "solar", "neutral"];
const colors: SelectionDialColorPreference[] = ["light", "dark", "blue", "green", "other", "neutral"];
const budgets: SelectionBudgetCode[] = ["under_15000", "range_15000_30000", "range_30000_50000", "range_50000_100000", "over_100000", "unknown"];
const featureSets: SelectionFeatureCode[][] = [
  ["none"],
  ["sapphire"],
  ["water-resistance"],
  ["steel-bracelet"],
  ["leather"],
  ["thin"],
  ["chronograph"],
  ["date"],
  ["functions"],
  ["sapphire", "steel-bracelet"],
  ["water-resistance", "chronograph"],
  ["leather", "thin"],
  ["sapphire", "date", "steel-bracelet"],
];

function handDesignedProfiles(): SelectionAnswers[] {
  const required: SelectionAnswers[] = [
    { scenario: "daily", fit: "compact", character: "neutral", movement: "neutral", dialColor: "neutral", features: ["none"], budget: "range_15000_30000" },
    { scenario: "work", fit: "medium", character: "classic", movement: "mechanical", dialColor: "light", features: ["none"], budget: "range_15000_30000" },
    { scenario: "travel", fit: "large", character: "modern", movement: "solar", dialColor: "blue", features: ["date"], budget: "range_30000_50000" },
    { scenario: "work", fit: "compact", character: "classic", movement: "neutral", dialColor: "neutral", features: ["sapphire", "steel-bracelet"], budget: "unknown" },
    { scenario: "occasion", fit: "medium", character: "classic", movement: "mechanical", dialColor: "neutral", features: ["leather"], budget: "range_30000_50000" },
    { scenario: "sport", fit: "large", character: "sporty", movement: "neutral", dialColor: "dark", features: ["water-resistance"], budget: "range_15000_30000" },
    { scenario: "daily", fit: "unknown", character: "modern", movement: "neutral", dialColor: "neutral", features: ["none"], budget: "range_15000_30000" },
  ];

  const generated: SelectionAnswers[] = [];
  for (let index = 0; generated.length + required.length < 50; index += 1) {
    generated.push({
      scenario: scenarios[index % scenarios.length]!,
      fit: fits[Math.floor(index / 2) % fits.length]!,
      character: characters[Math.floor(index / 3) % characters.length]!,
      movement: movements[Math.floor(index / 5) % movements.length]!,
      dialColor: colors[Math.floor(index / 7) % colors.length]!,
      features: featureSets[Math.floor(index / 11) % featureSets.length]!,
      budget: budgets[Math.floor(index / 13) % budgets.length]!,
    });
  }

  return [...required, ...generated];
}

function generatedProfiles(count = 500): SelectionAnswers[] {
  return Array.from({ length: count }, (_, index) => ({
    scenario: scenarios[(index * 7 + 3) % scenarios.length]!,
    fit: fits[(index * 5 + 1) % fits.length]!,
    character: characters[(index * 11 + 2) % characters.length]!,
    movement: movements[(index * 13 + 1) % movements.length]!,
    dialColor: colors[(index * 17 + 4) % colors.length]!,
    features: featureSets[(index * 19 + 6) % featureSets.length]!,
    budget: budgets[(index * 23 + 2) % budgets.length]!,
  }));
}

function auditProfile(dataset: CatalogReadDataset, answers: SelectionAnswers, index: number, kind: "hand" | "generated") {
  const recommendations = buildSelectionRecommendations({ dataset, answers, limit: 4 });
  const failures = [];
  for (const recommendation of recommendations) {
    if (recommendation.imageCandidates.length === 0) {
      failures.push({ type: "IMAGE_VIOLATION", reference: recommendation.watch.referenceDisplay });
    }
    if (answers.fit !== "unknown" && recommendation.sizeClass !== answers.fit) {
      failures.push({ type: "SIZE_VIOLATION", reference: recommendation.watch.referenceDisplay, expected: answers.fit, actual: recommendation.sizeClass });
    }
    if (!selectionMovementMatchesPreference(answers.movement, recommendation.movementKey)) {
      failures.push({ type: "MECHANISM_VIOLATION", reference: recommendation.watch.referenceDisplay, expected: answers.movement, actual: recommendation.movementKey });
    }
  }

  return {
    kind,
    index,
    answers,
    resultCount: recommendations.length,
    results: recommendations.map((recommendation) => ({
      reference: recommendation.watch.referenceDisplay,
      brand: recommendation.watch.brandSlug,
      href: recommendation.watch.href,
      price: recommendation.watch.publicPrice?.amountMinor ?? null,
      sizeClass: recommendation.sizeClass,
      sizeMm: recommendation.caseSizeMm,
      movement: recommendation.movementKey,
      imageUrl: recommendation.imageCandidates[0]?.src ?? null,
      imageCandidates: recommendation.imageCandidates.length,
      budgetTier: evaluateBudgetFit(answers.budget, recommendation.watch.publicPrice?.amountMinor ?? null).tier,
      score: recommendation.score,
    })),
    failures,
  };
}

function byCount<T extends string>(values: T[]): Record<T, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {}) as Record<T, number>;
}

function renderMarkdown(input: {
  candidates: CandidateSnapshot[];
  handResults: ReturnType<typeof auditProfile>[];
  generatedResults: ReturnType<typeof auditProfile>[];
  failures: unknown[];
}) {
  const withImage = input.candidates.filter((candidate) => candidate.imageValid);
  const lines = [
    "# Selection hard constraints v4 audit",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    `Selection steps: ${selectionFormDefinition.steps.map((step) => step.code).join(" → ")}`,
    "",
    "## Hard constraints",
    "",
    "- Valid customer-facing image: required.",
    "- Exact size class: required when compact/medium/large is selected.",
    "- Mechanism: hard for explicit mechanical/quartz/solar, neutral for any.",
    "- Budget, dial color, character, scenario and features remain ranking signals / soft preferences.",
    "",
    "## Availability with valid image",
    "",
    `- Compact: ${withImage.filter((candidate) => candidate.sizeClass === "compact").length}`,
    `- Medium: ${withImage.filter((candidate) => candidate.sizeClass === "medium").length}`,
    `- Large: ${withImage.filter((candidate) => candidate.sizeClass === "large").length}`,
    `- Mechanical: ${withImage.filter((candidate) => candidate.movement === "mechanical").length}`,
    `- Quartz: ${withImage.filter((candidate) => ["quartz", "digital", "analog-digital"].includes(candidate.movement)).length}`,
    `- Solar: ${withImage.filter((candidate) => candidate.movement === "solar").length}`,
    "",
    "## Profile audit",
    "",
    `- Hand-designed profiles: ${input.handResults.filter((result) => result.failures.length === 0).length} / ${input.handResults.length} PASS`,
    `- Generated profiles: ${input.generatedResults.filter((result) => result.failures.length === 0).length} / ${input.generatedResults.length} PASS`,
    `- Hard constraint failures: ${input.failures.length}`,
    "",
    "## Result counts",
    "",
    `- 0 exact results: ${[...input.handResults, ...input.generatedResults].filter((result) => result.resultCount === 0).length}`,
    `- 1 exact result: ${[...input.handResults, ...input.generatedResults].filter((result) => result.resultCount === 1).length}`,
    `- 2 exact results: ${[...input.handResults, ...input.generatedResults].filter((result) => result.resultCount === 2).length}`,
    `- 3+ exact results: ${[...input.handResults, ...input.generatedResults].filter((result) => result.resultCount >= 3).length}`,
    "",
    "## Candidate size buckets",
    "",
    "```json",
    JSON.stringify(byCount(input.candidates.map((candidate) => candidate.sizeClass ?? "unknown")), null, 2),
    "```",
    "",
    "## Candidate movement buckets",
    "",
    "```json",
    JSON.stringify(byCount(input.candidates.map((candidate) => candidate.movement)), null, 2),
    "```",
    "",
  ];

  return `${lines.join("\n")}\n`;
}

async function main() {
  const rawDataset = await readDatasetFromDatabase();
  const manifests = await loadManifests();
  const dataset = {
    ...rawDataset,
    watches: rawDataset.watches.map((watch) => applyProductionLikeImagePolicy(watch, manifests)),
  } satisfies CatalogReadDataset;
  const candidates = dataset.watches.map(candidateSnapshot);
  const handResults = handDesignedProfiles().map((answers, index) => auditProfile(dataset, answers, index, "hand"));
  const generatedResults = generatedProfiles().map((answers, index) => auditProfile(dataset, answers, index, "generated"));
  const failures = [...handResults, ...generatedResults].flatMap((result) =>
    result.failures.map((failure) => ({ profile: result.index, kind: result.kind, answers: result.answers, ...failure })),
  );
  const withImage = candidates.filter((candidate) => candidate.imageValid);

  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, "selection-candidates.json"), `${JSON.stringify(candidates, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-profile-results.json"), `${JSON.stringify({ handDesigned: handResults, generated: generatedResults }, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-hard-constraint-failures.json"), `${JSON.stringify(failures, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-image-eligibility.json"), `${JSON.stringify({
    total: candidates.length,
    validImage: withImage.length,
    invalidImage: candidates.length - withImage.length,
    invalid: candidates.filter((candidate) => !candidate.imageValid).map((candidate) => ({ brand: candidate.brand, reference: candidate.reference, primaryImage: candidate.primaryImage })),
  }, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-size-eligibility.json"), `${JSON.stringify({
    compact: withImage.filter((candidate) => candidate.sizeClass === "compact").length,
    medium: withImage.filter((candidate) => candidate.sizeClass === "medium").length,
    large: withImage.filter((candidate) => candidate.sizeClass === "large").length,
    unknown: withImage.filter((candidate) => candidate.sizeClass === null).length,
  }, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-hard-constraints-v4.md"), renderMarkdown({ candidates, handResults, generatedResults, failures }), "utf8");

  console.log(JSON.stringify({
    totalCandidates: candidates.length,
    imageEligible: withImage.length,
    handDesignedProfiles: `${handResults.filter((result) => result.failures.length === 0).length}/${handResults.length}`,
    generatedProfiles: `${generatedResults.filter((result) => result.failures.length === 0).length}/${generatedResults.length}`,
    hardConstraintFailures: failures.length,
    compactEligibleWithImage: withImage.filter((candidate) => candidate.sizeClass === "compact").length,
    mediumEligibleWithImage: withImage.filter((candidate) => candidate.sizeClass === "medium").length,
    largeEligibleWithImage: withImage.filter((candidate) => candidate.sizeClass === "large").length,
    mechanicalEligibleWithImage: withImage.filter((candidate) => candidate.movement === "mechanical").length,
    quartzEligibleWithImage: withImage.filter((candidate) => ["quartz", "digital", "analog-digital"].includes(candidate.movement)).length,
    solarEligibleWithImage: withImage.filter((candidate) => candidate.movement === "solar").length,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown selection hard constraints v4 audit error.");
  process.exitCode = 1;
});
