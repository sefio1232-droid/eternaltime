import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser, createPaymentForExistingOrder } from "@/modules/commerce/infrastructure/commerce-repository.server";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAuthenticatedSupabaseUser();
  if (auth.status === "unconfigured") {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }
  if (auth.status === "unauthenticated") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { orderNumber } = await context.params;

  try {
    const result = await createPaymentForExistingOrder({
      orderNumber,
      userId: auth.user.id,
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
