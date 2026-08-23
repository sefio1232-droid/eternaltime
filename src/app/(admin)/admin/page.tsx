import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import adminStyles from "@/components/admin/admin.module.css";
import styles from "@/components/commerce/commerce.module.css";
import { formatCommerceMoney, orderStatusLabels, paymentStatusLabels } from "@/modules/commerce/domain/labels";
import {
  getAdminDashboardStats,
  listAdminOrdersForPanel,
} from "@/modules/admin/infrastructure/admin-repository.server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, latestOrders] = await Promise.all([
    getAdminDashboardStats(),
    listAdminOrdersForPanel({ pageSize: 8 }),
  ]);
  const statCards = [
    ["Catalog total", stats.catalogTotal],
    ["Published", stats.catalogPublished],
    ["Hidden/draft", stats.catalogHidden],
    ["No price", stats.catalogWithoutPrice],
    ["No image", stats.catalogWithoutImage],
    ["Incomplete", stats.catalogIncomplete],
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
    ["Новые пользователи 14д", stats.recentRegistrations],
    ["Blocked import rows", stats.importBlockedRows],
    ["Manual review", stats.importManualReviewRows],
  ] as const;
  const warnings = [
    stats.catalogWithoutImage ? `Без фото: ${stats.catalogWithoutImage}` : null,
    stats.catalogWithoutPrice ? `Без цены: ${stats.catalogWithoutPrice}` : null,
    stats.failedPaymentAttempts ? `Ошибки оплат: ${stats.failedPaymentAttempts}` : null,
    stats.failedShipments ? `Ошибки CDEK: ${stats.failedShipments}` : null,
    stats.recentImportErrors ? `Ошибки импорта: ${stats.recentImportErrors}` : null,
  ].filter(Boolean);

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Операционная панель</h1>
        <span>
          Реальные данные каталога, заказов, пользователей, оплаты и доставки. Если данных нет — показываем нули и
          спокойный empty state без демо-цифр.
        </span>
      </header>

      <section className={adminStyles.card}>
        <div className={adminStyles.toolbar}>
          <div>
            <p className={adminStyles.eyebrow}>Рабочие разделы</p>
            <p className={adminStyles.note}>
              Catalog управляет товарами, ценами, публикацией и существующими image rows. System показывает безопасную
              диагностику без секретов и чувствительных auth-полей.
            </p>
          </div>
          <div className={adminStyles.actions}>
            <Link className={adminStyles.linkButton} href="/admin/catalog">
              Открыть Catalog
            </Link>
            <Link className={adminStyles.linkButton} href="/admin/orders">
              Заказы
            </Link>
            <Link className={adminStyles.linkButton} href="/admin/imports">
              Импорты
            </Link>
            <Link className={adminStyles.linkButton} href="/admin/system">
              System
            </Link>
          </div>
        </div>
      </section>

      <section className={adminStyles.card}>
        <div className={adminStyles.sectionHeader}>
          <div>
            <p className={adminStyles.eyebrow}>Warnings</p>
            <h2>Операционные предупреждения</h2>
          </div>
          {stats.latestImportSource ? (
            <span className={adminStyles.status}>Latest import: {stats.latestImportStatus} · {stats.latestImportSource}</span>
          ) : null}
        </div>
        {warnings.length ? (
          <div className={adminStyles.issueRow}>
            {warnings.map((warning) => <span key={warning} className={adminStyles.issue}>{warning}</span>)}
          </div>
        ) : (
          <p className={adminStyles.note}>Критичных предупреждений по текущим real-data метрикам нет.</p>
        )}
      </section>

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
        {latestOrders.items.length ? (
          <div className={styles.adminList}>
            {latestOrders.items.map((order) => (
              <article key={order.id} className={styles.adminListItem}>
                <div>
                  <Link className={styles.lineTitle} href={`/admin/orders/${order.orderNumber}`}>
                    №{order.orderNumber}
                  </Link>
                  <p className={styles.lineMeta}>
                    {order.customerEmail} · {order.customerPhone}
                  </p>
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
