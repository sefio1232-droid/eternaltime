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
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import type { CatalogImagePresentation, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { Json } from "@/lib/supabase/database.types";

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
  sort?: "created_desc" | "created_asc" | "updated_desc" | "total_desc" | "total_asc" | "";
  page?: number;
  pageSize?: number;
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

export type AdminOrderListResult = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AdminDashboardStats = {
  catalogTotal: number;
  catalogPublished: number;
  catalogHidden: number;
  catalogWithoutPrice: number;
  catalogWithoutImage: number;
  catalogIncomplete: number;
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
  recentRegistrations: number;
  paidRevenueMinor: number;
  latestImportSource: string | null;
  latestImportStatus: string | null;
  importBlockedRows: number;
  importManualReviewRows: number;
  recentImportErrors: number;
  failedPaymentAttempts: number;
  failedShipments: number;
};

export type AdminCatalogFilters = {
  query?: string;
  brand?: string;
  status?: string;
  publication?: "published" | "unpublished" | "";
  sort?: "updated_desc" | "updated_asc" | "brand_asc" | "price_asc" | "price_desc" | "";
  page?: number;
  pageSize?: number;
};

export type AdminCatalogListItem = {
  id: string;
  href: string;
  brandName: string;
  brandSlug: string;
  modelName: string;
  displayName: string;
  referenceDisplay: string;
  referenceNormalized: string | null;
  referenceSlug: string;
  status: string;
  referenceStatus: string;
  dataConfidence: string;
  priceMinor: number | null;
  currencyCode: string | null;
  offerStatus: string | null;
  isVisible: boolean;
  inventoryLabel: string | null;
  updatedAt: string;
  primaryImage: CatalogImagePresentation;
  issueCodes: string[];
};

export type AdminCatalogListResult = {
  items: AdminCatalogListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  brands: Array<{ name: string; slug: string; count: number }>;
};

export type AdminCatalogStats = Pick<
  AdminDashboardStats,
  "catalogTotal" | "catalogPublished" | "catalogHidden" | "catalogWithoutPrice" | "catalogWithoutImage" | "catalogIncomplete"
>;

export type AdminSelectOption = {
  id: string;
  label: string;
  code?: string | null;
};

export type AdminCatalogDictionaries = {
  brands: Array<AdminSelectOption & { slug: string }>;
  collections: AdminSelectOption[];
  lines: AdminSelectOption[];
  models: AdminSelectOption[];
  movementTypes: AdminSelectOption[];
  movements: AdminSelectOption[];
  materials: AdminSelectOption[];
  colors: AdminSelectOption[];
  crystalTypes: AdminSelectOption[];
  claspTypes: AdminSelectOption[];
  caseShapes: AdminSelectOption[];
  inventoryStates: Array<AdminSelectOption & { isOrderable: boolean }>;
};

export type AdminCatalogImageRow = {
  id: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  status: string;
  storageBucket: string;
  storagePath: string;
  updatedAt: string;
};

export type AdminCatalogDetail = {
  id: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  collectionId: string | null;
  collectionName: string | null;
  lineId: string | null;
  lineName: string | null;
  modelId: string;
  modelName: string;
  displayName: string;
  referenceDisplay: string;
  referenceNormalized: string | null;
  referenceSlug: string;
  status: string;
  referenceStatus: string;
  shortDescription: string | null;
  description: string | null;
  movementDescription: string | null;
  fitDescription: string | null;
  waterResistanceDescription: string | null;
  setContentsDescription: string | null;
  authenticityDescription: string | null;
  movementTypeId: string | null;
  movementId: string | null;
  caseMaterialId: string | null;
  caseCoatingMaterialId: string | null;
  caseShapeId: string | null;
  caseColorId: string | null;
  dialColorId: string | null;
  crystalTypeId: string | null;
  strapMaterialId: string | null;
  braceletMaterialId: string | null;
  claspTypeId: string | null;
  caseDiameterMm: number | null;
  caseWidthMm: number | null;
  lugToLugMm: number | null;
  caseThicknessMm: number | null;
  lugWidthMm: number | null;
  weightG: number | null;
  waterResistanceM: number | null;
  hasDate: boolean;
  hasDayDate: boolean;
  hasGmt: boolean;
  hasChronograph: boolean;
  hasTachymeter: boolean;
  hasWorldTime: boolean;
  hasAlarm: boolean;
  hasStopwatch: boolean;
  hasTimer: boolean;
  hasMoonPhase: boolean;
  hasRotatingBezel: boolean;
  dataConfidence: string;
  updatedAt: string;
  offerId: string | null;
  priceMinor: number | null;
  currencyCode: string | null;
  previousPriceMinor: number | null;
  offerStatus: string | null;
  isVisible: boolean;
  purchaseLimit: number | null;
  sellerNote: string | null;
  inventoryStateId: string | null;
  images: AdminCatalogImageRow[];
  publicPreview: CatalogWatchDetail | null;
  productionGallery: CatalogImagePresentation[];
  issueCodes: string[];
};

export type AdminSystemOverview = {
  generatedAt: string;
  environmentLabel: string;
  catalogStats: AdminCatalogStats;
  orderStats: Pick<AdminDashboardStats, "totalOrders" | "awaitingPayment" | "paid" | "failedProblemOrders">;
  imageDiagnostics: {
    productionGalleryImages: number;
    missingProductionImages: number;
    databaseImageRows: number;
  };
  latestAuditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }>;
  deployment: {
    codeOnlyDefault: true;
    catalogAssetsExplicitFlag: "-DeployCatalogAssets";
  };
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

export type AdminUserFilters = {
  query?: string;
  role?: string;
  sort?: "registered_desc" | "registered_asc" | "last_sign_in_desc" | "orders_desc" | "paid_desc" | "";
  page?: number;
  pageSize?: number;
};

export type AdminUserListResult = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  roles: Array<{ code: string; count: number }>;
};

export type AdminUserDetail = AdminUserListItem & {
  preferredContact: string | null;
  recentOrders: AdminOrderListItem[];
  collection: Array<{
    id: string;
    displayName: string;
    sourceKind: string;
    ownershipStatus: string;
    createdAt: string;
  }>;
};

