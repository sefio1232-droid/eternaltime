import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("first real order operability safeguards", () => {
  it("renders admin order detail with product, reference, customer, delivery, payment and CDEK recovery data", () => {
    const view = read("src/components/commerce/orders-view.tsx");
    const adminDetail = read("src/app/(admin)/admin/orders/[orderNumber]/page.tsx");

    expect(adminDetail).toContain("getAdminOrderDetail");
    expect(view).toContain("item.brand_name_snapshot");
    expect(view).toContain("item.display_name_snapshot");
    expect(view).toContain("item.reference_display_snapshot");
    expect(view).toContain("formatCommerceMoney(item.unit_price_minor)");
    expect(view).toContain("formatCommerceMoney(item.line_total_minor)");
    expect(view).toContain("detail.order.contact_name");
    expect(view).toContain("detail.order.contact_email");
    expect(view).toContain("detail.order.contact_phone");
    expect(view).toContain("detail.order.cdek_pickup_point_code");
    expect(view).toContain("detail.order.cdek_pickup_point_address");
    expect(view).toContain("latestYooKassaPaymentId");
    expect(view).toContain("Не удалось создать отправление CDEK");
    expect(view).toContain("AdminCreateShipmentButton");
    expect(view).toContain("shipmentDataGaps");
  });

  it("keeps customer order pages item-rich while hiding internal CDEK failure codes as primary language", () => {
    const view = read("src/components/commerce/orders-view.tsx");
    const accountList = read("src/app/(account)/account/orders/page.tsx");
    const accountDetail = read("src/app/(account)/account/orders/[orderNumber]/page.tsx");

    expect(accountList).toContain("OrdersListView");
    expect(accountDetail).toContain("OrderDetailView");
    expect(view).toContain("orderItemsSummary");
    expect(view).toContain("Заказ оплачен. Доставка оформляется");
    expect(view).toContain("После получения часы появятся в вашей коллекции.");

    const customerBranch = view.slice(view.indexOf("function customerShipmentLabel"), view.indexOf("function adminShipmentLabel"));
    expect(customerBranch).not.toContain("last_error_code");
    expect(customerBranch).not.toContain("CDEK_SHIPMENT_FAILED");
    expect(customerBranch).not.toContain("cdek_shipment_failed");
  });

  it("links admin order to user and user detail back to the user's real orders", () => {
    const orderView = read("src/components/commerce/orders-view.tsx");
    const userDetail = read("src/app/(admin)/admin/users/[id]/page.tsx");
    const repository = read("src/modules/admin/infrastructure/admin-repository.server.ts");

    expect(orderView).toContain('href={`/admin/users/${detail.order.user_id}`}');
    expect(userDetail).toContain('href={`/admin/orders/${order.orderNumber}`}');
    expect(userDetail).toContain("order.itemSummary");
    expect(userDetail).toContain("shipmentLabel(order.shipmentStatus)");
    expect(repository).toContain("lastOrderAt");
    expect(repository).toContain('.select("user_id, payment_status, total_amount_minor, created_at")');
  });

  it("preserves immutable item and delivery snapshots for order history", () => {
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(repository).toContain("brand_name_snapshot: line.product.brandName");
    expect(repository).toContain("display_name_snapshot: line.product.displayName");
    expect(repository).toContain("reference_display_snapshot: line.product.referenceDisplay");
    expect(repository).toContain("unit_price_minor: line.unitPrice.amountMinor");
    expect(repository).toContain("line_total_minor: line.lineTotalMinor");
    expect(repository).toContain("delivery_quote_snapshot: deliveryQuoteSnapshot");
    expect(repository).toContain("cdek_pickup_point_code: normalizedContact.cdekPickupPointCode");
    expect(repository).toContain("cdek_pickup_point_address: normalizedContact.cdekPickupPointAddress");
  });

  it("captures sanitized CDEK provider failure details instead of only a generic code", () => {
    const client = read("src/modules/commerce/infrastructure/cdek-client.server.ts");
    const shipping = read("src/modules/commerce/infrastructure/cdek-shipping-repository.server.ts");

    expect(client).toContain("readonly responseBody?: unknown");
    expect(client).toContain("new CdekShipmentCreationError");
    expect(shipping).toContain("extractCdekProviderErrors");
    expect(shipping).toContain("cdekFailureSnapshot");
    expect(shipping).toContain("createFailure");
    expect(shipping).toContain("requestPayload");
    expect(shipping).toContain("providerHttpStatus");
    expect(shipping).toContain("!normalized.includes(\"secret\")");
    expect(shipping).toContain("raw_carrier_metadata: { ...previousMetadata");
  });

  it("keeps CDEK retry guarded, idempotent and non-duplicating in code paths", () => {
    const shipping = read("src/modules/commerce/infrastructure/cdek-shipping-repository.server.ts");
    const route = read("src/app/api/admin/orders/[orderNumber]/shipment/create/route.ts");
    const view = read("src/components/commerce/orders-view.tsx");

    expect(route).toContain("requireAdminAccess");
    expect(shipping).toContain('.is("cdek_order_uuid", null)');
    expect(shipping).toContain('.in("shipment_status", ["pending_creation", "creation_pending_retry", "creation_failed"])');
    expect(shipping).toContain("if (existingShipment?.cdek_order_uuid || existingShipment?.tracking_number)");
    expect(view).toContain("dataGaps.length === 0");
  });

  it("creates collection ownership only after delivered status and only once per order item", () => {
    const shipping = read("src/modules/commerce/infrastructure/cdek-shipping-repository.server.ts");
    const webhook = read("src/app/api/delivery/cdek/webhook/route.ts");
    const migration = read("supabase/migrations/20260909090000_order_collection_provenance.sql");

    expect(shipping).toContain("export async function ensureUserWatchesForDeliveredOrder");
    expect(shipping).toContain('mapped.status === "delivered"');
    expect(shipping).toContain("source_order_item_id");
    expect(shipping).toContain("resolveWatchReferenceIdForOrderItem");
    expect(shipping).toContain("order.payment_status !== \"succeeded\"");
    expect(webhook).toContain("ensureUserWatchesForDeliveredOrder");
    expect(webhook).toContain('mapped.status === "delivered"');
    expect(migration).toContain("user_watches_source_order_item_unique");
  });

  it("uses responsive cards for admin orders instead of a huge operational spreadsheet", () => {
    const page = read("src/app/(admin)/admin/orders/page.tsx");
    const css = read("src/components/admin/admin.module.css");
    const commerceCss = read("src/components/commerce/commerce.module.css");

    expect(page).toContain("styles.orderRows");
    expect(page).toContain("styles.orderRow");
    expect(page).not.toContain("<table");
    expect(css).toContain(".orderRow");
    expect(css).toContain("@media (max-width: 720px)");
    expect(commerceCss).toContain(".orderCard");
    expect(commerceCss).toContain("grid-template-columns: 4.8rem minmax(0, 1fr)");
  });
});
