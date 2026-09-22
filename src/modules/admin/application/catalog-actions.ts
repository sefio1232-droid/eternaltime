"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  bulkUpdateAdminCatalogPublication,
  updateAdminCatalogImage,
  updateAdminCatalogReference,
} from "@/modules/admin/infrastructure/admin-repository.server";
import { invalidateCatalogReadDatasetCache } from "@/modules/catalog/infrastructure/catalog-read-repository.server";

function revalidatePublicCatalogReadModel() {
  invalidateCatalogReadDatasetCache();
}

export async function updateAdminCatalogReferenceAction(formData: FormData) {
  const result = await updateAdminCatalogReference(formData);
  revalidatePublicCatalogReadModel();
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${result.id}`);
  revalidatePath("/watches");
  redirect(`/admin/catalog/${result.id}?saved=1`);
}

export async function updateAdminCatalogImageAction(formData: FormData) {
  const result = await updateAdminCatalogImage(formData);
  revalidatePublicCatalogReadModel();
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${result.watchReferenceId}`);
  redirect(`/admin/catalog/${result.watchReferenceId}?imagesSaved=1#images`);
}

export async function bulkUpdateAdminCatalogPublicationAction(formData: FormData) {
  await bulkUpdateAdminCatalogPublication(formData);
  revalidatePublicCatalogReadModel();
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
  revalidatePath("/watches");
}
