import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { findSpecificationValue } from "@/modules/catalog/application/catalog-filter-taxonomy";
import {
  buildSelectionRecommendations,
  evaluateBudgetFit,
  selectionDialColorBucketFromRaw,
  selectionFormDefinition,
} from "@/modules/selection/application/selection-service";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { SelectionAnswers, SelectionBudgetFallbackTier } from "@/modules/selection/domain/types";

type CatalogPublicReadModelRow = {
  brand_slug: string;
  reference_code_normalized: string;
  reference_slug: string;
  read_model_json: CatalogWatchDetail;
  updated_at: string;
};

const rootDir = process.cwd();
const reportDir = path.join(rootDir, "imports", "reports", "selection-master-v3");
const masterDryRunPath = path.join(rootDir, "imports", "generated", "master-characteristics", "dry-run.json");
const scopedBrands = ["orient", "citizen", "tissot", "casio", "seiko"] as const;
const expectedScope = {
  orient: 82,
  citizen: 25,
  tissot: 160,
  casio: 215,
  seiko: 73,
} as const;

const representativeSeeds: SelectionAnswers[] = [
  { scenario: "daily", fit: "medium", character: "modern", movement: "quartz", dialColor: "blue", features: ["none"], budget: "range_15000_30000" },
  { scenario: "daily", fit: "medium", character: "modern", movement: "quartz", dialColor: "dark", features: ["sapphire"], budget: "range_15000_30000" },
  { scenario: "travel", fit: "medium", character: "modern", movement: "solar", dialColor: "blue", features: ["water-resistance", "date"], budget: "range_30000_50000" },
  { scenario: "first-mechanical", fit: "medium", character: "classic", movement: "mechanical", dialColor: "light", features: ["sapphire"], budget: "range_30000_50000" },
  { scenario: "universal", fit: "unknown", character: "neutral", movement: "neutral", dialColor: "neutral", features: ["none"], budget: "unknown" },
];

const scenarios = ["daily", "work", "occasion", "sport", "travel", "first-mechanical", "universal"] as const;
const fits = ["compact", "medium", "large", "unknown"] as const;
const characters = ["classic", "modern", "sporty", "expressive", "neutral"] as const;
const movements = ["mechanical", "quartz", "solar", "neutral"] as const;
const colors = ["light", "dark", "blue", "green", "other", "neutral"] as const;
const featureSets = [
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
] as const;
const budgets = [
  "under_15000",
  "range_15000_30000",
  "range_30000_50000",
  "range_50000_100000",
  "over_100000",
  "unknown",
] as const;

function priceMinor(watch: Pick<CatalogWatchDetail, "publicPrice">): number | null {
  return watch.publicPrice?.amountMinor ?? null;
}

function budgetTierRank(tier: SelectionBudgetFallbackTier): number {
  const order: SelectionBudgetFallbackTier[] = [
    "exact_budget_band",
    "slightly_below",
    "slightly_above",
    "broader_below",
    "unknown_price",
    "broader_above",
    "budget_neutral",
  ];
  return order.indexOf(tier);
}

function stableGeneratedProfile(index: number): SelectionAnswers {
  return {
    scenario: scenarios[index % scenarios.length],
    fit: fits[Math.floor(index / 2) % fits.length],
    character: characters[Math.floor(index / 3) % characters.length],
    movement: movements[Math.floor(index / 5) % movements.length],
    dialColor: colors[Math.floor(index / 7) % colors.length],
    features: [...featureSets[Math.floor(index / 11) % featureSets.length]],
    budget: budgets[Math.floor(index / 13) % budgets.length],
  };
}

function representativeProfiles(): SelectionAnswers[] {
  const generated: SelectionAnswers[] = [];
  for (let index = 0; generated.length < 40; index += 1) {
    generated.push(stableGeneratedProfile(index));
  }

  return [...representativeSeeds, ...generated].slice(0, 40);
}

function recommendationSnapshot(dataset: CatalogReadDataset, answers: SelectionAnswers, label: string) {
  const recommendations = buildSelectionRecommendations({ dataset, answers, limit: 4 });
  return {
    label,
    answers,
    count: recommendations.length,
    recommendations: recommendations.map((recommendation, index) => ({
      rank: index + 1,
      id: recommendation.watch.id,
      href: recommendation.watch.href,
      brand: recommendation.watch.brandName,
      brandSlug: recommendation.watch.brandSlug,
      title: recommendation.watch.title,
      reference: recommendation.watch.referenceDisplay,
      priceMinor: recommendation.watch.publicPrice?.amountMinor ?? null,
      score: recommendation.score,
      budgetTier: evaluateBudgetFit(answers.budget, recommendation.watch.publicPrice?.amountMinor ?? null).tier,
      movementKey: recommendation.movementKey,
      dialColorBucket: recommendation.dialColorBucket,
      caseSizeMm: recommendation.caseSizeMm,
      strapKey: recommendation.strapKey,
      criteria: recommendation.criteria.map((criterion) => ({
        key: criterion.key,
        status: criterion.status,
        score: criterion.score,
        reason: criterion.reason,
      })),
    })),
  };
}

