"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavigationItem } from "@/config/navigation";

export function MobileNavigation({
  primaryItems,
  utilityItems,
}: Readonly<{
  primaryItems: NavigationItem[];
  utilityItems: NavigationItem[];
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        className="border border-[var(--border-strong)] px-4 py-2 text-sm"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((value) => !value)}
      >
        Меню
      </button>
      {isOpen ? (
        <div
          id="mobile-navigation"
          className="absolute left-0 right-0 top-[72px] z-30 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-soft)]"
        >
          <form action="/watches" className="mb-5" role="search">
            <label className="sr-only" htmlFor="mobile-site-search">
              Поиск по каталогу
            </label>
            <input
              id="mobile-site-search"
              name="q"
              placeholder="Поиск по часам"
              className="h-12 w-full border-b border-[var(--border-strong)] bg-transparent text-base outline-none"
            />
          </form>
          <nav aria-label="Основная мобильная навигация" className="grid">
            {[...primaryItems, ...utilityItems].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-t border-[var(--border)] py-4 text-lg"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