export type AdminImportFilters = {
  query?: string;
  status?: string;
  sourceKind?: string;
  page?: number;
  pageSize?: number;
};

export type AdminImportBatchListItem = {
  id: string;
  createdAt: string;
  appliedAt: string | null;
  uploadedBy: string | null;
  sourceFilename: string;
  sourceKind: string;
  status: string;
  totalRows: number;
  eligibleRows: number;
  manualReviewRows: number;
  blockedRows: number;
  skippedRows: number;
  appliedRows: number;
  errorRows: number;
};

export type AdminImportListResult = {
  items: AdminImportBatchListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  statuses: Array<{ status: string; count: number }>;
  sourceKinds: Array<{ sourceKind: string; count: number }>;
};

export type AdminImportRowItem = {
  id: string;
  rowNumber: number;
  status: string;
  errors: Json;
  warnings: Json;
  raw: Json;
  normalized: Json;
  createdAt: string;
};

export type AdminImportDetail = AdminImportBatchListItem & {
  mapping: Json;
  summary: Json;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata: Json;
  }>;
  problemRows: AdminImportRowItem[];
};

type OrderRow = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items?: Array<Database["public"]["Tables"]["order_items"]["Row"]> | null;
  order_shipments?: Database["public"]["Tables"]["order_shipments"]["Row"] | null;
  payment_attempts?: Array<Database["public"]["Tables"]["payment_attempts"]["Row"]> | null;
};

type WatchReferenceRow = Database["public"]["Tables"]["watch_references"]["Row"];
type CatalogOfferRow = Database["public"]["Tables"]["catalog_offers"]["Row"];
type WatchImageRow = Database["public"]["Tables"]["watch_images"]["Row"];
type ImportBatchRow = Database["public"]["Tables"]["import_batches"]["Row"];
type ImportRow = Database["public"]["Tables"]["import_rows"]["Row"];

type AdminCatalogRawRow = WatchReferenceRow & {
  brands?: { id: string; name: string; slug: string } | null;
  watch_models?: {
    id: string;
    name: string;
    brand_collection_id: string | null;
    brand_line_id: string | null;
    brand_collections?: { id: string; name: string } | null;
    brand_lines?: { id: string; name: string } | null;
  } | null;
  catalog_offers?: Array<
    CatalogOfferRow & {
      inventory_states?: { id: string; label: string; code: string; is_orderable: boolean } | null;
    }
  > | null;
  watch_images?: WatchImageRow[] | null;
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

function moneyFromRubInput(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("invalid_price");
  }
  return Math.round(parsed * 100);
}

function nullableText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function nullableNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    throw new Error("invalid_number");
  }
  return parsed;
}

function nullableInteger(value: FormDataEntryValue | null): number | null {
  const number = nullableNumber(value);
  if (number === null) return null;
  if (!Number.isInteger(number)) {
    throw new Error("invalid_integer");
  }
  return number;
}

function formBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function jsonObject(value: Json | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function insertAuditLog(
  client: Client,
  input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown>;
  },
) {
  await client.from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    safe_metadata_json: input.metadata as Json,
  });
}

function issueCodesFor(input: {
  referenceDisplay: string | null;
  priceMinor: number | null;
  primaryImage: CatalogImagePresentation | null;
  movementTypeId: string | null;
  caseMaterialId: string | null;
  crystalTypeId: string | null;
  waterResistanceM: number | null;
  dataConfidence: string;
}) {
  const issues: string[] = [];
  if (!input.referenceDisplay) issues.push("missing_reference");
  if (input.priceMinor === null) issues.push("missing_price");
  if (!input.primaryImage || input.primaryImage.kind === "none") issues.push("missing_image");
  if (!input.movementTypeId) issues.push("missing_movement_type");
  if (!input.caseMaterialId) issues.push("missing_case_material");
  if (!input.crystalTypeId) issues.push("missing_crystal");
  if (input.waterResistanceM === null) issues.push("missing_water_resistance");
  if (input.dataConfidence === "unknown" || input.dataConfidence === "partial") issues.push("low_data_confidence");
  return issues;
}

function primaryImageFor(publicWatch: CatalogWatchDetail | null, rowImages: WatchImageRow[] | null | undefined): CatalogImagePresentation {
  if (publicWatch) return publicWatch.primaryImage;
  const primaryRow = [...(rowImages ?? [])].sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || left.sort_order - right.sort_order)[0];
  if (!primaryRow) {
    return { kind: "none", alt: "Изображение не добавлено" };
  }
  return {
    kind: "remote",
    url: primaryRow.storage_path,
    src: primaryRow.storage_path,
    alt: primaryRow.alt_text ?? "Изображение часов",
  };
}

function activeOffer(row: AdminCatalogRawRow): (CatalogOfferRow & { inventory_states?: { id: string; label: string; code: string; is_orderable: boolean } | null }) | null {
  const offers = row.catalog_offers ?? [];
  return (
    offers.find((offer) => offer.is_visible && offer.status === "active" && offer.offer_kind === "standard" && offer.condition === "new") ??
    offers.find((offer) => offer.is_visible) ??
    offers[0] ??
    null
  );
}

function publicMapById(dataset: Awaited<ReturnType<typeof getCatalogReadDataset>>) {
  return new Map(dataset.watches.map((watch) => [watch.id, watch]));
}

