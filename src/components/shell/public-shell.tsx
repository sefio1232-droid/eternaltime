import Link from "next/link";
import { publicNavigation, utilityNavigation } from "@/config/navigation";
import { Container } from "@/components/ui/container";
import { MobileNavigation } from "@/components/shell/mobile-navigation";

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <Container className="relative flex min-h-16 items-center justify-between gap-4">
          <Link href="/" className="text-base font-semibold tracking-[0.08em]">
            Eternal Time
          </Link>
          <nav aria-label="Основная навигация" className="hidden items-center gap-5 md:flex">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Навигация аккаунта" className="hidden items-center gap-3 lg:flex">
            {utilityNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <MobileNavigation primaryItems={publicNavigation} utilityItems={utilityNavigation} />
        </Container>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <Container className="grid gap-4 py-8 text-sm text-[var(--text-muted)] md:grid-cols-[1fr_auto]">
          <p>Eternal Time. Архитектурный foundation для выбора, покупки и владения часами.</p>
          <p>Юридические и коммерческие данные появятся только после верификации.</p>
        </Container>
      </footer>
    </div>
  );
}
