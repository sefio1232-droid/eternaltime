import Link from "next/link";
import { publicNavigation } from "@/config/navigation";
import { MobileNavigation } from "@/components/shell/mobile-navigation";
import { PublicNavLink } from "@/components/shell/public-nav-link";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { SearchDialog } from "@/components/shell/search-dialog";
import { CompareTray } from "@/components/comparison/compare-tray";
import { EditorialContainer, IconAction } from "@/components/ui/editorial-primitives";

function HeartIcon() {
  return <span className="icon-heart" />;
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
              <PublicNavLink key={item.href} href={item.href} className="public-nav-link">
                {item.label}
              </PublicNavLink>
            ))}
          </nav>

          <div className="public-actions">
            <SearchDialog compact />
            <IconAction href="/account/favorites" label="Избранное" icon={<HeartIcon />} />
            <ProfileMenu />
          </div>

          <MobileNavigation primaryItems={publicNavigation} />
        </EditorialContainer>
      </header>
      <main>{children}</main>
      <CompareTray />
      <footer className="border-t border-[var(--border)] bg-[var(--canvas)]">
        <EditorialContainer className="grid gap-5 py-8 text-sm md:grid-cols-[1fr_auto]">
          <p className="max-w-xl text-[var(--text-muted)]">
            Каталог, журнал и личная коллекция для осознанного выбора часов.
          </p>
          <nav aria-label="Информационные разделы" className="flex flex-wrap gap-5">
            <Link href="/journal" className="text-[var(--accent-strong)] hover:text-[var(--text)]">Читать журнал</Link>
            <Link href="/faq" className="text-[var(--accent-strong)] hover:text-[var(--text)]">Частые вопросы</Link>
          </nav>
        </EditorialContainer>
      </footer>
    </div>
  );
}
