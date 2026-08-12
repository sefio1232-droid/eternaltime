import Link from "next/link";
import { formatCommerceMoney, orderStatusLabels, paymentStatusLabels } from "@/modules/commerce/domain/labels";
import type { CommerceOrderDetail } from "@/modules/commerce/infrastructure/commerce-repository.server";
import { AdminOrderStatusButton, AdminRefundButton, RetryPaymentButton } from "@/components/commerce/order-actions";
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
};

export function OrdersListView({ orders, admin = false }: Readonly<{ orders: OrderListItem[]; admin?: boolean }>) {
  if (orders.length === 0) {
    return (
      <section className={styles.emptyPanel}>
        <p className={styles.eyebrow}>Сейчас</p>
        <h2>Заказов пока нет</h2>
        <p>{admin ? "Новые заказы появятся здесь после успешного checkout." : "После оформления покупка появится в этом разделе."}</p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.cartLines}>
        {orders.map((order) => {
          const firstItem = order.order_items?.[0];
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
  const canRefund = admin && detail.order.payment_status === "succeeded";

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
        <div className={styles.totals}>
          <div><span>Товары</span><strong>{formatCommerceMoney(detail.order.product_subtotal_minor)}</strong></div>
          <div><span>Доставка</span><strong>{formatCommerceMoney(detail.order.delivery_amount_minor)}</strong></div>
          <div className={styles.totalStrong}><span>Итого</span><strong>{formatCommerceMoney(detail.order.total_amount_minor)}</strong></div>
        </div>
        <div>
          <p className={styles.eyebrow}>Получатель</p>
          <p>{detail.order.contact_name}</p>
          <p className={styles.lineMeta}>{detail.order.contact_email} · {detail.order.contact_phone}</p>
          <p className={styles.lineMeta}>
            {detail.order.delivery_postal_code}, {detail.order.delivery_city}, {detail.order.delivery_street}, {detail.order.delivery_house}
            {detail.order.delivery_unit ? `, ${detail.order.delivery_unit}` : ""}
          </p>
          <p className={styles.lineMeta}>
            {detail.order.delivery_provider === "cdek" ? "СДЭК" : detail.order.delivery_provider} ·{" "}
            {detail.order.delivery_method === "cdek_pickup" || detail.order.delivery_method === "pickup" ? "ПВЗ" : "Курьер"}
          </p>
          {detail.order.cdek_pickup_point_code ? (
            <p className={styles.lineMeta}>
              ПВЗ {detail.order.cdek_pickup_point_code}
              {detail.order.cdek_pickup_point_address ? ` · ${detail.order.cdek_pickup_point_address}` : ""}
            </p>
          ) : null}
        </div>
        {canRetry ? <RetryPaymentButton orderNumber={detail.order.order_number} /> : null}
        {nextAction ? <AdminOrderStatusButton orderNumber={detail.order.order_number} {...nextAction} /> : null}
        {canRefund ? <AdminRefundButton orderNumber={detail.order.order_number} /> : null}
        <div>
          <p className={styles.eyebrow}>История</p>
          {detail.events.filter((event) => admin || event.customer_visible).map((event) => (
            <p key={event.id} className={styles.lineMeta}>
              {new Date(event.created_at).toLocaleString("ru-RU")} · {event.message}
            </p>
          ))}
        </div>
      </aside>
    </div>
  );
}
