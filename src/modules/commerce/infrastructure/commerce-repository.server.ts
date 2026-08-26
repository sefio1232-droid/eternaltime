import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/config/public-env";
import { getServerEnv } from "@/config/server-env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkoutLegalDocuments } from "@/content/legal";
import { mergeCommerceCartItems } from "@/modules/commerce/domain/cart";
import type {
  CheckoutContactInput,
  CheckoutSource,
  CommerceCartItemInput,
  CommerceResolvedSummary,
  OrderPaymentStatus,
  OrderStatus,
  PaymentAttemptStatus,
} from "@/modules/commerce/domain/types";
import { resolveCommerceSummary } from "@/modules/commerce/application/catalog-product-resolver.server";
import {
  createPendingShipmentSnapshot,
  ensureCdekShipmentForPaidOrder,
  getCarrierQuoteForCheckout,
  type OrderShipmentRow,
  validateCdekPickupPointSelection,
} from "@/modules/commerce/infrastructure/cdek-shipping-repository.server";
import {
  createYooKassaRefund,
  createYooKassaPayment,
  getYooKassaRefund,
  getYooKassaPayment,
  yookassaAmountValueToMinor,
  type ReceiptItemInput,
  type YooKassaPayment,
} from "@/modules/commerce/infrastructure/yookassa-client.server";

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  source: "buy_now" | "cart";
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  currency: "RUB";
  product_subtotal_minor: number;
  delivery_amount_minor: number;
  delivery_provider: string;
  delivery_method: string;
  delivery_tariff_code: string | null;
  delivery_quote_snapshot: unknown;
  total_amount_minor: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  delivery_postal_code: string | null;
  delivery_city: string;
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
  delivery_comment: string | null;
  customer_comment: string | null;
  checkout_submission_key: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  brand_slug: string;
  reference_code_normalized: string;
  brand_name_snapshot: string;
  display_name_snapshot: string;
  reference_display_snapshot: string;
  canonical_href_snapshot: string;
  image_snapshot: unknown;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
  created_at: string;
};

type PaymentAttemptRow = {
  id: string;
  order_id: string;
  provider: "yookassa";
  provider_payment_id: string | null;
  status: PaymentAttemptStatus;
  amount_minor: number;
  currency: "RUB";
  confirmation_url: string | null;
  idempotency_key: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  succeeded_at: string | null;
  canceled_at: string | null;
};

type PaymentRefundRow = {
  id: string;
  order_id: string;
  payment_attempt_id: string;
  provider_refund_id: string | null;
  amount_minor: number;
  currency: "RUB";
  status: "pending" | "succeeded" | "canceled" | "failed";
  reason: string | null;
  requested_by: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  succeeded_at: string | null;
  failed_at: string | null;
};

export type CommerceOrderDetail = {
  order: OrderRow;
  items: OrderItemRow[];
  paymentAttempts: PaymentAttemptRow[];
  shipments: OrderShipmentRow[];
  events: Array<{
    id: string;
    event_type: string;
    message: string;
    created_at: string;
    customer_visible: boolean;
  }>;
  refunds: Array<{
    id: string;
    amount_minor: number;
    currency: "RUB";
    status: string;
    provider_refund_id: string | null;
    created_at: string;
    succeeded_at: string | null;
    failed_at?: string | null;
  }>;
};

export type CommerceSetupState =
  | { ready: true; client: SupabaseClient }
  | { ready: false; reason: "supabase_unconfigured" | "admin_secret_missing" | "yookassa_unconfigured" | "delivery_unconfigured" };

function checkoutItems(source: CheckoutSource): CommerceCartItemInput[] {
  return source.type === "buy_now" ? [source.item] : source.items;
}

function buildReceiptItemsFromOrderItems(items: OrderItemRow[]) {
  return items.map((item) => ({
    description: `${item.brand_name_snapshot} ${item.display_name_snapshot} ${item.reference_display_snapshot}`.trim(),
    quantity: item.quantity,
    amountMinor: item.unit_price_minor,
  }));
}

function receiptItemsTotalMinor(items: ReceiptItemInput[]): number {
  return items.reduce((sum, item) => sum + item.amountMinor * item.quantity, 0);
}

