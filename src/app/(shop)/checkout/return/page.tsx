import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { formatCommerceMoney, orderStatusLabels, paymentStatusLabels } from "@/modules/commerce/domain/labels";
import { getCurrentUser } from "@/modules/auth/server";
import { getOrderDetailByNumber, reconcileYooKassaPayment } from "@/modules/commerce/infrastructure/commerce-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Статус оплаты",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type CheckoutReturnPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
  const params = await searchParams;
  const orderNumber = typeof params.order === "string" ? params.order : "";
  const currentUser = await getCurrentUser();

  if (!currentUser.user || !orderNumber) {
    return (
      <EditorialContainer className={`${styles.checkoutPage} public-page`}>
        <header className={styles.commerceHeading}>
          <p className={styles.eyebrow}>Оплата</p>
          <h1>Заказ не найден</h1>
          <span>Войдите в аккаунт и откройте заказ из личного кабинета.</span>
        </header>
      </EditorialContainer>
    );
  }

  let detail = await getOrderDetailByNumber(orderNumber, { userId: currentUser.user.id });
  const currentPayment = detail?.paymentAttempts[0]?.provider_payment_id;

  if (currentPayment) {
    await reconcileYooKassaPayment(currentPayment).catch(() => null);
    detail = await getOrderDetailByNumber(orderNumber, { userId: currentUser.user.id });
  }

  if (!detail) {
    return (
      <EditorialContainer className={`${styles.checkoutPage} public-page`}>
        <header className={styles.commerceHeading}>
          <p className={styles.eyebrow}>Оплата</p>
          <h1>Заказ не найден</h1>
          <span>Мы не нашли заказ в вашем аккаунте.</span>
        </header>
      </EditorialContainer>
    );
  }

  const paid = detail.order.payment_status === "succeeded";

  return (
    <EditorialContainer className={`${styles.checkoutPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Оплата</p>
        <h1>{paid ? "Оплата прошла" : "Оплата не завершена"}</h1>
        <span>
          {paid
            ? `Заказ №${detail.order.order_number} оплачен и передан в обработку.`
            : "Заказ сохранен. Вы можете повторить оплату из личного кабинета."}
        </span>
      </header>
      <section className={styles.summaryPanel}>
        <span className={styles.statusPill}>{paymentStatusLabels[detail.order.payment_status]}</span>
        <span className={styles.statusPill}>{orderStatusLabels[detail.order.status]}</span>
        <p>Сумма: {formatCommerceMoney(detail.order.total_amount_minor)}</p>
        <div className={styles.drawerActions}>
          <Link className={styles.buyNow} href={`/account/orders/${detail.order.order_number}`}>
            Перейти к заказу
          </Link>
          <Link className={styles.quietButton} href="/watches">
            Смотреть часы
          </Link>
        </div>
      </section>
    </EditorialContainer>
  );
}
