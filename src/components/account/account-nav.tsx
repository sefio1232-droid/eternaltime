"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountNavigation } from "@/config/navigation";
import styles from "./account-shell.module.css";

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.navigation} aria-label="Личный кабинет">
      {accountNavigation.map((item) => {
        const active = item.href === "/account" ? pathname === item.href : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>;
      })}
    </nav>
  );
}