function buildReceiptItemsFromOrderSnapshot(order: OrderRow, items: OrderItemRow[]): ReceiptItemInput[] {
  const receiptItems: ReceiptItemInput[] = buildReceiptItemsFromOrderItems(items);

  if (order.delivery_amount_minor > 0) {
    receiptItems.push({
      description: "Доставка заказа Eternal Time",
      quantity: 1,
      amountMinor: order.delivery_amount_minor,
      paymentSubject: "service",
    });
  }

  if (receiptItemsTotalMinor(receiptItems) !== order.total_amount_minor) {
    throw new Error("receipt_total_mismatch");
  }

  return receiptItems;
}

function buildPartialRefundReceiptItems(input: {
  order: OrderRow;
  items: OrderItemRow[];
  amountMinor: number;
}): ReceiptItemInput[] {
  const receiptItems = buildReceiptItemsFromOrderSnapshot(input.order, input.items);
  let remainingMinor = input.amountMinor;
  const refundedItems: ReceiptItemInput[] = [];

  for (const item of receiptItems) {
    if (remainingMinor <= 0) {
      break;
    }

    const lineTotalMinor = item.amountMinor * item.quantity;
    const refundedLineMinor = Math.min(remainingMinor, lineTotalMinor);

    refundedItems.push(
      refundedLineMinor === lineTotalMinor
        ? item
        : {
            ...item,
            quantity: 1,
            amountMinor: refundedLineMinor,
          },
    );
    remainingMinor -= refundedLineMinor;
  }

  if (remainingMinor !== 0 || receiptItemsTotalMinor(refundedItems) !== input.amountMinor) {
    throw new Error("refund_receipt_total_mismatch");
  }

  return refundedItems;
}

export function getCheckoutReturnUrl(orderNumber: string): string {
  const env = getPublicEnv();
  const url = new URL("/checkout/return", env.appUrl);
  url.searchParams.set("order", orderNumber);
  return url.toString();
}

export function getCommerceSetupState(requirePayment = true): CommerceSetupState {
  const serverEnv = getServerEnv();
  const client = createSupabaseAdminClient();

  if (!getPublicEnv().supabase.isConfigured) {
    return { ready: false, reason: "supabase_unconfigured" };
  }

  if (!client) {
    return { ready: false, reason: "admin_secret_missing" };
  }

  if (serverEnv.commerce.deliveryPricingMode === "not_configured") {
    return { ready: false, reason: "delivery_unconfigured" };
  }

  if (requirePayment && !serverEnv.yookassa.isConfigured) {
    return { ready: false, reason: "yookassa_unconfigured" };
  }

  return { ready: true, client };
}

export async function getAuthenticatedSupabaseUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unconfigured" as const, user: null };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { status: "unauthenticated" as const, user: null };
  }

  return { status: "authenticated" as const, user: data.user };
}

