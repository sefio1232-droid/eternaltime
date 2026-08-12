import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { OrdersListView } from "@/components/commerce/orders-view";
import { listAdminOrders } from "@/modules/commerce/infrastructure/commerce-repository.server";
import { orderStatusLabels } from "@/modules/commerce/domain/labels";
import styles from "@/components/commerce/commerce.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const orders = await listAdminOrders();
  const counts = Object.keys(orderStatusLabels).map((status) => ({
    status: status as keyof typeof orderStatusLabels,
    label: orderStatusLabels[status as keyof typeof orderStatusLabels],
    count: orders.filter((order) => order.status === status).length,
  }));

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Commerce</h1>
        <span>Операционный обзор заказов: оплата приходит только через YooKassa webhook/reconciliation.</span>
      </header>
      <section className={styles.panel}>
        <div className={styles.fieldGrid}>
          {counts.map((item) => (
            <div key={item.status} className={styles.summaryPanel}>
              <p className={styles.eyebrow}>{item.label}</p>
              <strong className={styles.totalStrong}>{item.count}</strong>
            </div>
          ))}
        </div>
      </section>
      <OrdersListView orders={orders.slice(0, 10)} admin />
    </EditorialContainer>
  );
}
