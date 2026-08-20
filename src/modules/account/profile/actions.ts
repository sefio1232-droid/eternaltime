"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/modules/auth/authorization";
import {
  normalizeAccountProfileFormData,
  updateAccountProfile,
} from "@/modules/account/profile/profile-repository.server";

export async function updateAccountProfileAction(formData: FormData) {
  const access = await requireAuthenticatedUser();

  if (!access.allowed) {
    redirect("/login?returnTo=/account/profile");
  }

  const profile = normalizeAccountProfileFormData(formData, access.user.email);
  const result = await updateAccountProfile({ user: access.user, profile });

  revalidatePath("/account");
  revalidatePath("/account/profile");

  if (!result.ok) {
    const reason = Object.keys(result.errors)[0] ?? "profile";
    redirect(`/account/profile?profile=error&reason=${encodeURIComponent(reason)}`);
  }

  redirect("/account/profile?profile=updated");
}
