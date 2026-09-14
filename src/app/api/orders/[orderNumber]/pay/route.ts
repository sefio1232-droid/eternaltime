import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guestOrderAccessCookieName } from "@/modules/commerce/application/guest-order-access.server";
import { getAuthenticatedSupabaseUser, createPaymentForExistingOrder } from "@/modules/commerce/infrastructure/commerce-repository.server";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAuthenticatedSupabaseUser();
  if (auth.status === "unconfigured") {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const { orderNumber } = await context.params;
  const cookieStore = await cookies();
  const guestAccessCookie = cookieStore.get(guestOrderAccessCookieName)?.value ?? null;
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  if (!userId && !guestAccessCookie) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const result = await createPaymentForExistingOrder({
      orderNumber,
      userId,
      guestAccessCookie,
    });

    return NextResponse.json({
      orderNumber: result.order.order_number,
      confirmationUrl: result.confirmationUrl,
      paymentAttemptId: result.paymentAttempt.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "payment_retry_failed", message: error instanceof Error ? error.message : "payment_retry_failed" },
      { status: 409 },
    );
  }
}
