import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { CheckoutExperience } from "@/components/commerce/checkout-experience";
import { getCurrentUser } from "@/modules/auth/server";
import { normalizeCommerceCartItem } from "@/modules/commerce/domain/cart";
import type { CheckoutSource } from "@/modules/commerce/domain/types";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = {
  title: "Оформление заказа",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type CheckoutPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function buildCheckoutSource(params: Record<string, string | string[] | undefined>): CheckoutSource {
  if (params.source === "buy_now") {
    const item = normalizeCommerceCartItem({
      brandSlug: params.brand,
      referenceNormalized: params.ref,
      quantity: params.qty ?? 1,
      source: "buy_now",
      addedAt: new Date().toISOString(),
    });

    if (!item) {
      redirect("/watches");
    }

    return { type: "buy_now", item };
  }

  return { type: "cart", items: [] };
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const source = buildCheckoutSource(params);
  const currentPath = `/checkout?${new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
  ).toString()}`;

  if (currentUser.status === "unconfigured") {
    return (
      <EditorialContainer className={`${styles.checkoutPage} public-page`}>
        <header className={styles.commerceHeading}>
          <p className={styles.eyebrow}>Оформление</p>
          <h1>Онлайн-оформление скоро откроется</h1>
          <span>Мы уже подготовили корзину, доставку и оплату. Финальное создание заказа включим после подключения личного кабинета.</span>
        </header>
      </EditorialContainer>
    );
  }

  if (!currentUser.user) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  return (
    <EditorialContainer className={`${styles.checkoutPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Оформление</p>
        <h1>Оформление заказа</h1>
        <span>Контакты, доставка и финальная проверка суммы перед переходом на страницу оплаты YooKassa.</span>
      </header>
      <CheckoutExperience source={source} userEmail={currentUser.user.email ?? ""} />
    </EditorialContainer>
  );
}
