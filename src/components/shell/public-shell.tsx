import Link from "next/link";
import { publicNavigation, utilityNavigation } from "@/config/navigation";
import { MobileNavigation } from "@/components/shell/mobile-navigation";
import { SearchDialog } from "@/components/shell/search-dialog";
import { EditorialContainer, IconAction } from "@/components/ui/editorial-primitives";

function HeartIcon() {
  return <span className="icon-heart" />;
}

function AccountIcon() {
  return <span className="icon-account" />;
}

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="site-frame min-h-screen bg-[var(--background)]">
      <header className="public-header">
        <EditorialContainer className="public-header-inner">
          <Link href="/" className="public-logo" aria-label="Eternal Time">
            Eternal Time
          </Link>

          <nav aria-label="Основная навигация" className="public-nav">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="public-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="public-actions">
            <SearchDialog compact />
            <IconAction href="/account/favorites" label="Избранное" icon={<HeartIcon />} />
            <IconAction href="/account" label={utilityNavigation.find((item) => item.href === "/account")?.label ?? "Профиль"} icon={<AccountIcon />} />
          </div>

          <MobileNavigation primaryItems={publicNavigation} utilityItems={utilityNavigation} />
        </EditorialContainer>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[var(--border)] bg-[var(--canvas)]">
        <EditorialContainer className="grid gap-5 py-8 text-sm md:grid-cols-[1fr_auto]">
          <p className="max-w-xl text-[var(--text-muted)]">
            Каталог, журнал и личная коллекция для осознанного выбора часов.
          </p>
          <Link href="/journal" className="text-[var(--accent-strong)] hover:text-[var(--text)]">
            Читать журнал
          </Link>
        </EditorialContainer>
      </footer>
    </div>
  );
}
