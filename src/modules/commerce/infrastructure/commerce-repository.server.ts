import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/config/public-env";
import { getServerEnv } from "@/config/server-env";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  createYooKassaRefund,
  createYooKassaPayment,
  getYooKassaPayment,
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
  delivery_postal_code: string;
  delivery_city: string;
  delivery_street: string;
  delivery_house: string;
  delivery_unit: string | null;
  cdek_pickup_point_code: string | null;
  cdek_pickup_point_address: string | null;
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

export type CommerceOrderDetail = {
  order: OrderRow;
  items: OrderItemRow[];
  paymentAttempts: PaymentAttemptRow[];
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
  }>;
};

export type CommerceSetupState =
  | { ready: true; client: SupabaseClient }
  | { ready: false; reason: "supabase_unconfigured" | "service_role_missing" | "yookassa_unconfigured" | "delivery_unconfigured" };

function checkoutItems(source: CheckoutSource): CommerceCartItemInput[] {
  return source.type === "buy_now" ? [source.item] : source.items;
}

export function getCheckoutReturnUrl(orderNumber: string): string {
  const env = getPublicEnv();
  const url = new URL("/checkout/return", env.appUrl);
  url.searchParams.set("order", orderNumber);
  return url.toString();
}

export function getCommerceSetupState(requirePayment = true): CommerceSetupState {
  const serverEnv = getServerEnv();
  const client = createSupabaseServiceRoleClient();

  if (!getPublicEnv().supabase.isConfigured) {
    return { ready: false, reason: "supabase_unconfigured" };
  }

  if (!client) {
    return { ready: false, reason: "service_role_missing" };
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

export async function listServerCartItems(userId: string, client = createSupabaseServiceRoleClient()): Promise<CommerceCartItemInput[]> {
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
  const setup = getCommerceSetupState(true);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const summary = await resolveCommerceSummary(checkoutItems(input.source));
  if (!summary.purchasable || summary.totalAmountMinor === null || summary.delivery.status !== "configured") {
    throw new Error(summary.issues.join(" ") || "Checkout summary is not payable.");
  }

  const orderPayload = {
    user_id: input.userId,
    source: input.source.type,
    status: "awaiting_payment",
    payment_status: "pending",
    currency: "RUB",
    product_subtotal_minor: summary.productSubtotalMinor,
    delivery_amount_minor: summary.delivery.amountMinor,
    delivery_provider: summary.delivery.provider,
    delivery_method: input.contact.deliveryMethod ?? "cdek_courier",
    delivery_tariff_code: summary.delivery.tariffCode,
    delivery_quote_snapshot: summary.delivery.snapshot,
    total_amount_minor: summary.totalAmountMinor,
    contact_name: input.contact.recipientName,
    contact_email: input.contact.email,
    contact_phone: input.contact.phone,
    delivery_postal_code: input.contact.postalCode,
    delivery_city: input.contact.city,
    delivery_street: input.contact.street,
    delivery_house: input.contact.house,
    delivery_unit: input.contact.unit || null,
    cdek_pickup_point_code: input.contact.cdekPickupPointCode || null,
    cdek_pickup_point_address: input.contact.cdekPickupPointAddress || null,
    delivery_comment: input.contact.deliveryComment || null,
    customer_comment: input.contact.customerComment || null,
    checkout_submission_key: input.checkoutSubmissionKey,
    legal_consent_snapshot: {},
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

  try {
    const payment = await createYooKassaPayment({
      amountMinor: orderRow.total_amount_minor,
      orderNumber: orderRow.order_number,
      orderId: orderRow.id,
      userId: input.userId,
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
  const amountMinor = Math.round(Number(payment.amount.value) * 100);
  if (payment.amount.currency !== order.currency || amountMinor !== order.total_amount_minor) {
    throw new Error("YooKassa payment amount does not match the order.");
  }

  const status = payment.status === "canceled" ? "canceled" : payment.status;
  const updatePayload: Record<string, unknown> = {
    provider_payment_id: payment.id,
    status,
    confirmation_url: payment.confirmation?.confirmation_url ?? null,
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
}

export async function reconcileYooKassaPayment(providerPaymentId: string) {
  const setup = getCommerceSetupState(true);
  if (!setup.ready) {
    throw new Error(setup.reason);
  }

  const { data: attempt, error } = await setup.client
    .from("payment_attempts")
    .select("*, orders(*)")
    .eq("provider_payment_id", providerPaymentId)
    .single();

  if (error || !attempt) {
    throw new Error("Payment attempt not found.");
  }

  const payment = await getYooKassaPayment(providerPaymentId);
  const order = attempt.orders as OrderRow;
  const updatedAttempt = await updateAttemptFromYooKassaPayment(setup.client, String(attempt.id), order, payment);
  return { order, payment, paymentAttempt: updatedAttempt };
}

export async function getOrderDetailByNumber(
  orderNumber: string,
  access: { userId?: string; admin?: boolean },
  client = createSupabaseServiceRoleClient(),
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

  const [{ data: items }, { data: attempts }, { data: events }, { data: refunds }] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
    client.from("payment_attempts").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
    client.from("order_events").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
    client.from("payment_refunds").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
  ]);

  return {
    order,
    items: (items ?? []) as OrderItemRow[],
    paymentAttempts: (attempts ?? []) as PaymentAttemptRow[],
    events: (events ?? []) as CommerceOrderDetail["events"],
    refunds: (refunds ?? []) as CommerceOrderDetail["refunds"],
  };
}

export async function listOrdersForUser(userId: string, client = createSupabaseServiceRoleClient()) {
  if (!client) {
    return [];
  }

  const { data } = await client
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as Array<OrderRow & { order_items: OrderItemRow[] }>;
}

export async function listAdminOrders(client = createSupabaseServiceRoleClient()) {
  if (!client) {
    return [];
  }

  const { data } = await client
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as Array<OrderRow & { order_items: OrderItemRow[] }>;
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
    userId: input.userId,
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
}) {
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

  const idempotencyKey = crypto.randomUUID();
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
    throw new Error(error?.message ?? "refund_create_failed");
  }

  const refund = await createYooKassaRefund({
    paymentId: succeededAttempt.provider_payment_id,
    amountMinor,
    idempotencyKey,
    reason: input.reason,
  });

  const refundStatus = refund.status === "succeeded" ? "succeeded" : refund.status === "canceled" ? "canceled" : "pending";
  await setup.client
    .from("payment_refunds")
    .update({
      provider_refund_id: refund.id,
      status: refundStatus,
      succeeded_at: refundStatus === "succeeded" ? new Date().toISOString() : null,
    })
    .eq("id", storedRefund.id);

  if (refundStatus === "succeeded") {
    const nextPaymentStatus = amountMinor === refundableAmountMinor ? "refunded" : "partially_refunded";
    await setup.client.from("orders").update({ payment_status: nextPaymentStatus }).eq("id", detail.order.id);
    await insertOrderEvent(setup.client, {
      orderId: detail.order.id,
      eventType: "refund_succeeded",
      message: nextPaymentStatus === "refunded" ? "Оплата возвращена полностью." : "Оформлен частичный возврат.",
      nextPaymentStatus,
      actorUserId: input.actorUserId,
    });
  }

  return refund;
}
