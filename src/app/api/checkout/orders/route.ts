import { NextResponse } from "next/server";
import { createCheckoutOrderSchema } from "@/modules/commerce/application/checkout-validation";
import {
  createCheckoutOrderAndPayment,
  getAuthenticatedSupabaseUser,
} from "@/modules/commerce/infrastructure/commerce-repository.server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseUser();
  if (auth.status === "unconfigured") {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }
  if (auth.status === "unauthenticated") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
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
    const result = await createCheckoutOrderAndPayment({
      userId: auth.user.id,
      source: parsed.data.source,
      contact: parsed.data.contact,
      checkoutSubmissionKey: parsed.data.checkoutSubmissionKey,
    });

    return NextResponse.json({
      orderNumber: result.order.order_number,
      confirmationUrl: result.confirmationUrl,
      paymentAttemptId: result.paymentAttempt?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    const setupErrors = new Set(["supabase_unconfigured", "service_role_missing", "yookassa_unconfigured", "delivery_unconfigured"]);
    return NextResponse.json(
      {
        error: setupErrors.has(message) ? message : "checkout_failed",
        message,
      },
      { status: setupErrors.has(message) ? 503 : 409 },
    );
  }
}
