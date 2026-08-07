import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogSectionNav, type CatalogSectionNavItem } from "@/components/catalog/catalog-section-nav";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import { CollectionWatchAction } from "@/components/collection/collection-watch-action";
import { CompareToggle } from "@/components/comparison/compare-toggle";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import {
  formatCatalogCount,
  formatCatalogMoney,
} from "@/modules/catalog/application/catalog-format";
import {
  buildFactualWatchDescription,
  displayWatchModelHeading,
  displayWatchTitle,
  formatCatalogCardTrait,
  formatCatalogDisplayValue,
  splitDescriptionIntoParagraphs,
} from "@/modules/catalog/application/catalog-display";
import {
  resolveCatalogImageQualityPresentation,
  selectBestCatalogHeroImage,
  sequenceCatalogGalleryImages,
} from "@/modules/catalog/application/catalog-image-presentation-policy";
import { groupSpecificationsByPublicSection } from "@/modules/catalog/application/catalog-read-service";
import type {
  CatalogPublicSpecification,
  CatalogSpecificationGroup,
  CatalogWatchCard,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";
import type { CatalogWatchSeoOverlay } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import styles from "@/components/catalog/watch-detail.module.css";

const groupLabels: Record<CatalogSpecificationGroup, string> = {
  mechanism: "Механизм",
  case: "Корпус",
  dimensions: "Размеры",
  dial: "Циферблат",
  glass: "Стекло",
  strap: "Ремешок и браслет",
  water_resistance: "Водозащита",
  functions: "Функции",
  other: "Другое",
};

const groupOrder: CatalogSpecificationGroup[] = [
  "mechanism",
  "case",
  "dimensions",
  "glass",
  "water_resistance",
  "dial",
  "strap",
  "functions",
  "other",
];

const highlightKeys = [
  "movement_type_raw",
  "movement_raw",
  "crystal_type_raw",
  "case_material_raw",
  "water_resistance_raw",
  "case_diameter_raw",
  "case_dimensions_raw",
];

/**
 * At most one hero key fact per specification group — e.g. `movement_type_raw` and
 * `case_diameter_raw`/`case_dimensions_raw` never both surface, since two facts from the same
 * group (mechanism, dimensions, ...) read as the same trait restated twice. Grouping (not label
 * equality) is what actually catches this: two mechanism specs can have different labels
 * ("Тип механизма" vs "Механизм") while still describing the identical fact.
 */
function highlights(specifications: CatalogPublicSpecification[]): CatalogPublicSpecification[] {
  const byKey = new Map(specifications.map((specification) => [specification.key, specification]));
  const picked: CatalogPublicSpecification[] = [];
  const pickedGroups = new Set<CatalogSpecificationGroup>();

  for (const key of highlightKeys) {
    const specification = byKey.get(key);
    if (specification && !pickedGroups.has(specification.group)) {
      picked.push(specification);
      pickedGroups.add(specification.group);
    }
    if (picked.length === 4) {
      break;
    }
  }

  return picked;
}

function titleScaleClass(title: string): string {
  const compactLength = title.replace(/\s/g, "").length;
  const technicalParts = title.split(/[-.]/).length;

  if (compactLength > 28 || technicalParts >= 4) {
    return styles.titleLong;
  }

  if (compactLength > 18 || technicalParts >= 3) {
    return styles.titleMedium;
  }

  return styles.titleShort;
}

export function CatalogWatchDetailPage({
  watch,
  collectionState,
  seoOverlay,
  relatedWatches = [],
}: Readonly<{
  watch: CatalogWatchDetail;
  collectionState?: string;
  /** Optional editorial description sourced from the site-import overlay (docs: catalog-site-import
   * overlay). Deliberately not part of `CatalogWatchDetail` — see catalog-read-repository.server.ts. */
  seoOverlay?: CatalogWatchSeoOverlay | null;
  /** Deterministic brand/mechanism/price picks for the page-ending section — see
   * `pickRelatedCatalogWatches` in catalog-read-service.ts. A plain, transparent scoring rule, not
   * a bespoke ranking model or extra data source. */
  relatedWatches?: CatalogWatchCard[];
}>) {
  const groupedSpecifications = groupSpecificationsByPublicSection(watch.specifications);
  const keyFacts = highlights(watch.specifications);
  const gallery = watch.imageGallery.filter((image) => image.kind !== "none");
  const heroImage = selectBestCatalogHeroImage(gallery.length > 0 ? gallery : [watch.primaryImage]);
  const sequencedGallery = sequenceCatalogGalleryImages(gallery, heroImage);
  const imagePresentation = resolveCatalogImageQualityPresentation({
    primaryImage: heroImage,
    galleryCount: gallery.length,
  });
  const displayTitle = displayWatchTitle({ brandName: watch.brandName, title: watch.title, referenceDisplay: watch.referenceDisplay });
  const displayModelTitle = displayWatchModelHeading({
    brandName: watch.brandName,
    title: watch.watchModelName,
    referenceDisplay: watch.referenceDisplay,
  });
  const titleScale = titleScaleClass(displayTitle);
  const overviewText = seoOverlay?.longDescription || buildFactualWatchDescription(watch);
  // Only a genuinely different official name earns its own line under the title — `watchModelName`
  // is the same string as `title` for the overwhelming majority of the catalog, so showing it again
  // here would just repeat the H1 as a sentence directly below it.
  // Only ever link to a section that actually renders for this watch — "Характеристики"/"На
  // запястье"/"В коллекции" each have a real conditional below, and a nav item pointing at a
  // section that never mounts is a broken anchor (docs/CATALOG_SHOWROOM_RECOVERY.md
  // "Sticky section navigation").
  const sectionNavItems: CatalogSectionNavItem[] = [
    { href: "#overview", label: "Обзор" },
    ...(watch.specifications.length > 0 ? [{ href: "#specifications", label: "Характеристики" }] : []),
    ...(gallery.length > 1 ? [{ href: "#fit", label: "На запястье" }] : []),
    ...(watch.siblingReferences.length > 0 ? [{ href: "#collection", label: "В коллекции" }] : []),
  ];
  const officialDisplayName =
    watch.officialName && watch.officialName !== watch.title
      ? displayWatchTitle({ brandName: watch.brandName, title: watch.officialName, referenceDisplay: watch.referenceDisplay })
      : null;

  return (
    <EditorialContainer className={`${styles.detailPage} public-page`}>
      <div className="grid gap-10 lg:gap-12">
        <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
          <Link href="/watches" className="hover:text-[var(--text)]">
            Часы
          </Link>
          <span>/</span>
          <Link href={`/watches/${watch.brandSlug}`} className="hover:text-[var(--text)]">
            {watch.brandName}
          </Link>
          <span>/</span>
          <span className="text-[var(--text)]">{watch.referenceDisplay}</span>
        </nav>

        <section className={styles.hero} data-image-presentation={imagePresentation}>
          <div className={styles.heroCopy}>
            <p className="type-label">
              {watch.brandName}
              {watch.brandCollectionName ? ` / ${watch.brandCollectionName}` : ""}
            </p>
            <h1 className={`${styles.title} ${titleScale} text-balance`}>{displayTitle}</h1>
            <p className={styles.reference}>
              <span className="sr-only">Код модели </span>
              {watch.referenceDisplay}
            </p>
            {officialDisplayName ? <p className={styles.deck}>{officialDisplayName}</p> : null}
            <div className={styles.priceRow}>
              <p className="price-plate type-price text-3xl">{formatCatalogMoney(watch.publicPrice)}</p>
            </div>
            {keyFacts.length > 0 ? (
              <dl className={styles.keySpecsInline} aria-label="Ключевые характеристики">
                {keyFacts.map((specification) => (
                  <div key={specification.key}>
                    <dt>{formatCatalogCardTrait(specification)}</dt>
                    <dd>{specification.label}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className={styles.actions}>
              <CollectionWatchAction
                watchReferenceId={watch.id}
                displayName={displayTitle}
                returnTo={watch.href}
                state={collectionState}
              />
              <CompareToggle
                variant="detail"
                item={{
                  identity: `${watch.brandSlug}:${watch.referenceSlug}`,
                  brandName: watch.brandName,
                  brandSlug: watch.brandSlug,
                  displayName: displayModelTitle,
                  referenceDisplay: watch.referenceDisplay,
                  referenceSlug: watch.referenceSlug,
                  canonicalHref: watch.href,
                }}
              />
            </div>
          </div>

          <div className={styles.mediaShell}>
            <div className={`product-stage product-stage-detail ${styles.detailMedia} p-6 sm:p-9`}>
              <CatalogImage
                image={heroImage}
                priority
                presentation={imagePresentation === "detail-hero" ? "full" : "guarded"}
                compositionSlot="detail-hero"
                galleryCount={gallery.length}
              />
            </div>
          </div>
        </section>

        <CatalogSectionNav items={sectionNavItems} trailingHref="/journal" trailingLabel="Журнал" />

        <section id="overview" className={styles.overviewSection}>
          <div>
            <p className="type-label">Обзор</p>
            <h2 className="type-editorial text-3xl text-balance md:text-5xl">{displayModelTitle}</h2>
          </div>
          <div className={styles.overviewCopy}>
            {splitDescriptionIntoParagraphs(overviewText).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {gallery.length > 1 ? (
          <section id="fit" className={styles.gallerySection}>
            {sequencedGallery.slice(0, 5).map((image, index) => (
              <figure key={`${image.kind}-${image.alt}-${index}`} className="product-stage product-stage-plain">
                <CatalogImage image={image} presentation="guarded" compositionSlot="detail-gallery" imageIndex={index} galleryCount={gallery.length} />
              </figure>
            ))}
          </section>
        ) : null}

        {watch.specifications.length > 0 ? (
          <section id="specifications" className="grid gap-7">
            <div>
              <p className="type-label">Детали</p>
              <h2 className="type-section mt-2 text-2xl md:text-3xl">Характеристики</h2>
              <p className="mt-2 max-w-[52ch] text-sm text-[var(--text-muted)]">
                Только подтвержденные данные производителя и проверенных источников.
              </p>
            </div>
            <div className={styles.specGrid}>
              {groupOrder.map((group) => {
                const specifications = groupedSpecifications[group];
                if (!specifications?.length) {
                  return null;
                }

                const preview = specifications
                  .slice(0, 2)
                  .map((specification) => formatCatalogDisplayValue(specification.value))
                  .join(" · ");

                return (
                  <details key={group} className={styles.specGroup}>
                    <summary className={styles.specGroupSummary}>
                      <span className={styles.specGroupTitle}>{groupLabels[group]}</span>
                      <span className={styles.specGroupPreview}>{preview}</span>
                    </summary>
                    <dl className={styles.specList}>
                      {specifications.map((specification) => (
                        <div key={specification.key} className={styles.specRow}>
                          <dt>{specification.label}</dt>
                          <dd>{formatCatalogDisplayValue(specification.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                );
              })}
            </div>
          </section>
        ) : null}

        {watch.siblingReferences.length > 0 ? (
          <section id="collection" className="grid gap-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="type-label">Модель</p>
                <h2 className="type-section mt-2 text-3xl">Другие исполнения</h2>
              </div>
              <p className="text-sm text-[var(--text-muted)]">{formatCatalogCount(watch.siblingReferences.length)} рядом</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {watch.siblingReferences.map((sibling) => (
                <CatalogWatchCardView
                  key={sibling.id}
                  watch={{
                    id: sibling.id,
                    href: sibling.href,
                    brandName: watch.brandName,
                    brandSlug: watch.brandSlug,
                    title: sibling.title,
                    officialName: null,
                    referenceDisplay: sibling.referenceDisplay,
                    referenceNormalized: sibling.referenceNormalized,
                    referenceSlug: sibling.referenceSlug,
                    brandCollectionName: watch.brandCollectionName,
                    watchModelName: watch.watchModelName,
                    publicPrice: sibling.publicPrice,
                    primaryImage: sibling.primaryImage,
                    keySpecifications: [],
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        {relatedWatches.length > 0 ? (
          <section className="grid gap-7 border-t border-[var(--border)] pt-9">
            <div>
              <p className="type-label">Продолжить</p>
              <h2 className="type-section mt-2 text-3xl">Похожие модели</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedWatches.map((related) => (
                <CatalogWatchCardView key={related.id} watch={related} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-7">
          <p className="text-sm text-[var(--text-muted)]">Не нашли то, что искали?</p>
          <div className="flex flex-wrap gap-5 text-sm font-semibold">
            <Link href={`/watches/${watch.brandSlug}`} className="underline decoration-1 underline-offset-4 hover:text-[var(--text)]">
              Все модели {watch.brandName}
            </Link>
            <Link href="/watches" className="underline decoration-1 underline-offset-4 hover:text-[var(--text)]">
              Открыть весь каталог
            </Link>
            <Link href="/selection" className="underline decoration-1 underline-offset-4 hover:text-[var(--text)]">
              Подбор по сценарию
            </Link>
          </div>
        </section>
      </div>
    </EditorialContainer>
  );
}