function mapCatalogListItem(row: AdminCatalogRawRow, publicWatch: CatalogWatchDetail | null): AdminCatalogListItem {
  const offer = activeOffer(row);
  const primaryImage = primaryImageFor(publicWatch, row.watch_images);
  const brandName = row.brands?.name ?? "—";
  const brandSlug = row.brands?.slug ?? "";
  const referenceSlug = publicWatch?.referenceSlug ?? row.slug;
  const issueCodes = issueCodesFor({
    referenceDisplay: row.reference_code_display,
    priceMinor: offer?.current_price_minor ?? null,
    primaryImage,
    movementTypeId: row.movement_type_id,
    caseMaterialId: row.case_material_id,
    crystalTypeId: row.crystal_type_id,
    waterResistanceM: row.water_resistance_m,
    dataConfidence: row.data_confidence,
  });

  return {
    id: row.id,
    href: brandSlug && referenceSlug ? `/watches/${brandSlug}/${referenceSlug}` : "#",
    brandName,
    brandSlug,
    modelName: row.watch_models?.name ?? row.display_name,
    displayName: row.display_name,
    referenceDisplay: row.reference_code_display,
    referenceNormalized: row.reference_code_normalized,
    referenceSlug,
    status: row.status,
    referenceStatus: row.reference_status,
    dataConfidence: row.data_confidence,
    priceMinor: offer?.current_price_minor ?? null,
    currencyCode: offer?.currency_code ?? null,
    offerStatus: offer?.status ?? null,
    isVisible: offer?.is_visible ?? false,
    inventoryLabel: offer?.inventory_states?.label ?? null,
    updatedAt: row.updated_at,
    primaryImage,
    issueCodes,
  };
}

function filterCatalogItem(item: AdminCatalogListItem, filters: AdminCatalogFilters): boolean {
  const query = filters.query?.trim().toLowerCase();
  if (filters.brand && item.brandSlug !== filters.brand) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.publication === "published" && item.status !== "published") return false;
  if (filters.publication === "unpublished" && item.status === "published") return false;
  if (query) {
    const haystack = [
      item.brandName,
      item.brandSlug,
      item.modelName,
      item.displayName,
      item.referenceDisplay,
      item.referenceNormalized,
      item.referenceSlug,
    ].join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function sortCatalogItems(items: AdminCatalogListItem[], sort: AdminCatalogFilters["sort"]) {
  return [...items].sort((left, right) => {
    if (sort === "updated_asc") return left.updatedAt.localeCompare(right.updatedAt);
    if (sort === "brand_asc") {
      return (
        left.brandName.localeCompare(right.brandName, "ru") ||
        left.modelName.localeCompare(right.modelName, "ru") ||
        left.referenceDisplay.localeCompare(right.referenceDisplay, "ru")
      );
    }
    if (sort === "price_asc") return (left.priceMinor ?? Number.MAX_SAFE_INTEGER) - (right.priceMinor ?? Number.MAX_SAFE_INTEGER);
    if (sort === "price_desc") return (right.priceMinor ?? -1) - (left.priceMinor ?? -1);
    return right.updatedAt.localeCompare(left.updatedAt);
  });
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

function pagination(input: { page?: number; pageSize?: number; total: number }, defaults = { pageSize: 25 }) {
  const pageSize = Math.min(Math.max(input.pageSize ?? defaults.pageSize, 10), 100);
  const pageCount = Math.max(1, Math.ceil(input.total / pageSize));
  const page = Math.min(Math.max(input.page ?? 1, 1), pageCount);
  return { page, pageSize, pageCount, from: (page - 1) * pageSize, to: page * pageSize };
}

function sortAdminOrders(items: AdminOrderListItem[], sort: AdminOrderFilters["sort"]) {
  return [...items].sort((left, right) => {
    if (sort === "created_asc") return left.createdAt.localeCompare(right.createdAt);
    if (sort === "updated_desc") return right.updatedAt.localeCompare(left.updatedAt);
    if (sort === "total_desc") return right.totalAmountMinor - left.totalAmountMinor;
    if (sort === "total_asc") return left.totalAmountMinor - right.totalAmountMinor;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function listAdminOrdersForPanel(filters: AdminOrderFilters = {}): Promise<AdminOrderListResult> {
  const client = await requireAdminClient();
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*), order_shipments(*), payment_attempts(*)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const filtered = sortAdminOrders(
    ((data ?? []) as unknown as OrderRow[]).map(mapOrderListItem).filter((order) => matchesSearch(order, filters)),
    filters.sort,
  );
  const page = pagination({ total: filtered.length, page: filters.page, pageSize: filters.pageSize });
  return {
    items: filtered.slice(page.from, page.to),
    total: filtered.length,
    page: page.page,
    pageSize: page.pageSize,
    pageCount: page.pageCount,
  };
}

async function listAdminCatalogRawRows(client: Client): Promise<AdminCatalogRawRow[]> {
  const { data, error } = await client
    .from("watch_references")
    .select(
      `
      *,
      brands(id,name,slug),
      watch_models(
        id,
        name,
        brand_collection_id,
        brand_line_id,
        brand_collections(id,name),
        brand_lines(id,name)
      ),
      catalog_offers(*, inventory_states(id,label,code,is_orderable)),
      watch_images(*)
      `,
    )
    .order("updated_at", { ascending: false })
    .limit(2000);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as AdminCatalogRawRow[];
}

export async function getAdminCatalogStats(): Promise<AdminCatalogStats> {
  const client = await requireAdminClient();
  const [rows, dataset] = await Promise.all([listAdminCatalogRawRows(client), getCatalogReadDataset()]);
  const byId = publicMapById(dataset);
  const items = rows.map((row) => mapCatalogListItem(row, byId.get(row.id) ?? null));

  return {
    catalogTotal: items.length,
    catalogPublished: items.filter((item) => item.status === "published").length,
    catalogHidden: items.filter((item) => item.status !== "published").length,
    catalogWithoutPrice: items.filter((item) => item.priceMinor === null).length,
    catalogWithoutImage: items.filter((item) => item.primaryImage.kind === "none").length,
    catalogIncomplete: items.filter((item) => item.issueCodes.length > 0).length,
  };
}

export async function listAdminCatalogForPanel(filters: AdminCatalogFilters = {}): Promise<AdminCatalogListResult> {
  const client = await requireAdminClient();
  const [rows, dataset] = await Promise.all([listAdminCatalogRawRows(client), getCatalogReadDataset()]);
  const byId = publicMapById(dataset);
  const allItems = rows.map((row) => mapCatalogListItem(row, byId.get(row.id) ?? null));
  const brands = [...allItems.reduce((map, item) => {
    const current = map.get(item.brandSlug) ?? { name: item.brandName, slug: item.brandSlug, count: 0 };
    current.count += 1;
    map.set(item.brandSlug, current);
    return map;
  }, new Map<string, { name: string; slug: string; count: number }>()).values()].sort((left, right) =>
    left.name.localeCompare(right.name, "ru"),
  );
  const filtered = sortCatalogItems(allItems.filter((item) => filterCatalogItem(item, filters)), filters.sort);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 10), 100);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(filters.page ?? 1, 1), pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    pageCount,
    brands,
  };
}

function mapImageRow(row: WatchImageRow): AdminCatalogImageRow {
  return {
    id: row.id,
    altText: row.alt_text,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    updatedAt: row.updated_at,
  };
}

function mapCatalogDetail(row: AdminCatalogRawRow, publicWatch: CatalogWatchDetail | null): AdminCatalogDetail {
  const offer = activeOffer(row);
  const primaryImage = primaryImageFor(publicWatch, row.watch_images);
  const issueCodes = issueCodesFor({
    referenceDisplay: row.reference_code_display,
    priceMinor: offer?.current_price_minor ?? null,
    primaryImage,
    movementTypeId: row.movement_type_id,
    caseMaterialId: row.case_material_id,
    crystalTypeId: row.crystal_type_id,
    waterResistanceM: row.water_resistance_m,
    dataConfidence: row.data_confidence,
  });

  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brands?.name ?? "—",
    brandSlug: row.brands?.slug ?? "",
    collectionId: row.watch_models?.brand_collection_id ?? null,
    collectionName: row.watch_models?.brand_collections?.name ?? null,
    lineId: row.watch_models?.brand_line_id ?? null,
    lineName: row.watch_models?.brand_lines?.name ?? null,
    modelId: row.watch_model_id,
    modelName: row.watch_models?.name ?? row.display_name,
    displayName: row.display_name,
    referenceDisplay: row.reference_code_display,
    referenceNormalized: row.reference_code_normalized,
    referenceSlug: publicWatch?.referenceSlug ?? row.slug,
    status: row.status,
    referenceStatus: row.reference_status,
    shortDescription: row.short_description,
    description: row.description,
    movementDescription: row.movement_description,
    fitDescription: row.fit_description,
    waterResistanceDescription: row.water_resistance_description,
    setContentsDescription: row.set_contents_description,
    authenticityDescription: row.authenticity_description,
    movementTypeId: row.movement_type_id,
    movementId: row.movement_id,
    caseMaterialId: row.case_material_id,
    caseCoatingMaterialId: row.case_coating_material_id,
    caseShapeId: row.case_shape_id,
    caseColorId: row.case_color_id,
    dialColorId: row.dial_color_id,
    crystalTypeId: row.crystal_type_id,
    strapMaterialId: row.strap_material_id,
    braceletMaterialId: row.bracelet_material_id,
    claspTypeId: row.clasp_type_id,
    caseDiameterMm: row.case_diameter_mm,
    caseWidthMm: row.case_width_mm,
    lugToLugMm: row.lug_to_lug_mm,
    caseThicknessMm: row.case_thickness_mm,
    lugWidthMm: row.lug_width_mm,
    weightG: row.weight_g,
    waterResistanceM: row.water_resistance_m,
    hasDate: row.has_date,
    hasDayDate: row.has_day_date,
    hasGmt: row.has_gmt,
    hasChronograph: row.has_chronograph,
    hasTachymeter: row.has_tachymeter,
    hasWorldTime: row.has_world_time,
    hasAlarm: row.has_alarm,
    hasStopwatch: row.has_stopwatch,
    hasTimer: row.has_timer,
    hasMoonPhase: row.has_moon_phase,
    hasRotatingBezel: row.has_rotating_bezel,
    dataConfidence: row.data_confidence,
    updatedAt: row.updated_at,
    offerId: offer?.id ?? null,
    priceMinor: offer?.current_price_minor ?? null,
    currencyCode: offer?.currency_code ?? null,
    previousPriceMinor: offer?.previous_price_minor ?? null,
    offerStatus: offer?.status ?? null,
    isVisible: offer?.is_visible ?? false,
    purchaseLimit: offer?.purchase_limit ?? null,
    sellerNote: offer?.seller_note ?? null,
    inventoryStateId: offer?.inventory_state_id ?? null,
    images: [...(row.watch_images ?? [])].sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || left.sort_order - right.sort_order).map(mapImageRow),
    publicPreview: publicWatch,
    productionGallery: publicWatch?.imageGallery ?? (primaryImage.kind === "none" ? [] : [primaryImage]),
    issueCodes,
  };
}

