import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/modules/auth/return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = safeReturnPath(request.nextUrl.searchParams.get("returnTo"), "/collection");
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL(`/login?error=callback_failed&returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=callback_failed&returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  return NextResponse.redirect(new URL(returnTo, request.url));
}
