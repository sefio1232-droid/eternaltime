import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSelectionRecommendations,
  evaluateBudgetFit,
  selectionDialColorBucketFromRaw,
  selectionFormDefinition,
} from "@/modules/selection/application/selection-service";
import { findSpecificationValue } from "@/modules/catalog/application/catalog-filter-taxonomy";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";
import type { SelectionAnswers } from "@/modules/selection/domain/types";

const root = process.cwd();
const preview = JSON.parse(
  readFileSync(path.join(root, "imports", "generated", "catalog-import-preview.json"), "utf8"),
) as CatalogImportPreview;
const imagePlan = JSON.parse(
  readFileSync(path.join(root, "imports", "generated", "catalog-image-upload-plan.json"), "utf8"),
) as CatalogImageUploadPlan;
const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });

const scenarios: Record<"A" | "B" | "C" | "D" | "E" | "F" | "G", SelectionAnswers> = {
  A: { scenario: "daily", fit: "medium", character: "modern", movement: "quartz", dialColor: "blue", features: ["none"], budget: "range_15000_30000" },
  B: { scenario: "work", fit: "compact", character: "classic", movement: "quartz", dialColor: "dark", features: ["sapphire", "thin"], budget: "range_30000_50000" },
  C: { scenario: "occasion", fit: "compact", character: "expressive", movement: "solar", dialColor: "green", features: ["steel-bracelet"], budget: "range_30000_50000" },
  D: { scenario: "sport", fit: "large", character: "sporty", movement: "quartz", dialColor: "dark", features: ["water-resistance", "chronograph"], budget: "range_15000_30000" },
  E: { scenario: "travel", fit: "medium", character: "modern", movement: "solar", dialColor: "blue", features: ["water-resistance", "date"], budget: "range_30000_50000" },
  F: { scenario: "first-mechanical", fit: "medium", character: "classic", movement: "mechanical", dialColor: "light", features: ["sapphire"], budget: "range_30000_50000" },
  G: { scenario: "universal", fit: "unknown", character: "neutral", movement: "neutral", dialColor: "neutral", features: ["none"], budget: "unknown" },
};

function statusFor(result: ReturnType<typeof buildSelectionRecommendations>[number], key: string) {
  return result.criteria.find((criterion) => criterion.key === key)?.status;
}

function priceRub(result: ReturnType<typeof buildSelectionRecommendations>[number]) {
  return (result.watch.publicPrice?.amountMinor ?? 0) / 100;
}