export async function getAdminCatalogDetail(id: string): Promise<AdminCatalogDetail | null> {
  const client = await requireAdminClient();
  const [{ data, error }, dataset] = await Promise.all([
    client
      .from("watch_references")
      .select(
        `
        *,
        brands(id,name,slug),
        watch_models(
          id,
          name,
          brand_collection_id,
          brand_line_id,
          brand_collections(id,name),
          brand_lines(id,name)
        ),
        catalog_offers(*, inventory_states(id,label,code,is_orderable)),
        watch_images(*)
        `,
      )
      .eq("id", id)
      .maybeSingle(),
    getCatalogReadDataset(),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  const row = data as unknown as AdminCatalogRawRow;
  const byId = publicMapById(dataset);
  return mapCatalogDetail(row, byId.get(row.id) ?? null);
}

async function selectOptions(
  client: Client,
  table:
    | "movement_types"
    | "materials"
    | "colors"
    | "crystal_types"
    | "clasp_types"
    | "case_shapes",
): Promise<AdminSelectOption[]> {
  const { data, error } = await client.from(table).select("id,label,code").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.id, label: row.label, code: row.code }));
}

export async function getAdminCatalogDictionaries(): Promise<AdminCatalogDictionaries> {
  const client = await requireAdminClient();
  const [
    { data: brands, error: brandsError },
    { data: collections, error: collectionsError },
    { data: lines, error: linesError },
    { data: models, error: modelsError },
    movementTypes,
    { data: movements, error: movementsError },
    materials,
    colors,
    crystalTypes,
    claspTypes,
    caseShapes,
    { data: inventoryStates, error: inventoryError },
  ] = await Promise.all([
    client.from("brands").select("id,name,slug").order("name", { ascending: true }),
    client.from("brand_collections").select("id,name").order("name", { ascending: true }),
    client.from("brand_lines").select("id,name").order("name", { ascending: true }),
    client.from("watch_models").select("id,name").order("name", { ascending: true }).limit(2000),
    selectOptions(client, "movement_types"),
    client.from("movements").select("id,display_name,caliber_code").order("display_name", { ascending: true }).limit(2000),
    selectOptions(client, "materials"),
    selectOptions(client, "colors"),
    selectOptions(client, "crystal_types"),
    selectOptions(client, "clasp_types"),
    selectOptions(client, "case_shapes"),
    client.from("inventory_states").select("id,label,code,is_orderable").order("sort_order", { ascending: true }),
  ]);

  const firstError = brandsError ?? collectionsError ?? linesError ?? modelsError ?? movementsError ?? inventoryError;
  if (firstError) throw new Error(firstError.message);

  return {
    brands: (brands ?? []).map((row) => ({ id: row.id, label: row.name, slug: row.slug })),
    collections: (collections ?? []).map((row) => ({ id: row.id, label: row.name })),
    lines: (lines ?? []).map((row) => ({ id: row.id, label: row.name })),
    models: (models ?? []).map((row) => ({ id: row.id, label: row.name })),
    movementTypes,
    movements: (movements ?? []).map((row) => ({
      id: row.id,
      label: row.caliber_code ? `${row.display_name} (${row.caliber_code})` : row.display_name,
      code: row.caliber_code,
    })),
    materials,
    colors,
    crystalTypes,
    claspTypes,
    caseShapes,
    inventoryStates: (inventoryStates ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      code: row.code,
      isOrderable: row.is_orderable,
    })),
  };
}

