import type { Metadata } from "next";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { OrdersListView } from "@/components/commerce/orders-view";
import { listAdminOrders } from "@/modules/commerce/infrastructure/commerce-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = { title: "Заказы" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Заказы</h1>
        <span>Новые, оплаченные и исполняемые заказы Eternal Time.</span>
      </header>
      <OrdersListView orders={orders} admin />
    </EditorialContainer>
  );
}
