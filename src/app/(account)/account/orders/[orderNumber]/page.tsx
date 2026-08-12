import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { OrderDetailView } from "@/components/commerce/orders-view";
import { getCurrentUser } from "@/modules/auth/server";
import { getOrderDetailByNumber } from "@/modules/commerce/infrastructure/commerce-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = { title: "Заказ" };
export const dynamic = "force-dynamic";

type OrderPageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function AccountOrderDetailPage({ params }: OrderPageProps) {
  const currentUser = await getCurrentUser();
  if (currentUser.status === "configured" && !currentUser.user) {
    redirect("/login?next=/account/orders");
  }
  if (!currentUser.user) {
    notFound();
  }

  const { orderNumber } = await params;
  const detail = await getOrderDetailByNumber(orderNumber, { userId: currentUser.user.id });
  if (!detail) {
    notFound();
  }

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Заказ</p>
        <h1>№{detail.order.order_number}</h1>
        <span>Подтвержденная сумма, состав, доставка и история статусов.</span>
      </header>
      <OrderDetailView detail={detail} />
    </EditorialContainer>
  );
}
