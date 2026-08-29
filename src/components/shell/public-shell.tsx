import Link from "next/link";
import { publicNavigation } from "@/config/navigation";
import { MobileNavigation } from "@/components/shell/mobile-navigation";
import { PublicNavLink } from "@/components/shell/public-nav-link";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { SearchDialog } from "@/components/shell/search-dialog";
import { CommerceCartIcon } from "@/components/commerce/commerce-actions";
import { CompareTray } from "@/components/comparison/compare-tray";
import { EditorialContainer, IconAction } from "@/components/ui/editorial-primitives";
import { legalDocuments } from "@/content/legal";

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
            <CommerceCartIcon />
            <IconAction href="/account/favorites" label="Избранное" icon={<HeartIcon />} />
            <ProfileMenu />
          </div>

          <MobileNavigation primaryItems={publicNavigation} />
        </EditorialContainer>
      </header>
      <main>{children}</main>
      <CompareTray />
      <footer className="public-footer">
        <EditorialContainer className="public-footer-inner">
          <p className="public-footer-copy">
            Каталог, журнал и личная коллекция для осознанного выбора часов.
          </p>
          <nav aria-label="Информационные разделы" className="public-footer-nav">
            <div className="public-footer-primary">
              <Link href="/journal">Читать журнал</Link>
              <Link href="/faq">Частые вопросы</Link>
              <Link href="/legal">Юридические документы</Link>
            </div>
            <div className="public-footer-legal">
              {legalDocuments
                .filter((document) => ["seller-details", "public-offer", "privacy", "terms", "returns", "delivery-and-payment"].includes(document.slug))
                .map((document) => (
                  <Link key={document.slug} href={document.route}>
                    {document.title}
                  </Link>
                ))}
            </div>
          </nav>
        </EditorialContainer>
      </footer>
    </div>
  );
}
