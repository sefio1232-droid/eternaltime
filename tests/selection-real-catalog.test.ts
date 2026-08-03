import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSelectionRecommendations } from "@/modules/selection/application/selection-service";
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

const scenarios: Record<"A" | "B" | "C" | "D" | "E", SelectionAnswers> = {
  A: { scenario: "everyday", character: "universal", budget: "under_15000", movement: "quartz", fit: "unknown", attachment: "any", practical: "none" },
  B: { scenario: "work", character: "classic", budget: "range_30000_50000", movement: "quartz", fit: "medium", attachment: "bracelet", practical: "none" },
  C: { scenario: "travel", character: "instrumental", budget: "range_15000_30000", movement: "ana_digi", fit: "unknown", attachment: "rubber", practical: "none" },
  D: { scenario: "special", character: "expressive", budget: "over_100000", movement: "mechanical", fit: "unknown", attachment: "any", practical: "none" },
  E: { scenario: "universal", character: "universal", budget: "any", movement: "any", fit: "unknown", attachment: "any", practical: "none" },
};

function statusFor(result: ReturnType<typeof buildSelectionRecommendations>[number], key: string) {
  return result.criteria.find((criterion) => criterion.key === key)?.status;
}

describe("selection real catalog scenarios", () => {
  it("keeps every result canonical and deterministic", () => {
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
      expect(first[0]?.isPreliminary).toBe(false);
    }
  });

  it("A keeps everyday quartz models at or below 15 000 rubles", () => {
    const [featured] = buildSelectionRecommendations({ dataset, answers: scenarios.A });

    expect(featured?.watch.referenceDisplay).toBe("GBD-200SM-1A5DR");
    expect(featured?.watch.publicPrice?.amountMinor).toBeLessThanOrEqual(1_500_000);
    expect(statusFor(featured, "movement")).toBe("match");
    expect(featured?.imageCandidates.length).toBeGreaterThan(0);
  });

  it("B prioritizes confirmed quartz bracelet models in the selected range", () => {
    const [featured] = buildSelectionRecommendations({ dataset, answers: scenarios.B });

    expect(statusFor(featured, "movement")).toBe("match");
    expect(statusFor(featured, "attachment")).toBe("match");
    expect(featured?.watch.publicPrice?.amountMinor).toBeGreaterThan(3_000_000);
    expect(featured?.watch.publicPrice?.amountMinor).toBeLessThanOrEqual(5_000_000);
  });

  it("C keeps ana-digi and rubber as confirmed requirements", () => {
    const [featured] = buildSelectionRecommendations({ dataset, answers: scenarios.C });

    expect(featured?.watch.referenceDisplay).toBe("GA-700SK-1ADR");
    expect(statusFor(featured, "movement")).toBe("match");
    expect(statusFor(featured, "attachment")).toBe("match");
  });

  it("D uses strictly over 100 000 mechanical models and honest roles", () => {
    const results = buildSelectionRecommendations({ dataset, answers: scenarios.D });
    const featured = results[0];

    expect(statusFor(featured, "movement")).toBe("match");
    expect(results.every((item) => (item.watch.publicPrice?.amountMinor ?? 0) > 10_000_000)).toBe(true);
    expect(results.every((item) => item.movementKey === "mechanical" || item.movementKey === "automatic")).toBe(true);
    expect(results.slice(1).every((item) => item.roleLabel === "Альтернатива той же марки")).toBe(true);
    expect(results.every((item) => !item.roleDescription.includes("другого бренда"))).toBe(true);
  });

  it("E labels same-brand and different-brand alternatives factually", () => {
    const results = buildSelectionRecommendations({ dataset, answers: scenarios.E });
    const featured = results[0];

    for (const alternative of results.slice(1)) {
      if (alternative.watch.brandSlug === featured?.watch.brandSlug) {
        expect(alternative.roleLabel).toBe("Альтернатива той же марки");
        expect(alternative.roleDescription).toContain(alternative.watch.brandName);
      } else {
        expect(alternative.roleLabel).toBe("Другой бренд");
        expect(alternative.roleDescription).toContain(alternative.watch.brandName);
      }
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
