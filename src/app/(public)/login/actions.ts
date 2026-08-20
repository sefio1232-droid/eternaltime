"use server";

import { redirect } from "next/navigation";
import { safeReturnPath } from "@/modules/auth/return-path";
import { buildAuthCallbackUrl } from "@/modules/auth/site-url.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestMagicLinkAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const personalDataConsentAccepted = formData.get("personalDataConsentAccepted") === "on";
  const returnTo = safeReturnPath(
    String(formData.get("next") || formData.get("returnTo") || ""),
    "/collection",
  );

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirect(`/login?error=invalid_email&returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (!personalDataConsentAccepted) {
    redirect(`/login?error=personal_data_consent_required&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(`/login?error=unconfigured&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const callbackUrl = await buildAuthCallbackUrl(returnTo);
  if (!callbackUrl) {
    redirect(`/login?error=unconfigured&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    redirect(`/login?error=send_failed&returnTo=${encodeURIComponent(returnTo)}`);
  }

  redirect(`/login?sent=1&returnTo=${encodeURIComponent(returnTo)}`);
}
