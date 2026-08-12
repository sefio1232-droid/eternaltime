import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { OrdersListView } from "@/components/commerce/orders-view";
import { getCurrentUser } from "@/modules/auth/server";
import { listOrdersForUser } from "@/modules/commerce/infrastructure/commerce-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = { title: "Мои заказы" };
export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const currentUser = await getCurrentUser();
  if (currentUser.status === "configured" && !currentUser.user) {
    redirect("/login?next=/account/orders");
  }

  const orders = currentUser.user ? await listOrdersForUser(currentUser.user.id) : [];

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Заказы</p>
        <h1>Мои заказы</h1>
        <span>История покупок, статус оплаты и этап исполнения заказа.</span>
      </header>
      <OrdersListView orders={orders} />
    </EditorialContainer>
  );
}
