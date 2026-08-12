import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogMissingImage } from "@/components/catalog/catalog-missing-image";
import { CommerceCardCartButton } from "@/components/commerce/commerce-actions";
import { CompareToggle } from "@/components/comparison/compare-toggle";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import {
  classifyCatalogCardPresentation,
  displayWatchModelHeading,
  formatCatalogCardTrait,
} from "@/modules/catalog/application/catalog-display";
import type { CatalogWatchCard } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-watch-card.module.css";

export function CatalogWatchCardView({
  watch,
  priority = false,
}: Readonly<{ watch: CatalogWatchCard; priority?: boolean }>) {
  const modelHeading = displayWatchModelHeading({ brandName: watch.brandName, title: watch.title, referenceDisplay: watch.referenceDisplay });
  const quickFacts = watch.keySpecifications.slice(0, 2);
  const presentationCategory = classifyCatalogCardPresentation(watch);

  return (
    <article className={`${styles.card} catalog-card-review-outline`} data-catalog-reference={watch.referenceDisplay}>
      <Link href={watch.href} className={styles.link}>
        <div
          className={`${styles.media} catalog-media-review-outline`}
          data-presentation-category={watch.primaryImage.kind === "none" ? undefined : presentationCategory}
        >
          {watch.primaryImage.kind === "none" ? (
            <CatalogMissingImage brandName={watch.brandName} referenceDisplay={watch.referenceDisplay} />
          ) : (
            <CatalogImage
              image={watch.primaryImage}
              presentation="card"
              compositionSlot="catalog-card"
              priority={priority}
            />
          )}
        </div>
        <div className={styles.content}>
          <span className={styles.brand}>{watch.brandName}</span>
          <h2 className={styles.model}>{modelHeading}</h2>
          <span className={styles.reference}>{watch.referenceDisplay}</span>
          <p className={styles.price}>{formatCatalogMoney(watch.publicPrice)}</p>
          {quickFacts.length > 0 ? (
            <dl className={styles.specs} aria-label="Ключевые характеристики">
              {quickFacts.map((fact) => (
                <div key={fact.key}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>{formatCatalogCardTrait(fact)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <span className={styles.footer}>
            Смотреть модель
            <span className={styles.footerArrow} aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
      <CompareToggle
        item={{
          identity: `${watch.brandSlug}:${watch.referenceSlug}`,
          brandName: watch.brandName,
          brandSlug: watch.brandSlug,
          displayName: modelHeading,
          referenceDisplay: watch.referenceDisplay,
          referenceSlug: watch.referenceSlug,
          canonicalHref: watch.href,
        }}
      />
      <CommerceCardCartButton
        product={{
          brandSlug: watch.brandSlug,
          referenceNormalized: watch.referenceNormalized,
          referenceDisplay: watch.referenceDisplay,
          referenceSlug: watch.referenceSlug,
          brandName: watch.brandName,
          displayName: modelHeading,
          canonicalHref: watch.href,
          image: watch.primaryImage,
          publicPrice: watch.publicPrice,
          purchasable:
            Boolean(watch.publicPrice) &&
            watch.publicPrice?.currencyCode === "RUB" &&
            Boolean(watch.publicPrice?.amountMinor && watch.publicPrice.amountMinor > 0),
        }}
      />
    </article>
  );
}
