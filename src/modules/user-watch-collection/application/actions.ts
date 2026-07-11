"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/modules/auth/authorization";
import { safeReturnPath } from "@/modules/auth/return-path";
import {
  CollectionServiceError,
  createCatalogLinkedUserWatch,
  createManualUserWatch,
  deleteUserWatch,
  updateUserWatchOwnership,
} from "@/modules/user-watch-collection/application/collection-service";
import { rublesToMinorUnits } from "@/modules/user-watch-collection/domain/validation";
import {
  createUserWatchCollectionRepository,
  uploadUserWatchPhoto,
} from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function withState(path: string, key: string, value: string): string {
  const url = new URL(path, "http://local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

async function authenticatedContext(returnTo: string) {
  const access = await requireAuthenticatedUser();
  if (!access.allowed) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(withState(returnTo, "collection", "unavailable"));
  }

  return {
    user: access.user,
    supabase,
    repository: createUserWatchCollectionRepository(supabase),
  };
}

export async function createCatalogUserWatchAction(formData: FormData) {
  const returnTo = safeReturnPath(String(formData.get("returnTo") ?? ""), "/watches");
  const context = await authenticatedContext(returnTo);

  try {
    const userWatchId = await createCatalogLinkedUserWatch(context.repository, context.user.id, {
      watchReferenceId: String(formData.get("watchReferenceId") ?? ""),
      displayName: String(formData.get("displayName") ?? "") || undefined,
      allowDuplicate: formData.get("allowDuplicate") === "true",
    });
    revalidatePath("/collection");
    redirect(`/collection/${userWatchId}?created=1`);
  } catch (error) {
    if (error instanceof CollectionServiceError && error.code === "duplicate_confirmation_required") {
      redirect(withState(returnTo, "collection", "duplicate"));
    }
    if (
      error instanceof CollectionServiceError &&
      (error.code === "invalid_watch_reference" || error.code === "validation_error")
    ) {
      redirect(withState(returnTo, "collection", "invalid_reference"));
    }
    throw error;
  }
}

export async function createManualUserWatchAction(formData: FormData) {
  const context = await authenticatedContext("/collection/new");

  let userWatchId: string;
  try {
    userWatchId = await createManualUserWatch(context.repository, context.user.id, {
      displayName: String(formData.get("displayName") ?? ""),
      brandName: String(formData.get("brandName") ?? "") || undefined,
      modelName: String(formData.get("modelName") ?? "") || undefined,
      reference: String(formData.get("reference") ?? "") || undefined,
      note: String(formData.get("note") ?? "") || undefined,
    });
  } catch (error) {
    if (error instanceof CollectionServiceError && error.code === "validation_error") {
      redirect("/collection/new?error=validation");
    }
    throw error;
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      await uploadUserWatchPhoto({
        supabase: context.supabase,
        userId: context.user.id,
        userWatchId,
        file: photo,
      });
    } catch (error) {
      if (error instanceof CollectionServiceError) {
        revalidatePath("/collection");
        redirect(`/collection/${userWatchId}?created=1&photo=error`);
      }
      throw error;
    }
  }

  revalidatePath("/collection");
  redirect(`/collection/${userWatchId}?created=1`);
}

export async function updateUserWatchAction(formData: FormData) {
  const userWatchId = String(formData.get("userWatchId") ?? "");
  const returnTo = `/collection/${userWatchId}`;
  const context = await authenticatedContext(returnTo);
  const acquisitionPriceMinor = rublesToMinorUnits(String(formData.get("acquisitionPrice") ?? ""));

  try {
    await updateUserWatchOwnership(context.repository, context.user.id, userWatchId, {
      displayName: String(formData.get("displayName") ?? ""),
      acquiredAt: String(formData.get("acquiredAt") ?? "") || undefined,
      acquisitionPriceMinor,
      acquisitionCurrencyCode:
        acquisitionPriceMinor === undefined ? undefined : String(formData.get("acquisitionCurrencyCode") ?? "RUB"),
      acquisitionSource: String(formData.get("acquisitionSource") ?? "") || undefined,
      ownershipStatus:
        formData.get("ownershipStatus") === "previously_owned" ? "previously_owned" : "owned",
      personalNote: String(formData.get("personalNote") ?? "") || undefined,
    });
  } catch (error) {
    if (error instanceof CollectionServiceError) {
      redirect(`${returnTo}?update=error`);
    }
    throw error;
  }

  revalidatePath("/collection");
  revalidatePath(returnTo);
  redirect(`${returnTo}?updated=1`);
}

export async function deleteUserWatchAction(formData: FormData) {
  const userWatchId = String(formData.get("userWatchId") ?? "");
  const context = await authenticatedContext(`/collection/${userWatchId}`);

  await deleteUserWatch(context.repository, context.user.id, userWatchId);
  revalidatePath("/collection");
  redirect("/collection?deleted=1");
}
