"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { useCommerceCart, useResolvedCommerceCart } from "@/components/commerce/use-commerce-cart";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import type { CheckoutContactInput, CheckoutSource, CommerceCartItemInput } from "@/modules/commerce/domain/types";
import styles from "@/components/commerce/commerce.module.css";

type CheckoutExperienceProps = {
  source: CheckoutSource;
  userEmail: string;
};

const emptyContact: CheckoutContactInput = {
  recipientName: "",
  phone: "",
  email: "",
  deliveryMethod: "cdek_courier",
  cdekPickupPointCode: "",
  cdekPickupPointAddress: "",
  city: "",
  postalCode: "",
  street: "",
  house: "",
  unit: "",
  deliveryComment: "",
  customerComment: "",
};

function sourceItems(source: CheckoutSource, cartItems: CommerceCartItemInput[]) {
  return source.type === "buy_now" ? [source.item] : cartItems;
}

export function CheckoutExperience({ source, userEmail }: CheckoutExperienceProps) {
  const cart = useCommerceCart();
  const activeItems = useMemo(() => sourceItems(source, cart.items), [cart.items, source]);
  const { summary, loading } = useResolvedCommerceCart(activeItems);
  const [contact, setContact] = useState<CheckoutContactInput>({ ...emptyContact, email: userEmail });
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (source.type !== "cart" || !cart.ready || cart.items.length === 0) {
      return;
    }

    fetch("/api/cart/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.items }),
    })
      .then((response) => response.ok)
      .catch(() => {
        // Checkout can still proceed from the local intent; merge is retried naturally on another visit.
      });
  }, [cart, source.type]);

  function setField<K extends keyof CheckoutContactInput>(key: K, value: CheckoutContactInput[K]) {
    setContact((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary?.purchasable) {
      setMessage("Проверьте состав заказа и настройку доставки.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const payloadSource: CheckoutSource =
      source.type === "buy_now"
        ? source
        : {
            type: "cart",
            items: activeItems,
          };

    const response = await fetch("/api/checkout/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutSubmissionKey: submissionKey,
        source: payloadSource,
        contact,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setMessage(payload.message || "Не удалось начать оплату. Проверьте данные заказа или попробуйте позже.");
      return;
    }

    if (payload.confirmationUrl) {
      if (source.type === "cart") {
        cart.clear();
      }
      window.location.assign(payload.confirmationUrl);
      return;
    }

    setMessage("Заказ создан, но YooKassa не вернула ссылку подтверждения.");
  }

  return (
    <div className={styles.checkoutLayout} aria-busy={loading || submitting}>
      <form className={`${styles.panel} ${styles.checkoutForm}`} onSubmit={submit} noValidate>
        <p className={styles.eyebrow}>Контакты и доставка</p>
        <div className={styles.fieldGrid}>
          <label>
            Получатель
            <input required autoComplete="name" value={contact.recipientName} onChange={(event) => setField("recipientName", event.target.value)} />
          </label>
          <label>
            Телефон
            <input required type="tel" autoComplete="tel" value={contact.phone} onChange={(event) => setField("phone", event.target.value)} />
          </label>
          <label>
            Email
            <input required type="email" autoComplete="email" value={contact.email} onChange={(event) => setField("email", event.target.value)} />
          </label>
          <label>
            Город
            <input required autoComplete="address-level2" value={contact.city} onChange={(event) => setField("city", event.target.value)} />
          </label>
          <div className={styles.deliveryMapSlot}>
            <p className={styles.eyebrow}>СДЭК</p>
            <strong>Бесплатная доставка от 10 000 ₽, иначе 500 ₽</strong>
            <p className={styles.lineMeta}>
              Здесь подготовлено место для карты СДЭК: выбор ПВЗ будет заполнять код и адрес пункта выдачи без изменения суммы оплаты.
            </p>
            <div className={styles.deliveryChoice} aria-label="Способ доставки СДЭК">
              <button
                type="button"
                aria-pressed={(contact.deliveryMethod ?? "cdek_courier") === "cdek_courier"}
                onClick={() => setField("deliveryMethod", "cdek_courier")}
              >
                Курьер СДЭК
              </button>
              <button
                type="button"
                aria-pressed={contact.deliveryMethod === "cdek_pickup"}
                onClick={() => setField("deliveryMethod", "cdek_pickup")}
              >
                ПВЗ на карте
              </button>
            </div>
            {contact.deliveryMethod === "cdek_pickup" ? (
              <div className={styles.fieldGrid}>
                <label>
                  Код ПВЗ СДЭК
                  <input
                    value={contact.cdekPickupPointCode ?? ""}
                    onChange={(event) => setField("cdekPickupPointCode", event.target.value)}
                    placeholder="Будет заполнено картой"
                  />
                </label>
                <label>
                  Адрес ПВЗ
                  <input
                    value={contact.cdekPickupPointAddress ?? ""}
                    onChange={(event) => setField("cdekPickupPointAddress", event.target.value)}
                    placeholder="Будет заполнено картой"
                  />
                </label>
              </div>
            ) : null}
          </div>
          <label>
            Индекс
            <input required autoComplete="postal-code" value={contact.postalCode} onChange={(event) => setField("postalCode", event.target.value)} />
          </label>
          <label>
            Улица
            <input required autoComplete="address-line1" value={contact.street} onChange={(event) => setField("street", event.target.value)} />
          </label>
          <label>
            Дом
            <input required value={contact.house} onChange={(event) => setField("house", event.target.value)} />
          </label>
          <label>
            Квартира / офис
            <input value={contact.unit ?? ""} onChange={(event) => setField("unit", event.target.value)} />
          </label>
          <label className={styles.fullField}>
            Комментарий курьеру
            <textarea value={contact.deliveryComment ?? ""} onChange={(event) => setField("deliveryComment", event.target.value)} />
          </label>
          <label className={styles.fullField}>
            Комментарий к заказу
            <textarea value={contact.customerComment ?? ""} onChange={(event) => setField("customerComment", event.target.value)} />
          </label>
        </div>
        <button className={styles.buyNow} type="submit" disabled={submitting || !summary?.purchasable}>
          Оплатить
        </button>
        {message ? <p className={styles.issues} role="status">{message}</p> : null}
      </form>

      <aside className={styles.summaryPanel}>
        <p className={styles.eyebrow}>Проверка заказа</p>
        <div className={styles.cartLines}>
          {(summary?.lines ?? []).map((line) =>
            line.product ? (
              <article key={`${line.product.brandSlug}:${line.product.referenceNormalized}`} className={styles.line}>
                <div className={styles.lineMedia}>
                  <CatalogImage image={line.product.image} presentation="card" />
                </div>
                <div>
                  <p className={styles.lineTitle}>{line.product.displayName}</p>
                  <p className={styles.lineMeta}>{line.product.referenceDisplay} · {line.quantity} шт.</p>
                  <p>{formatCommerceMoney(line.lineTotalMinor)}</p>
                </div>
              </article>
            ) : null,
          )}
        </div>
        <div className={styles.totals}>
          <div>
            <span>Товары</span>
            <strong>{formatCommerceMoney(summary?.productSubtotalMinor)}</strong>
          </div>
          <div>
            <span>{summary?.delivery.label ?? "Доставка"}</span>
            <strong>{formatCommerceMoney(summary?.delivery.amountMinor)}</strong>
          </div>
          <div className={styles.totalStrong}>
            <span>К оплате</span>
            <strong>{formatCommerceMoney(summary?.totalAmountMinor)}</strong>
          </div>
        </div>
        {summary?.issues.length ? (
          <ul className={styles.issues}>
            {summary.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <Link className={styles.quietButton} href={source.type === "buy_now" ? "/watches" : "/cart"}>
          Вернуться
        </Link>
      </aside>
    </div>
  );
}
