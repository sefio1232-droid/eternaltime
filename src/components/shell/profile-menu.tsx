"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./profile-menu.module.css";

const profileItems = [
  { href: "/account", label: "Обзор", description: "Коллекция, заказы и личные данные" },
  { href: "/cart", label: "Корзина", description: "Модели, выбранные для оформления" },
  { href: "/account/orders", label: "Заказы", description: "История и статусы покупок" },
  { href: "/collection", label: "Коллекция", description: "Часы и профиль коллекции" },
  { href: "/account/profile", label: "Профиль", description: "Контактные данные" },
] as const;

export function ProfileMenu({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const collectionActive = pathname.startsWith("/collection");

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter((item): item is HTMLAnchorElement => Boolean(item));
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    let next = current;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <div ref={rootRef} className={`${styles.root} ${mobile ? styles.mobile : styles.desktop}`}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label="Открыть профиль"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        data-collection-active={collectionActive || undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.icon} aria-hidden="true" />
      </button>
      {open ? (
        <div id={menuId} className={styles.popover}>
          <p className={styles.heading}>Ваше пространство</p>
          <div role="menu" aria-label="Личное пространство" onKeyDown={handleMenuKeyDown}>
            {profileItems.map((item, index) => {
              const active =
                item.href === "/collection"
                  ? collectionActive
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  ref={(node) => { itemRefs.current[index] = node; if (index === 0) firstItemRef.current = node; }}
                  href={item.href}
                  className={styles.item}
                  role="menuitem"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
