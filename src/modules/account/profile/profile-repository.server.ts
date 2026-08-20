import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/modules/auth/server";
import {
  emptyLocalAccountProfile,
  normalizeLocalAccountProfile,
  validateLocalAccountProfile,
  type LocalAccountProfile,
  type LocalAccountProfileErrors,
} from "@/modules/account/profile/local-account-profile";

type ProfileRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  city: string | null;
  preferred_contact: "email" | "phone" | null;
};

export type AccountProfileLoadResult =
  | { status: "unconfigured"; profile: LocalAccountProfile; errors: null }
  | { status: "ready"; profile: LocalAccountProfile; errors: null }
  | { status: "error"; profile: LocalAccountProfile; errors: LocalAccountProfileErrors };

function profileFromRow(row: ProfileRow | null, user: AuthenticatedUser): LocalAccountProfile {
  return {
    name: row?.display_name ?? "",
    email: user.email ?? "",
    phone: row?.phone ?? "",
    city: row?.city ?? "",
    preferredContact: row?.preferred_contact ?? "",
  };
}

export function normalizeAccountProfileFormData(formData: FormData, email: string | undefined): LocalAccountProfile {
  return normalizeLocalAccountProfile({
    name: String(formData.get("name") ?? ""),
    email: email ?? "",
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    preferredContact: String(formData.get("preferredContact") ?? ""),
  }) ?? { ...emptyLocalAccountProfile, email: email ?? "" };
}

export function validateAccountProfileUpdate(profile: LocalAccountProfile): LocalAccountProfileErrors {
  return validateLocalAccountProfile(profile);
}

export async function loadAccountProfile(
  user: AuthenticatedUser,
  client?: SupabaseClient | null,
): Promise<AccountProfileLoadResult> {
  const supabase = client ?? (await createSupabaseServerClient());

  if (!supabase) {
    return { status: "unconfigured", profile: { ...emptyLocalAccountProfile, email: user.email ?? "" }, errors: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone, city, preferred_contact")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      profile: { ...emptyLocalAccountProfile, email: user.email ?? "" },
      errors: { name: "Не удалось загрузить профиль. Попробуйте позже." },
    };
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id })
      .select("id, display_name, phone, city, preferred_contact")
      .single();

    if (insertError) {
      return {
        status: "error",
        profile: { ...emptyLocalAccountProfile, email: user.email ?? "" },
        errors: { name: "Не удалось подготовить профиль. Попробуйте позже." },
      };
    }

    return { status: "ready", profile: profileFromRow(inserted as ProfileRow, user), errors: null };
  }

  return { status: "ready", profile: profileFromRow(data as ProfileRow, user), errors: null };
}

export async function updateAccountProfile(input: {
  user: AuthenticatedUser;
  profile: LocalAccountProfile;
  client?: SupabaseClient | null;
}): Promise<{ ok: true } | { ok: false; errors: LocalAccountProfileErrors }> {
  const errors = validateAccountProfileUpdate(input.profile);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const supabase = input.client ?? (await createSupabaseServerClient());

  if (!supabase) {
    return { ok: false, errors: { name: "Профиль временно недоступен. Попробуйте позже." } };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: input.user.id,
      display_name: input.profile.name || null,
      phone: input.profile.phone || null,
      city: input.profile.city || null,
      preferred_contact: input.profile.preferredContact || null,
    })
    .eq("id", input.user.id);

  if (error) {
    return { ok: false, errors: { name: "Не удалось сохранить профиль. Проверьте данные и попробуйте ещё раз." } };
  }

  return { ok: true };
}
