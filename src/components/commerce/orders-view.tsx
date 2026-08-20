import Link from "next/link";
import { cdekTrackingUrl } from "@/modules/commerce/domain/shipping";
import {
  formatCommerceMoney,
  orderStatusLabels,
  paymentStatusLabels,
  shipmentStatusLabels,
} from "@/modules/commerce/domain/labels";
import type { CommerceOrderDetail } from "@/modules/commerce/infrastructure/commerce-repository.server";
import {
  AdminCreateShipmentButton,
  AdminOrderStatusButton,
  AdminRefreshShipmentButton,
  AdminRefundButton,
  RetryPaymentButton,
} from "@/components/commerce/order-actions";
import styles from "@/components/commerce/commerce.module.css";

type OrderListItem = {
  order_number: string;
  contact_email: string;
  contact_phone: string;
  total_amount_minor: number;
  payment_status: keyof typeof paymentStatusLabels;
  status: keyof typeof orderStatusLabels;
  created_at: string;
  order_items?: Array<{
    display_name_snapshot: string;
    quantity: number;
    reference_display_snapshot: string;
  }>;
  order_shipments?: {
    shipment_status: keyof typeof shipmentStatusLabels;
    tracking_number: string | null;
    pickup_point_address: string | null;
  } | null;
};

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

