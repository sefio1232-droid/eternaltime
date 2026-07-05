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
    <div className="md:hidden">
      <button
        type="button"
        className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm font-medium"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((value) => !value)}
      >
        Меню
      </button>
      {isOpen ? (
        <div
          id="mobile-navigation"
          className="absolute left-5 right-5 top-16 z-20 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
        >
          <nav aria-label="Основная мобильная навигация" className="grid gap-1">
            {[...primaryItems, ...utilityItems].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[var(--radius-sm)] px-3 py-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
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
