import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CollectionServiceError,
  createCatalogLinkedUserWatch,
  createManualUserWatch,
  deleteUserWatch,
  getUserWatch,
  listUserWatches,
  updateUserWatchOwnership,
  type UserWatchCollectionRepository,
} from "@/modules/user-watch-collection/application/collection-service";
import type {
  CreateCatalogUserWatchInput,
  CreateManualUserWatchInput,
  UpdateOwnershipInput,
  UserWatchDetail,
} from "@/modules/user-watch-collection/domain/types";
import {
  createManualUserWatchSchema,
  rublesToMinorUnits,
  userWatchPhotoSchema,
} from "@/modules/user-watch-collection/domain/validation";

const userA = "10000000-0000-4000-8000-000000000001";
const userB = "10000000-0000-4000-8000-000000000002";
const referenceId = "20000000-0000-4000-8000-000000000001";

class FakeCollectionRepository implements UserWatchCollectionRepository {
  private sequence = 0;
  private readonly rows = new Map<string, UserWatchDetail & { userId: string; deleted: boolean }>();
  readonly validReferences = new Set([referenceId]);

  async list(userId: string) {
    return Array.from(this.rows.values()).filter((row) => row.userId === userId && !row.deleted);
  }

  async findById(userId: string, userWatchId: string) {
    const row = this.rows.get(userWatchId);
    return row && row.userId === userId && !row.deleted ? row : null;
  }

  async createCatalogLinked(userId: string, input: CreateCatalogUserWatchInput) {
    if (!this.validReferences.has(input.watchReferenceId)) {
      throw new CollectionServiceError("invalid_watch_reference", "Invalid reference.");
    }
    if (!input.allowDuplicate && (await this.countActiveByReference(userId, input.watchReferenceId)) > 0) {
      throw new CollectionServiceError("duplicate_confirmation_required", "Confirm duplicate.");
    }

    return this.insert(userId, {
      displayName: input.displayName ?? "Catalog watch",
      sourceKind: "catalog",
      watchReferenceId: input.watchReferenceId,
      brandName: "Brand",
      modelName: "Model",
      referenceDisplay: "REF-1",
      watchReferenceHref: "/watches/brand/ref1",
      customBrandName: null,
      customModelName: null,
      customReference: null,
      personalNote: null,
    });
  }

  async createManual(userId: string, input: CreateManualUserWatchInput) {
    return this.insert(userId, {
      displayName: input.displayName,
      sourceKind: "manual",
      watchReferenceId: null,
      brandName: input.brandName ?? null,
      modelName: input.modelName ?? null,
      referenceDisplay: input.reference ?? null,
      watchReferenceHref: null,
      customBrandName: input.brandName ?? null,
      customModelName: input.modelName ?? null,
      customReference: input.reference ?? null,
      personalNote: input.note ?? null,
    });
  }

  async updateOwnership(userId: string, userWatchId: string, input: UpdateOwnershipInput) {
    const row = this.rows.get(userWatchId);
    if (!row || row.userId !== userId || row.deleted) {
      return false;
    }
    Object.assign(row, {
      displayName: input.displayName,
      acquiredAt: input.acquiredAt ?? null,
      acquisitionPriceMinor: input.acquisitionPriceMinor ?? null,
      acquisitionCurrencyCode: input.acquisitionCurrencyCode ?? null,
      acquisitionSource: input.acquisitionSource ?? null,
      ownershipStatus: input.ownershipStatus,
      personalNote: input.personalNote ?? null,
    });
    return true;
  }

  async softDelete(userId: string, userWatchId: string) {
    const row = this.rows.get(userWatchId);
    if (!row || row.userId !== userId || row.deleted) {
      return false;
    }
    row.deleted = true;
    return true;
  }

  async countActiveByReference(userId: string, watchReferenceId: string) {
    return Array.from(this.rows.values()).filter(
      (row) => row.userId === userId && row.watchReferenceId === watchReferenceId && !row.deleted,
    ).length;
  }

  private insert(
    userId: string,
    input: Pick<
      UserWatchDetail,
      | "displayName"
      | "sourceKind"
      | "watchReferenceId"
      | "brandName"
      | "modelName"
      | "referenceDisplay"
      | "watchReferenceHref"
      | "customBrandName"
      | "customModelName"
      | "customReference"
      | "personalNote"
    >,
  ) {
    this.sequence += 1;
    const id = `30000000-0000-4000-8000-${String(this.sequence).padStart(12, "0")}`;
    this.rows.set(id, {
      ...input,
      id,
      userId,
      deleted: false,
      ownershipStatus: "owned",
      acquiredAt: null,
      acquisitionSource: null,
      primaryImageUrl: null,
      acquisitionPriceMinor: null,
      acquisitionCurrencyCode: null,
      createdAt: "2026-07-11T00:00:00.000Z",
    });
    return id;
  }
}

