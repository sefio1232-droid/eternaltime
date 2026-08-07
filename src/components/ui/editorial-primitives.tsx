import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

export function EditorialContainer({
  children,
  className = "",
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return <div className={`mx-auto w-full max-w-[var(--container-wide)] px-5 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function EditorialWideContainer({
  children,
  className = "",
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return <div className={`editorial-wide-container ${className}`}>{children}</div>;
}

export function EditorialHeading({
  eyebrow,
  title,
  deck,
  className = "",
}: Readonly<{
  eyebrow?: string;
  title: string;
  deck?: string;
  className?: string;
}>) {
  return (
    <div className={`editorial-heading ${className}`}>
      {eyebrow ? <p className="type-label">{eyebrow}</p> : null}
      <h1 className="editorial-heading-title text-balance">{title}</h1>
      {deck ? <p className="editorial-heading-deck">{deck}</p> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: Readonly<{
  eyebrow?: string;
  title: string;
  action?: { href: string; label: string };
}>) {
  return (
    <header className="section-heading">
      <div>
        {eyebrow ? <p className="type-label">{eyebrow}</p> : null}
        <h2 className="section-heading-title text-balance">{title}</h2>
      </div>
      {action ? (
        <Link href={action.href} className="editorial-link">
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}

export function ThinDivider({ className = "" }: Readonly<{ className?: string }>) {
  return <span aria-hidden="true" className={`thin-divider ${className}`} />;
}

export function IconAction({
  href,
  label,
  icon,
  className = "",
}: Readonly<{
  href: string;
  label: string;
  icon: React.ReactNode;
  className?: string;
}>) {
  return (
    <Link href={href} className={`icon-action ${className}`} aria-label={label} title={label}>
      <span aria-hidden="true">{icon}</span>
    </Link>
  );
}

export function ResponsiveProductMedia({
  image,
  priority = false,
  className = "",
  presentation = "guarded",
}: Readonly<{
  image: CatalogImagePresentation;
  priority?: boolean;
  className?: string;
  presentation?: "guarded" | "card" | "full";
}>) {
  return (
    <div className={`responsive-product-media ${className}`}>
      <CatalogImage image={image} priority={priority} presentation={presentation} />
    </div>
  );
}
