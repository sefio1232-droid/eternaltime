import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { RetryPaymentButton } from "@/components/commerce/order-actions";
import { formatCommerceMoney, orderStatusLabels, paymentStatusLabels } from "@/modules/commerce/domain/labels";
import { getCurrentUser } from "@/modules/auth/server";
import { guestOrderAccessCookieName } from "@/modules/commerce/application/guest-order-access.server";
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
  const cookieStore = await cookies();
  const guestAccessCookie = cookieStore.get(guestOrderAccessCookieName)?.value ?? null;

  if (!orderNumber) {
    return (
      <EditorialContainer className={`${styles.checkoutPage} public-page`}>
        <header className={styles.commerceHeading}>
          <p className={styles.eyebrow}>Оплата</p>
          <h1>Заказ не найден</h1>
          <span>Проверьте ссылку или откройте заказ из личного кабинета.</span>
        </header>
      </EditorialContainer>
    );
  }

  let detail = currentUser.user ? await getOrderDetailByNumber(orderNumber, { userId: currentUser.user.id }) : null;
  detail ??= await getOrderDetailByNumber(orderNumber, { guestAccessCookie });
  const currentPayment = detail?.paymentAttempts[0]?.provider_payment_id;

  if (currentPayment) {
    await reconcileYooKassaPayment(currentPayment).catch(() => null);
    detail = currentUser.user ? await getOrderDetailByNumber(orderNumber, { userId: currentUser.user.id }) : null;
    detail ??= await getOrderDetailByNumber(orderNumber, { guestAccessCookie });
  }

  if (!detail) {
    return (
      <EditorialContainer className={`${styles.checkoutPage} public-page`}>
        <header className={styles.commerceHeading}>
          <p className={styles.eyebrow}>Оплата</p>
          <h1>Заказ не найден</h1>
          <span>Мы не нашли заказ для текущей сессии.</span>
        </header>
      </EditorialContainer>
    );
  }

  const paid = detail.order.payment_status === "succeeded";
  const accountOrderHref =
    currentUser.user && detail.order.user_id === currentUser.user.id
      ? `/account/orders/${detail.order.order_number}`
      : null;

  return (
    <EditorialContainer className={`${styles.checkoutPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Оплата</p>
        <h1>{paid ? "Оплата прошла" : "Оплата не завершена"}</h1>
        <span>
          {paid
            ? `Заказ №${detail.order.order_number} оплачен и передан в обработку.`
            : "Заказ сохранен. Если оплата не открылась, вы можете повторить переход к оплате с этой страницы."}
        </span>
      </header>
      <section className={styles.summaryPanel}>
        <span className={styles.statusPill}>{paymentStatusLabels[detail.order.payment_status]}</span>
        <span className={styles.statusPill}>{orderStatusLabels[detail.order.status]}</span>
        <p>Сумма: {formatCommerceMoney(detail.order.total_amount_minor)}</p>
        {!paid ? <RetryPaymentButton orderNumber={detail.order.order_number} /> : null}
        <div className={styles.drawerActions}>
          {accountOrderHref ? (
            <Link className={styles.buyNow} href={accountOrderHref}>
              Перейти к заказу
            </Link>
          ) : (
            <Link className={styles.buyNow} href={`/login?returnTo=${encodeURIComponent(`/checkout/return?order=${detail.order.order_number}`)}`}>
              Создать аккаунт
            </Link>
          )}
          <Link className={styles.quietButton} href="/watches">
            Смотреть часы
          </Link>
        </div>
      </section>
    </EditorialContainer>
  );
}
