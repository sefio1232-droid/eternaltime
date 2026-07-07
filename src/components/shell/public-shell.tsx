import Link from "next/link";
import { publicNavigation, utilityNavigation } from "@/config/navigation";
import { Container } from "@/components/ui/container";
import { MobileNavigation } from "@/components/shell/mobile-navigation";
import { SearchDialog } from "@/components/shell/search-dialog";

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--canvas)]/92 backdrop-blur-md">
        <Container className="flex min-h-16 items-center gap-5">
          <Link href="/" className="mr-4 font-[var(--font-reference)] text-sm font-semibold tracking-[0.18em]">
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
      <footer className="bg-[var(--surface-graphite)] text-[var(--text-inverse)]">
        <Container className="grid gap-6 py-10 text-sm md:grid-cols-[1fr_auto]">
          <p className="max-w-xl text-[var(--surface-steel)]">
            Eternal Time — каталог, журнал и инструменты для осознанного выбора часов.
          </p>
          <Link href="/journal" className="text-[var(--surface-steel)] hover:text-white">
            Читать журнал
          </Link>
        </Container>
      </footer>
    </div>
  );
}
