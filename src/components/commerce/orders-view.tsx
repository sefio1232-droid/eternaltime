import Link from "next/link";
import Image from "next/image";
import { cdekTrackingUrl } from "@/modules/commerce/domain/shipping";
import {
  formatCommerceMoney,
  orderStatusLabels,
  paymentStatusLabels,
  refundStatusLabels,
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
  contact_name?: string;
  contact_phone: string;
  total_amount_minor: number;
  payment_status: keyof typeof paymentStatusLabels;
  status: keyof typeof orderStatusLabels;
  delivery_method?: string;
  delivery_city?: string;
  created_at: string;
  updated_at?: string;
  order_items?: Array<{
    brand_name_snapshot?: string;
    display_name_snapshot: string;
    quantity: number;
    reference_display_snapshot: string;
    unit_price_minor?: number;
    line_total_minor?: number;
    image_snapshot?: unknown;
  }>;
  order_shipments?: {
    shipment_status: keyof typeof shipmentStatusLabels;
    tracking_number: string | null;
    pickup_point_code?: string | null;
    pickup_point_address: string | null;
    last_error_code?: string | null;
  } | null;
};

const activeShipmentStatuses = new Set([
  "created",
  "handed_over",
  "in_transit",
  "arrived_at_pickup_point",
  "ready_for_pickup",
  "delivered",
]);

const nextStatusActions: Partial<Record<keyof typeof orderStatusLabels, { nextStatus: string; label: string }>> = {
  paid: { nextStatus: "processing", label: "В обработку" },
  processing: { nextStatus: "supplier_ordered", label: "Заказан у поставщика" },
  supplier_ordered: { nextStatus: "in_transit", label: "В пути" },
  in_transit: { nextStatus: "local_delivery", label: "Передан в доставку" },
  local_delivery: { nextStatus: "completed", label: "Завершить" },
};

function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("ru-RU") : "—";
}

function imageFromSnapshot(snapshot: unknown): { src: string; alt: string } | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const record = snapshot as { src?: unknown; alt?: unknown; kind?: unknown };
  if (record.kind === "none" || typeof record.src !== "string" || !record.src) {
    return null;
  }
  return { src: record.src, alt: typeof record.alt === "string" ? record.alt : "Фото часов" };
}

function shipmentFromOrder(order: OrderListItem) {
  const shipment = order.order_shipments;
  return Array.isArray(shipment) ? shipment[0] : shipment;
}

function orderItemsSummary(items: OrderListItem["order_items"]): string {
  if (!items?.length) {
    return "Состав заказа не сохранён";
  }
  const [first, ...rest] = items;
  const title = [first.brand_name_snapshot, first.display_name_snapshot].filter(Boolean).join(" ");
  return rest.length ? `${title} × ${first.quantity} + ещё ${rest.length}` : `${title} × ${first.quantity}`;
}

function deliveryDestinationShort(order: Pick<OrderListItem, "delivery_method" | "delivery_city">, shipment?: ReturnType<typeof shipmentFromOrder>) {
  const method = order.delivery_method === "cdek_pickup" || order.delivery_method === "pickup" ? "ПВЗ CDEK" : "Курьер";
  const fallbackCity = shipment?.pickup_point_address?.split(",")[2]?.trim();
  return `${method} · ${order.delivery_city ?? fallbackCity ?? "город не указан"}`;
}

function customerShipmentLabel(
  paymentStatus: keyof typeof paymentStatusLabels,
  status: keyof typeof shipmentStatusLabels | null | undefined,
): string {
  if (!status) return paymentStatus === "succeeded" ? "Доставка готовится" : "Доставка появится после оплаты";
  if ((status === "creation_failed" || status === "creation_pending_retry") && paymentStatus === "succeeded") {
    return "Заказ оплачен. Доставка оформляется";
  }
  return shipmentStatusLabels[status];
}

function adminShipmentLabel(status: keyof typeof shipmentStatusLabels | null | undefined): string {
  if (!status) return "Нет отправления";
  if (status === "creation_failed") return "Ошибка создания отправления";
  return shipmentStatusLabels[status];
}