function colorCoverage(dataset: CatalogReadDataset) {
  const coverage = {
    totalScoped: 0,
    byBucket: {} as Record<string, number>,
    byBrand: {} as Record<string, Record<string, number>>,
    unknown: [] as Array<{ brandSlug: string; reference: string; href: string }>,
  };

  for (const watch of dataset.watches.filter((item) => scopedBrands.includes(item.brandSlug as typeof scopedBrands[number]))) {
    coverage.totalScoped += 1;
    const raw = findSpecificationValue(watch.specifications, ["dial_color_raw"]);
    const bucket = selectionDialColorBucketFromRaw(raw);
    coverage.byBucket[bucket] = (coverage.byBucket[bucket] ?? 0) + 1;
    coverage.byBrand[watch.brandSlug] ??= {};
    coverage.byBrand[watch.brandSlug]![bucket] = (coverage.byBrand[watch.brandSlug]![bucket] ?? 0) + 1;
    if (bucket === "unknown") {
      coverage.unknown.push({ brandSlug: watch.brandSlug, reference: watch.referenceDisplay, href: watch.href });
    }
  }

  return coverage;
}

function invariantsForProfile(dataset: CatalogReadDataset, answers: SelectionAnswers, label: string): string[] {
  const issues: string[] = [];
  const first = buildSelectionRecommendations({ dataset, answers, limit: 4 });
  const second = buildSelectionRecommendations({ dataset, answers, limit: 4 });
  const firstIds = first.map((item) => item.watch.id).join("|");
  const secondIds = second.map((item) => item.watch.id).join("|");
  if (firstIds !== secondIds) issues.push(`${label}: ranking is not deterministic.`);
  if (first.length === 0) issues.push(`${label}: no recommendations.`);
  if (first.length > 4) issues.push(`${label}: more than 4 recommendations.`);
  if (new Set(first.map((item) => item.watch.href)).size !== first.length) issues.push(`${label}: duplicate hrefs.`);
  if (first.some((item) => !item.criteria.some((criterion) => criterion.key === "dialColor"))) {
    issues.push(`${label}: missing dialColor criterion.`);
  }

  if (answers.budget !== "unknown" && first.length > 1) {
    const ranks = first.map((item) => budgetTierRank(evaluateBudgetFit(answers.budget, priceMinor(item.watch)).tier));
    const firstRank = ranks[0] ?? 0;
    if (ranks.some((rank) => rank < firstRank)) {
      issues.push(`${label}: a better budget tier appeared after the first result.`);
    }
  }

  return issues;
}

async function readMasterDryRunSummary() {
  const parsed = JSON.parse(await readFile(masterDryRunPath, "utf8")) as {
    summary?: {
      totalScope?: number;
      matchedRows?: number;
      missingRows?: number;
      ambiguousRows?: number;
      priceChanges?: number;
      perBrand?: Record<string, { scope?: number; matched?: number; updated?: number }>;
    };
    blockers?: string[];
  };
  return parsed;
}

async function readDatasetFromDatabase(): Promise<CatalogReadDataset> {
  loadEnvConfig(rootDir);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase URL or server admin secret key is not configured.");
  }

  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client
    .from("catalog_public_read_models")
    .select("brand_slug,reference_code_normalized,reference_slug,read_model_json,updated_at")
    .eq("status", "published")
    .order("brand_slug", { ascending: true })
    .order("reference_slug", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as CatalogPublicReadModelRow[];
  const watches = rows.map((row) => row.read_model_json);
  const brandCounts = new Map<string, { slug: string; name: string; watchCount: number }>();
  for (const watch of watches) {
    const current = brandCounts.get(watch.brandSlug);
    brandCounts.set(watch.brandSlug, {
      slug: watch.brandSlug,
      name: watch.brandName,
      watchCount: (current?.watchCount ?? 0) + 1,
    });
  }

  return {
    source: "database",
    generatedAt: rows.map((row) => row.updated_at).sort().at(-1) ?? new Date(0).toISOString(),
    brands: [...brandCounts.values()].sort((left, right) => right.watchCount - left.watchCount || left.name.localeCompare(right.name, "ru")),
    watches,
  };
}

