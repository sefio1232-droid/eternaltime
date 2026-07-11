import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CollectionServiceError, type UserWatchCollectionRepository } from "@/modules/user-watch-collection/application/collection-service";
import type {
  UserWatchDetail,
} from "@/modules/user-watch-collection/domain/types";
import { userWatchPhotoSchema } from "@/modules/user-watch-collection/domain/validation";

const privateMediaBucket = "user-watch-collection-media-private";

type UserWatchRow = {
  id: string;
  watch_reference_id: string | null;
  source_kind: "catalog" | "manual";
  display_name: string;
  custom_brand_name: string | null;
  custom_model_name: string | null;
  custom_reference: string | null;
  ownership_status: "owned" | "previously_owned";
  acquired_at: string | null;
  acquisition_price_minor: number | string | null;
  acquisition_currency_code: string | null;
  acquisition_source: string | null;
  personal_note: string | null;
  created_at: string;
};

type WatchReferenceRow = {
  id: string;
  brand_id: string;
  watch_model_id: string;
  display_name: string;
  reference_code_display: string;
  slug: string;
};

type BrandRow = { id: string; name: string; slug: string };
type WatchModelRow = { id: string; name: string };
type WatchImageRow = {
  watch_reference_id: string;
  storage_bucket: string;
  storage_path: string;
};
type UserWatchFileRow = {
  user_watch_id: string;
  storage_bucket: string;
  storage_path: string;
};

function repositoryError(message: string): CollectionServiceError {
  if (message.includes("duplicate_catalog_watch_confirmation_required")) {
    return new CollectionServiceError("duplicate_confirmation_required", "Duplicate confirmation is required.");
  }

  if (message.includes("invalid_watch_reference")) {
    return new CollectionServiceError("invalid_watch_reference", "Watch Reference is unavailable.");
  }

  return new CollectionServiceError("repository_error", "User Watch Collection operation failed.");
}

