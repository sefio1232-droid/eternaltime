"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import {
  commerceCartMaxQuantity,
  type CommerceCartItemInput,
  type CommerceProductSnapshot,
  type CommerceResolvedSummary,
} from "@/modules/commerce/domain/types";
import { useCommerceCart, useResolvedCommerceCart } from "@/components/commerce/use-commerce-cart";
import { trackAnalyticsEvent } from "@/components/analytics/analytics-client";
import styles from "@/components/commerce/commerce.module.css";

function buyNowHref(product: CommerceProductSnapshot): string {
  const params = new URLSearchParams({
    source: "buy_now",
    brand: product.brandSlug,
    ref: product.referenceNormalized,
    qty: "1",
  });
  return `/checkout?${params.toString()}`;
}

function summaryLines(summary: CommerceResolvedSummary | null) {
  return summary?.lines.filter((line) => line.product) ?? [];
}

export function CommerceCartIcon() {
  const { itemCount, ready } = useCommerceCart();
  const label = itemCount === 1 ? "Корзина, 1 товар" : `Корзина, ${itemCount} товаров`;

  return (
    <Link href="/cart" className={styles.cartIcon} aria-label={ready && itemCount > 0 ? label : "Корзина"}>
      <svg className={styles.cartIconGlyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.25 8.75h9.5l-.72 9.1a2.15 2.15 0 0 1-2.14 1.98H10.1a2.15 2.15 0 0 1-2.14-1.98l-.71-9.1Z" />
        <path d="M8.9 8.75V7.1a3.1 3.1 0 0 1 6.2 0v1.65" />
        <path d="M9.65 12.2h4.7" />
      </svg>
      {ready && itemCount > 0 ? <span className={styles.badge}>{Math.min(99, itemCount)}</span> : null}
    </Link>
  );
}

export function CommerceCartDrawer({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  const { items } = useCommerceCart();
  const { summary } = useResolvedCommerceCart(items);

  if (!open) {
    return null;
  }

  return (
    <aside className={styles.drawer} aria-label="Мини-корзина" aria-live="polite">
      <div className={styles.drawerHeader}>
        <div>
          <p>Добавлено в корзину</p>
          <h2>Мини-корзина</h2>
        </div>
        <button type="button" className={styles.quietButton} onClick={onClose}>
          Закрыть
        </button>
      </div>
      <div className={styles.drawerItems}>
        {summaryLines(summary).slice(-3).map((line) =>
          line.product ? (
            <article key={`${line.product.brandSlug}:${line.product.referenceNormalized}`} className={styles.line}>
              <div className={styles.lineMedia}>
                <CatalogImage image={line.product.image} presentation="card" />
              </div>
              <div>
                <p className={styles.lineTitle}>{line.product.displayName}</p>
                <p className={styles.lineMeta}>
                  {line.product.referenceDisplay} · {line.quantity} шт.
                </p>
                <p className={styles.lineMeta}>{formatCommerceMoney(line.lineTotalMinor)}</p>
              </div>
            </article>
          ) : null,
        )}
      </div>
      <div className={styles.drawerFooter}>
        <div className={styles.totals}>
          <div>
            <span>Товары</span>
            <strong>{formatCommerceMoney(summary?.productSubtotalMinor)}</strong>
          </div>
        </div>
        <div className={styles.drawerActions}>
          <Link className={styles.quietButton} href="/cart">
            Открыть корзину
          </Link>
          {summary?.purchasable ? (
            <Link className={styles.buyNow} href="/checkout?source=cart">
              Оформить
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function CommerceProductActions({
  product,
}: Readonly<{
  product: CommerceProductSnapshot;
}>) {
  const { addItem } = useCommerceCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const commerceState = product.publicCommerceState;
  const cartItem = useMemo<CommerceCartItemInput>(
    () => ({
      brandSlug: product.brandSlug,
      referenceNormalized: product.referenceNormalized,
      quantity: 1,
      source: "catalog",
      addedAt: new Date().toISOString(),
    }),
    [product.brandSlug, product.referenceNormalized],
  );

  if (!product.purchasable) {
    return (
      <div className={styles.productActions}>
        <strong className={styles.lineTitle}>{commerceState?.publicLabel ?? "Сейчас недоступно для заказа"}</strong>
        <p className={styles.disabledNote}>
          Купить эту модель сейчас нельзя, но карточка остаётся полезной: можно изучить характеристики, сравнить часы или подобрать близкий вариант.
        </p>
        <div className={styles.drawerActions}>
          <Link className={styles.quietButton} href="/selection">
            Пройти подбор
          </Link>
          <Link className={styles.quietButton} href="/watches">
            Смотреть похожие модели
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.productActions}>
      <div className={styles.actionGrid}>
        <Link href={buyNowHref(product)} className={styles.buyNow}>
          Купить сейчас
        </Link>
        <button
          type="button"
          className={styles.addToCart}
          onClick={() => {
            addItem(cartItem);
            trackAnalyticsEvent("add_to_cart", {
              brand: product.brandName,
              reference: product.referenceDisplay,
              commerce_state: commerceState?.kind ?? "purchasable",
              source_surface: "watch_detail",
              quantity: 1,
            });
            setDrawerOpen(true);
          }}
        >
          Добавить в корзину
        </button>
      </div>
      <strong className={styles.lineTitle}>{commerceState?.shortLabel ?? "Доступно для заказа"}</strong>
      <p className={styles.disabledNote}>
        Перед оплатой мы ещё раз подтвердим модель, актуальную цену и возможность поставки. Ориентир доставки — около 12 календарных дней. Для одной модели можно выбрать до {commerceCartMaxQuantity} штук.
      </p>
      <CommerceCartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

export function CommerceCardCartButton({
  product,
}: Readonly<{
  product: CommerceProductSnapshot;
}>) {
  const { addItem } = useCommerceCart();

  if (!product.purchasable) {
    return null;
  }

  return (
    <button
      type="button"
      className={styles.cardCartButton}
      aria-label={`Добавить в корзину ${product.brandName} ${product.referenceDisplay}`}
      onClick={() => {
        addItem({
          brandSlug: product.brandSlug,
          referenceNormalized: product.referenceNormalized,
          quantity: 1,
          source: "catalog",
          addedAt: new Date().toISOString(),
        });
        trackAnalyticsEvent("add_to_cart", {
          brand: product.brandName,
          reference: product.referenceDisplay,
          commerce_state: product.publicCommerceState?.kind ?? "purchasable",
          source_surface: "catalog",
          quantity: 1,
        });
      }}
    >
      +
    </button>
  );
}
