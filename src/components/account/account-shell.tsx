import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { AccountNav } from "./account-nav";
import styles from "./account-shell.module.css";

export function AccountShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <EditorialContainer className={styles.headerInner}>
          <Link href="/" className={styles.logo} aria-label="Eternal Time, на главную">Eternal Time</Link>
          <Link href="/journal" className={styles.returnLink}>Вернуться к сайту →</Link>
        </EditorialContainer>
      </header>
      <EditorialContainer className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.eyebrow}>ET / ACCOUNT</p>
          <p className={styles.sidebarTitle}>Личное пространство</p>
          <AccountNav />
        </aside>
        <main className={styles.main}>{children}</main>
      </EditorialContainer>
      <footer className={styles.footer}>
        <EditorialContainer><Link href="/">Eternal Time</Link><span>Коллекция, заказы и личные данные — без вымышленных состояний.</span></EditorialContainer>
      </footer>
    </div>
  );
}
