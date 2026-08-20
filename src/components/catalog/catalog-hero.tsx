import Link from "next/link";
import styles from "@/components/catalog/catalog-hero.module.css";

/**
 * The catalog's first viewport — rebuilt a third time after real user feedback rejected every
 * product-photo version tried so far (an overlapping multi-watch stage, then a single watch on a
 * radial "plinth" — both eventually read as "pointless"/unfinished no matter how the image bug was
 * fixed). This version drops the product photo entirely: a compact intro on the left, and on the
 * right a genuinely useful second module — "didn't find the model you wanted" handing off to the
 * existing personal-selection flow — rather than another decorative image
 * (docs/CATALOG_SHOWROOM_RECOVERY.md "Hero rebuild, third pass"). Server Component, no client JS,
 * no product image composition to get wrong.
 */
export function CatalogHero({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <header className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{description}</p>
        <Link href="/selection" className={styles.cta}>
          Перейти к подбору <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={styles.assist}>
        <p className={styles.assistLabel}>Не нашли нужную модель?</p>
        <p className={styles.assistLead}>
          Опишите сценарий, размер и бюджет — подберём несколько реальных моделей из каталога под конкретную задачу.
        </p>
        <Link href="/selection" className={styles.assistCta}>
          Пройти подбор <span aria-hidden="true">→</span>
        </Link>
      </div>
    </header>
  );
}
