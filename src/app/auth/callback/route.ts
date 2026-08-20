import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/modules/auth/return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAuthRedirectUrl } from "@/modules/auth/site-url.server";

async function redirectToAuthPath(path: string) {
  const redirectUrl = await buildAuthRedirectUrl(path);
  if (!redirectUrl) {
    return NextResponse.json({ error: "Auth origin is not configured." }, { status: 500 });
  }

  return NextResponse.redirect(redirectUrl);
}

function callbackFailurePath(returnTo: string): string {
  return `/login?error=callback_failed&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = safeReturnPath(request.nextUrl.searchParams.get("returnTo"), "/collection");
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) {
    return redirectToAuthPath(callbackFailurePath(returnTo));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectToAuthPath(callbackFailurePath(returnTo));
  }

  return redirectToAuthPath(returnTo);
}
