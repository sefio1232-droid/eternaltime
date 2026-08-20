import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { OrderDetailView } from "@/components/commerce/orders-view";
import { getAdminOrderDetail } from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = { title: "Заказ" };
export const dynamic = "force-dynamic";

type AdminOrderPageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderPageProps) {
  const { orderNumber } = await params;
  const detail = await getAdminOrderDetail(orderNumber);
  if (!detail) {
    notFound();
  }

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Admin / заказ</p>
        <h1>№{detail.order.order_number}</h1>
        <span>Покупатель, состав, платежи, доставка, CDEK-идентификаторы, tracking, фактическая себестоимость и история статусов.</span>
      </header>
      <OrderDetailView detail={detail} admin />
    </EditorialContainer>
  );
}