describe("User Watch Collection", () => {
  it("creates a catalog-linked User Watch", async () => {
    const repository = new FakeCollectionRepository();
    const id = await createCatalogLinkedUserWatch(repository, userA, {
      watchReferenceId: referenceId,
      allowDuplicate: false,
    });

    const watch = await getUserWatch(repository, userA, id);
    expect(watch?.sourceKind).toBe("catalog");
    expect(watch?.watchReferenceId).toBe(referenceId);
  });

  it("requires explicit confirmation for a duplicate catalog reference", async () => {
    const repository = new FakeCollectionRepository();
    await createCatalogLinkedUserWatch(repository, userA, { watchReferenceId: referenceId, allowDuplicate: false });

    await expect(
      createCatalogLinkedUserWatch(repository, userA, { watchReferenceId: referenceId, allowDuplicate: false }),
    ).rejects.toMatchObject({ code: "duplicate_confirmation_required" });

    await expect(
      createCatalogLinkedUserWatch(repository, userA, { watchReferenceId: referenceId, allowDuplicate: true }),
    ).resolves.toBeTypeOf("string");
  });

  it("rejects an invalid catalog reference", async () => {
    const repository = new FakeCollectionRepository();
    await expect(
      createCatalogLinkedUserWatch(repository, userA, {
        watchReferenceId: "20000000-0000-4000-8000-000000000099",
        allowDuplicate: false,
      }),
    ).rejects.toMatchObject({ code: "invalid_watch_reference" });
  });

  it("creates a manual User Watch without catalog identity", async () => {
    const repository = new FakeCollectionRepository();
    const id = await createManualUserWatch(repository, userA, {
      displayName: "Дедушкины часы",
      brandName: "Неизвестно",
      note: "Семейные часы",
    });

    const watch = await getUserWatch(repository, userA, id);
    expect(watch).toMatchObject({
      displayName: "Дедушкины часы",
      sourceKind: "manual",
      watchReferenceId: null,
    });
  });

  it("updates ownership details", async () => {
    const repository = new FakeCollectionRepository();
    const id = await createManualUserWatch(repository, userA, { displayName: "Watch" });

    await updateUserWatchOwnership(repository, userA, id, {
      displayName: "Travel watch",
      acquiredAt: "2025-05-01",
      acquisitionPriceMinor: 1200000,
      acquisitionCurrencyCode: "RUB",
      acquisitionSource: "Store",
      ownershipStatus: "previously_owned",
      personalNote: "Sold later",
    });

    expect(await getUserWatch(repository, userA, id)).toMatchObject({
      displayName: "Travel watch",
      ownershipStatus: "previously_owned",
      acquisitionPriceMinor: 1200000,
    });
  });

  it("soft-deletes a User Watch", async () => {
    const repository = new FakeCollectionRepository();
    const id = await createManualUserWatch(repository, userA, { displayName: "Watch" });
    await deleteUserWatch(repository, userA, id);

    expect(await getUserWatch(repository, userA, id)).toBeNull();
    expect(await listUserWatches(repository, userA)).toHaveLength(0);
  });

  it("isolates User Watches by owner", async () => {
    const repository = new FakeCollectionRepository();
    const id = await createManualUserWatch(repository, userA, { displayName: "Private watch" });

    expect(await getUserWatch(repository, userB, id)).toBeNull();
    await expect(
      updateUserWatchOwnership(repository, userB, id, {
        displayName: "Changed",
        ownershipStatus: "owned",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteUserWatch(repository, userB, id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("validates minimal manual input, money, and private photo limits", () => {
    expect(createManualUserWatchSchema.safeParse({ displayName: "" }).success).toBe(false);
    expect(createManualUserWatchSchema.safeParse({ displayName: "My watch" }).success).toBe(true);
    expect(rublesToMinorUnits("12 345,67")).toBe(1_234_567);
    expect(Number.isNaN(rublesToMinorUnits("not-money"))).toBe(true);
    expect(userWatchPhotoSchema.safeParse({ type: "image/jpeg", size: 1024, name: "watch.jpg" }).success).toBe(true);
    expect(userWatchPhotoSchema.safeParse({ type: "image/svg+xml", size: 1024, name: "watch.svg" }).success).toBe(false);
  });

  it("keeps mutation ownership server-derived and unauthenticated calls blocked", () => {
    const actions = readFileSync(
      join(process.cwd(), "src/modules/user-watch-collection/application/actions.ts"),
      "utf8",
    );
    const repository = readFileSync(
      join(process.cwd(), "src/modules/user-watch-collection/infrastructure/user-watch-repository.server.ts"),
      "utf8",
    );

    expect(actions).toContain("requireAuthenticatedUser()");
    expect(actions).not.toContain('formData.get("userId")');
    expect(repository).toContain('.eq("user_id", userId)');
    expect(repository).toContain('.eq("user_id", userId)');
  });
});
