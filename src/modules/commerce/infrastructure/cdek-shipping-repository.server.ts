import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/config/server-env";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CheckoutContactInput, OrderShipmentStatus } from "@/modules/commerce/domain/types";
import { mapCdekStatusToShipmentStatus, publicDeliveryAddress } from "@/modules/commerce/domain/shipping";
import {
  calculateCdekTariff,
  createCdekOrder,
  CdekConfigurationError,
  CdekRateError,
  CdekShipmentCreationError,
  CdekUnavailableError,
  getCdekOrderInfo,
  getCdekPickupPointByCode,
  type CdekTariffQuote,
} from "@/modules/commerce/infrastructure/cdek-client.server";

type Client = SupabaseClient<Database>;

export type OrderShipmentRow = {
  id: string;
  order_id: string;
  provider: "cdek";
  delivery_method: "cdek_pickup" | "cdek_courier";
  customer_delivery_charge_minor: number;
  carrier_actual_cost_minor: number | null;
  carrier_currency: "RUB";
  carrier_name: "CDEK";
  pickup_point_code: string | null;
  pickup_point_name: string | null;
  pickup_point_address: string | null;
  pickup_point_city: string | null;
  pickup_point_postal_code: string | null;
  pickup_point_latitude: number | null;
  pickup_point_longitude: number | null;
  delivery_address: Record<string, unknown>;
  recipient_name: string;
  recipient_phone: string;
  cdek_order_uuid: string | null;
  cdek_order_number: string | null;
  tracking_number: string | null;
  shipment_status: OrderShipmentStatus;
  carrier_status_code: string | null;
  carrier_status_name: string | null;
  carrier_status_updated_at: string | null;
  last_sync_at: string | null;
  create_attempts: number;
  last_error_code: string | null;
  last_error_at: string | null;
  safe_admin_note: string | null;
  raw_carrier_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ShipmentOrderSnapshot = {
  id: string;
  order_number: string;
  source: "buy_now" | "cart";
  status: string;
  payment_status: string;
  currency: "RUB";
  product_subtotal_minor: number;
  delivery_amount_minor: number;
  total_amount_minor: number;
  delivery_method: "cdek_pickup" | "cdek_courier";
  delivery_tariff_code: string | null;
  delivery_quote_snapshot: Record<string, unknown>;
  contact_name: string;
  contact_phone: string;
  delivery_city: string;
  delivery_postal_code: string | null;
  delivery_street: string | null;
  delivery_house: string | null;
  delivery_unit: string | null;
  cdek_pickup_point_code: string | null;
  cdek_pickup_point_name: string | null;
  cdek_pickup_point_address: string | null;
  cdek_pickup_point_city: string | null;
  cdek_pickup_point_postal_code: string | null;
  cdek_pickup_point_latitude: number | null;
  cdek_pickup_point_longitude: number | null;
  cdek_destination_city_code: number | null;
};

type ShipmentItemSnapshot = {
  display_name_snapshot: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
};

function packagePolicy(quantity: number) {
  const env = getServerEnv();
  const configured = env.cdek.packagePolicy;

  if (!configured.isConfigured) {
    return null;
  }

  return {
    weight: (configured.weightGrams ?? 0) * Math.max(1, quantity),
    length: configured.lengthCm ?? 0,
    width: configured.widthCm ?? 0,
    height: configured.heightCm ?? 0,
  };
}

function tariffCodeForMethod(method: "cdek_pickup" | "cdek_courier" | undefined): number | null {
  const env = getServerEnv();
  if (method === "cdek_pickup") {
    return env.cdek.pickupTariffCode;
  }
  return env.cdek.courierTariffCode;
}

export async function validateCdekPickupPointSelection(
  contact: CheckoutContactInput,
): Promise<CheckoutContactInput> {
  if (contact.deliveryMethod !== "cdek_pickup") {
    return contact;
  }

  const pointCode = contact.cdekPickupPointCode?.trim();
  if (!pointCode) {
    throw new Error("pickup_point_required");
  }

  const point = await getCdekPickupPointByCode(pointCode);
  if (!point) {
    throw new Error("pickup_point_unavailable");
  }

  return {
    ...contact,
    cdekCityCode: point.location?.city_code ?? contact.cdekCityCode,
    cdekPickupPointCode: point.code,
    cdekPickupPointName: point.name ?? contact.cdekPickupPointName ?? point.code,
    cdekPickupPointAddress: point.location?.address_full ?? point.location?.address ?? contact.cdekPickupPointAddress ?? "",
    cdekPickupPointCity: point.location?.city ?? contact.cdekPickupPointCity ?? contact.city,
    cdekPickupPointPostalCode: point.postal_code ?? contact.cdekPickupPointPostalCode ?? contact.postalCode,
    cdekPickupPointLatitude: point.location?.latitude ?? contact.cdekPickupPointLatitude,
    cdekPickupPointLongitude: point.location?.longitude ?? contact.cdekPickupPointLongitude,
    cdekPickupPointWorkTime: point.work_time ?? contact.cdekPickupPointWorkTime,
    cdekPickupPointNote: point.address_comment ?? contact.cdekPickupPointNote,
    cdekPickupPointProviderSnapshot: {
      source: "server_validation",
      code: point.code,
      name: point.name ?? null,
      postal_code: point.postal_code ?? null,
      work_time: point.work_time ?? null,
      address_comment: point.address_comment ?? null,
      location: point.location ?? null,
    },
  };
}

export async function getCarrierQuoteForCheckout(input: {
  contact: CheckoutContactInput;
  quantity: number;
}): Promise<CdekTariffQuote | null> {
  const env = getServerEnv();
  const destinationCityCode = input.contact.cdekCityCode;
  const tariffCode = tariffCodeForMethod(input.contact.deliveryMethod);
  const originCityCode = env.cdek.fromLocationCode;
  const pack = packagePolicy(input.quantity);

  if (!env.cdek.isConfigured || !originCityCode || !destinationCityCode || !tariffCode || !pack) {
    return null;
  }

  try {
    return await calculateCdekTariff({
      tariffCode,
      fromLocationCode: originCityCode,
      toLocationCode: destinationCityCode,
      weightGram: pack.weight,
      lengthCm: pack.length,
      widthCm: pack.width,
      heightCm: pack.height,
    });
  } catch (error) {
    if (error instanceof CdekRateError || error instanceof CdekUnavailableError) {
      return null;
    }
    throw error;
  }
}

export async function createPendingShipmentSnapshot(input: {
  client: Client;
  orderId: string;
  contact: CheckoutContactInput;
  customerDeliveryChargeMinor: number;
  carrierQuote: CdekTariffQuote | null;
}) {
  const deliveryAddress = publicDeliveryAddress(input.contact) as Json;
  const rawCarrierMetadata = {
    ...(input.carrierQuote ? { quote: input.carrierQuote } : {}),
    ...(input.contact.deliveryMethod === "cdek_pickup" && input.contact.cdekPickupPointProviderSnapshot
      ? { pickupPointProviderSnapshot: input.contact.cdekPickupPointProviderSnapshot }
      : {}),
  } as Json;

  const { error } = await input.client.from("order_shipments").insert({
    order_id: input.orderId,
    provider: "cdek",
    delivery_method: input.contact.deliveryMethod ?? "cdek_courier",
    customer_delivery_charge_minor: input.customerDeliveryChargeMinor,
    carrier_actual_cost_minor:
      typeof input.carrierQuote?.delivery_sum === "number"
        ? Math.round(input.carrierQuote.delivery_sum * 100)
        : typeof input.carrierQuote?.total_sum === "number"
          ? Math.round(input.carrierQuote.total_sum * 100)
          : null,
    carrier_currency: "RUB",
    carrier_name: "CDEK",
    pickup_point_code: input.contact.deliveryMethod === "cdek_pickup" ? input.contact.cdekPickupPointCode || null : null,
    pickup_point_name: input.contact.deliveryMethod === "cdek_pickup" ? input.contact.cdekPickupPointName || null : null,
    pickup_point_address: input.contact.deliveryMethod === "cdek_pickup" ? input.contact.cdekPickupPointAddress || null : null,
    pickup_point_city: input.contact.deliveryMethod === "cdek_pickup" ? input.contact.cdekPickupPointCity || input.contact.city : null,
    pickup_point_postal_code: input.contact.deliveryMethod === "cdek_pickup" ? input.contact.cdekPickupPointPostalCode || null : null,
    pickup_point_latitude: input.contact.deliveryMethod === "cdek_pickup" ? input.contact.cdekPickupPointLatitude ?? null : null,
    pickup_point_longitude: input.contact.deliveryMethod === "cdek_pickup" ? input.contact.cdekPickupPointLongitude ?? null : null,
    delivery_address: deliveryAddress,
    recipient_name: input.contact.recipientName,
    recipient_phone: input.contact.phone,
    shipment_status: "pending_creation",
    raw_carrier_metadata: rawCarrierMetadata,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

function classifyShipmentError(error: unknown) {
  if (error instanceof CdekConfigurationError) {
    return { code: "cdek_not_configured", status: "creation_pending_retry" as OrderShipmentStatus };
  }
  if (error instanceof CdekShipmentCreationError) {
    return { code: "cdek_shipment_failed", status: "creation_failed" as OrderShipmentStatus };
  }
  if (error instanceof CdekUnavailableError) {
    return { code: "cdek_unavailable", status: "creation_pending_retry" as OrderShipmentStatus };
  }
  return { code: "shipment_error", status: "creation_failed" as OrderShipmentStatus };
}

async function insertOrderEvent(
  client: Client,
  input: {
    orderId: string;
    eventType: string;
    message: string;
    nextStatus?: string;
    customerVisible?: boolean;
    actorUserId?: string;
  },
) {
  const { error } = await client.from("order_events").insert({
    order_id: input.orderId,
    event_type: input.eventType,
    message: input.message,
    next_status: input.nextStatus ?? null,
    customer_visible: input.customerVisible ?? true,
    actor_user_id: input.actorUserId ?? null,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

async function loadShipmentOrder(client: Client, orderNumberOrId: { orderNumber?: string; orderId?: string }) {
  let query = client.from("orders").select("*, order_items(*)").limit(1);
  if (orderNumberOrId.orderId) {
    query = query.eq("id", orderNumberOrId.orderId);
  } else {
    query = query.eq("order_number", orderNumberOrId.orderNumber ?? "");
  }

  const { data } = await query;
  const row = data?.[0] as (ShipmentOrderSnapshot & { order_items?: ShipmentItemSnapshot[] }) | undefined;
  return row ?? null;
}

function buildCdekOrderPayload(order: ShipmentOrderSnapshot, items: ShipmentItemSnapshot[]) {
  const env = getServerEnv();
  const destinationCode = order.cdek_destination_city_code;
  const tariffCode = tariffCodeForMethod(order.delivery_method);
  const pack = packagePolicy(items.reduce((sum, item) => sum + item.quantity, 0));

  if (!env.cdek.fromLocationCode || !destinationCode || !tariffCode || !pack) {
    throw new CdekConfigurationError(
      "CDEK origin, destination, tariff and package policy must be configured before shipment creation.",
    );
  }

  const destination =
    order.delivery_method === "cdek_pickup" && order.cdek_pickup_point_code
      ? { delivery_point: order.cdek_pickup_point_code, to_location: { code: destinationCode } }
      : {
          to_location: {
            code: destinationCode,
            address: `${order.delivery_street ?? ""}, ${order.delivery_house ?? ""}`.trim(),
            postal_code: order.delivery_postal_code ?? undefined,
          },
        };

  return {
    type: 1,
    number: order.order_number,
    tariff_code: tariffCode,
    from_location: { code: env.cdek.fromLocationCode },
    ...destination,
    recipient: {
      name: order.contact_name,
      phones: [{ number: order.contact_phone }],
    },
    packages: [
      {
        number: crypto.createHash("sha256").update(order.id).digest("hex").slice(0, 16),
        weight: pack.weight,
        length: pack.length,
        width: pack.width,
        height: pack.height,
        items: items.map((item, index) => ({
          name: item.display_name_snapshot,
          ware_key: `${order.order_number}-${index + 1}`,
          payment: { value: 0 },
          cost: Math.round(item.line_total_minor / 100),
          weight: Math.max(1, Math.round(pack.weight / Math.max(1, items.length))),
          amount: item.quantity,
        })),
      },
    ],
  };
}

export async function ensureCdekShipmentForPaidOrder(input: {
  orderId?: string;
  orderNumber?: string;
  actorUserId?: string;
  client?: Client | null;
}): Promise<OrderShipmentRow | null> {
  const client = input.client ?? createSupabaseAdminClient();
  if (!client) {
    throw new Error("admin_secret_missing");
  }

  const order = await loadShipmentOrder(client, { orderId: input.orderId, orderNumber: input.orderNumber });
  if (!order) {
    throw new Error("order_not_found");
  }

  const { data: existingShipment } = await client
    .from("order_shipments")
    .select("*")
    .eq("order_id", order.id)
    .maybeSingle();

  if (existingShipment?.cdek_order_uuid || existingShipment?.tracking_number) {
    return existingShipment as OrderShipmentRow;
  }

  if (order.payment_status !== "succeeded") {
    return (existingShipment as OrderShipmentRow | null) ?? null;
  }

  if (!existingShipment) {
    await createPendingShipmentSnapshot({
      client,
      orderId: order.id,
      contact: {
        recipientName: order.contact_name,
        phone: order.contact_phone,
        email: "",
        deliveryMethod: order.delivery_method,
        cdekCityCode: order.cdek_destination_city_code ?? undefined,
        cdekPickupPointCode: order.cdek_pickup_point_code ?? undefined,
        cdekPickupPointName: order.cdek_pickup_point_name ?? undefined,
        cdekPickupPointAddress: order.cdek_pickup_point_address ?? undefined,
        cdekPickupPointCity: order.cdek_pickup_point_city ?? undefined,
        cdekPickupPointPostalCode: order.cdek_pickup_point_postal_code ?? undefined,
        cdekPickupPointLatitude: order.cdek_pickup_point_latitude ?? undefined,
        cdekPickupPointLongitude: order.cdek_pickup_point_longitude ?? undefined,
        city: order.delivery_city,
        postalCode: order.delivery_postal_code ?? "",
        street: order.delivery_street ?? "",
        house: order.delivery_house ?? "",
        unit: order.delivery_unit ?? "",
        legalOfferAccepted: true,
        personalDataConsentAccepted: true,
        marketingConsentAccepted: false,
      },
      customerDeliveryChargeMinor: order.delivery_amount_minor,
      carrierQuote: null,
    });
  }

  const { data: claimedShipment, error: claimError } = await client
    .from("order_shipments")
    .update({
      create_attempts: ((existingShipment as { create_attempts?: number } | null)?.create_attempts ?? 0) + 1,
      shipment_status: "creation_in_progress",
      last_error_code: null,
      last_error_at: null,
      safe_admin_note: "Создание отправления запрошено.",
    })
    .eq("order_id", order.id)
    .is("cdek_order_uuid", null)
    .in("shipment_status", ["pending_creation", "creation_pending_retry", "creation_failed"])
    .select("*")
    .single();

  if (claimError || !claimedShipment) {
    const { data: latest } = await client.from("order_shipments").select("*").eq("order_id", order.id).maybeSingle();
    return (latest as OrderShipmentRow | null) ?? null;
  }

  try {
    const payload = buildCdekOrderPayload(order, order.order_items ?? []);
    const response = await createCdekOrder(payload);
    const cdekUuid = response.entity?.uuid ?? response.requests?.[0]?.request_uuid ?? null;
    const cdekNumber = response.entity?.cdek_number ?? response.entity?.number ?? null;
    const statusFromRequest = response.requests?.[0]?.state;

    const { data: updated, error } = await client
      .from("order_shipments")
      .update({
        cdek_order_uuid: cdekUuid,
        cdek_order_number: cdekNumber,
        tracking_number: cdekNumber,
        shipment_status: statusFromRequest === "INVALID" ? "creation_failed" : "created",
        carrier_status_code: statusFromRequest ?? null,
        carrier_status_name: statusFromRequest ?? null,
        carrier_status_updated_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        raw_carrier_metadata: { createResponse: response } as Json,
        safe_admin_note: cdekUuid ? "Отправление создано." : "Запрос на создание отправления принят СДЭК.",
      })
      .eq("id", claimedShipment.id)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(error?.message ?? "shipment_update_failed");
    }

    await insertOrderEvent(client, {
      orderId: order.id,
      eventType: "shipment_created",
      nextStatus: "processing",
      message: "Оплата получена. Заказ готовится к отправке.",
      customerVisible: true,
      actorUserId: input.actorUserId,
    });

    await client.from("orders").update({ status: "processing" }).eq("id", order.id).in("status", ["paid", "processing"]);
    return updated as OrderShipmentRow;
  } catch (error) {
    const classified = classifyShipmentError(error);
    const { data: updated } = await client
      .from("order_shipments")
      .update({
        shipment_status: classified.status,
        last_error_code: classified.code,
        last_error_at: new Date().toISOString(),
        safe_admin_note: "Не удалось создать отправление. Можно повторить из админки.",
      })
      .eq("id", claimedShipment.id)
      .select("*")
      .single();

    await insertOrderEvent(client, {
      orderId: order.id,
      eventType: "shipment_creation_deferred",
      nextStatus: "paid",
      message: "Оплата получена. Заказ готовится к отправке.",
      customerVisible: true,
      actorUserId: input.actorUserId,
    });

    return (updated as OrderShipmentRow | null) ?? null;
  }
}

export async function refreshCdekShipmentStatus(input: {
  orderNumber?: string;
  shipmentId?: string;
  cdekOrderUuid?: string;
  actorUserId?: string;
  client?: Client | null;
}): Promise<OrderShipmentRow | null> {
  const client = input.client ?? createSupabaseAdminClient();
  if (!client) {
    throw new Error("admin_secret_missing");
  }

  let query = client.from("order_shipments").select("*, orders(order_number)").limit(1);
  if (input.shipmentId) {
    query = query.eq("id", input.shipmentId);
  } else if (input.cdekOrderUuid) {
    query = query.eq("cdek_order_uuid", input.cdekOrderUuid);
  } else {
    const order = await loadShipmentOrder(client, { orderNumber: input.orderNumber });
    if (!order) {
      throw new Error("order_not_found");
    }
    query = query.eq("order_id", order.id);
  }

  const { data } = await query;
  const shipment = data?.[0] as OrderShipmentRow | undefined;
  if (!shipment?.cdek_order_uuid) {
    return shipment ?? null;
  }

  const info = await getCdekOrderInfo(shipment.cdek_order_uuid);
  const lastStatus = info.entity?.statuses?.[0];
  const mapped = mapCdekStatusToShipmentStatus({ code: lastStatus?.code, name: lastStatus?.name });

  const { data: updated, error } = await client
    .from("order_shipments")
    .update({
      shipment_status: mapped.status,
      carrier_status_code: lastStatus?.code ?? shipment.carrier_status_code,
      carrier_status_name: lastStatus?.name ?? shipment.carrier_status_name,
      carrier_status_updated_at: lastStatus?.date_time ?? new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      raw_carrier_metadata: { statusResponse: info } as Json,
    })
    .eq("id", shipment.id)
    .select("*")
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? "shipment_status_update_failed");
  }

  await insertOrderEvent(client, {
    orderId: shipment.order_id,
    eventType: "shipment_status_updated",
    nextStatus: mapped.status,
    message: mapped.customerMessage,
    customerVisible: true,
    actorUserId: input.actorUserId,
  });

  return updated as OrderShipmentRow;
}
