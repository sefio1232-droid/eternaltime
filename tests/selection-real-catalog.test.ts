import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSelectionRecommendations, selectionFormDefinition } from "@/modules/selection/application/selection-service";
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
  A: { scenario: "daily", fit: "medium", character: "modern", movement: "quartz", features: ["none"], budget: "range_15000_30000" },
  B: { scenario: "work", fit: "compact", character: "classic", movement: "quartz", features: ["sapphire", "thin"], budget: "range_30000_50000" },
  C: { scenario: "occasion", fit: "compact", character: "expressive", movement: "solar", features: ["steel-bracelet"], budget: "range_30000_50000" },
  D: { scenario: "sport", fit: "large", character: "sporty", movement: "quartz", features: ["water-resistance", "chronograph"], budget: "range_15000_30000" },
  E: { scenario: "travel", fit: "medium", character: "modern", movement: "solar", features: ["water-resistance", "date"], budget: "range_30000_50000" },
  F: { scenario: "first-mechanical", fit: "medium", character: "classic", movement: "mechanical", features: ["sapphire"], budget: "range_30000_50000" },
  G: { scenario: "universal", fit: "unknown", character: "neutral", movement: "neutral", features: ["none"], budget: "unknown" },
};

function statusFor(result: ReturnType<typeof buildSelectionRecommendations>[number], key: string) {
  return result.criteria.find((criterion) => criterion.key === key)?.status;
}

describe("selection real catalog scenarios", () => {
  it("runs the current full catalog through all representative profiles deterministically", () => {
    expect(dataset.watches.length).toBeGreaterThanOrEqual(600);
    expect(selectionFormDefinition.steps).toHaveLength(6);

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
    }
  });

  it("does not rank noticeably over-budget models first when in-budget alternatives exist", () => {
    const results = buildSelectionRecommendations({ dataset, answers: scenarios.B, limit: 4 });
    expect(results[0]?.watch.publicPrice?.amountMinor ?? 0).toBeLessThanOrEqual(5_000_000);
    expect(statusFor(results[0]!, "budget")).not.toBe("conflict");
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
        features: ["none"],
        budget: "unknown",
      },
      limit: 10,
    });

    expect(selectionFormDefinition.steps.flatMap((step) => step.options).some((option) => option.code === "gender")).toBe(false);
    expect(compactClassic.some((item) => item.watch.brandSlug === "seiko")).toBe(true);
  });

  it("does not use dial color in selection questions or criteria keys", () => {
    expect(JSON.stringify(selectionFormDefinition)).not.toMatch(/color|цвет|dial_color/i);

    for (const answers of Object.values(scenarios)) {
      const results = buildSelectionRecommendations({ dataset, answers });
      expect(results.flatMap((item) => item.criteria.map((criterion) => criterion.key)).join(" ")).not.toMatch(/color|dial/i);
    }
  });

  it("never exposes known technical image URLs in the shortlist", () => {
    const blocked = /(profil|caseback|[_-]b\d+\.|clasp|buckle|manual|diagram|macro|movement)/i;

    for (const answers of Object.values(scenarios)) {
      const results = buildSelectionRecommendations({ dataset, answers });
      expect(results.flatMap((item) => item.imageCandidates).every((image) => !blocked.test(image.src))).toBe(true);
    }
  });
});
