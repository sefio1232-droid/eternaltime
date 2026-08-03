"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./profile-menu.module.css";

const profileItems = [
  { href: "/collection", label: "Моя коллекция", description: "Полка и анализ" },
  { href: "/collection/new", label: "Добавить часы", description: "Вручную или из каталога" },
  { href: "/account", label: "Профиль", description: "Личный раздел" },
  { href: "/login", label: "Войти или зарегистрироваться", description: "Доступ к аккаунту" },
] as const;

export function ProfileMenu({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const collectionActive = pathname.startsWith("/collection");

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  return (
    <div ref={rootRef} className={`${styles.root} ${mobile ? styles.mobile : styles.desktop}`}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label="Открыть профиль"
        aria-expanded={open}
        aria-controls={menuId}
        data-collection-active={collectionActive || undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.icon} aria-hidden="true" />
      </button>
      {open ? (
        <div id={menuId} className={styles.popover} role="dialog" aria-label="Профиль и коллекция">
          <p className={styles.heading}>Ваше пространство</p>
          <nav aria-label="Профиль">
            {profileItems.map((item, index) => {
              const active =
                item.href === "/collection"
                  ? collectionActive
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  ref={index === 0 ? firstItemRef : undefined}
                  href={item.href}
                  className={styles.item}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
