import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/modules/auth/authorization";
import { advanceAdminOrderStatus } from "@/modules/commerce/infrastructure/commerce-repository.server";

const statusSchema = z.object({
  nextStatus: z.enum(["processing", "supplier_ordered", "in_transit", "local_delivery", "completed"]),
});

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requireAdminAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthenticated" ? 401 : 403 });
  }

  const parsed = statusSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { orderNumber } = await context.params;

  try {
    await advanceAdminOrderStatus({
      orderNumber,
      actorUserId: access.user.id,
      nextStatus: parsed.data.nextStatus,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "transition_failed", message: error instanceof Error ? error.message : "transition_failed" },
      { status: 409 },
    );
  }
}
