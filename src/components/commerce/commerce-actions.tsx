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
      <span className={styles.cartIconGlyph} aria-hidden="true" />
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
          <Link className={styles.buyNow} href="/checkout?source=cart">
            Оформить
          </Link>
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
        <p className={styles.disabledNote}>
          Цена уточняется. Оплата недоступна, пока в публичном каталоге нет корректной цены модели.
        </p>
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
            setDrawerOpen(true);
          }}
        >
          В корзину
        </button>
      </div>
      <p className={styles.disabledNote}>
        Сервер заново проверит модель, цену и доставку перед оплатой. Максимум одной модели в заказе — {commerceCartMaxQuantity}.
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
      }}
    >
      +
    </button>
  );
}