export async function mergeServerCartForUser(userId: string, items: CommerceCartItemInput[]) {
  const setup = getCommerceSetupState(false);
  if (!setup.ready) {
    return setup;
  }

  const normalizedItems = mergeCommerceCartItems(items);
  const { data: existingCart } = await setup.client
    .from("commerce_carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const cart =
    existingCart ??
    (
      await setup.client
        .from("commerce_carts")
        .insert({ user_id: userId, status: "active" })
        .select("id")
        .single()
    ).data;

  if (!cart) {
    const { data: racedCart, error: racedCartError } = await setup.client
      .from("commerce_carts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (racedCartError || !racedCart) {
      throw new Error(racedCartError?.message ?? "Failed to create active cart.");
    }

    return mergeServerCartForUser(userId, normalizedItems);
  }

  const { data: freshCart, error: cartError } = await setup.client
    .from("commerce_carts")
    .select("id")
    .eq("id", cart.id)
    .single();

  if (cartError || !freshCart) {
    throw new Error(cartError?.message ?? "Failed to create active cart.");
  }

  for (const item of normalizedItems) {
    const { data: existing } = await setup.client
      .from("commerce_cart_items")
      .select("id, quantity")
      .eq("cart_id", freshCart.id)
      .eq("brand_slug", item.brandSlug)
      .eq("reference_code_normalized", item.referenceNormalized)
      .maybeSingle();

    if (existing) {
      await setup.client
        .from("commerce_cart_items")
        .update({
          quantity: Math.min(5, Number(existing.quantity) + item.quantity),
          source: item.source,
        })
        .eq("id", existing.id);
    } else {
      await setup.client.from("commerce_cart_items").insert({
        cart_id: freshCart.id,
        brand_slug: item.brandSlug,
        reference_code_normalized: item.referenceNormalized,
        quantity: item.quantity,
        source: item.source,
        added_at: item.addedAt,
      });
    }
  }

  const serverItems = await listServerCartItems(userId, setup.client);
  return { ready: true as const, items: serverItems, summary: await resolveCommerceSummary(serverItems) };
}

export async function listServerCartItems(userId: string, client = createSupabaseAdminClient()): Promise<CommerceCartItemInput[]> {
  if (!client) {
    return [];
  }

  const { data: carts } = await client
    .from("commerce_carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  const cartId = carts?.[0]?.id;

  if (!cartId) {
    return [];
  }

  const { data: items } = await client
    .from("commerce_cart_items")
    .select("brand_slug, reference_code_normalized, quantity, source, added_at")
    .eq("cart_id", cartId)
    .order("added_at", { ascending: true });

  return (items ?? []).map((item) => ({
    brandSlug: String(item.brand_slug),
    referenceNormalized: String(item.reference_code_normalized),
    quantity: Number(item.quantity),
    source: item.source as CommerceCartItemInput["source"],
    addedAt: String(item.added_at),
  }));
}

async function insertOrderEvent(
  client: SupabaseClient,
  input: {
    orderId: string;
    eventType: string;
    message: string;
    nextStatus?: string;
    nextPaymentStatus?: string;
    customerVisible?: boolean;
    actorUserId?: string;
  },
) {
  const { error } = await client.from("order_events").insert(
    {
      order_id: input.orderId,
      event_type: input.eventType,
      message: input.message,
      next_status: input.nextStatus ?? null,
      next_payment_status: input.nextPaymentStatus ?? null,
      customer_visible: input.customerVisible ?? true,
      actor_user_id: input.actorUserId ?? null,
    },
  );

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function createCheckoutOrderAndPayment(input: {
  userId: string;
  source: CheckoutSource;
  contact: CheckoutContactInput;
  checkoutSubmissionKey: string;
}): Promise<{
  order: OrderRow;
  summary: CommerceResolvedSummary;
  paymentAttempt: PaymentAttemptRow | null;
  confirmationUrl: string | null;
}> {
  const setup = getCommerceSetupState(false);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const summary = await resolveCommerceSummary(checkoutItems(input.source), {
    deliveryMethod: input.contact.deliveryMethod,
  });
  if (!summary.purchasable || summary.totalAmountMinor === null || summary.delivery.status !== "configured") {
    throw new Error(summary.issues.join(" ") || "Checkout summary is not payable.");
  }

  const normalizedContact =
    input.contact.deliveryMethod === "cdek_pickup"
      ? await validateCdekPickupPointSelection(input.contact)
      : input.contact;
  const carrierQuote = await getCarrierQuoteForCheckout({
    contact: normalizedContact,
    quantity: summary.itemCount,
  });
  const carrierActualCostMinor =
    typeof carrierQuote?.delivery_sum === "number"
      ? Math.round(carrierQuote.delivery_sum * 100)
      : typeof carrierQuote?.total_sum === "number"
        ? Math.round(carrierQuote.total_sum * 100)
        : null;
  const deliveryQuoteSnapshot = {
    ...summary.delivery.snapshot,
    carrierActualCostMinor,
    carrierCurrency: "RUB",
    carrierQuote: carrierQuote
      ? {
          tariffCode: carrierQuote.tariff_code,
          tariffName: carrierQuote.tariff_name ?? null,
          periodMin: carrierQuote.period_min ?? null,
          periodMax: carrierQuote.period_max ?? null,
        }
      : null,
    pickupPointProviderSnapshot:
      normalizedContact.deliveryMethod === "cdek_pickup"
        ? normalizedContact.cdekPickupPointProviderSnapshot ?? null
        : null,
  };

  const orderPayload = {
    user_id: input.userId,
    source: input.source.type,
    status: "awaiting_payment",
    payment_status: "pending",
    currency: "RUB",
    product_subtotal_minor: summary.productSubtotalMinor,
    delivery_amount_minor: summary.delivery.amountMinor,
    delivery_provider: summary.delivery.provider,
    delivery_method: normalizedContact.deliveryMethod ?? "cdek_courier",
    delivery_tariff_code: summary.delivery.tariffCode,
    delivery_quote_snapshot: deliveryQuoteSnapshot,
    total_amount_minor: summary.totalAmountMinor,
    contact_name: normalizedContact.recipientName,
    contact_email: normalizedContact.email,
    contact_phone: normalizedContact.phone,
    delivery_postal_code: normalizedContact.postalCode || null,
    delivery_city: normalizedContact.city,
    delivery_street: normalizedContact.street || null,
    delivery_house: normalizedContact.house || null,
    delivery_unit: normalizedContact.unit || null,
    cdek_pickup_point_code: normalizedContact.cdekPickupPointCode || null,
    cdek_pickup_point_name: normalizedContact.cdekPickupPointName || null,
    cdek_pickup_point_address: normalizedContact.cdekPickupPointAddress || null,
    cdek_pickup_point_city: normalizedContact.cdekPickupPointCity || null,
    cdek_pickup_point_postal_code: normalizedContact.cdekPickupPointPostalCode || null,
    cdek_pickup_point_latitude: normalizedContact.cdekPickupPointLatitude ?? null,
    cdek_pickup_point_longitude: normalizedContact.cdekPickupPointLongitude ?? null,
    cdek_destination_city_code: normalizedContact.cdekCityCode ?? null,
    delivery_comment: normalizedContact.deliveryComment || null,
    customer_comment: normalizedContact.customerComment || null,
    checkout_submission_key: input.checkoutSubmissionKey,
    legal_consent_snapshot: {
      publicOffer: {
        accepted: normalizedContact.legalOfferAccepted,
        title: checkoutLegalDocuments.publicOffer.title,
        route: checkoutLegalDocuments.publicOffer.route,
        sourceFileName: checkoutLegalDocuments.publicOffer.sourceFileName,
      },
      personalDataConsent: {
        accepted: normalizedContact.personalDataConsentAccepted,
        title: checkoutLegalDocuments.personalDataConsent.title,
        route: checkoutLegalDocuments.personalDataConsent.route,
        sourceFileName: checkoutLegalDocuments.personalDataConsent.sourceFileName,
      },
      privacy: {
        acknowledged: normalizedContact.personalDataConsentAccepted,
        title: checkoutLegalDocuments.privacy.title,
        route: checkoutLegalDocuments.privacy.route,
        sourceFileName: checkoutLegalDocuments.privacy.sourceFileName,
      },
      marketingConsent: {
        accepted: Boolean(normalizedContact.marketingConsentAccepted),
        title: checkoutLegalDocuments.marketingConsent.title,
        route: checkoutLegalDocuments.marketingConsent.route,
        sourceFileName: checkoutLegalDocuments.marketingConsent.sourceFileName,
      },
      capturedAt: new Date().toISOString(),
    },
  };

  const { data: order, error: orderError } = await setup.client
    .from("orders")
    .insert(orderPayload)
    .select("*")
    .single();

  if (orderError) {
    const { data: existingOrder, error: existingError } = await setup.client
      .from("orders")
      .select("*")
      .eq("user_id", input.userId)
      .eq("checkout_submission_key", input.checkoutSubmissionKey)
      .single();

    if (existingError || !existingOrder) {
      throw new Error(orderError.message);
    }

    const details = await getOrderDetailByNumber(String(existingOrder.order_number), {
      userId: input.userId,
    });
    return {
      order: existingOrder as OrderRow,
      summary,
      paymentAttempt: details?.paymentAttempts[0] ?? null,
      confirmationUrl: details?.paymentAttempts[0]?.confirmation_url ?? null,
    };
  }

  const orderRow = order as OrderRow;

  const itemPayload = summary.lines.map((line) => {
    if (!line.product || !line.unitPrice || line.lineTotalMinor === null) {
      throw new Error("Order contains an unresolved item.");
    }

    return {
      order_id: orderRow.id,
      brand_slug: line.product.brandSlug,
      reference_code_normalized: line.product.referenceNormalized,
      brand_name_snapshot: line.product.brandName,
      display_name_snapshot: line.product.displayName,
      reference_display_snapshot: line.product.referenceDisplay,
      canonical_href_snapshot: line.product.canonicalHref,
      image_snapshot: line.product.image.kind === "none" ? null : line.product.image,
      quantity: line.quantity,
      unit_price_minor: line.unitPrice.amountMinor,
      line_total_minor: line.lineTotalMinor,
    };
  });

  await setup.client.from("order_items").insert(itemPayload);
  await insertOrderEvent(setup.client, {
    orderId: orderRow.id,
    eventType: "order_created",
    nextStatus: "awaiting_payment",
    nextPaymentStatus: "pending",
    message: "Заказ создан и ожидает оплаты.",
  });
  await createPendingShipmentSnapshot({
    client: setup.client,
    orderId: orderRow.id,
    contact: normalizedContact,
    customerDeliveryChargeMinor: summary.delivery.amountMinor,
    carrierQuote,
  });

  const idempotencyKey = crypto.randomUUID();
  const { data: attempt } = await setup.client
    .from("payment_attempts")
    .insert({
      order_id: orderRow.id,
      provider: "yookassa",
      status: "created",
      amount_minor: orderRow.total_amount_minor,
      currency: "RUB",
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (!attempt) {
    throw new Error("payment_attempt_failed");
  }

  if (!getServerEnv().yookassa.isConfigured) {
    await insertOrderEvent(setup.client, {
      orderId: orderRow.id,
      eventType: "payment_provider_not_configured",
      nextStatus: "awaiting_payment",
      nextPaymentStatus: "pending",
      message: "Заказ создан. Онлайн-оплата будет доступна после подключения платежного провайдера.",
    });

    return {
      order: orderRow,
      summary,
      paymentAttempt: attempt as PaymentAttemptRow,
      confirmationUrl: null,
    };
  }

  try {
    const payment = await createYooKassaPayment({
      amountMinor: orderRow.total_amount_minor,
      orderNumber: orderRow.order_number,
      orderId: orderRow.id,
      paymentAttemptId: String(attempt.id),
      customerEmail: orderRow.contact_email,
      customerPhone: orderRow.contact_phone,
      items: buildReceiptItemsFromOrderSnapshot(orderRow, itemPayload.map((item) => ({
        id: "",
        created_at: "",
        ...item,
      })) as OrderItemRow[]),
      returnUrl: getCheckoutReturnUrl(orderRow.order_number),
      idempotencyKey,
    });

    const paymentAttempt = await updateAttemptFromYooKassaPayment(setup.client, attempt.id, orderRow, payment);
    return {
      order: orderRow,
      summary,
      paymentAttempt,
      confirmationUrl: payment.confirmation?.confirmation_url ?? null,
    };
  } catch (error) {
    await setup.client
      .from("payment_attempts")
      .update({ status: "failed", failure_reason: error instanceof Error ? error.message : "Payment creation failed." })
      .eq("id", attempt.id);
    throw error;
  }
}

export async function updateAttemptFromYooKassaPayment(
  client: SupabaseClient,
  attemptId: string,
  order: Pick<OrderRow, "id" | "total_amount_minor" | "currency" | "payment_status" | "status">,
  payment: YooKassaPayment,
): Promise<PaymentAttemptRow> {
  const amountMinor = yookassaAmountValueToMinor(payment.amount.value);
  if (payment.amount.currency !== order.currency || amountMinor !== order.total_amount_minor) {
    throw new Error("YooKassa payment amount does not match the order.");
  }

  const status = payment.status === "canceled" ? "canceled" : payment.status;
  const updatePayload: Record<string, unknown> = {
    provider_payment_id: payment.id,
    status,
    confirmation_url: payment.confirmation?.confirmation_url ?? null,
    failure_reason: payment.cancellation_details
      ? `${payment.cancellation_details.party ?? "unknown"}:${payment.cancellation_details.reason ?? "canceled"}`
      : null,
  };

  if (payment.status === "succeeded") {
    updatePayload.succeeded_at = new Date().toISOString();
    await markOrderPaid(client, order.id);
  }

  if (payment.status === "canceled") {
    updatePayload.canceled_at = new Date().toISOString();
  }

  const { data, error } = await client.from("payment_attempts").update(updatePayload).eq("id", attemptId).select("*").single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update payment attempt.");
  }

  return data as PaymentAttemptRow;
}

export async function markOrderPaid(client: SupabaseClient, orderId: string) {
  const paidAt = new Date().toISOString();
  await client
    .from("orders")
    .update({
      payment_status: "succeeded",
      status: "paid",
      paid_at: paidAt,
    })
    .eq("id", orderId)
    .in("status", ["awaiting_payment", "paid"]);

  await insertOrderEvent(client, {
    orderId,
    eventType: "payment_succeeded",
    nextStatus: "paid",
    nextPaymentStatus: "succeeded",
    message: "Оплата подтверждена YooKassa, заказ передан в обработку.",
  });

  await ensureCdekShipmentForPaidOrder({ orderId, client: client as SupabaseClient });
}

export async function reconcileYooKassaPayment(providerPaymentId: string) {
  const setup = getCommerceSetupState(true);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const payment = await getYooKassaPayment(providerPaymentId);
  const metadataAttemptId = payment.metadata?.payment_attempt_id;

  let attemptQuery = setup.client.from("payment_attempts").select("*, orders(*)").eq("provider_payment_id", providerPaymentId);
  if (!metadataAttemptId) {
    attemptQuery = attemptQuery.limit(1);
  }

  let { data: attempts } = await attemptQuery;
  if ((!attempts || attempts.length === 0) && metadataAttemptId) {
    const retry = await setup.client.from("payment_attempts").select("*, orders(*)").eq("id", metadataAttemptId).limit(1);
    attempts = retry.data;
  }

  const attempt = attempts?.[0];
  if (!attempt) {
    throw new Error("Payment attempt not found.");
  }

  const order = attempt.orders as OrderRow;
  const updatedAttempt = await updateAttemptFromYooKassaPayment(setup.client, String(attempt.id), order, payment);
  return { order, payment, paymentAttempt: updatedAttempt };
}

export async function getOrderDetailByNumber(
  orderNumber: string,
  access: { userId?: string; admin?: boolean },
  client = createSupabaseAdminClient(),
): Promise<CommerceOrderDetail | null> {
  if (!client) {
    return null;
  }

  let query = client.from("orders").select("*").eq("order_number", orderNumber).limit(1);
  if (!access.admin) {
    query = query.eq("user_id", access.userId ?? "");
  }
  const { data: orders } = await query;
  const order = orders?.[0] as OrderRow | undefined;

  if (!order) {
    return null;
  }

  const [{ data: items }, { data: attempts }, { data: shipments }, { data: events }, { data: refunds }] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
    client.from("payment_attempts").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
    client.from("order_shipments").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
    client.from("order_events").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
    client.from("payment_refunds").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
  ]);

  return {
    order,
    items: (items ?? []) as OrderItemRow[],
    paymentAttempts: (attempts ?? []) as PaymentAttemptRow[],
    shipments: (shipments ?? []) as OrderShipmentRow[],
    events: (events ?? []) as CommerceOrderDetail["events"],
    refunds: (refunds ?? []) as CommerceOrderDetail["refunds"],
  };
}

export async function listOrdersForUser(userId: string, client = createSupabaseAdminClient()) {
  if (!client) {
    return [];
  }

  const { data } = await client
    .from("orders")
    .select("*, order_items(*), order_shipments(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as unknown as Array<OrderRow & { order_items: OrderItemRow[]; order_shipments?: OrderShipmentRow | null }>;
}

export async function listAdminOrders(client = createSupabaseAdminClient()) {
  if (!client) {
    return [];
  }

  const { data } = await client
    .from("orders")
    .select("*, order_items(*), order_shipments(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as unknown as Array<OrderRow & { order_items: OrderItemRow[]; order_shipments?: OrderShipmentRow | null }>;
}

export async function createPaymentForExistingOrder(input: {
  orderNumber: string;
  userId: string;
}): Promise<{ order: OrderRow; confirmationUrl: string | null; paymentAttempt: PaymentAttemptRow }> {
  const setup = getCommerceSetupState(true);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const detail = await getOrderDetailByNumber(input.orderNumber, { userId: input.userId }, setup.client);
  if (!detail) {
    throw new Error("order_not_found");
  }

  if (detail.order.payment_status === "succeeded" || detail.order.payment_status === "refunded") {
    throw new Error("order_not_payable");
  }

  const reusableAttempt = detail.paymentAttempts.find(
    (attempt) =>
      (attempt.status === "pending" || attempt.status === "waiting_for_capture" || attempt.status === "created") &&
      attempt.confirmation_url,
  );
  if (reusableAttempt) {
    return {
      order: detail.order,
      confirmationUrl: reusableAttempt.confirmation_url,
      paymentAttempt: reusableAttempt,
    };
  }

  const idempotencyKey = crypto.randomUUID();
  const { data: attempt, error } = await setup.client
    .from("payment_attempts")
    .insert({
      order_id: detail.order.id,
      provider: "yookassa",
      status: "created",
      amount_minor: detail.order.total_amount_minor,
      currency: "RUB",
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (error || !attempt) {
    throw new Error(error?.message ?? "payment_attempt_failed");
  }

  const payment = await createYooKassaPayment({
    amountMinor: detail.order.total_amount_minor,
    orderNumber: detail.order.order_number,
    orderId: detail.order.id,
    paymentAttemptId: String(attempt.id),
    customerEmail: detail.order.contact_email,
    customerPhone: detail.order.contact_phone,
    items: buildReceiptItemsFromOrderSnapshot(detail.order, detail.items),
    returnUrl: getCheckoutReturnUrl(detail.order.order_number),
    idempotencyKey,
  });

  const paymentAttempt = await updateAttemptFromYooKassaPayment(setup.client, attempt.id, detail.order, payment);

  return {
    order: detail.order,
    confirmationUrl: payment.confirmation?.confirmation_url ?? null,
    paymentAttempt,
  };
}

const allowedOrderTransitions: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: "processing",
  processing: "supplier_ordered",
  supplier_ordered: "in_transit",
  in_transit: "local_delivery",
  local_delivery: "completed",
};

export async function advanceAdminOrderStatus(input: {
  orderNumber: string;
  actorUserId: string;
  nextStatus: OrderStatus;
}) {
  const setup = getCommerceSetupState(false);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const detail = await getOrderDetailByNumber(input.orderNumber, { admin: true }, setup.client);
  if (!detail) {
    throw new Error("order_not_found");
  }

  if (allowedOrderTransitions[detail.order.status] !== input.nextStatus) {
    throw new Error("invalid_transition");
  }

  const updates: Record<string, unknown> = { status: input.nextStatus };
  if (input.nextStatus === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  await setup.client.from("orders").update(updates).eq("id", detail.order.id);
  await insertOrderEvent(setup.client, {
    orderId: detail.order.id,
    eventType: "status_changed",
    message: `Статус заказа изменен на ${input.nextStatus}.`,
    nextStatus: input.nextStatus,
    actorUserId: input.actorUserId,
  });
}

export async function createAdminRefund(input: {
  orderNumber: string;
  amountMinor?: number;
  reason?: string;
  actorUserId: string;
  refundRequestKey?: string;
}): Promise<PaymentRefundRow> {
  const setup = getCommerceSetupState(true);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const detail = await getOrderDetailByNumber(input.orderNumber, { admin: true }, setup.client);
  if (!detail) {
    throw new Error("order_not_found");
  }

  const succeededAttempt = detail.paymentAttempts.find((attempt) => attempt.status === "succeeded" && attempt.provider_payment_id);
  if (!succeededAttempt?.provider_payment_id) {
    throw new Error("payment_not_refundable");
  }

  const succeededRefunds = detail.refunds
    .filter((refund) => refund.status === "succeeded" || refund.status === "pending")
    .reduce((sum, refund) => sum + refund.amount_minor, 0);
  const refundableAmountMinor = detail.order.total_amount_minor - succeededRefunds;
  const amountMinor = input.amountMinor ?? refundableAmountMinor;

  if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > refundableAmountMinor) {
    throw new Error("invalid_refund_amount");
  }

  const refundReceiptItems =
    amountMinor === detail.order.total_amount_minor
      ? undefined
      : buildPartialRefundReceiptItems({
          order: detail.order,
          items: detail.items,
          amountMinor,
        });

  const idempotencyKey = input.refundRequestKey ?? crypto.randomUUID();
  const { data: storedRefund, error } = await setup.client
    .from("payment_refunds")
    .insert({
      order_id: detail.order.id,
      payment_attempt_id: succeededAttempt.id,
      amount_minor: amountMinor,
      currency: "RUB",
      status: "pending",
      reason: input.reason || null,
      requested_by: input.actorUserId,
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (error || !storedRefund) {
    if (error?.message.toLowerCase().includes("duplicate")) {
      const { data: existingRefund } = await setup.client
        .from("payment_refunds")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (existingRefund) {
        return existingRefund as PaymentRefundRow;
      }
    }
    throw new Error(error?.message ?? "refund_create_failed");
  }

  let refund;
  try {
    refund = await createYooKassaRefund({
      paymentId: succeededAttempt.provider_payment_id,
      amountMinor,
      idempotencyKey,
      reason: input.reason,
      customerEmail: detail.order.contact_email,
      customerPhone: detail.order.contact_phone,
      items: refundReceiptItems,
      metadata: {
        order_id: detail.order.id,
        order_number: detail.order.order_number,
        payment_attempt_id: succeededAttempt.id,
        refund_id: String(storedRefund.id),
      },
    });
  } catch (error) {
    await setup.client
      .from("payment_refunds")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
      })
      .eq("id", storedRefund.id);
    throw error;
  }

  const refundStatus = refund.status === "succeeded" ? "succeeded" : refund.status === "canceled" ? "canceled" : "pending";
  const { data: updatedRefund, error: updateError } = await setup.client
    .from("payment_refunds")
    .update({
      provider_refund_id: refund.id,
      status: refundStatus,
      succeeded_at: refundStatus === "succeeded" ? new Date().toISOString() : null,
    })
    .eq("id", storedRefund.id)
    .select("*")
    .single();
  if (updateError || !updatedRefund) {
    throw new Error(updateError?.message ?? "refund_update_failed");
  }

  if (refundStatus === "succeeded") {
    const nextPaymentStatus = await updateOrderPaymentStatusFromRefunds(setup.client, detail.order);
    await insertOrderEvent(setup.client, {
      orderId: detail.order.id,
      eventType: "refund_succeeded",
      message: nextPaymentStatus === "refunded" ? "Оплата возвращена полностью." : "Оформлен частичный возврат.",
      nextPaymentStatus,
      actorUserId: input.actorUserId,
    });
  }

  return updatedRefund as PaymentRefundRow;
}

async function updateOrderPaymentStatusFromRefunds(client: SupabaseClient, order: Pick<OrderRow, "id" | "total_amount_minor">) {
  const { data: refunds, error } = await client
    .from("payment_refunds")
    .select("amount_minor, status")
    .eq("order_id", order.id);
  if (error) {
    throw new Error(error.message);
  }

  const succeededAmount = (refunds ?? [])
    .filter((refund) => refund.status === "succeeded")
    .reduce((sum, refund) => sum + Number(refund.amount_minor), 0);
  const nextPaymentStatus = succeededAmount >= order.total_amount_minor ? "refunded" : succeededAmount > 0 ? "partially_refunded" : "succeeded";
  await client.from("orders").update({ payment_status: nextPaymentStatus }).eq("id", order.id);
  return nextPaymentStatus;
}

export async function reconcileYooKassaRefund(providerRefundId: string) {
  const setup = getCommerceSetupState(true);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const providerRefund = await getYooKassaRefund(providerRefundId);
  let { data: refunds } = await setup.client
    .from("payment_refunds")
    .select("*, orders(*)")
    .eq("provider_refund_id", providerRefund.id)
    .limit(1);
  if ((!refunds || refunds.length === 0) && providerRefund.metadata?.refund_id) {
    const retry = await setup.client
      .from("payment_refunds")
      .select("*, orders(*)")
      .eq("id", providerRefund.metadata.refund_id)
      .limit(1);
    refunds = retry.data;
  }

  const storedRefund = refunds?.[0] as (PaymentRefundRow & { orders?: OrderRow }) | undefined;
  if (!storedRefund) {
    throw new Error("Refund not found.");
  }

  const amountMinor = yookassaAmountValueToMinor(providerRefund.amount.value);
  if (providerRefund.amount.currency !== storedRefund.currency || amountMinor !== storedRefund.amount_minor) {
    throw new Error("YooKassa refund amount does not match the stored refund.");
  }

  const status = providerRefund.status === "succeeded" ? "succeeded" : providerRefund.status === "canceled" ? "canceled" : "pending";
  const { data: updatedRefund, error } = await setup.client
    .from("payment_refunds")
    .update({
      provider_refund_id: providerRefund.id,
      status,
      succeeded_at: status === "succeeded" ? new Date().toISOString() : storedRefund.succeeded_at,
      failed_at: status === "canceled" ? new Date().toISOString() : storedRefund.failed_at,
    })
    .eq("id", storedRefund.id)
    .select("*")
    .single();
  if (error || !updatedRefund) {
    throw new Error(error?.message ?? "refund_update_failed");
  }

  if (storedRefund.orders && status === "succeeded") {
    await updateOrderPaymentStatusFromRefunds(setup.client, storedRefund.orders);
  }

  return { refund: updatedRefund as PaymentRefundRow, providerRefund };
}
