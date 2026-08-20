import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import {
  formatCommerceMoney,
  orderStatusLabels,
  paymentStatusLabels,
  shipmentStatusLabels,
} from "@/modules/commerce/domain/labels";
import { listAdminOrdersForPanel, type AdminOrderFilters } from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = { title: "Заказы" };
export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const filters: AdminOrderFilters = {
    status: value(params, "status"),
    paymentStatus: value(params, "paymentStatus"),
    deliveryStatus: value(params, "deliveryStatus"),
    dateFrom: value(params, "dateFrom"),
    dateTo: value(params, "dateTo"),
    customer: value(params, "customer"),
    orderNumber: value(params, "orderNumber"),
    query: value(params, "q"),
  };
  const orders = await listAdminOrdersForPanel(filters);

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Заказы</h1>
        <span>List view показывает основные поля и фильтры. Полная операционная карточка открывается в detail view.</span>
      </header>

      <section className={styles.panel}>
        <form className={styles.adminFilters}>
          <label>
            Поиск
            <input name="q" defaultValue={filters.query ?? ""} placeholder="order, email, phone, tracking" />
          </label>
          <label>
            Order number
            <input name="orderNumber" defaultValue={filters.orderNumber ?? ""} />
          </label>
          <label>
            Customer
            <input name="customer" defaultValue={filters.customer ?? ""} placeholder="email / phone / name" />
          </label>
          <label>
            Status
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">Все</option>
              {Object.entries(orderStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Payment
            <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""}>
              <option value="">Все</option>
              {Object.entries(paymentStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Delivery
            <select name="deliveryStatus" defaultValue={filters.deliveryStatus ?? ""}>
              <option value="">Все</option>
              {Object.entries(shipmentStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Date from
            <input name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} />
          </label>
          <label>
            Date to
            <input name="dateTo" type="date" defaultValue={filters.dateTo ?? ""} />
          </label>
          <button className={styles.quietButton} type="submit">Фильтровать</button>
          <Link className={styles.quietButton} href="/admin/orders">Сбросить</Link>
        </form>
      </section>

      <section className={styles.panel}>
        {orders.length ? (
          <div className={styles.adminList}>
            {orders.map((order) => (
              <article key={order.id} className={styles.adminOrderCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.eyebrow}>{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
                    <h2 className={styles.lineTitle}>
                      <Link href={`/admin/orders/${order.orderNumber}`}>№{order.orderNumber}</Link>
                    </h2>
                    <p className={styles.lineMeta}>ID: {order.id}</p>
                  </div>
                  <div>
                    <strong>{formatCommerceMoney(order.totalAmountMinor)}</strong>
                    <p className={styles.lineMeta}>{paymentStatusLabels[order.paymentStatus]} · {orderStatusLabels[order.orderStatus]}</p>
                  </div>
                </div>
                <div className={styles.adminOrderGrid}>
                  <p><span>Покупатель</span>{order.customerName} · {order.customerEmail} · {order.customerPhone}</p>
                  <p><span>Позиции</span>{order.itemSummary}</p>
                  <p><span>Товары</span>{formatCommerceMoney(order.productSubtotalMinor)}</p>
                  <p><span>Доставка для клиента</span>{formatCommerceMoney(order.customerDeliveryAmountMinor)}</p>
                  <p><span>CDEK actual cost</span>{formatCommerceMoney(order.carrierActualCostMinor)}</p>
                  <p><span>YooKassa</span>{order.yookassaPaymentId ?? "—"}</p>
                  <p><span>Получение</span>{order.deliveryMethod} · {order.city}{order.cdekCityCode ? ` · CDEK city ${order.cdekCityCode}` : ""}</p>
                  <p><span>ПВЗ / адрес</span>{order.pickupPointCode ? `${order.pickupPointCode} · ${order.pickupPointAddress}` : order.courierAddress ?? "—"}</p>
                  <p><span>Tracking</span>{order.trackingNumber ?? "—"}</p>
                  <p><span>Shipment</span>{order.shipmentStatus ? shipmentStatusLabels[order.shipmentStatus] : "—"}{order.lastErrorCode ? ` · ${order.lastErrorCode}` : ""}</p>
                  <p><span>CDEK order</span>{order.cdekOrderNumber ?? "—"}</p>
                  <p><span>Updated</span>{new Date(order.updatedAt).toLocaleString("ru-RU")}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>Нет данных</p>
            <h2>Заказы не найдены</h2>
            <p>Измените фильтры или дождитесь первого реального checkout.</p>
          </div>
        )}
      </section>
    </EditorialContainer>
  );
}
