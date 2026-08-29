"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavigationItem } from "@/config/navigation";
import { SearchDialog } from "@/components/shell/search-dialog";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { CommerceCartIcon } from "@/components/commerce/commerce-actions";

export function MobileNavigation({
  primaryItems,
}: Readonly<{
  primaryItems: NavigationItem[];
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className="mobile-navigation-controls ml-auto flex items-center gap-2 lg:hidden">
      <SearchDialog compact />
      <CommerceCartIcon />
      <ProfileMenu mobile />
      <button
        type="button"
        ref={menuButtonRef}
        className="mobile-menu-button inline-flex items-center justify-center text-sm"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span aria-hidden="true">{isOpen ? "×" : "☰"}</span>
        <span className="sr-only">Меню</span>
      </button>
      {isOpen ? (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Навигация"
          className="mobile-navigation-drawer"
        >
          <div className="mobile-navigation-drawer-head">
            <span>Eternal Time</span>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Закрыть меню">
              ×
            </button>
          </div>
          <nav aria-label="Мобильная навигация" className="mobile-navigation-list">
            {primaryItems.map((item) => (
              <Link key={item.href} href={item.href} className="mobile-navigation-link" onClick={() => setIsOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mobile-navigation-secondary">
            <Link href="/cart" onClick={() => setIsOpen(false)}>
              Корзина
            </Link>
            <Link href="/compare" onClick={() => setIsOpen(false)}>
              Сравнение
            </Link>
            <Link href="/account" onClick={() => setIsOpen(false)}>
              Личный кабинет
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
