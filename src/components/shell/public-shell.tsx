import Link from "next/link";
import { publicNavigation, utilityNavigation } from "@/config/navigation";
import { Container } from "@/components/ui/container";
import { MobileNavigation } from "@/components/shell/mobile-navigation";

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
        <Container className="flex min-h-[72px] items-center gap-5 py-3">
          <Link href="/" className="mr-2 text-base font-semibold leading-none">
            Eternal Time
          </Link>

          <nav aria-label="Основная навигация" className="hidden flex-1 items-center gap-6 md:flex">
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

          <form action="/watches" className="hidden min-w-52 max-w-64 flex-1 lg:block" role="search">
            <label className="sr-only" htmlFor="site-search">
              Поиск по каталогу
            </label>
            <input
              id="site-search"
              name="q"
              placeholder="Поиск по часам"
              className="h-10 w-full border-b border-[var(--border-strong)] bg-transparent px-1 text-sm outline-none placeholder:text-[var(--text-soft)] focus-visible:outline-none focus-visible:ring-0"
            />
          </form>

          <nav aria-label="Сервисная навигация" className="hidden items-center gap-4 md:flex">
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

          <MobileNavigation primaryItems={publicNavigation} utilityItems={utilityNavigation} />
        </Container>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <Container className="grid gap-5 py-10 text-sm text-[var(--text-muted)] md:grid-cols-[1fr_auto]">
          <p className="max-w-xl">
            Eternal Time соединяет каталог часов, редакционные материалы и будущие инструменты подбора и коллекции.
          </p>
          <p>Коммерческие и юридические данные публикуются только после проверки.</p>
        </Container>
      </footer>
    </div>
  );
}
