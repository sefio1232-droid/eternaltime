import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { formatCommerceMoney, orderStatusLabels, paymentStatusLabels } from "@/modules/commerce/domain/labels";
import {
  getAdminDashboardStats,
  listAdminOrdersForPanel,
} from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, latestOrders] = await Promise.all([
    getAdminDashboardStats(),
    listAdminOrdersForPanel(),
  ]);
  const statCards = [
    ["Все заказы", stats.totalOrders],
    ["Новые", stats.newOrders],
    ["Awaiting payment", stats.awaitingPayment],
    ["Paid", stats.paid],
    ["Processing", stats.processing],
    ["Shipment pending", stats.shipmentPending],
    ["Shipped / in transit", stats.shippedInTransit],
    ["Delivered", stats.delivered],
    ["Failed / problem", stats.failedProblemOrders],
    ["Пользователи", stats.registeredUsers],
  ] as const;

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Операционная панель</h1>
        <span>Реальные заказы, пользователи, оплата и доставка. Если данных нет — показываем нули и спокойный empty state, без демо-цифр.</span>
      </header>

      <section className={styles.panel}>
        <div className={styles.fieldGrid}>
          {statCards.map(([label, value]) => (
            <article key={label} className={styles.metricCard}>
              <p className={styles.eyebrow}>{label}</p>
              <strong>{value}</strong>
            </article>
          ))}
          <article className={styles.metricCard}>
            <p className={styles.eyebrow}>Выручка paid</p>
            <strong>{formatCommerceMoney(stats.paidRevenueMinor)}</strong>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Последние заказы</p>
            <h2>Живая лента</h2>
          </div>
          <Link className={styles.quietButton} href="/admin/orders">
            Все заказы
          </Link>
        </div>
        {latestOrders.length ? (
          <div className={styles.adminList}>
            {latestOrders.slice(0, 8).map((order) => (
              <article key={order.id} className={styles.adminListItem}>
                <div>
                  <Link className={styles.lineTitle} href={`/admin/orders/${order.orderNumber}`}>
                    №{order.orderNumber}
                  </Link>
                  <p className={styles.lineMeta}>{order.customerEmail} · {order.customerPhone}</p>
                </div>
                <div>
                  <p>{formatCommerceMoney(order.totalAmountMinor)}</p>
                  <p className={styles.lineMeta}>
                    {paymentStatusLabels[order.paymentStatus]} · {orderStatusLabels[order.orderStatus]}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>Сейчас</p>
            <h2>Заказов пока нет</h2>
            <p>После первого реального checkout заказ появится здесь.</p>
          </div>
        )}
      </section>
    </EditorialContainer>
  );
}
