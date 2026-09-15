import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guestOrderAccessCookieName } from "@/modules/commerce/application/guest-order-access.server";
import {
  claimGuestOrderForUser,
  getAuthenticatedSupabaseUser,
} from "@/modules/commerce/infrastructure/commerce-repository.server";
import { validateAnalyticsEvent } from "@/modules/analytics/domain/events";
import { recordAnalyticsEvent } from "@/modules/analytics/infrastructure/analytics-repository.server";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAuthenticatedSupabaseUser();
  if (auth.status === "unconfigured") {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const cookieStore = await cookies();
  const guestAccessCookie = cookieStore.get(guestOrderAccessCookieName)?.value ?? null;

  try {
    const result = await claimGuestOrderForUser({
      orderNumber,
      userId: auth.user.id,
      guestAccessCookie,
    });
    const analyticsSessionId = request.headers.get("x-et-analytics-session");
    if (analyticsSessionId) {
      try {
        const event = validateAnalyticsEvent({
          eventName: "order_claimed",
          sessionId: analyticsSessionId,
          pathname: `/checkout/return?order=${encodeURIComponent(result.order.order_number)}`,
          properties: { order_number: result.order.order_number },
        });
        await recordAnalyticsEvent({ event, userId: auth.user.id });
      } catch {
        // Claim security and UX must not depend on analytics storage.
      }
    }

    return NextResponse.json({
      orderNumber: result.order.order_number,
      alreadyClaimed: result.alreadyClaimed,
      ownership: result.ownership,
    });
  } catch (error) {
    console.error("guest_order_claim_failed", {
      orderNumber,
      message: error instanceof Error ? error.message : "order_claim_denied",
    });
    return NextResponse.json(
      {
        error: "order_claim_denied",
        message: "Не удалось сохранить заказ в аккаунте. Откройте страницу заказа из того же браузера и попробуйте ещё раз.",
      },
      { status: 403 },
    );
  }
}