describe("selection real catalog scenarios", () => {
  it("runs the current full catalog through all representative profiles deterministically", () => {
    expect(dataset.watches.length).toBeGreaterThanOrEqual(600);
    expect(selectionFormDefinition.steps).toHaveLength(7);

    for (const answers of Object.values(scenarios)) {
      const first = buildSelectionRecommendations({ dataset, answers });
      const second = buildSelectionRecommendations({ dataset, answers });

      expect(first.map((item) => item.watch.id)).toEqual(second.map((item) => item.watch.id));
      expect(first.length).toBeGreaterThanOrEqual(2);
      expect(first.length).toBeLessThanOrEqual(4);
      expect(first.every((item) => item.watch.href.startsWith("/watches/"))).toBe(true);
      expect(new Set(first.map((item) => item.watch.href)).size).toBe(first.length);
      expect(new Set(first.map((item) => item.watch.referenceNormalized)).size).toBe(first.length);
      expect(first.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
      expect(first.every((item) => item.criteria.some((criterion) => criterion.key === "dialColor"))).toBe(true);
    }
  });

  it("does not rank noticeably over-budget models first when in-budget alternatives exist", () => {
    const results = buildSelectionRecommendations({ dataset, answers: scenarios.B, limit: 4 });
    expect(results[0]?.watch.publicPrice?.amountMinor ?? 0).toBeLessThanOrEqual(5_000_000);
    expect(statusFor(results[0]!, "budget")).not.toBe("conflict");
  });

  it("treats selected budgets as target bands across the real catalog", () => {
    const profiles: SelectionAnswers[] = [
      { scenario: "daily", fit: "medium", character: "modern", movement: "quartz", dialColor: "blue", features: ["none"], budget: "range_15000_30000" },
      { scenario: "sport", fit: "large", character: "sporty", movement: "quartz", dialColor: "dark", features: ["water-resistance", "chronograph"], budget: "range_15000_30000" },
      { scenario: "work", fit: "compact", character: "classic", movement: "quartz", dialColor: "light", features: ["leather"], budget: "range_15000_30000" },
    ];

    for (const answers of profiles) {
      const results = buildSelectionRecommendations({ dataset, answers, limit: 3 });
      const prices = results.map(priceRub);
      expect(prices.every((price) => price >= 15_000 && price <= 30_000)).toBe(true);
      expect(prices.some((price) => price <= 6_000)).toBe(false);
    }
  });

  it("keeps extreme lower-band outliers out of normal top results for higher budget ranges", () => {
    const matrix: Array<{ budget: SelectionAnswers["budget"]; extremeCeiling: number }> = [
      { budget: "range_30000_50000", extremeCeiling: 8_000 },
      { budget: "range_50000_100000", extremeCeiling: 15_000 },
      { budget: "over_100000", extremeCeiling: 25_000 },
    ];

    for (const item of matrix) {
      const results = buildSelectionRecommendations({
        dataset,
        answers: { ...scenarios.A, budget: item.budget },
        limit: 3,
      });

      expect(results.some((result) => priceRub(result) <= item.extremeCeiling)).toBe(false);
      expect(results.filter((result) => evaluateBudgetFit(item.budget, result.watch.publicPrice?.amountMinor ?? null).status === "ideal").length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps movement choice meaningful", () => {
    const mechanical = buildSelectionRecommendations({ dataset, answers: scenarios.F });
    const solar = buildSelectionRecommendations({ dataset, answers: scenarios.E });

    expect(statusFor(mechanical[0]!, "movement")).toBe("match");
    expect(statusFor(solar[0]!, "movement")).toBe("match");
  });

  it("keeps feature requests visible in criteria without hiding unknown data", () => {
    const [featured] = buildSelectionRecommendations({ dataset, answers: scenarios.D });

    expect(featured?.criteria.some((criterion) => criterion.key === "feature:water-resistance")).toBe(true);
    expect(featured?.criteria.some((criterion) => criterion.key === "feature:chronograph")).toBe(true);
    expect(featured?.criteria.every((criterion) => ["match", "unknown", "conflict", "neutral"].includes(criterion.status))).toBe(true);
  });

  it("keeps Seiko women records eligible without a gender question", () => {
    const compactClassic = buildSelectionRecommendations({
      dataset,
      answers: {
        scenario: "work",
        fit: "compact",
        character: "classic",
        movement: "quartz",
        dialColor: "light",
        features: ["none"],
        budget: "unknown",
      },
      limit: 10,
    });

    expect(selectionFormDefinition.steps.flatMap((step) => step.options).some((option) => option.code === "gender")).toBe(false);
    expect(compactClassic.some((item) => item.watch.brandSlug === "seiko")).toBe(true);
  });

  it("uses MASTER dial_color_raw as a soft selection criterion without image or title inference", () => {
    expect(selectionFormDefinition.steps.find((step) => step.code === "dial-color")?.options.map((option) => option.code)).toEqual([
      "light",
      "dark",
      "blue",
      "green",
      "other",
      "neutral",
    ]);

    const scoped = dataset.watches.filter((watch) => ["orient", "citizen", "tissot", "casio", "seiko"].includes(watch.brandSlug));
    const buckets = new Set(scoped.map((watch) => selectionDialColorBucketFromRaw(findSpecificationValue(watch.specifications, ["dial_color_raw"]))));
    expect(scoped.length).toBeGreaterThanOrEqual(555);
    expect(buckets.has("light")).toBe(true);
    expect(buckets.has("dark")).toBe(true);
    expect(buckets.has("blue")).toBe(true);
    expect(buckets.has("green")).toBe(true);

    const blueResults = buildSelectionRecommendations({ dataset, answers: scenarios.A, limit: 4 });
    expect(blueResults.some((item) => item.criteria.find((criterion) => criterion.key === "dialColor")?.status === "match")).toBe(true);
    expect(blueResults.every((item) => item.criteria.find((criterion) => criterion.key === "dialColor")?.status !== undefined)).toBe(true);
  });

  it("never exposes known technical image URLs in the shortlist", () => {
    const blocked = /(profil|caseback|[_-]b\d+\.|clasp|buckle|manual|diagram|macro|movement)/i;

    for (const answers of Object.values(scenarios)) {
      const results = buildSelectionRecommendations({ dataset, answers });
      expect(results.flatMap((item) => item.imageCandidates).every((image) => !blocked.test(image.src))).toBe(true);
    }
  });
});
