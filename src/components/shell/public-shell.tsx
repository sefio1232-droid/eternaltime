import Link from "next/link";
import { publicNavigation, utilityNavigation } from "@/config/navigation";
import { Container } from "@/components/ui/container";
import { MobileNavigation } from "@/components/shell/mobile-navigation";
import { SearchDialog } from "@/components/shell/search-dialog";

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="site-frame min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--canvas)]/88 backdrop-blur-xl">
        <Container className="flex min-h-16 items-center gap-5">
          <Link href="/" className="mr-4 border-r border-[var(--border)] pr-5 font-[var(--font-reference)] text-sm font-semibold tracking-[0.18em]">
            ETERNAL TIME
          </Link>

          <nav aria-label="Основная навигация" className="hidden flex-1 items-center gap-7 md:flex">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <SearchDialog />
            <nav aria-label="Сервисная навигация" className="flex items-center gap-4">
              {utilityNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <MobileNavigation primaryItems={publicNavigation} utilityItems={utilityNavigation} />
        </Container>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[var(--border)] bg-[var(--surface-paper)]">
        <Container className="grid gap-6 py-10 text-sm md:grid-cols-[1fr_auto]">
          <p className="max-w-xl text-[var(--text-muted)]">
            Eternal Time помогает выбирать часы спокойно: через каталог, понятные материалы и будущую личную коллекцию.
          </p>
          <Link href="/journal" className="text-[var(--accent-strong)] hover:text-[var(--text)]">
            Читать журнал
          </Link>
        </Container>
      </footer>
    </div>
  );
}
