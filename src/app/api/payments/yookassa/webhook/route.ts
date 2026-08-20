import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/config/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getOrderDetailByNumber,
  reconcileYooKassaRefund,
  reconcileYooKassaPayment,
} from "@/modules/commerce/infrastructure/commerce-repository.server";

const yookassaWebhookSchema = z.object({
  type: z.string(),
  event: z.string(),
  object: z.object({
    id: z.string(),
    status: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  }),
});

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="YooKassa webhook"' },
  });
}

function validateOptionalBasicAuth(request: Request): boolean {
  const env = getServerEnv();
  if (!env.yookassa.webhookBasicAuthUser && !env.yookassa.webhookBasicAuthPassword) {
    return true;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return false;
  }

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const [user, password] = decoded.split(":");
  return user === env.yookassa.webhookBasicAuthUser && password === env.yookassa.webhookBasicAuthPassword;
}

export async function POST(request: Request) {
  if (!validateOptionalBasicAuth(request)) {
    return unauthorized();
  }

  const raw = await request.json().catch(() => null);
  const parsed = yookassaWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_webhook" }, { status: 400 });
  }

  const event = parsed.data;
  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: "supabase_admin_secret_missing" }, { status: 503 });
  }

  const { data: existingEvent } = await client
    .from("payment_events")
    .select("id, processing_result")
    .eq("provider", "yookassa")
    .eq("provider_object_id", event.object.id)
    .eq("event_type", event.event)
    .maybeSingle();

  if (existingEvent?.processing_result === "processed") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { data: storedEvent } = existingEvent
    ? await client
        .from("payment_events")
        .update({ provider_status: event.object.status ?? null, processing_result: "received" })
        .eq("id", existingEvent.id)
        .select("id")
        .single()
    : await client
        .from("payment_events")
        .insert({
          provider: "yookassa",
          provider_object_id: event.object.id,
          event_type: event.event,
          provider_status: event.object.status ?? null,
        })
        .select("id")
        .single();

  const eventRowId = storedEvent?.id ?? existingEvent?.id;
  if (!eventRowId) {
    return NextResponse.json({ ok: false, error: "payment_event_store_failed" }, { status: 503 });
  }

  try {
    if (event.event.startsWith("payment.")) {
      const result = await reconcileYooKassaPayment(event.object.id);
      await client
        .from("payment_events")
        .update({
          order_id: result.order.id,
          payment_attempt_id: result.paymentAttempt.id,
          provider_status: result.payment.status,
          processed_at: new Date().toISOString(),
          processing_result: "processed",
        })
        .eq("id", eventRowId);
    } else if (event.event.startsWith("refund.")) {
      const result = await reconcileYooKassaRefund(event.object.id);
      const orderNumber = result.providerRefund.metadata?.order_number;
      const order = result.refund.order_id
        ? await getOrderDetailByNumber(orderNumber ?? "", { admin: true }, client)
        : null;
      await client
        .from("payment_events")
        .update({
          order_id: order?.order.id ?? null,
          payment_attempt_id: result.refund.payment_attempt_id,
          refund_id: result.refund.id,
          provider_status: event.object.status ?? null,
          processed_at: new Date().toISOString(),
          processing_result: "processed",
        })
        .eq("id", eventRowId);
    }
  } catch (error) {
    await client
      .from("payment_events")
      .update({
        processed_at: new Date().toISOString(),
        processing_result: error instanceof Error ? `failed: ${error.message.slice(0, 160)}` : "failed",
      })
      .eq("id", eventRowId);

    return NextResponse.json({ ok: false, error: "reconciliation_failed" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
