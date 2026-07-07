"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavigationItem } from "@/config/navigation";
import { SearchDialog } from "@/components/shell/search-dialog";

export function MobileNavigation({
  primaryItems,
  utilityItems,
}: Readonly<{
  primaryItems: NavigationItem[];
  utilityItems: NavigationItem[];
}>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ml-auto flex items-center gap-2 md:hidden">
      <SearchDialog compact />
      <button
        type="button"
        className="h-10 border border-[var(--border)] px-3 text-sm"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((value) => !value)}
      >
        Меню
      </button>
      {isOpen ? (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Навигация"
          className="absolute left-0 right-0 top-16 z-40 border-b border-[var(--border)] bg-[var(--canvas)] px-5 py-5 shadow-[var(--shadow-soft)]"
        >
          <nav aria-label="Мобильная навигация" className="grid">
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