async function syncCatalogProjectionAfterUpdate(client: Client, input: {
  watchReferenceId: string;
  status: string;
  displayName: string;
  referenceDisplay: string;
  priceMinor: number | null;
}) {
  const { data: projection, error } = await client
    .from("catalog_public_read_models")
    .select("read_model_json")
    .eq("watch_reference_id", input.watchReferenceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const projectionStatus = input.status === "published" || input.status === "archival" ? "published" : "hidden";
  if (!projection) {
    return;
  }

  const readModel = jsonObject(projection.read_model_json);
  if (!readModel) {
    await client.from("catalog_public_read_models").update({ status: projectionStatus }).eq("watch_reference_id", input.watchReferenceId);
    return;
  }

  readModel.title = input.displayName;
  readModel.officialName = input.displayName;
  readModel.referenceDisplay = input.referenceDisplay;
  readModel.publicPrice = input.priceMinor === null ? null : { amountMinor: input.priceMinor, currencyCode: "RUB" };

  await client
    .from("catalog_public_read_models")
    .update({
      status: projectionStatus,
      read_model_json: readModel as Json,
    })
    .eq("watch_reference_id", input.watchReferenceId);
}

export async function updateAdminCatalogReference(formData: FormData): Promise<{ ok: true; id: string }> {
  const access = await requireAdminAccess();
  if (!access.allowed) {
    throw new Error(access.reason);
  }
  const client = requireClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing_reference_id");
  const displayName = nullableText(formData.get("displayName"));
  const referenceDisplay = nullableText(formData.get("referenceDisplay"));
  const brandId = nullableText(formData.get("brandId"));
  const modelId = nullableText(formData.get("modelId"));
  const status = String(formData.get("status") ?? "");
  const referenceStatus = String(formData.get("referenceStatus") ?? "");
  const dataConfidence = String(formData.get("dataConfidence") ?? "imported");

  if (!displayName || !referenceDisplay) throw new Error("identity_required");
  if (!["draft", "published", "archival", "hidden"].includes(status)) throw new Error("invalid_status");
  if (!["current", "discontinued", "catalog_only", "unknown"].includes(referenceStatus)) throw new Error("invalid_reference_status");
  if (!["verified", "imported", "partial", "unknown"].includes(dataConfidence)) throw new Error("invalid_data_confidence");

  const priceMinor = moneyFromRubInput(nullableText(formData.get("priceRub")));
  const offerStatus = String(formData.get("offerStatus") ?? "active");
  if (!["active", "inactive", "archived", "draft"].includes(offerStatus)) throw new Error("invalid_offer_status");

  const watchUpdate: Database["public"]["Tables"]["watch_references"]["Update"] = {
    ...(brandId ? { brand_id: brandId } : {}),
    ...(modelId ? { watch_model_id: modelId } : {}),
    display_name: displayName,
    reference_code_display: referenceDisplay,
    status,
    reference_status: referenceStatus,
    data_confidence: dataConfidence,
    short_description: nullableText(formData.get("shortDescription")),
    description: nullableText(formData.get("description")),
    movement_description: nullableText(formData.get("movementDescription")),
    fit_description: nullableText(formData.get("fitDescription")),
    water_resistance_description: nullableText(formData.get("waterResistanceDescription")),
    set_contents_description: nullableText(formData.get("setContentsDescription")),
    authenticity_description: nullableText(formData.get("authenticityDescription")),
    movement_type_id: nullableText(formData.get("movementTypeId")),
    movement_id: nullableText(formData.get("movementId")),
    case_material_id: nullableText(formData.get("caseMaterialId")),
    case_coating_material_id: nullableText(formData.get("caseCoatingMaterialId")),
    case_shape_id: nullableText(formData.get("caseShapeId")),
    case_color_id: nullableText(formData.get("caseColorId")),
    dial_color_id: nullableText(formData.get("dialColorId")),
    crystal_type_id: nullableText(formData.get("crystalTypeId")),
    strap_material_id: nullableText(formData.get("strapMaterialId")),
    bracelet_material_id: nullableText(formData.get("braceletMaterialId")),
    clasp_type_id: nullableText(formData.get("claspTypeId")),
    case_diameter_mm: nullableNumber(formData.get("caseDiameterMm")),
    case_width_mm: nullableNumber(formData.get("caseWidthMm")),
    lug_to_lug_mm: nullableNumber(formData.get("lugToLugMm")),
    case_thickness_mm: nullableNumber(formData.get("caseThicknessMm")),
    lug_width_mm: nullableNumber(formData.get("lugWidthMm")),
    weight_g: nullableNumber(formData.get("weightG")),
    water_resistance_m: nullableInteger(formData.get("waterResistanceM")),
    has_date: formBoolean(formData, "hasDate"),
    has_day_date: formBoolean(formData, "hasDayDate"),
    has_gmt: formBoolean(formData, "hasGmt"),
    has_chronograph: formBoolean(formData, "hasChronograph"),
    has_tachymeter: formBoolean(formData, "hasTachymeter"),
    has_world_time: formBoolean(formData, "hasWorldTime"),
    has_alarm: formBoolean(formData, "hasAlarm"),
    has_stopwatch: formBoolean(formData, "hasStopwatch"),
    has_timer: formBoolean(formData, "hasTimer"),
    has_moon_phase: formBoolean(formData, "hasMoonPhase"),
    has_rotating_bezel: formBoolean(formData, "hasRotatingBezel"),
  };

  const { data: beforeReference } = await client
    .from("watch_references")
    .select("id,display_name,status,reference_code_display")
    .eq("id", id)
    .maybeSingle();

  const { error: referenceError } = await client.from("watch_references").update(watchUpdate).eq("id", id);
  if (referenceError) throw new Error(referenceError.message);

  const { data: offers, error: offerReadError } = await client
    .from("catalog_offers")
    .select("*")
    .eq("watch_reference_id", id)
    .order("is_visible", { ascending: false })
    .order("updated_at", { ascending: false });
  if (offerReadError) throw new Error(offerReadError.message);
  const offer = activeOffer({ catalog_offers: offers ?? [] } as AdminCatalogRawRow);
  const offerUpdate: Database["public"]["Tables"]["catalog_offers"]["Update"] = {
    current_price_minor: priceMinor,
    currency_code: priceMinor === null ? null : "RUB",
    status: offerStatus,
    is_visible: formBoolean(formData, "isVisible"),
    inventory_state_id: nullableText(formData.get("inventoryStateId")),
    purchase_limit: nullableInteger(formData.get("purchaseLimit")),
    seller_note: nullableText(formData.get("sellerNote")),
  };

  if (offer) {
    const { error: offerUpdateError } = await client.from("catalog_offers").update(offerUpdate).eq("id", offer.id);
    if (offerUpdateError) throw new Error(offerUpdateError.message);
    if (priceMinor !== null && priceMinor !== offer.current_price_minor) {
      await client.from("offer_price_history").insert({
        catalog_offer_id: offer.id,
        price_minor: priceMinor,
        currency_code: "RUB",
        changed_by: access.user.id,
        reason: "admin.catalog.update",
      });
    }
  } else {
    const { data: insertedOffer, error: insertOfferError } = await client
      .from("catalog_offers")
      .insert({
        watch_reference_id: id,
        current_price_minor: priceMinor,
        currency_code: priceMinor === null ? null : "RUB",
        status: offerStatus,
        is_visible: formBoolean(formData, "isVisible"),
        inventory_state_id: nullableText(formData.get("inventoryStateId")),
        purchase_limit: nullableInteger(formData.get("purchaseLimit")),
        seller_note: nullableText(formData.get("sellerNote")),
      })
      .select("id")
      .single();
    if (insertOfferError) throw new Error(insertOfferError.message);
    if (insertedOffer && priceMinor !== null) {
      await client.from("offer_price_history").insert({
        catalog_offer_id: insertedOffer.id,
        price_minor: priceMinor,
        currency_code: "RUB",
        changed_by: access.user.id,
        reason: "admin.catalog.initial_price",
      });
    }
  }

  await syncCatalogProjectionAfterUpdate(client, {
    watchReferenceId: id,
    status,
    displayName,
    referenceDisplay,
    priceMinor,
  });

  await insertAuditLog(client, {
    actorUserId: access.user.id,
    action: "admin.catalog.update",
    entityType: "watch_reference",
    entityId: id,
    metadata: {
      before: beforeReference ? { displayName: beforeReference.display_name, status: beforeReference.status } : null,
      after: { displayName, status, referenceDisplay, priceMinor, offerStatus },
    },
  });

  return { ok: true, id };
}

export async function updateAdminCatalogImage(formData: FormData): Promise<{ ok: true; watchReferenceId: string }> {
  const access = await requireAdminAccess();
  if (!access.allowed) throw new Error(access.reason);
  const client = requireClient();
  const imageId = String(formData.get("imageId") ?? "");
  const watchReferenceId = String(formData.get("watchReferenceId") ?? "");
  if (!imageId || !watchReferenceId) throw new Error("missing_image_id");
  const status = String(formData.get("imageStatus") ?? "published");
  if (!["draft", "published", "hidden", "archived"].includes(status)) throw new Error("invalid_image_status");

  const makePrimary = formBoolean(formData, "isPrimary");
  if (makePrimary) {
    const { error: clearError } = await client
      .from("watch_images")
      .update({ is_primary: false })
      .eq("watch_reference_id", watchReferenceId);
    if (clearError) throw new Error(clearError.message);
  }

  const { error } = await client
    .from("watch_images")
    .update({
      alt_text: nullableText(formData.get("altText")),
      sort_order: nullableInteger(formData.get("sortOrder")) ?? 0,
      status,
      is_primary: makePrimary,
    })
    .eq("id", imageId)
    .eq("watch_reference_id", watchReferenceId);
  if (error) throw new Error(error.message);

  await insertAuditLog(client, {
    actorUserId: access.user.id,
    action: "admin.catalog_image.update",
    entityType: "watch_image",
    entityId: imageId,
    metadata: { watchReferenceId, status, makePrimary },
  });

  return { ok: true, watchReferenceId };
}

export async function bulkUpdateAdminCatalogPublication(formData: FormData): Promise<{ ok: true; count: number }> {
  const access = await requireAdminAccess();
  if (!access.allowed) throw new Error(access.reason);
  const client = requireClient();
  const action = String(formData.get("bulkAction") ?? "");
  const ids = formData.getAll("selectedReferenceId").map(String).filter(Boolean);
  if (ids.length === 0) return { ok: true, count: 0 };
  const nextStatus = action === "publish" ? "published" : action === "unpublish" ? "hidden" : null;
  if (!nextStatus) throw new Error("invalid_bulk_action");

  const { error } = await client.from("watch_references").update({ status: nextStatus }).in("id", ids);
  if (error) throw new Error(error.message);
  await client.from("catalog_public_read_models").update({ status: nextStatus === "published" ? "published" : "hidden" }).in("watch_reference_id", ids);

  await insertAuditLog(client, {
    actorUserId: access.user.id,
    action: "admin.catalog.bulk_publication",
    entityType: "watch_reference",
    entityId: null,
    metadata: { count: ids.length, nextStatus },
  });

  return { ok: true, count: ids.length };
}

export async function getAdminOrderDetail(orderNumber: string): Promise<CommerceOrderDetail | null> {
  const client = await requireAdminClient();
  return getOrderDetailByNumber(orderNumber, { admin: true }, client);
}

function rowCountByStatus(rows: Array<{ status: string }>, status: string) {
  return rows.filter((row) => row.status === status).length;
}

function mapImportBatch(batch: ImportBatchRow, rows: ImportRow[]): AdminImportBatchListItem {
  const batchRows = rows.filter((row) => row.import_batch_id === batch.id);
  return {
    id: batch.id,
    createdAt: batch.created_at,
    appliedAt: batch.applied_at,
    uploadedBy: batch.uploaded_by,
    sourceFilename: batch.source_filename,
    sourceKind: batch.source_kind,
    status: batch.status,
    totalRows: batchRows.length,
    eligibleRows: rowCountByStatus(batchRows, "eligible"),
    manualReviewRows: rowCountByStatus(batchRows, "manual_review"),
    blockedRows: rowCountByStatus(batchRows, "blocked"),
    skippedRows: rowCountByStatus(batchRows, "skipped"),
    appliedRows: rowCountByStatus(batchRows, "applied"),
    errorRows: batchRows.filter((row) => {
      const errors = row.errors_json;
      return Array.isArray(errors) ? errors.length > 0 : Boolean(errors && typeof errors === "object" && Object.keys(errors).length);
    }).length,
  };
}

function matchesImport(batch: AdminImportBatchListItem, filters: AdminImportFilters): boolean {
  const query = filters.query?.trim().toLowerCase();
  if (filters.status && batch.status !== filters.status) return false;
  if (filters.sourceKind && batch.sourceKind !== filters.sourceKind) return false;
  if (query) {
    const haystack = [batch.sourceFilename, batch.sourceKind, batch.status, batch.id].join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

export async function listAdminImportBatches(filters: AdminImportFilters = {}): Promise<AdminImportListResult> {
  const client = await requireAdminClient();
  const [{ data: batches, error: batchError }, { data: rows, error: rowError }] = await Promise.all([
    client.from("import_batches").select("*").order("created_at", { ascending: false }).limit(500),
    client.from("import_rows").select("*").order("created_at", { ascending: false }).limit(10000),
  ]);
  if (batchError || rowError) {
    throw new Error(batchError?.message ?? rowError?.message ?? "import_read_failed");
  }

  const allItems = ((batches ?? []) as ImportBatchRow[]).map((batch) => mapImportBatch(batch, (rows ?? []) as ImportRow[]));
  const filtered = allItems.filter((batch) => matchesImport(batch, filters));
  const statuses = [...allItems.reduce((map, batch) => {
    map.set(batch.status, (map.get(batch.status) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()].map(([status, count]) => ({ status, count }));
  const sourceKinds = [...allItems.reduce((map, batch) => {
    map.set(batch.sourceKind, (map.get(batch.sourceKind) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()].map(([sourceKind, count]) => ({ sourceKind, count }));
  const page = pagination({ total: filtered.length, page: filters.page, pageSize: filters.pageSize });

  return {
    items: filtered.slice(page.from, page.to),
    total: filtered.length,
    page: page.page,
    pageSize: page.pageSize,
    pageCount: page.pageCount,
    statuses: statuses.sort((left, right) => left.status.localeCompare(right.status)),
    sourceKinds: sourceKinds.sort((left, right) => left.sourceKind.localeCompare(right.sourceKind)),
  };
}

export async function getAdminImportDetail(batchId: string): Promise<AdminImportDetail | null> {
  const client = await requireAdminClient();
  const [{ data: batch }, { data: rows }, { data: logs }] = await Promise.all([
    client.from("import_batches").select("*").eq("id", batchId).maybeSingle(),
    client
      .from("import_rows")
      .select("*")
      .eq("import_batch_id", batchId)
      .in("status", ["blocked", "manual_review", "failed"])
      .order("row_number", { ascending: true })
      .limit(200),
    client
      .from("audit_logs")
      .select("id,action,created_at,safe_metadata_json")
      .eq("entity_type", "import_batch")
      .eq("entity_id", batchId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (!batch) return null;

  const { data: allRows } = await client.from("import_rows").select("*").eq("import_batch_id", batchId).limit(10000);
  const base = mapImportBatch(batch as ImportBatchRow, (allRows ?? []) as ImportRow[]);
  return {
    ...base,
    mapping: batch.mapping_json,
    summary: batch.summary_json,
    auditLogs: (logs ?? []).map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.created_at,
      metadata: log.safe_metadata_json,
    })),
    problemRows: ((rows ?? []) as ImportRow[]).map((row) => ({
      id: row.id,
      rowNumber: row.row_number,
      status: row.status,
      errors: row.errors_json,
      warnings: row.warnings_json,
      raw: row.raw_json,
      normalized: row.normalized_json,
      createdAt: row.created_at,
    })),
  };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const client = await requireAdminClient();
  const [catalogStats, { data: orders }, { data: shipments }, { data: attempts }, { data: batches }, { data: importRows }, authUsers] =
    await Promise.all([
    getAdminCatalogStats(),
    client.from("orders").select("id, status, payment_status, total_amount_minor"),
    client.from("order_shipments").select("shipment_status, last_error_code"),
    client.from("payment_attempts").select("status, failure_reason"),
    client.from("import_batches").select("*").order("created_at", { ascending: false }).limit(1),
    client.from("import_rows").select("status, errors_json").limit(10000),
    client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const orderRows = (orders ?? []) as Array<Pick<OrderRow, "id" | "status" | "payment_status" | "total_amount_minor">>;
  const shipmentRows = (shipments ?? []) as Array<{ shipment_status: OrderShipmentStatus; last_error_code: string | null }>;
  const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 14;
  const importRowItems = (importRows ?? []) as Array<{ status: string; errors_json: Json }>;

  return {
    ...catalogStats,
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
    recentRegistrations: authUsers.data.users.filter((user) => {
      const created = user.created_at ? new Date(user.created_at).getTime() : 0;
      return created >= recentCutoff;
    }).length,
    paidRevenueMinor: orderRows
      .filter((order) => order.payment_status === "succeeded")
      .reduce((sum, order) => sum + order.total_amount_minor, 0),
    latestImportSource: batches?.[0]?.source_filename ?? null,
    latestImportStatus: batches?.[0]?.status ?? null,
    importBlockedRows: importRowItems.filter((row) => row.status === "blocked").length,
    importManualReviewRows: importRowItems.filter((row) => row.status === "manual_review").length,
    recentImportErrors: importRowItems.filter((row) => {
      const errors = row.errors_json;
      return Array.isArray(errors) ? errors.length > 0 : Boolean(errors && typeof errors === "object" && Object.keys(errors).length);
    }).length,
    failedPaymentAttempts: (attempts ?? []).filter((attempt) => attempt.status === "failed" || Boolean(attempt.failure_reason)).length,
    failedShipments: shipmentRows.filter((shipment) => shipment.shipment_status === "creation_failed" || Boolean(shipment.last_error_code)).length,
  };
}

export async function getAdminSystemOverview(): Promise<AdminSystemOverview> {
  const client = await requireAdminClient();
  const [catalogStats, dashboardStats, dataset, { count: databaseImageRows }, { data: logs }] = await Promise.all([
    getAdminCatalogStats(),
    getAdminDashboardStats(),
    getCatalogReadDataset(),
    client.from("watch_images").select("id", { count: "exact", head: true }),
    client
      .from("audit_logs")
      .select("id,action,entity_type,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const galleryImages = dataset.watches.reduce((sum, watch) => sum + watch.imageGallery.filter((image) => image.kind !== "none").length, 0);
  const missingProductionImages = dataset.watches.filter((watch) => watch.primaryImage.kind === "none").length;

  return {
    generatedAt: new Date().toISOString(),
    environmentLabel: process.env.NODE_ENV === "production" ? "production" : "local",
    catalogStats,
    orderStats: {
      totalOrders: dashboardStats.totalOrders,
      awaitingPayment: dashboardStats.awaitingPayment,
      paid: dashboardStats.paid,
      failedProblemOrders: dashboardStats.failedProblemOrders,
    },
    imageDiagnostics: {
      productionGalleryImages: galleryImages,
      missingProductionImages,
      databaseImageRows: databaseImageRows ?? 0,
    },
    latestAuditLogs: (logs ?? []).map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      createdAt: log.created_at,
    })),
    deployment: {
      codeOnlyDefault: true,
      catalogAssetsExplicitFlag: "-DeployCatalogAssets",
    },
  };
}

function matchesUser(user: AdminUserListItem, filters: AdminUserFilters): boolean {
  const query = filters.query?.trim().toLowerCase();
  if (filters.role && !user.roles.includes(filters.role as RoleCode)) return false;
  if (query) {
    const haystack = [user.email, user.displayName, user.phone, user.city, user.userId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function sortAdminUsers(items: AdminUserListItem[], sort: AdminUserFilters["sort"]) {
  return [...items].sort((left, right) => {
    if (sort === "registered_asc") return String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? ""));
    if (sort === "last_sign_in_desc") return String(right.lastSignInAt ?? "").localeCompare(String(left.lastSignInAt ?? ""));
    if (sort === "orders_desc") return right.ordersCount - left.ordersCount;
    if (sort === "paid_desc") return right.lifetimePaidAmountMinor - left.lifetimePaidAmountMinor;
    return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
  });
}

async function listAdminUsersRaw(): Promise<AdminUserListItem[]> {
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

  return users;
}

export async function listAdminUsersForPanel(filters: AdminUserFilters = {}): Promise<AdminUserListResult> {
  const users = await listAdminUsersRaw();
  const filtered = sortAdminUsers(users.filter((user) => matchesUser(user, filters)), filters.sort);
  const roles = [...users.reduce((map, user) => {
    for (const role of user.roles.length ? user.roles : ["customer"]) {
      map.set(role, (map.get(role) ?? 0) + 1);
    }
    return map;
  }, new Map<string, number>()).entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => left.code.localeCompare(right.code));
  const page = pagination({ total: filtered.length, page: filters.page, pageSize: filters.pageSize });

  return {
    items: filtered.slice(page.from, page.to),
    total: filtered.length,
    page: page.page,
    pageSize: page.pageSize,
    pageCount: page.pageCount,
    roles,
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const client = await requireAdminClient();
  const users = await listAdminUsersRaw();
  const user = users.find((item) => item.userId === userId);
  if (!user) return null;

  const [{ data: profile }, { data: orders }, { data: watches }] = await Promise.all([
    client.from("profiles").select("preferred_contact").eq("id", userId).maybeSingle(),
    client
      .from("orders")
      .select("*, order_items(*), order_shipments(*), payment_attempts(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    client
      .from("user_watches")
      .select("id, display_name, source_kind, ownership_status, created_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    ...user,
    preferredContact: profile?.preferred_contact ?? null,
    recentOrders: ((orders ?? []) as unknown as OrderRow[]).map(mapOrderListItem),
    collection: (watches ?? []).map((watch) => ({
      id: watch.id,
      displayName: watch.display_name,
      sourceKind: watch.source_kind,
      ownershipStatus: watch.ownership_status,
      createdAt: watch.created_at,
    })),
  };
}
