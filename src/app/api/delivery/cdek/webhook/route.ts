import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/config/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapCdekStatusToShipmentStatus } from "@/modules/commerce/domain/shipping";

const cdekWebhookSchema = z
  .object({
    uuid: z.string().optional(),
    order_uuid: z.string().optional(),
    cdek_number: z.string().optional(),
    status: z
      .object({
        code: z.string().optional(),
        name: z.string().optional(),
        date_time: z.string().optional(),
      })
      .optional(),
    entity: z
      .object({
        uuid: z.string().optional(),
        cdek_number: z.string().optional(),
        statuses: z.array(z.object({ code: z.string().optional(), name: z.string().optional(), date_time: z.string().optional() })).optional(),
      })
      .optional(),
  })
  .passthrough();

function validateWebhookToken(request: Request): boolean {
  const expected = getServerEnv().cdek.webhookToken;
  if (!expected) {
    return false;
  }

  const headerToken = request.headers.get("x-cdek-webhook-token") ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  return headerToken === expected || bearer === expected;
}

export async function POST(request: Request) {
  if (!validateWebhookToken(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = cdekWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
  }

  const payload = parsed.data;
  const cdekUuid = payload.entity?.uuid ?? payload.order_uuid ?? payload.uuid ?? null;
  const cdekNumber = payload.entity?.cdek_number ?? payload.cdek_number ?? null;
  const latestStatus = payload.status ?? payload.entity?.statuses?.[0] ?? null;
  const mapped = mapCdekStatusToShipmentStatus({ code: latestStatus?.code, name: latestStatus?.name });
  const client = createSupabaseAdminClient();

  if (!client) {
    return NextResponse.json({ error: "admin_secret_missing" }, { status: 503 });
  }

  let query = client.from("order_shipments").select("id, order_id").limit(1);
  if (cdekUuid) {
    query = query.eq("cdek_order_uuid", cdekUuid);
  } else if (cdekNumber) {
    query = query.eq("cdek_order_number", cdekNumber);
  } else {
    return NextResponse.json({ error: "missing_shipment_identity" }, { status: 400 });
  }

  const { data: shipments } = await query;
  const shipment = shipments?.[0];
  if (!shipment) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await client
    .from("order_shipments")
    .update({
      shipment_status: mapped.status,
      carrier_status_code: latestStatus?.code ?? null,
      carrier_status_name: latestStatus?.name ?? null,
      carrier_status_updated_at: latestStatus?.date_time ?? new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", shipment.id);

  await client.from("order_events").insert({
    order_id: shipment.order_id,
    event_type: "shipment_status_updated",
    next_status: mapped.status,
    message: mapped.customerMessage,
    customer_visible: true,
  });

  return NextResponse.json({ ok: true });
}
