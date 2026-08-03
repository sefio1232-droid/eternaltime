import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { formatCatalogCount } from "@/modules/catalog/application/catalog-format";
import { displayWatchModelHeading } from "@/modules/catalog/application/catalog-display";
import type { CatalogWatchCard } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-hero.module.css";

/**
 * The catalog's first viewport — a real product composition (Phase 4 "radical rebuild"), not
 * decorative shapes. `heroWatches` are picked by `pickCatalogHeroWatches` (Recommended ranking,
 * clean-image only, brand-diverse) and rendered as three real, clickable watches at different
 * scales on one shared stage — never a synthetic/invented model, never a caseback or technical
 * angle. Server Component throughout; the only motion is a pure-CSS slow drift on the two
 * secondary watches (see catalog-hero.module.css), which respects `prefers-reduced-motion` on its
 * own and needs no client JS at all.
 */
export function CatalogHero({
  eyebrow,
  title,
  description,
  totalRecords,
  brandCount,
  heroWatches,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  totalRecords: number;
  brandCount: number | null;
  heroWatches: CatalogWatchCard[];
}>) {
  const [primary, ...secondary] = heroWatches;
  const statLine = brandCount
    ? `${formatCatalogCount(totalRecords)} моделей · ${brandCount} ${brandCount === 1 ? "бренд" : "бренда"} · реальные характеристики`
    : `${formatCatalogCount(totalRecords)} моделей · реальные характеристики`;

  return (
    <header className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{description}</p>
        <p className={styles.stat}>{statLine}</p>
        <Link href="/selection" className={styles.cta}>
          Перейти к подбору <span aria-hidden="true">→</span>
        </Link>
      </div>

      {primary ? (
        <div className={styles.stage}>
          <Link href={primary.href} className={styles.primaryWatch} aria-label={displayWatchModelHeading({ brandName: primary.brandName, title: primary.title, referenceDisplay: primary.referenceDisplay })}>
            <CatalogImage image={primary.primaryImage} presentation="guarded" compositionSlot="catalog-hero-primary" priority />
          </Link>
          {secondary.map((watch, index) => (
            <Link
              key={watch.id}
              href={watch.href}
              className={`${styles.secondaryWatch} ${styles[`secondaryWatch${index + 1}`] ?? ""}`}
              aria-label={displayWatchModelHeading({ brandName: watch.brandName, title: watch.title, referenceDisplay: watch.referenceDisplay })}
            >
              <CatalogImage image={watch.primaryImage} presentation="guarded" compositionSlot="catalog-hero-secondary" />
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
