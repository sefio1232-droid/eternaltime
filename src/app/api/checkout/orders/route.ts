import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createCheckoutOrderSchema } from "@/modules/commerce/application/checkout-validation";
import {
  createGuestOrderAccessCookieValue,
  guestOrderAccessCookieName,
} from "@/modules/commerce/application/guest-order-access.server";
import {
  createCheckoutOrderAndPayment,
  getAuthenticatedSupabaseUser,
} from "@/modules/commerce/infrastructure/commerce-repository.server";
import { validateAnalyticsEvent } from "@/modules/analytics/domain/events";
import { recordAnalyticsEvent } from "@/modules/analytics/infrastructure/analytics-repository.server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseUser();
  if (auth.status === "unconfigured") {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  const parsed = createCheckoutOrderSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_checkout",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  try {
    const userId = auth.status === "authenticated" ? auth.user.id : null;
    const result = await createCheckoutOrderAndPayment({
      userId,
      source: parsed.data.source,
      contact: parsed.data.contact,
      checkoutSubmissionKey: parsed.data.checkoutSubmissionKey,
    });
    const analyticsSessionId = request.headers.get("x-et-analytics-session");
    if (analyticsSessionId) {
      try {
        const event = validateAnalyticsEvent({
          eventName: "order_created",
          sessionId: analyticsSessionId,
          pathname: "/checkout",
          properties: {
            order_number: result.order.order_number,
            source: parsed.data.source.type,
            item_count: result.summary.itemCount,
            total_minor: result.order.total_amount_minor,
          },
        });
        await recordAnalyticsEvent({ event, userId });
      } catch {
        // Order creation is server truth; analytics must never interrupt payment handoff.
      }
    }

    const response = NextResponse.json({
      orderNumber: result.order.order_number,
      confirmationUrl: result.confirmationUrl,
      paymentAttemptId: result.paymentAttempt?.id ?? null,
    });
    if (!userId) {
      const cookieStore = await cookies();
      const cookieValue = createGuestOrderAccessCookieValue(
        result.order.order_number,
        cookieStore.get(guestOrderAccessCookieName)?.value,
      );
      if (cookieValue) {
        response.cookies.set(guestOrderAccessCookieName, cookieValue, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
      }
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    const setupErrors = new Set(["supabase_unconfigured", "admin_secret_missing", "yookassa_unconfigured", "delivery_unconfigured"]);
    if (!setupErrors.has(message)) {
      console.error("checkout_order_failed", { message });
    }
    return NextResponse.json(
      {
        error: setupErrors.has(message) ? message : "checkout_failed",
        message: setupErrors.has(message)
          ? "Оформление заказа временно недоступно. Попробуйте позже."
          : "Не удалось оформить заказ. Проверьте состав корзины, доставку и попробуйте ещё раз.",
      },
      { status: setupErrors.has(message) ? 503 : 409 },
    );
  }
}