function deliveryAddress(detail: CommerceOrderDetail) {
  if (detail.order.delivery_method === "cdek_pickup") {
    return detail.order.cdek_pickup_point_address ?? "Данные ПВЗ не сохранены";
  }
  return [
    detail.order.delivery_postal_code,
    detail.order.delivery_city,
    detail.order.delivery_street,
    detail.order.delivery_house,
    detail.order.delivery_unit,
  ]
    .filter(Boolean)
    .join(", ");
}

function deliveryMethodLabel(method: string) {
  return method === "cdek_pickup" || method === "pickup" ? "ПВЗ CDEK" : "Курьер CDEK";
}

function rawFailureReason(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const failure = (metadata as { createFailure?: unknown }).createFailure;
  if (!failure || typeof failure !== "object") {
    return null;
  }
  const providerErrors = (failure as { providerErrors?: unknown }).providerErrors;
  if (Array.isArray(providerErrors)) {
    const text = providerErrors
      .map((error) => {
        if (!error || typeof error !== "object") return "";
        const record = error as { code?: unknown; message?: unknown };
        return [record.code, record.message].filter((value) => typeof value === "string" && value).join(": ");
      })
      .filter(Boolean)
      .join("; ");
    if (text) return text;
  }
  const message = (failure as { message?: unknown }).message;
  return typeof message === "string" && message ? message : null;
}

function adminFailureReason(shipment: CommerceOrderDetail["shipments"][number] | undefined): string | null {
  if (!shipment) return null;
  return rawFailureReason(shipment.raw_carrier_metadata) ?? shipment.carrier_status_name ?? shipment.safe_admin_note ?? shipment.last_error_code ?? null;
}

function shipmentDataGaps(detail: CommerceOrderDetail): string[] {
  const gaps: string[] = [];
  if (!detail.order.contact_name) gaps.push("получатель");
  if (!detail.order.contact_phone) gaps.push("телефон");
  if (!detail.order.delivery_city) gaps.push("город");
  if (!detail.order.cdek_destination_city_code) gaps.push("CDEK city/location ID");
  if (detail.order.delivery_method === "cdek_pickup") {
    if (!detail.order.cdek_pickup_point_code) gaps.push("код ПВЗ");
    if (!detail.order.cdek_pickup_point_address) gaps.push("адрес ПВЗ");
  } else {
    if (!detail.order.delivery_street) gaps.push("улица");
    if (!detail.order.delivery_house) gaps.push("дом");
  }
  return gaps;
}

