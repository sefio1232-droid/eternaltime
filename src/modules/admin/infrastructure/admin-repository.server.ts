import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { requireAdminAccess } from "@/modules/auth/authorization";
import { isRoleCode, type RoleCode } from "@/modules/auth/roles";
import {
  getOrderDetailByNumber,
  type CommerceOrderDetail,
} from "@/modules/commerce/infrastructure/commerce-repository.server";
import type { OrderPaymentStatus, OrderShipmentStatus, OrderStatus } from "@/modules/commerce/domain/types";

type Client = SupabaseClient<Database>;

export type AdminOrderFilters = {
  status?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  customer?: string;
  orderNumber?: string;
};

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  createdAt: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  itemSummary: string;
  productSubtotalMinor: number;
  customerDeliveryAmountMinor: number;
  totalAmountMinor: number;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderStatus;
  deliveryMethod: string;
  city: string;
  cdekCityCode: number | null;
  pickupPointCode: string | null;
  pickupPointAddress: string | null;
  courierAddress: string | null;
  cdekShipmentUuid: string | null;
  cdekOrderNumber: string | null;
  trackingNumber: string | null;
  yookassaPaymentId: string | null;
  shipmentStatus: OrderShipmentStatus | null;
  carrierActualCostMinor: number | null;
  shipmentRetryState: string | null;
  lastErrorCode: string | null;
  paidAt: string | null;
  updatedAt: string;
};

export type AdminDashboardStats = {
  totalOrders: number;
  newOrders: number;
  awaitingPayment: number;
  paid: number;
  processing: number;
  shipmentPending: number;
  shippedInTransit: number;
  delivered: number;
  failedProblemOrders: number;
  registeredUsers: number;
  paidRevenueMinor: number;
};

export type AdminUserListItem = {
  userId: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  displayName: string | null;
  phone: string | null;
  city: string | null;
  roles: RoleCode[];
  ordersCount: number;
  paidOrdersCount: number;
  lifetimePaidAmountMinor: number;
  collectionWatchesCount: number;
};

type OrderRow = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items?: Array<Database["public"]["Tables"]["order_items"]["Row"]> | null;
  order_shipments?: Database["public"]["Tables"]["order_shipments"]["Row"] | null;
  payment_attempts?: Array<Database["public"]["Tables"]["payment_attempts"]["Row"]> | null;
};

function requireClient(): Client {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error("admin_secret_missing");
  }
  return client;
}

async function requireAdminClient(): Promise<Client> {
  const access = await requireAdminAccess();
  if (!access.allowed) {
    throw new Error(access.reason);
  }
  return requireClient();
}

function courierAddress(order: Pick<OrderRow, "delivery_postal_code" | "delivery_city" | "delivery_street" | "delivery_house" | "delivery_unit">) {
  return [order.delivery_postal_code, order.delivery_city, order.delivery_street, order.delivery_house, order.delivery_unit]
    .filter(Boolean)
    .join(", ");
}

function mapOrderListItem(order: OrderRow): AdminOrderListItem {
  const shipment = order.order_shipments ?? null;
  const items = order.order_items ?? [];
  const latestYooKassaPaymentId =
    order.payment_attempts?.find((attempt) => attempt.provider === "yookassa" && attempt.provider_payment_id)
      ?.provider_payment_id ?? null;
  const itemSummary = items
    .map((item) => `${item.brand_name_snapshot} ${item.display_name_snapshot} ${item.reference_display_snapshot} × ${item.quantity}`)
    .join("; ");

  return {
    id: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at,
    userId: order.user_id,
    customerEmail: order.contact_email,
    customerName: order.contact_name,
    customerPhone: order.contact_phone,
    itemSummary: itemSummary || "—",
    productSubtotalMinor: order.product_subtotal_minor,
    customerDeliveryAmountMinor: order.delivery_amount_minor,
    totalAmountMinor: order.total_amount_minor,
    paymentStatus: order.payment_status,
    orderStatus: order.status,
    deliveryMethod: order.delivery_method,
    city: order.delivery_city,
    cdekCityCode: order.cdek_destination_city_code,
    pickupPointCode: order.cdek_pickup_point_code,
    pickupPointAddress: order.cdek_pickup_point_address,
    courierAddress: order.delivery_method === "cdek_courier" ? courierAddress(order) : null,
    cdekShipmentUuid: shipment?.cdek_order_uuid ?? null,
    cdekOrderNumber: shipment?.cdek_order_number ?? null,
    trackingNumber: shipment?.tracking_number ?? null,
    yookassaPaymentId: latestYooKassaPaymentId,
    shipmentStatus: shipment?.shipment_status ?? null,
    carrierActualCostMinor: shipment?.carrier_actual_cost_minor ?? null,
    shipmentRetryState: shipment?.shipment_status ?? null,
    lastErrorCode: shipment?.last_error_code ?? null,
    paidAt: order.paid_at,
    updatedAt: order.updated_at,
  };
}

