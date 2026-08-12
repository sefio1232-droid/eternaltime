import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/modules/auth/authorization";
import { createAdminRefund } from "@/modules/commerce/infrastructure/commerce-repository.server";

const refundSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  reason: z.string().trim().max(500).optional(),
});

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requireAdminAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthenticated" ? 401 : 403 });
  }

  const parsed = refundSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_refund" }, { status: 400 });
  }

  const { orderNumber } = await context.params;

  try {
    const refund = await createAdminRefund({
      orderNumber,
      actorUserId: access.user.id,
      amountMinor: parsed.data.amountMinor,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ ok: true, refundId: refund.id, status: refund.status });
  } catch (error) {
    return NextResponse.json(
      { error: "refund_failed", message: error instanceof Error ? error.message : "refund_failed" },
      { status: 409 },
    );
  }
}
