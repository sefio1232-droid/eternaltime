import type {
  CreateCatalogUserWatchInput,
  CreateManualUserWatchInput,
  UpdateOwnershipInput,
  UserWatchDetail,
  UserWatchSummary,
} from "@/modules/user-watch-collection/domain/types";
import {
  createCatalogUserWatchSchema,
  createManualUserWatchSchema,
  updateOwnershipSchema,
  userWatchIdSchema,
} from "@/modules/user-watch-collection/domain/validation";

export type CollectionErrorCode =
  | "validation_error"
  | "invalid_watch_reference"
  | "duplicate_confirmation_required"
  | "not_found"
  | "storage_error"
  | "repository_error";

export class CollectionServiceError extends Error {
  readonly code: CollectionErrorCode;

  constructor(code: CollectionErrorCode, message: string) {
    super(message);
    this.name = "CollectionServiceError";
    this.code = code;
  }
}

export interface UserWatchCollectionRepository {
  list(userId: string): Promise<UserWatchSummary[]>;
  findById(userId: string, userWatchId: string): Promise<UserWatchDetail | null>;
  createCatalogLinked(userId: string, input: CreateCatalogUserWatchInput): Promise<string>;
  createManual(userId: string, input: CreateManualUserWatchInput): Promise<string>;
  updateOwnership(userId: string, userWatchId: string, input: UpdateOwnershipInput): Promise<boolean>;
  softDelete(userId: string, userWatchId: string): Promise<boolean>;
  countActiveByReference(userId: string, watchReferenceId: string): Promise<number>;
}

export async function listUserWatches(repository: UserWatchCollectionRepository, userId: string) {
  return repository.list(userId);
}

export async function getUserWatch(
  repository: UserWatchCollectionRepository,
  userId: string,
  userWatchId: string,
) {
  const parsedId = userWatchIdSchema.safeParse(userWatchId);
  if (!parsedId.success) {
    return null;
  }

  return repository.findById(userId, parsedId.data);
}

export async function createCatalogLinkedUserWatch(
  repository: UserWatchCollectionRepository,
  userId: string,
  input: CreateCatalogUserWatchInput,
): Promise<string> {
  const parsed = createCatalogUserWatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new CollectionServiceError("validation_error", "Catalog-linked watch input is invalid.");
  }

  return repository.createCatalogLinked(userId, parsed.data);
}

export async function createManualUserWatch(
  repository: UserWatchCollectionRepository,
  userId: string,
  input: CreateManualUserWatchInput,
): Promise<string> {
  const parsed = createManualUserWatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new CollectionServiceError("validation_error", "Manual watch input is invalid.");
  }

  return repository.createManual(userId, parsed.data);
}

export async function updateUserWatchOwnership(
  repository: UserWatchCollectionRepository,
  userId: string,
  userWatchId: string,
  input: UpdateOwnershipInput,
): Promise<void> {
  const parsedId = userWatchIdSchema.safeParse(userWatchId);
  const parsed = updateOwnershipSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    throw new CollectionServiceError("validation_error", "Ownership details are invalid.");
  }

  const updated = await repository.updateOwnership(userId, parsedId.data, parsed.data);
  if (!updated) {
    throw new CollectionServiceError("not_found", "User Watch was not found.");
  }
}

export async function deleteUserWatch(
  repository: UserWatchCollectionRepository,
  userId: string,
  userWatchId: string,
): Promise<void> {
  const parsedId = userWatchIdSchema.safeParse(userWatchId);
  if (!parsedId.success) {
    throw new CollectionServiceError("validation_error", "User Watch ID is invalid.");
  }

  const deleted = await repository.softDelete(userId, parsedId.data);
  if (!deleted) {
    throw new CollectionServiceError("not_found", "User Watch was not found.");
  }
}
