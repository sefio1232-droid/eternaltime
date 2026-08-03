"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/shell/public-nav-link.module.css";

/**
 * Drop-in replacement for a plain nav <Link> that adds a route-aware active indicator
 * (navy text + champagne underline) without changing base look, markup, or behavior when
 * inactive. Client-only because App Router route-awareness (usePathname) has no server
 * equivalent that PublicShell (a Server Component, shared by every route) can consume without
 * prop-threading through the layouts that render it — those layouts are out of scope to edit.
 */
export function PublicNavLink({
  href,
  className,
  children,
}: Readonly<{ href: string; className?: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className={`${className ?? ""} ${styles.link} ${isActive ? styles.linkActive : ""}`} aria-current={isActive ? "page" : undefined}>
      {children}
    </Link>
  );
}