export function OrdersListView({ orders, admin = false }: Readonly<{ orders: OrderListItem[]; admin?: boolean }>) {
  if (orders.length === 0) {
    return (
      <section className={styles.emptyPanel}>
        <p className={styles.eyebrow}>Сейчас</p>
        <h2>{admin ? "Заказы не найдены" : "Заказов пока нет"}</h2>
        <p>{admin ? "Измените фильтры или дождитесь первого реального checkout." : "После оформления покупка появится в этом разделе."}</p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.orderCards}>
        {orders.map((order) => {
          const firstItem = order.order_items?.[0];
          const shipment = shipmentFromOrder(order);
          const image = imageFromSnapshot(firstItem?.image_snapshot);
          const href = admin ? `/admin/orders/${order.order_number}` : `/account/orders/${order.order_number}`;
          const shipmentLabel = admin
            ? adminShipmentLabel(shipment?.shipment_status)
            : customerShipmentLabel(order.payment_status, shipment?.shipment_status);

          return (
            <article key={order.order_number} className={styles.orderCard}>
              <div className={styles.orderThumb} aria-hidden={!image}>
                {image ? <Image src={image.src} alt={image.alt} width={112} height={112} /> : <span>ET</span>}
              </div>
              <div className={styles.orderCardMain}>
                <div>
                  <p className={styles.eyebrow}>{formatDate(order.created_at)}</p>
                  <h2 className={styles.lineTitle}>
                    <Link href={href}>№{order.order_number}</Link>
                  </h2>
                </div>
                <p className={styles.orderItemSummary}>{orderItemsSummary(order.order_items)}</p>
                {firstItem ? <p className={styles.lineMeta}>{firstItem.reference_display_snapshot}</p> : null}
                {admin ? (
                  <p className={styles.lineMeta}>
                    {order.contact_name ?? "Имя не сохранено"} · {order.contact_email} · {order.contact_phone}
                  </p>
                ) : null}
                <p className={styles.lineMeta}>{deliveryDestinationShort(order, shipment)}</p>
              </div>
              <div className={styles.orderCardAside}>
                <strong>{formatCommerceMoney(order.total_amount_minor)}</strong>
                <div className={styles.statusStack}>
                  <span className={styles.statusPill}>{paymentStatusLabels[order.payment_status]}</span>
                  <span className={styles.statusPill}>{orderStatusLabels[order.status]}</span>
                  <span className={styles.statusPill}>{shipmentLabel}</span>
                </div>
                {admin && shipment?.last_error_code ? <p className={styles.lineMeta}>Тех. код: {shipment.last_error_code}</p> : null}
                <Link className={styles.quietLink} href={href}>
                  Открыть
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function OrderDetailView({ detail, admin = false }: Readonly<{ detail: CommerceOrderDetail; admin?: boolean }>) {
  const canRetryPayment = !admin && detail.order.payment_status !== "succeeded" && detail.order.payment_status !== "refunded";
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
    detail.paymentAttempts.find((attempt) => attempt.provider === "yookassa" && attempt.provider_payment_id)?.provider_payment_id ?? null;
  const failureReason = adminFailureReason(shipment);
  const dataGaps = shipmentDataGaps(detail);
  const canCreateShipment =
    admin &&
    detail.order.payment_status === "succeeded" &&
    dataGaps.length === 0 &&
    (!shipment || (!shipment.cdek_order_uuid && !shipment.tracking_number && !activeShipmentStatuses.has(shipment.shipment_status)));

  return (
    <div className={styles.checkoutLayout}>
      <section className={styles.orderDetailStack}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Состав</p>
          <div className={styles.cartLines}>
            {detail.items.map((item) => {
              const image = imageFromSnapshot(item.image_snapshot);
              return (
                <article key={item.id} className={styles.orderProductLine}>
                  <div className={styles.orderThumb} aria-hidden={!image}>
                    {image ? <Image src={image.src} alt={image.alt} width={112} height={112} /> : <span>ET</span>}
                  </div>
                  <div>
                    <p className={styles.eyebrow}>{item.brand_name_snapshot}</p>
                    <h2 className={styles.lineTitle}>{item.display_name_snapshot}</h2>
                    <p className={styles.lineMeta}>Reference: {item.reference_display_snapshot}</p>
                    {admin ? (
                      <p className={styles.lineMeta}>
                        <Link href={item.canonical_href_snapshot}>Открыть карточку товара</Link>
                      </p>
                    ) : null}
                  </div>
                  <div className={styles.productPriceBlock}>
                    <p>{item.quantity} × {formatCommerceMoney(item.unit_price_minor)}</p>
                    <strong>{formatCommerceMoney(item.line_total_minor)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {admin && shipment?.shipment_status === "creation_failed" ? (
          <section className={styles.failurePanel}>
            <p className={styles.eyebrow}>CDEK / требуется действие</p>
            <h2>Не удалось создать отправление CDEK</h2>
            <p>{failureReason ?? "Точная причина не сохранена в старой попытке. Повторный запуск сохранит ответ CDEK без секретов."}</p>
            <dl className={styles.metaGrid}>
              <div><dt>Последняя попытка</dt><dd>{formatDateTime(shipment.last_error_at)}</dd></div>
              <div><dt>Попыток</dt><dd>{shipment.create_attempts}</dd></div>
              <div><dt>Технический код</dt><dd>{shipment.last_error_code ?? "—"}</dd></div>
            </dl>
            {canCreateShipment ? <AdminCreateShipmentButton orderNumber={detail.order.order_number} /> : null}
            {!canCreateShipment && dataGaps.length > 0 ? (
              <p>Повтор невозможен до уточнения данных: {dataGaps.join(", ")}.</p>
            ) : null}
          </section>
        ) : null}

        {admin ? (
          <section className={styles.panel}>
            <p className={styles.eyebrow}>Операционный timeline</p>
            {detail.events.length ? (
              <div className={styles.adminList}>
                {detail.events.map((event) => (
                  <article key={event.id} className={styles.adminListItem}>
                    <div>
                      <p className={styles.eyebrow}>{formatDateTime(event.created_at)}</p>
                      <p className={styles.lineTitle}>{event.event_type}</p>
                    </div>
                    <p className={styles.lineMeta}>{event.message}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.lineMeta}>События заказа пока не записаны.</p>
            )}
          </section>
        ) : null}
      </section>

      <aside className={styles.summaryPanel}>
        <p className={styles.eyebrow}>Заказ №{detail.order.order_number}</p>
        <div className={styles.statusStack}>
          <span className={styles.statusPill}>Оплата: {paymentStatusLabels[detail.order.payment_status]}</span>
          <span className={styles.statusPill}>Заказ: {orderStatusLabels[detail.order.status]}</span>
          <span className={styles.statusPill}>
            Доставка: {admin ? adminShipmentLabel(shipment?.shipment_status) : customerShipmentLabel(detail.order.payment_status, shipment?.shipment_status)}
          </span>
        </div>

        {admin ? (
          <div className={styles.adminShippingMeta}>
            <p className={styles.lineMeta}>Internal ID: {detail.order.id}</p>
            <p className={styles.lineMeta}>User ID: <Link href={`/admin/users/${detail.order.user_id}`}>{detail.order.user_id}</Link></p>
            <p className={styles.lineMeta}>Создан: {formatDateTime(detail.order.created_at)}</p>
            <p className={styles.lineMeta}>Обновлён: {formatDateTime(detail.order.updated_at)}</p>
            <p className={styles.lineMeta}>Оплачен: {formatDateTime(detail.order.paid_at)}</p>
          </div>
        ) : (
          <p className={styles.selectedDelivery}>
            {shipment?.shipment_status === "delivered"
              ? "Часы получены и появятся в вашей коллекции."
              : detail.order.payment_status === "succeeded"
                ? "После получения часы появятся в вашей коллекции."
                : "После оплаты мы начнём оформление доставки."}
          </p>
        )}

        <div className={styles.totals}>
          <div><span>Товары</span><strong>{formatCommerceMoney(detail.order.product_subtotal_minor)}</strong></div>
          <div><span>Доставка для покупателя</span><strong>{formatCommerceMoney(detail.order.delivery_amount_minor)}</strong></div>
          {admin ? (
            <div><span>Фактическая стоимость CDEK</span><strong>{formatCommerceMoney(shipment?.carrier_actual_cost_minor)}</strong></div>
          ) : null}
          <div className={styles.totalStrong}><span>Итого</span><strong>{formatCommerceMoney(detail.order.total_amount_minor)}</strong></div>
        </div>

        <div>
          <p className={styles.eyebrow}>Покупатель</p>
          <p>{detail.order.contact_name}</p>
          <p className={styles.lineMeta}>{detail.order.contact_email}</p>
          <p className={styles.lineMeta}>{detail.order.contact_phone}</p>
          {admin ? <p className={styles.lineMeta}><Link href={`/admin/users/${detail.order.user_id}`}>Открыть профиль клиента</Link></p> : null}
        </div>

        <div>
          <p className={styles.eyebrow}>Куда отправлять</p>
          <p>{deliveryMethodLabel(detail.order.delivery_method)}</p>
          <p className={styles.lineMeta}>Город: {detail.order.delivery_city}</p>
          <p className={styles.lineMeta}>Адрес: {deliveryAddress(detail)}</p>
          {detail.order.cdek_pickup_point_code ? <p className={styles.lineMeta}>Код ПВЗ: {detail.order.cdek_pickup_point_code}</p> : null}
          {detail.order.cdek_pickup_point_name ? <p className={styles.lineMeta}>ПВЗ: {detail.order.cdek_pickup_point_name}</p> : null}
          {detail.order.cdek_destination_city_code ? <p className={styles.lineMeta}>CDEK city/location ID: {detail.order.cdek_destination_city_code}</p> : null}
          {admin && detail.order.delivery_tariff_code ? <p className={styles.lineMeta}>Тариф: {detail.order.delivery_tariff_code}</p> : null}
          {admin && detail.order.delivery_comment ? <p className={styles.lineMeta}>Комментарий доставки: {detail.order.delivery_comment}</p> : null}
          {admin && detail.order.customer_comment ? <p className={styles.lineMeta}>Комментарий клиента: {detail.order.customer_comment}</p> : null}
        </div>

        <div>
          <p className={styles.eyebrow}>Доставка / fulfillment</p>
          {shipment ? (
            <>
              <p>{admin ? adminShipmentLabel(shipment.shipment_status) : customerShipmentLabel(detail.order.payment_status, shipment.shipment_status)}</p>
              {shipment.tracking_number ? <p>Трек-номер: {shipment.tracking_number}</p> : null}
              {trackingUrl ? <p><a href={trackingUrl} target="_blank" rel="noreferrer">Отследить доставку</a></p> : null}
              {admin ? (
                <div className={styles.adminShippingMeta}>
                  <p className={styles.lineMeta}>CDEK UUID: {shipment.cdek_order_uuid ?? "—"}</p>
                  <p className={styles.lineMeta}>CDEK order number: {shipment.cdek_order_number ?? "—"}</p>
                  <p className={styles.lineMeta}>Tracking number: {shipment.tracking_number ?? "—"}</p>
                  <p className={styles.lineMeta}>CDEK status code: {shipment.carrier_status_code ?? "—"}</p>
                  <p className={styles.lineMeta}>CDEK status: {shipment.carrier_status_name ?? shipment.shipment_status}</p>
                  <p className={styles.lineMeta}>Retry/error: {shipment.last_error_code ?? "—"}</p>
                  <p className={styles.lineMeta}>Последняя ошибка: {formatDateTime(shipment.last_error_at)}</p>
                  <p className={styles.lineMeta}>Last sync: {formatDateTime(shipment.last_sync_at)}</p>
                  {failureReason ? <p className={styles.lineMeta}>Причина: {failureReason}</p> : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.lineMeta}>Данные доставки готовятся.</p>
          )}
        </div>

        {admin ? (
          <div>
            <p className={styles.eyebrow}>Оплата</p>
            <p className={styles.lineMeta}>Провайдер: YooKassa</p>
            <p className={styles.lineMeta}>Payment ID: {latestYooKassaPaymentId ?? "—"}</p>
            <p className={styles.lineMeta}>Попыток оплаты: {detail.paymentAttempts.length}</p>
            {detail.paymentAttempts.map((attempt) => (
              <p key={attempt.id} className={styles.lineMeta}>
                {formatDateTime(attempt.created_at)} · {attempt.provider} · {attempt.status} · {formatCommerceMoney(attempt.amount_minor)} · {attempt.provider_payment_id ?? "—"}
              </p>
            ))}
            <p className={styles.lineMeta}>Зарезервировано/возвращено: {formatCommerceMoney(refundReservedAmountMinor)}</p>
            <p className={styles.lineMeta}>Доступно к возврату: {formatCommerceMoney(refundableAmountMinor)}</p>
          </div>
        ) : null}

        {canRetryPayment ? <RetryPaymentButton orderNumber={detail.order.order_number} /> : null}
        {nextAction ? <AdminOrderStatusButton orderNumber={detail.order.order_number} {...nextAction} /> : null}
        {canCreateShipment && shipment?.shipment_status !== "creation_failed" ? <AdminCreateShipmentButton orderNumber={detail.order.order_number} /> : null}
        {admin && shipment?.cdek_order_uuid ? <AdminRefreshShipmentButton orderNumber={detail.order.order_number} /> : null}
        {canRefund ? <AdminRefundButton orderNumber={detail.order.order_number} refundableAmountMinor={refundableAmountMinor} /> : null}

        {admin && detail.refunds.length ? (
          <div>
            <p className={styles.eyebrow}>Возвраты</p>
            {detail.refunds.map((refund) => (
              <p key={refund.id} className={styles.lineMeta}>
                {formatDateTime(refund.created_at)} · {refundStatusLabels[refund.status as keyof typeof refundStatusLabels] ?? refund.status} · {formatCommerceMoney(refund.amount_minor)} · {refund.provider_refund_id ?? "—"}
              </p>
            ))}
          </div>
        ) : null}

        {!admin ? (
          <div>
            <p className={styles.eyebrow}>История</p>
            {detail.events.filter((event) => event.customer_visible).map((event) => (
              <p key={event.id} className={styles.lineMeta}>{formatDateTime(event.created_at)} · {event.message}</p>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
