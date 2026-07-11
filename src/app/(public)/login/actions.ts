"use server";

import { redirect } from "next/navigation";
import { getPublicEnv } from "@/config/public-env";
import { safeReturnPath } from "@/modules/auth/return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestMagicLinkAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const returnTo = safeReturnPath(String(formData.get("returnTo") ?? ""), "/collection");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirect(`/login?error=invalid_email&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(`/login?error=unconfigured&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const env = getPublicEnv();
  const callbackUrl = new URL("/auth/callback", env.appUrl);
  callbackUrl.searchParams.set("returnTo", returnTo);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    redirect(`/login?error=send_failed&returnTo=${encodeURIComponent(returnTo)}`);
  }

  redirect(`/login?sent=1&returnTo=${encodeURIComponent(returnTo)}`);
}
