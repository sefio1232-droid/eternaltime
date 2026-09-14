import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guestOrderAccessCookieName } from "@/modules/commerce/application/guest-order-access.server";
import {
  claimGuestOrderForUser,
  getAuthenticatedSupabaseUser,
} from "@/modules/commerce/infrastructure/commerce-repository.server";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
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