function markdownReport(input: {
  summary: Record<string, unknown>;
  issues: string[];
  coverage: ReturnType<typeof colorCoverage>;
}) {
  return [
    "# Selection MASTER v3 audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    ...Object.entries(input.summary).map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`),
    "",
    "## Dial color coverage",
    "",
    ...Object.entries(input.coverage.byBucket).map(([bucket, count]) => `- ${bucket}: ${count}`),
    "",
    "## Issues",
    "",
    ...(input.issues.length === 0 ? ["- none"] : input.issues.map((issue) => `- ${issue}`)),
    "",
  ].join("\n");
}

async function main() {
  const dataset = await readDatasetFromDatabase();
  const dryRun = await readMasterDryRunSummary();
  const representative = representativeProfiles();
  const generated = Array.from({ length: 200 }, (_, index) => stableGeneratedProfile(index + 101));
  const representativeSnapshots = representative.map((answers, index) =>
    recommendationSnapshot(dataset, answers, `representative-${String(index + 1).padStart(2, "0")}`),
  );
  const generatedSnapshots = generated.map((answers, index) =>
    recommendationSnapshot(dataset, answers, `generated-${String(index + 1).padStart(3, "0")}`),
  );
  const coverage = colorCoverage(dataset);
  const issues = [
    ...representative.flatMap((answers, index) => invariantsForProfile(dataset, answers, `representative-${index + 1}`)),
    ...generated.flatMap((answers, index) => invariantsForProfile(dataset, answers, `generated-${index + 1}`)),
  ];

  const drySummary = dryRun.summary ?? {};
  if (drySummary.totalScope !== 555 || drySummary.matchedRows !== 555 || drySummary.missingRows !== 0 || drySummary.ambiguousRows !== 0 || drySummary.priceChanges !== 0) {
    issues.push("MASTER dry-run summary is not clean for 555 scoped models.");
  }
  for (const brand of scopedBrands) {
    const scope = drySummary.perBrand?.[brand]?.scope;
    const matched = drySummary.perBrand?.[brand]?.matched;
    const updated = drySummary.perBrand?.[brand]?.updated;
    if (scope !== expectedScope[brand] || matched !== expectedScope[brand] || updated !== 0) {
      issues.push(`${brand}: MASTER dry-run per-brand scope/match/update mismatch.`);
    }
  }
  if ((dryRun.blockers ?? []).length > 0) issues.push("MASTER dry-run blockers are present.");
  if (coverage.totalScoped < 555) issues.push(`Selection dataset has only ${coverage.totalScoped} scoped 5-brand watches.`);
  for (const bucket of ["light", "dark", "blue", "green", "other"]) {
    if (!coverage.byBucket[bucket]) issues.push(`No scoped watches mapped to ${bucket} dial bucket.`);
  }
  if (selectionFormDefinition.steps.length !== 7) issues.push("Selection form is not 7 steps.");

  const summary = {
    datasetSource: dataset.source,
    totalDatasetWatches: dataset.watches.length,
    totalScopedWatches: coverage.totalScoped,
    masterDryRunTotalScope: drySummary.totalScope ?? null,
    masterDryRunMatchedRows: drySummary.matchedRows ?? null,
    masterDryRunMissingRows: drySummary.missingRows ?? null,
    masterDryRunAmbiguousRows: drySummary.ambiguousRows ?? null,
    masterDryRunPriceChanges: drySummary.priceChanges ?? null,
    selectionSteps: selectionFormDefinition.steps.map((step) => step.code),
    representativeProfiles: representative.length,
    generatedProfiles: generated.length,
    issues: issues.length,
  };

  const report = {
    summary,
    issues,
    coverage,
    representativeProfiles: representativeSnapshots,
    generatedProfileSummary: generatedSnapshots.map((snapshot) => ({
      label: snapshot.label,
      answers: snapshot.answers,
      count: snapshot.count,
      top: snapshot.recommendations[0] ?? null,
    })),
    consistencySample: representativeSnapshots.flatMap((snapshot) => snapshot.recommendations).slice(0, 20),
  };

  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, "selection-master-v3.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-master-v3.md"), markdownReport({ summary, issues, coverage }), "utf8");
  await writeFile(path.join(reportDir, "selection-candidate-snapshot.json"), `${JSON.stringify(representativeSnapshots, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-color-coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "selection-profile-results.json"), `${JSON.stringify({ representative: representativeSnapshots, generated: generatedSnapshots }, null, 2)}\n`, "utf8");

  console.log(`selection_master_v3_report=${path.relative(rootDir, path.join(reportDir, "selection-master-v3.md"))}`);
  console.log(`selection_master_v3_issues=${issues.length}`);
  if (issues.length > 0) {
    for (const issue of issues.slice(0, 20)) console.log(`issue=${issue}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
