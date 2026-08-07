"use client";

import Link from "next/link";
import { useLocalCart } from "./use-local-cart";
import { clearLocalCart, removeLocalCartItem, summarizeLocalCart, updateLocalCartQuantity } from "@/modules/cart/application/local-cart";
import styles from "./cart-experience.module.css";

function formatRub(amountMinor: number) { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amountMinor / 100); }

export function CartExperience() {
  const { cart, ready, setCart } = useLocalCart();
  const summary = summarizeLocalCart(cart);
  return (
    <div className={styles.page}>
      <header className={styles.heading}><p>КОРЗИНА</p><h1>Корзина</h1><span>Модели, выбранные для будущего оформления заказа.</span></header>
      {!ready || cart.items.length === 0 ? (
        <section className={styles.empty} aria-busy={!ready}>
          <span aria-hidden="true">01</span>
          <div><p>СЕЙЧАС</p><h2>{ready ? "В корзине пока нет моделей" : "Загружаем корзину…"}</h2><p>Добавление часов в корзину будет подключено к карточкам моделей на следующем этапе.</p></div>
          <nav aria-label="Продолжить"><Link href="/watches">Смотреть каталог</Link><Link href="/selection">Пройти подбор</Link></nav>
        </section>
      ) : (
        <section className={styles.cart}>
          <div className={styles.items}>{cart.items.map((item) => <article key={item.identity}><div><p>{item.brand}</p><h2><Link href={item.canonicalHref}>{item.reference}</Link></h2>{item.publicPriceSnapshot ? <span>{formatRub(item.publicPriceSnapshot.amountMinor)}</span> : <span>Цена уточняется</span>}</div><label>Количество<input type="number" min="1" max="9" value={item.quantity} onChange={(event) => setCart(updateLocalCartQuantity(cart, item.identity, Number(event.target.value)))} /></label><button type="button" onClick={() => setCart(removeLocalCartItem(cart, item.identity))}>Удалить</button></article>)}</div>
          <aside><p>Позиций: {summary.itemCount}</p><strong>{formatRub(summary.knownTotalMinor)}</strong>{summary.unknownPriceCount ? <span>Без цены: {summary.unknownPriceCount}</span> : null}<p>Оформление заказа будет подключено после интеграции корзины с каталогом.</p><button type="button" onClick={() => setCart(clearLocalCart())}>Очистить корзину</button></aside>
        </section>
      )}
    </div>
  );
}
