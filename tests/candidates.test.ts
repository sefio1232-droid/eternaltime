import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CandidateServiceError,
  listCandidates,
  removeCandidate,
  saveCandidate,
  updateCandidateStatus,
  type CandidateRepository,
} from "@/modules/candidates/application/candidate-service";
import { candidateStatuses, type CandidateSummary } from "@/modules/candidates/domain/types";
import { getPublicCommerceState } from "@/modules/commerce/domain/public-commerce-state";

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

const candidate: CandidateSummary = {
  id: "candidate-1",
  watchReferenceId: "11111111-1111-4111-8111-111111111111",
  status: "saved",
  note: null,
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
  watch: {
    href: "/watches/casio/demo",
    brandName: "Casio",
    brandSlug: "casio",
    displayName: "Casio Demo",
    referenceDisplay: "DEMO",
    referenceNormalized: "DEMO",
    referenceSlug: "demo",
    image: { kind: "none", alt: "Demo" },
    publicPrice: null,
    publicCommerceState: getPublicCommerceState({ publicPrice: null }),
  },
};

function memoryRepository(): CandidateRepository {
  const rows = new Map<string, CandidateSummary>();
  return {
    async list() {
      return [...rows.values()];
    },
    async findByReference(_userId, watchReferenceId) {
      return rows.get(watchReferenceId) ?? null;
    },
    async upsert(_userId, input) {
      const next = {
        ...candidate,
        watchReferenceId: input.watchReferenceId,
        status: input.status,
        note: input.note ?? null,
      };
      rows.set(input.watchReferenceId, next);
      return next;
    },
    async remove(_userId, watchReferenceId) {
      return rows.delete(watchReferenceId);
    },
    async resolveByOwnedReference(_userId, watchReferenceId, userWatchId) {
      const existing = rows.get(watchReferenceId);
      if (existing) rows.delete(watchReferenceId);
      expect(userWatchId).toBeTruthy();
    },
  };
}

describe("P3 candidates", () => {
  it("defines only the canonical candidate lifecycle", () => {
    expect(candidateStatuses).toEqual(["saved", "considering", "finalist"]);
    const source = read("src/modules/candidates/domain/types.ts");
    expect(source).not.toMatch(/wishlist|favorite|like|shortlist|bookmark/i);
  });

  it("saves, updates and removes a candidate through the service boundary", async () => {
    const repository = memoryRepository();
    const watchReferenceId = "11111111-1111-4111-8111-111111111111";

    await expect(saveCandidate(repository, "user-1", { watchReferenceId })).resolves.toMatchObject({
      watchReferenceId,
      status: "saved",
    });
    await expect(updateCandidateStatus(repository, "user-1", { watchReferenceId, status: "finalist" })).resolves.toMatchObject({
      watchReferenceId,
      status: "finalist",
    });

    expect(await listCandidates(repository, "user-1")).toHaveLength(1);
    await expect(removeCandidate(repository, "user-1", watchReferenceId)).resolves.toBeUndefined();
    expect(await listCandidates(repository, "user-1")).toHaveLength(0);
  });

  it("rejects invalid references before repository writes", async () => {
    await expect(saveCandidate(memoryRepository(), "user-1", { watchReferenceId: "not-a-uuid" })).rejects.toMatchObject({
      code: "validation_error",
    } satisfies Partial<CandidateServiceError>);
  });

  it("never accepts user_id from browser-facing candidate API", () => {
    const route = read("src/app/api/candidates/route.ts");

    expect(route).toContain("getCurrentUser");
    expect(route).not.toContain("user_id");
    expect(route).not.toContain("userId: payload");
    expect(route).toContain("authentication_required");
  });

  it("surfaces candidates on detail, selection, compare and the dedicated page", () => {
    expect(read("src/components/catalog/catalog-watch-detail-page.tsx")).toContain("CandidateWatchAction");
    expect(read("src/components/selection/selection-page.tsx")).toContain("CandidateButton");
    expect(read("src/components/comparison/compare-workspace.tsx")).toContain("CandidateStatusControls");
    expect(read("src/app/(public)/candidates/page.tsx")).toContain("После доставки купленные часы переходят в коллекцию");
  });

  it("keeps guest checkout separate from candidate login flow", () => {
    const button = read("src/components/candidates/candidate-action.tsx");
    const commerceActions = read("src/components/commerce/commerce-actions.tsx");

    expect(button).toContain("/login?returnTo=");
    expect(commerceActions).toContain('source: "buy_now"');
    expect(commerceActions).not.toContain("/login?returnTo=");
  });
});
