"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/components/catalog/watch-detail.module.css";

export type CatalogSectionNavItem = {
  href: string;
  label: string;
};

/**
 * Sticky in-page section nav for the watch detail page, with the currently-visible section
 * highlighted (docs/CATALOG_SHOWROOM_RECOVERY.md "Sticky section navigation"). `items` must only
 * ever contain anchors to sections that actually render on this watch — the caller
 * (catalog-watch-detail-page.tsx) filters out "Характеристики"/"На запястье"/"В коллекции" when
 * that section has nothing to show, so this never points at a non-existent id. One
 * IntersectionObserver shared across all tracked sections; server-rendered markup has no active
 * state (every link is still fully functional without JS) — the highlight is a progressive
 * enhancement only.
 */
export function CatalogSectionNav({
  items,
  trailingHref,
  trailingLabel,
}: Readonly<{
  items: CatalogSectionNavItem[];
  trailingHref?: string;
  trailingLabel?: string;
}>) {
  const [activeHref, setActiveHref] = useState<string | null>(null);

  useEffect(() => {
    const sections = items
      .map((item) => ({ href: item.href, element: document.getElementById(item.href.slice(1)) }))
      .filter((entry): entry is { href: string; element: HTMLElement } => entry.element !== null);

    if (sections.length === 0) {
      return;
    }

    const hrefByElement = new Map(sections.map((entry) => [entry.element, entry.href]));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActiveHref(hrefByElement.get(visible.target as HTMLElement) ?? null);
        }
      },
      { rootMargin: "-110px 0px -65% 0px", threshold: 0 },
    );

    sections.forEach(({ element }) => observer.observe(element));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Разделы модели" className={styles.tabs}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          aria-current={activeHref === item.href ? "true" : undefined}
          className={activeHref === item.href ? styles.tabActive : undefined}
        >
          {item.label}
        </a>
      ))}
      {trailingHref && trailingLabel ? <Link href={trailingHref}>{trailingLabel}</Link> : null}
    </nav>
  );
}