function matchesSearch(order: AdminOrderListItem, filters: AdminOrderFilters): boolean {
  const query = filters.query?.trim().toLowerCase();
  const customer = filters.customer?.trim().toLowerCase();
  const orderNumber = filters.orderNumber?.trim().toLowerCase();

  if (filters.status && order.orderStatus !== filters.status) return false;
  if (filters.paymentStatus && order.paymentStatus !== filters.paymentStatus) return false;
  if (filters.deliveryStatus && order.shipmentStatus !== filters.deliveryStatus) return false;
  if (filters.dateFrom && order.createdAt < filters.dateFrom) return false;
  if (filters.dateTo && order.createdAt > `${filters.dateTo}T23:59:59.999Z`) return false;
  if (orderNumber && !order.orderNumber.toLowerCase().includes(orderNumber)) return false;
  if (customer && !`${order.customerEmail} ${order.customerName} ${order.customerPhone}`.toLowerCase().includes(customer)) return false;

  if (query) {
    const haystack = [
      order.orderNumber,
      order.customerEmail,
      order.customerPhone,
      order.trackingNumber,
      order.yookassaPaymentId,
      order.itemSummary,
      order.pickupPointCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  return true;
}

export async function listAdminOrdersForPanel(filters: AdminOrderFilters = {}): Promise<AdminOrderListItem[]> {
  const client = await requireAdminClient();
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*), order_shipments(*), payment_attempts(*)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as OrderRow[]).map(mapOrderListItem).filter((order) => matchesSearch(order, filters));
}

export async function getAdminOrderDetail(orderNumber: string): Promise<CommerceOrderDetail | null> {
  const client = await requireAdminClient();
  return getOrderDetailByNumber(orderNumber, { admin: true }, client);
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const client = await requireAdminClient();
  const [{ data: orders }, { data: shipments }, authUsers] = await Promise.all([
    client.from("orders").select("id, status, payment_status, total_amount_minor"),
    client.from("order_shipments").select("shipment_status, last_error_code"),
    client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const orderRows = (orders ?? []) as Array<Pick<OrderRow, "id" | "status" | "payment_status" | "total_amount_minor">>;
  const shipmentRows = (shipments ?? []) as Array<{ shipment_status: OrderShipmentStatus; last_error_code: string | null }>;

  return {
    totalOrders: orderRows.length,
    newOrders: orderRows.filter((order) => order.status === "awaiting_payment").length,
    awaitingPayment: orderRows.filter((order) => order.payment_status === "pending").length,
    paid: orderRows.filter((order) => order.payment_status === "succeeded").length,
    processing: orderRows.filter((order) => order.status === "processing" || order.status === "supplier_ordered").length,
    shipmentPending: shipmentRows.filter((shipment) =>
      ["pending_creation", "creation_in_progress", "creation_pending_retry"].includes(shipment.shipment_status),
    ).length,
    shippedInTransit: shipmentRows.filter((shipment) =>
      ["created", "handed_over", "in_transit", "arrived_at_pickup_point", "ready_for_pickup"].includes(shipment.shipment_status),
    ).length,
    delivered: shipmentRows.filter((shipment) => shipment.shipment_status === "delivered").length,
    failedProblemOrders: shipmentRows.filter((shipment) =>
      shipment.shipment_status === "creation_failed" || shipment.shipment_status === "problem" || Boolean(shipment.last_error_code),
    ).length,
    registeredUsers: authUsers.data.users.length,
    paidRevenueMinor: orderRows
      .filter((order) => order.payment_status === "succeeded")
      .reduce((sum, order) => sum + order.total_amount_minor, 0),
  };
}

export async function listAdminUsersForPanel(): Promise<AdminUserListItem[]> {
  const client = await requireAdminClient();
  const [{ data: profiles }, { data: roleRows }, { data: orders }, { data: watches }, authUsers] = await Promise.all([
    client.from("profiles").select("id, display_name, phone, city, created_at"),
    client.from("user_roles").select("user_id, roles!inner(code)").is("revoked_at", null),
    client.from("orders").select("user_id, payment_status, total_amount_minor"),
    client.from("user_watches").select("user_id"),
    client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        displayName: profile.display_name ?? null,
        phone: profile.phone ?? null,
        city: profile.city ?? null,
        createdAt: profile.created_at ?? null,
      },
    ]),
  );
  const rolesByUser = new Map<string, RoleCode[]>();
  for (const row of roleRows ?? []) {
    const userId = String(row.user_id);
    const code = (row.roles as { code?: string } | null)?.code;
    if (!code || !isRoleCode(code)) continue;
    const current = rolesByUser.get(userId) ?? [];
    if (!current.includes(code)) current.push(code);
    rolesByUser.set(userId, current);
  }
  const ordersByUser = new Map<string, { ordersCount: number; paidOrdersCount: number; lifetimePaidAmountMinor: number }>();
  for (const order of orders ?? []) {
    const userId = String(order.user_id);
    const current = ordersByUser.get(userId) ?? { ordersCount: 0, paidOrdersCount: 0, lifetimePaidAmountMinor: 0 };
    current.ordersCount += 1;
    if (order.payment_status === "succeeded") {
      current.paidOrdersCount += 1;
      current.lifetimePaidAmountMinor += Number(order.total_amount_minor);
    }
    ordersByUser.set(userId, current);
  }
  const watchesByUser = new Map<string, number>();
  for (const watch of watches ?? []) {
    const userId = String(watch.user_id);
    watchesByUser.set(userId, (watchesByUser.get(userId) ?? 0) + 1);
  }

  const users = authUsers.data.users.map((user) => {
    const profile = profileById.get(user.id);
    const orderStats = ordersByUser.get(user.id) ?? { ordersCount: 0, paidOrdersCount: 0, lifetimePaidAmountMinor: 0 };
    return {
      userId: user.id,
      email: user.email ?? null,
      createdAt: user.created_at ?? profile?.createdAt ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      displayName: profile?.displayName ?? null,
      phone: profile?.phone ?? null,
      city: profile?.city ?? null,
      roles: rolesByUser.get(user.id) ?? [],
      ordersCount: orderStats.ordersCount,
      paidOrdersCount: orderStats.paidOrdersCount,
      lifetimePaidAmountMinor: orderStats.lifetimePaidAmountMinor,
      collectionWatchesCount: watchesByUser.get(user.id) ?? 0,
    };
  });

  return users.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}