function minorAmount(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function hydrateRows(
  supabase: SupabaseClient,
  rows: UserWatchRow[],
): Promise<UserWatchDetail[]> {
  const watchReferenceIds = Array.from(
    new Set(rows.map((row) => row.watch_reference_id).filter((value): value is string => Boolean(value))),
  );
  const userWatchIds = rows.map((row) => row.id);

  const [referencesResult, filesResult, imagesResult] = await Promise.all([
    watchReferenceIds.length > 0
      ? supabase
          .from("watch_references")
          .select("id, brand_id, watch_model_id, display_name, reference_code_display, slug")
          .in("id", watchReferenceIds)
      : Promise.resolve({ data: [], error: null }),
    userWatchIds.length > 0
      ? supabase
          .from("user_watch_files")
          .select("user_watch_id, storage_bucket, storage_path")
          .in("user_watch_id", userWatchIds)
          .eq("file_kind", "photo")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    watchReferenceIds.length > 0
      ? supabase
          .from("watch_images")
          .select("watch_reference_id, storage_bucket, storage_path")
          .in("watch_reference_id", watchReferenceIds)
          .eq("status", "published")
          .eq("is_primary", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (referencesResult.error || filesResult.error || imagesResult.error) {
    throw new CollectionServiceError("repository_error", "Could not load User Watch relations.");
  }

  const references = (referencesResult.data ?? []) as unknown as WatchReferenceRow[];
  const referenceMap = new Map(references.map((row) => [row.id, row]));
  const brandIds = Array.from(new Set(references.map((row) => row.brand_id)));
  const modelIds = Array.from(new Set(references.map((row) => row.watch_model_id)));

  const [brandsResult, modelsResult] = await Promise.all([
    brandIds.length > 0
      ? supabase.from("brands").select("id, name, slug").in("id", brandIds)
      : Promise.resolve({ data: [], error: null }),
    modelIds.length > 0
      ? supabase.from("watch_models").select("id, name").in("id", modelIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (brandsResult.error || modelsResult.error) {
    throw new CollectionServiceError("repository_error", "Could not load catalog identity for User Watches.");
  }

  const brandMap = new Map(
    ((brandsResult.data ?? []) as unknown as BrandRow[]).map((row) => [row.id, row]),
  );
  const modelMap = new Map(
    ((modelsResult.data ?? []) as unknown as WatchModelRow[]).map((row) => [row.id, row]),
  );
  const catalogImageMap = new Map(
    ((imagesResult.data ?? []) as unknown as WatchImageRow[]).map((row) => [row.watch_reference_id, row]),
  );
  const userPhotoMap = new Map<string, UserWatchFileRow>();

  for (const file of (filesResult.data ?? []) as unknown as UserWatchFileRow[]) {
    if (!userPhotoMap.has(file.user_watch_id)) {
      userPhotoMap.set(file.user_watch_id, file);
    }
  }

  const signedPhotoEntries = await Promise.all(
    Array.from(userPhotoMap.entries()).map(async ([userWatchId, file]) => {
      const { data } = await supabase.storage.from(file.storage_bucket).createSignedUrl(file.storage_path, 15 * 60);
      return [userWatchId, data?.signedUrl ?? null] as const;
    }),
  );
  const signedPhotoMap = new Map(signedPhotoEntries);

  return rows.map((row) => {
    const reference = row.watch_reference_id ? referenceMap.get(row.watch_reference_id) : undefined;
    const brand = reference ? brandMap.get(reference.brand_id) : undefined;
    const model = reference ? modelMap.get(reference.watch_model_id) : undefined;
    const catalogImage = row.watch_reference_id ? catalogImageMap.get(row.watch_reference_id) : undefined;
    const catalogImageUrl = catalogImage
      ? supabase.storage.from(catalogImage.storage_bucket).getPublicUrl(catalogImage.storage_path).data.publicUrl
      : null;

    return {
      id: row.id,
      displayName: row.display_name,
      sourceKind: row.source_kind,
      ownershipStatus: row.ownership_status,
      brandName: brand?.name ?? row.custom_brand_name,
      modelName: model?.name ?? row.custom_model_name,
      referenceDisplay: reference?.reference_code_display ?? row.custom_reference,
      watchReferenceHref: reference && brand ? `/watches/${brand.slug}/${reference.slug}` : null,
      acquiredAt: row.acquired_at,
      acquisitionSource: row.acquisition_source,
      primaryImageUrl: signedPhotoMap.get(row.id) ?? catalogImageUrl,
      watchReferenceId: row.watch_reference_id,
      customBrandName: row.custom_brand_name,
      customModelName: row.custom_model_name,
      customReference: row.custom_reference,
      acquisitionPriceMinor: minorAmount(row.acquisition_price_minor),
      acquisitionCurrencyCode: row.acquisition_currency_code,
      personalNote: row.personal_note,
      createdAt: row.created_at,
    };
  });
}

export function createUserWatchCollectionRepository(supabase: SupabaseClient): UserWatchCollectionRepository {
  return {
    async list(userId) {
      const { data, error } = await supabase
        .from("user_watches")
        .select(
          "id, watch_reference_id, source_kind, display_name, custom_brand_name, custom_model_name, custom_reference, ownership_status, acquired_at, acquisition_price_minor, acquisition_currency_code, acquisition_source, personal_note, created_at",
        )
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        throw repositoryError(error.message);
      }

      return hydrateRows(supabase, (data ?? []) as unknown as UserWatchRow[]);
    },

    async findById(userId, userWatchId) {
      const { data, error } = await supabase
        .from("user_watches")
        .select(
          "id, watch_reference_id, source_kind, display_name, custom_brand_name, custom_model_name, custom_reference, ownership_status, acquired_at, acquisition_price_minor, acquisition_currency_code, acquisition_source, personal_note, created_at",
        )
        .eq("id", userWatchId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        throw repositoryError(error.message);
      }

      if (!data) {
        return null;
      }

      return (await hydrateRows(supabase, [data as unknown as UserWatchRow]))[0] ?? null;
    },

    async createCatalogLinked(_userId, input) {
      const { data, error } = await supabase.rpc("create_catalog_user_watch", {
        input_watch_reference_id: input.watchReferenceId,
        input_display_name: input.displayName ?? null,
        input_allow_duplicate: input.allowDuplicate,
      });

      if (error || typeof data !== "string") {
        throw repositoryError(error?.message ?? "Catalog-linked User Watch RPC returned no ID.");
      }

      return data;
    },

    async createManual(_userId, input) {
      const { data, error } = await supabase.rpc("create_manual_user_watch", {
        input_display_name: input.displayName,
        input_brand_name: input.brandName ?? null,
        input_model_name: input.modelName ?? null,
        input_reference: input.reference ?? null,
        input_note: input.note ?? null,
      });

      if (error || typeof data !== "string") {
        throw repositoryError(error?.message ?? "Manual User Watch RPC returned no ID.");
      }

      return data;
    },

    async updateOwnership(userId, userWatchId, input) {
      const { data, error } = await supabase
        .from("user_watches")
        .update({
          display_name: input.displayName,
          acquired_at: input.acquiredAt ?? null,
          acquisition_price_minor: input.acquisitionPriceMinor ?? null,
          acquisition_currency_code: input.acquisitionCurrencyCode ?? null,
          acquisition_source: input.acquisitionSource ?? null,
          ownership_status: input.ownershipStatus,
          personal_note: input.personalNote ?? null,
        })
        .eq("id", userWatchId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("id");

      if (error) {
        throw repositoryError(error.message);
      }

      return (data?.length ?? 0) === 1;
    },

    async softDelete(userId, userWatchId) {
      const { data, error } = await supabase
        .from("user_watches")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", userWatchId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("id");

      if (error) {
        throw repositoryError(error.message);
      }

      return (data?.length ?? 0) === 1;
    },

    async countActiveByReference(userId, watchReferenceId) {
      const { count, error } = await supabase
        .from("user_watches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("watch_reference_id", watchReferenceId)
        .is("deleted_at", null);

      if (error) {
        throw repositoryError(error.message);
      }

      return count ?? 0;
    },
  };
}

export async function uploadUserWatchPhoto(input: {
  supabase: SupabaseClient;
  userId: string;
  userWatchId: string;
  file: File;
}): Promise<void> {
  const parsed = userWatchPhotoSchema.safeParse({
    type: input.file.type,
    size: input.file.size,
    name: input.file.name,
  });
  if (!parsed.success) {
    throw new CollectionServiceError("validation_error", "Photo must be JPEG, PNG, or WebP up to 8 MB.");
  }

  const extension = parsed.data.type === "image/png" ? "png" : parsed.data.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${input.userId}/${input.userWatchId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await input.supabase.storage
    .from(privateMediaBucket)
    .upload(storagePath, input.file, { contentType: parsed.data.type, upsert: false });

  if (uploadError) {
    throw new CollectionServiceError("storage_error", "Could not upload User Watch photo.");
  }

  const { error: rowError } = await input.supabase.from("user_watch_files").insert({
    user_watch_id: input.userWatchId,
    owner_user_id: input.userId,
    file_kind: "photo",
    storage_bucket: privateMediaBucket,
    storage_path: storagePath,
    mime_type: parsed.data.type,
    size_bytes: parsed.data.size,
    original_filename: parsed.data.name,
  });

  if (rowError) {
    await input.supabase.storage.from(privateMediaBucket).remove([storagePath]);
    throw new CollectionServiceError("storage_error", "Could not save User Watch photo metadata.");
  }
}
