"use client";

import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { useCommerceCart, useResolvedCommerceCart } from "@/components/commerce/use-commerce-cart";
import { commerceCartMaxQuantity } from "@/modules/commerce/domain/types";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import styles from "@/components/commerce/commerce.module.css";

export function CartExperience() {
  const { items, ready, updateQuantity, removeItem, clear } = useCommerceCart();
  const { summary, loading } = useResolvedCommerceCart(items);

  return (
    <EditorialContainer className={`${styles.cartPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Корзина</p>
        <h1>Корзина</h1>
        <span>
          Модели сохраняются локально для гостя; после входа корзина синхронизируется с Supabase перед оформлением.
        </span>
      </header>

      {!ready || items.length === 0 ? (
        <section className={styles.emptyPanel} aria-busy={!ready}>
          <p className={styles.eyebrow}>Сейчас</p>
          <h2>{ready ? "В корзине пока нет моделей" : "Загружаем корзину…"}</h2>
          <p>Добавьте часы из каталога или начните с подборки.</p>
          <div className={styles.drawerActions}>
            <Link className={styles.buyNow} href="/watches">
              Смотреть часы
            </Link>
            <Link className={styles.quietButton} href="/selection">
              Подбор
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.cartLayout} aria-busy={loading}>
          <div className={styles.panel}>
            <div className={styles.cartLines}>
              {(summary?.lines ?? []).map((line) =>
                line.product ? (
                  <article key={`${line.product.brandSlug}:${line.product.referenceNormalized}`} className={styles.cartLine}>
                    <Link href={line.product.canonicalHref} className={styles.lineMedia}>
                      <CatalogImage image={line.product.image} presentation="card" />
                    </Link>
                    <div>
                      <p className={styles.eyebrow}>{line.product.brandName}</p>
                      <h2 className={styles.lineTitle}>
                        <Link href={line.product.canonicalHref}>{line.product.displayName}</Link>
                      </h2>
                      <p className={styles.lineMeta}>{line.product.referenceDisplay}</p>
                      <p>{formatCommerceMoney(line.lineTotalMinor)}</p>
                      <div className={styles.quantityRow}>
                        <label>
                          Количество{" "}
                          <input
                            type="number"
                            min="1"
                            max={commerceCartMaxQuantity}
                            value={line.quantity}
                            onChange={(event) =>
                              updateQuantity(
                                line.product!.brandSlug,
                                line.product!.referenceNormalized,
                                Number(event.target.value),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.quietButton}
                          onClick={() => removeItem(line.product!.brandSlug, line.product!.referenceNormalized)}
                        >
                          Удалить
                        </button>
                      </div>
                      {line.issue ? <p className={styles.issues}>Модель нельзя оплатить сейчас.</p> : null}
                    </div>
                  </article>
                ) : (
                  <article key={`${line.input.brandSlug}:${line.input.referenceNormalized}`} className={styles.cartLine}>
                    <div className={styles.lineMedia}>ET</div>
                    <div>
                      <p className={styles.eyebrow}>Не найдено</p>
                      <h2 className={styles.lineTitle}>{line.input.referenceNormalized}</h2>
                      <button
                        type="button"
                        className={styles.quietButton}
                        onClick={() => removeItem(line.input.brandSlug, line.input.referenceNormalized)}
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>

          <aside className={styles.summaryPanel}>
            <p className={styles.eyebrow}>Итого</p>
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
            <Link
              className={summary?.purchasable ? styles.buyNow : styles.quietButton}
              aria-disabled={!summary?.purchasable}
              href="/checkout?source=cart"
            >
              Оформить заказ
            </Link>
            <button type="button" className={styles.quietButton} onClick={clear}>
              Очистить корзину
            </button>
          </aside>
        </section>
      )}
    </EditorialContainer>
  );
}
