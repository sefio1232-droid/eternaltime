import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/modules/auth/authorization";
import { ensureCdekShipmentForPaidOrder } from "@/modules/commerce/infrastructure/cdek-shipping-repository.server";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireAdminAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: access.reason === "unauthenticated" ? 401 : 403 });
  }

  const { orderNumber } = await context.params;

  try {
    const shipment = await ensureCdekShipmentForPaidOrder({
      orderNumber,
      actorUserId: access.user.id,
    });

    return NextResponse.json({
      ok: true,
      shipmentStatus: shipment?.shipment_status ?? null,
      trackingNumber: shipment?.tracking_number ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "shipment_create_failed", message: "Не удалось создать отправление. Проверьте заказ и настройки доставки." },
      { status: error instanceof Error && error.message === "order_not_found" ? 404 : 409 },
    );
  }
}
