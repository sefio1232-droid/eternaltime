import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { ClaimGuestOrderButton, RetryPaymentButton } from "@/components/commerce/order-actions";
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
  const canClaimGuestOrder = Boolean(currentUser.user && detail.order.user_id === null && guestAccessCookie);

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
        <p>Номер заказа: №{detail.order.order_number}</p>
        {detail.items.map((item) => (
          <p key={item.id}>
            {item.brand_name_snapshot} {item.display_name_snapshot} · {item.reference_display_snapshot} · {item.quantity} шт.
          </p>
        ))}
        <p>Сумма: {formatCommerceMoney(detail.order.total_amount_minor)}</p>
        <p>Обычно исполнение заказа занимает около 12 календарных дней. Если потребуется уточнение по конкретному референсу, мы свяжемся с вами по указанным контактам.</p>
        <div className={styles.selectedDelivery}>
          <strong>Что дальше</strong>
          <span>1. Проверим заказ и конкретный референс.</span>
          <span>2. Подтвердим поставку и оплату.</span>
          <span>3. Сообщим о движении заказа.</span>
          <span>4. После доставки часы можно сохранить в коллекции Eternal Time.</span>
        </div>
        {!paid ? <RetryPaymentButton orderNumber={detail.order.order_number} /> : null}
        {canClaimGuestOrder ? <ClaimGuestOrderButton orderNumber={detail.order.order_number} /> : null}
        <div className={styles.drawerActions}>
          {accountOrderHref ? (
            <Link className={styles.buyNow} href={accountOrderHref}>
              Перейти к заказу
            </Link>
          ) : !currentUser.user ? (
            <Link className={styles.buyNow} href={`/login?returnTo=${encodeURIComponent(`/checkout/return?order=${detail.order.order_number}`)}`}>
              Войти и сохранить заказ
            </Link>
          ) : null}
          <Link className={styles.quietButton} href="/watches">
            Смотреть часы
          </Link>
        </div>
      </section>
    </EditorialContainer>
  );
}