export function OrdersListView({ orders, admin = false }: Readonly<{ orders: OrderListItem[]; admin?: boolean }>) {
  if (orders.length === 0) {
    return (
      <section className={styles.emptyPanel}>
        <p className={styles.eyebrow}>Сейчас</p>
        <h2>Заказов пока нет</h2>
        <p>{admin ? "Новые реальные заказы появятся здесь после checkout." : "После оформления покупка появится в этом разделе."}</p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.cartLines}>
        {orders.map((order) => {
          const firstItem = order.order_items?.[0];
          const shipment = order.order_shipments;
          const href = admin ? `/admin/orders/${order.order_number}` : `/account/orders/${order.order_number}`;
          return (
            <article key={order.order_number} className={styles.cartLine}>
              <div>
                <p className={styles.eyebrow}>{new Date(order.created_at).toLocaleDateString("ru-RU")}</p>
                <h2 className={styles.lineTitle}>
                  <Link href={href}>№{order.order_number}</Link>
                </h2>
              </div>
              <div>
                <p className={styles.lineTitle}>
                  {firstItem
                    ? `${firstItem.display_name_snapshot} · ${firstItem.quantity} шт.`
                    : "Состав заказа"}
                </p>
                {admin ? <p className={styles.lineMeta}>{order.contact_email} · {order.contact_phone}</p> : null}
                <p>{formatCommerceMoney(order.total_amount_minor)}</p>
                <span className={styles.statusPill}>{paymentStatusLabels[order.payment_status]}</span>{" "}
                <span className={styles.statusPill}>{orderStatusLabels[order.status]}</span>
                {shipment ? <span className={styles.statusPill}>{shipmentStatusLabels[shipment.shipment_status]}</span> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const nextStatusActions: Partial<Record<keyof typeof orderStatusLabels, { nextStatus: string; label: string }>> = {
  paid: { nextStatus: "processing", label: "В обработку" },
  processing: { nextStatus: "supplier_ordered", label: "Заказан у поставщика" },
  supplier_ordered: { nextStatus: "in_transit", label: "В пути" },
  in_transit: { nextStatus: "local_delivery", label: "В доставку" },
  local_delivery: { nextStatus: "completed", label: "Завершить" },
};

export function OrderDetailView({ detail, admin = false }: Readonly<{ detail: CommerceOrderDetail; admin?: boolean }>) {
  const canRetry = !admin && detail.order.payment_status !== "succeeded" && detail.order.payment_status !== "refunded";
  const nextAction = admin ? nextStatusActions[detail.order.status] : null;
  const refundReservedAmountMinor = detail.refunds
    .filter((refund) => refund.status === "succeeded" || refund.status === "pending")
    .reduce((sum, refund) => sum + refund.amount_minor, 0);
  const refundableAmountMinor = Math.max(0, detail.order.total_amount_minor - refundReservedAmountMinor);
  const canRefund =
    admin &&
    (detail.order.payment_status === "succeeded" || detail.order.payment_status === "partially_refunded") &&
    refundableAmountMinor > 0;
  const shipment = detail.shipments[0];
  const trackingUrl = cdekTrackingUrl(shipment?.tracking_number);
  const latestYooKassaPaymentId =
    detail.paymentAttempts.find((attempt) => attempt.provider === "yookassa" && attempt.provider_payment_id)
      ?.provider_payment_id ?? null;
  const publicAddress =
    detail.order.delivery_method === "cdek_pickup"
      ? detail.order.cdek_pickup_point_address
      : `${detail.order.delivery_postal_code ?? ""}, ${detail.order.delivery_city}, ${detail.order.delivery_street ?? ""}, ${detail.order.delivery_house ?? ""}${
          detail.order.delivery_unit ? `, ${detail.order.delivery_unit}` : ""
        }`;

  return (
    <div className={styles.checkoutLayout}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Состав</p>
        <div className={styles.cartLines}>
          {detail.items.map((item) => (
            <article key={item.id} className={styles.cartLine}>
              <div>
                <p className={styles.eyebrow}>{item.brand_name_snapshot}</p>
                <h2 className={styles.lineTitle}>{item.display_name_snapshot}</h2>
                <p className={styles.lineMeta}>{item.reference_display_snapshot}</p>
              </div>
              <div>
                <p>{item.quantity} × {formatCommerceMoney(item.unit_price_minor)}</p>
                <strong>{formatCommerceMoney(item.line_total_minor)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className={styles.summaryPanel}>
        <p className={styles.eyebrow}>Заказ №{detail.order.order_number}</p>
        <span className={styles.statusPill}>{paymentStatusLabels[detail.order.payment_status]}</span>
        <span className={styles.statusPill}>{orderStatusLabels[detail.order.status]}</span>

        {admin ? (
          <div className={styles.adminShippingMeta}>
            <p className={styles.lineMeta}>Internal ID: {detail.order.id}</p>
            <p className={styles.lineMeta}>User ID: {detail.order.user_id}</p>
            <p className={styles.lineMeta}>Created: {formatDateTime(detail.order.created_at)}</p>
            <p className={styles.lineMeta}>Updated: {formatDateTime(detail.order.updated_at)}</p>
            <p className={styles.lineMeta}>Paid at: {formatDateTime(detail.order.paid_at)}</p>
          </div>
        ) : null}

        <div className={styles.totals}>
          <div><span>Товары</span><strong>{formatCommerceMoney(detail.order.product_subtotal_minor)}</strong></div>
          <div><span>{admin ? "Customer delivery amount" : "Доставка СДЭК"}</span><strong>{formatCommerceMoney(detail.order.delivery_amount_minor)}</strong></div>
          {admin && shipment?.carrier_actual_cost_minor !== null && shipment?.carrier_actual_cost_minor !== undefined ? (
            <div><span>Carrier actual cost</span><strong>{formatCommerceMoney(shipment.carrier_actual_cost_minor)}</strong></div>
          ) : null}
          <div className={styles.totalStrong}><span>Итого</span><strong>{formatCommerceMoney(detail.order.total_amount_minor)}</strong></div>
        </div>

        {admin ? (
          <div>
            <p className={styles.eyebrow}>Payment</p>
            <p className={styles.lineMeta}>YooKassa payment ID: {latestYooKassaPaymentId ?? "—"}</p>
            <p className={styles.lineMeta}>Attempts: {detail.paymentAttempts.length}</p>
            <p className={styles.lineMeta}>Paid amount: {formatCommerceMoney(detail.order.total_amount_minor)}</p>
            <p className={styles.lineMeta}>Refunded / reserved: {formatCommerceMoney(refundReservedAmountMinor)}</p>
            <p className={styles.lineMeta}>Remaining refundable: {formatCommerceMoney(refundableAmountMinor)}</p>
            {detail.paymentAttempts.length ? (
              <div className={styles.adminShippingMeta}>
                {detail.paymentAttempts.map((attempt) => (
                  <p key={attempt.id} className={styles.lineMeta}>
                    {formatDateTime(attempt.created_at)} · {attempt.provider} · {attempt.status} · {formatCommerceMoney(attempt.amount_minor)} · {attempt.provider_payment_id ?? "—"}
                  </p>
                ))}
              </div>
            ) : (
              <p className={styles.lineMeta}>Payment attempts are not recorded yet.</p>
            )}
          </div>
        ) : null}

        <div>
          <p className={styles.eyebrow}>Получатель</p>
          <p>{detail.order.contact_name}</p>
          <p className={styles.lineMeta}>{detail.order.contact_email} · {detail.order.contact_phone}</p>
          <p className={styles.lineMeta}>{publicAddress}</p>
          <p className={styles.lineMeta}>
            {detail.order.delivery_provider === "cdek" ? "СДЭК" : detail.order.delivery_provider} ·{" "}
            {detail.order.delivery_method === "cdek_pickup" || detail.order.delivery_method === "pickup" ? "ПВЗ" : "Курьер"}
          </p>
          {admin ? (
            <>
              <p className={styles.lineMeta}>CDEK city/location ID: {detail.order.cdek_destination_city_code ?? "—"}</p>
              <p className={styles.lineMeta}>Delivery method: {detail.order.delivery_method}</p>
              <p className={styles.lineMeta}>Delivery tariff code: {detail.order.delivery_tariff_code ?? "—"}</p>
              {detail.order.delivery_comment ? <p className={styles.lineMeta}>Delivery comment: {detail.order.delivery_comment}</p> : null}
              {detail.order.customer_comment ? <p className={styles.lineMeta}>Customer comment: {detail.order.customer_comment}</p> : null}
            </>
          ) : null}
          {detail.order.cdek_pickup_point_code ? (
            <p className={styles.lineMeta}>
              ПВЗ {detail.order.cdek_pickup_point_code}
              {detail.order.cdek_pickup_point_address ? ` · ${detail.order.cdek_pickup_point_address}` : ""}
            </p>
          ) : null}
        </div>

        <div>
          <p className={styles.eyebrow}>Доставка</p>
          {shipment ? (
            <>
              <span className={styles.statusPill}>{shipmentStatusLabels[shipment.shipment_status]}</span>
              {shipment.tracking_number ? <p>Трек-номер: {shipment.tracking_number}</p> : null}
              {trackingUrl ? (
                <p>
                  <a href={trackingUrl} target="_blank" rel="noreferrer">
                    Отследить доставку
                  </a>
                </p>
              ) : null}
              {shipment.pickup_point_address ? <p className={styles.lineMeta}>{shipment.pickup_point_address}</p> : null}
              {!shipment.pickup_point_address && detail.order.delivery_method === "cdek_courier" ? (
                <p className={styles.lineMeta}>
                  {detail.order.delivery_city}, {detail.order.delivery_street}, {detail.order.delivery_house}
                </p>
              ) : null}
              {admin ? (
                <div className={styles.adminShippingMeta}>
                  <p className={styles.lineMeta}>Customer delivery amount: {formatCommerceMoney(shipment.customer_delivery_charge_minor)}</p>
                  <p className={styles.lineMeta}>Carrier actual cost: {formatCommerceMoney(shipment.carrier_actual_cost_minor)}</p>
                  <p className={styles.lineMeta}>CDEK UUID: {shipment.cdek_order_uuid ?? "—"}</p>
                  <p className={styles.lineMeta}>CDEK order number: {shipment.cdek_order_number ?? "—"}</p>
                  <p className={styles.lineMeta}>Tracking number: {shipment.tracking_number ?? "—"}</p>
                  <p className={styles.lineMeta}>CDEK status: {shipment.shipment_status}</p>
                  <p className={styles.lineMeta}>Retry/error state: {shipment.last_error_code ?? "—"}</p>
                  <p className={styles.lineMeta}>Last error at: {formatDateTime(shipment.last_error_at)}</p>
                  <p className={styles.lineMeta}>Shipment created: {formatDateTime(shipment.created_at)}</p>
                  <p className={styles.lineMeta}>Shipment updated: {formatDateTime(shipment.updated_at)}</p>
                  <p className={styles.lineMeta}>Last sync: {formatDateTime(shipment.last_sync_at)}</p>
                  {shipment.safe_admin_note ? <p className={styles.lineMeta}>{shipment.safe_admin_note}</p> : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.lineMeta}>Готовим данные доставки.</p>
          )}
        </div>

        {canRetry ? <RetryPaymentButton orderNumber={detail.order.order_number} /> : null}
        {nextAction ? <AdminOrderStatusButton orderNumber={detail.order.order_number} {...nextAction} /> : null}
        {admin && shipment?.shipment_status !== "created" && shipment?.shipment_status !== "handed_over" && shipment?.shipment_status !== "in_transit" && shipment?.shipment_status !== "delivered" ? (
          <AdminCreateShipmentButton orderNumber={detail.order.order_number} />
        ) : null}
        {admin && shipment?.cdek_order_uuid ? <AdminRefreshShipmentButton orderNumber={detail.order.order_number} /> : null}
        {canRefund ? (
          <AdminRefundButton orderNumber={detail.order.order_number} refundableAmountMinor={refundableAmountMinor} />
        ) : null}

        {admin && detail.refunds.length ? (
          <div>
            <p className={styles.eyebrow}>Refunds</p>
            {detail.refunds.map((refund) => (
              <p key={refund.id} className={styles.lineMeta}>
                {formatDateTime(refund.created_at)} · {refund.status} · {formatCommerceMoney(refund.amount_minor)} · {refund.provider_refund_id ?? "—"}
              </p>
            ))}
          </div>
        ) : null}

        <div>
          <p className={styles.eyebrow}>История</p>
          {detail.events.filter((event) => admin || event.customer_visible).map((event) => (
            <p key={event.id} className={styles.lineMeta}>
              {formatDateTime(event.created_at)} · {event.message}
            </p>
          ))}
        </div>
      </aside>
    </div>
  );
}
