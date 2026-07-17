import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import { CollectionWatchAction } from "@/components/collection/collection-watch-action";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import {
  formatCatalogCount,
  formatCatalogMoney,
} from "@/modules/catalog/application/catalog-format";
import {
  buildFactualWatchDescription,
  displayWatchTitle,
  formatCatalogDisplayValue,
} from "@/modules/catalog/application/catalog-display";
import { resolveCatalogImageQualityPresentation } from "@/modules/catalog/application/catalog-image-presentation-policy";
import { selectBestCatalogHeroImage } from "@/modules/catalog/application/catalog-image-presentation-policy";
import { groupSpecificationsByPublicSection } from "@/modules/catalog/application/catalog-read-service";
import type {
  CatalogPublicSpecification,
  CatalogSpecificationGroup,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";

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

function highlights(specifications: CatalogPublicSpecification[]): CatalogPublicSpecification[] {
  const byKey = new Map(specifications.map((specification) => [specification.key, specification]));
  const picked: CatalogPublicSpecification[] = [];

  for (const key of highlightKeys) {
    const specification = byKey.get(key);
    if (specification && !picked.some((item) => item.label === specification.label)) {
      picked.push(specification);
    }
    if (picked.length === 4) {
      break;
    }
  }

  return picked;
}

function titleScaleClass(title: string): "watch-detail-title-short" | "watch-detail-title-medium" | "watch-detail-title-long" {
  const compactLength = title.replace(/\s/g, "").length;
  const technicalParts = title.split(/[-.]/).length;

  if (compactLength > 28 || technicalParts >= 4) {
    return "watch-detail-title-long";
  }

  if (compactLength > 18 || technicalParts >= 3) {
    return "watch-detail-title-medium";
  }

  return "watch-detail-title-short";
}

export function CatalogWatchDetailPage({
  watch,
  collectionState,
}: Readonly<{
  watch: CatalogWatchDetail;
  collectionState?: string;
}>) {
  const groupedSpecifications = groupSpecificationsByPublicSection(watch.specifications);
  const keyFacts = highlights(watch.specifications);
  const gallery = watch.imageGallery.filter((image) => image.kind !== "none");
  const heroImage = selectBestCatalogHeroImage(gallery.length > 0 ? gallery : [watch.primaryImage]);
  const imagePresentation = resolveCatalogImageQualityPresentation({
    primaryImage: heroImage,
    galleryCount: gallery.length,
  });
  const displayTitle = displayWatchTitle({ brandName: watch.brandName, title: watch.title });
  const displayModelTitle = displayWatchTitle({ brandName: watch.brandName, title: watch.watchModelName });
  const titleScale = titleScaleClass(displayTitle);
  const overviewText = buildFactualWatchDescription(watch);
  const deckTitle = watch.officialName && watch.officialName !== watch.title
    ? displayWatchTitle({ brandName: watch.brandName, title: watch.officialName })
    : displayModelTitle;

  return (
    <EditorialContainer className="watch-detail-page public-page">
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

        <section className="watch-detail-hero" data-image-presentation={imagePresentation}>
          <div className="watch-detail-copy">
            <p className="type-label">{watch.brandName} {watch.brandCollectionName ? ` / ${watch.brandCollectionName}` : ""}</p>
            <h1 className={`watch-detail-title ${titleScale} text-balance`}>{displayTitle}</h1>
            <p className="watch-detail-deck">
              {deckTitle}. Код модели {watch.referenceDisplay}.
            </p>
            <div className="watch-detail-price-row">
              <p className="price-plate type-price text-3xl">{formatCatalogMoney(watch.publicPrice)}</p>
            </div>
            <div className="watch-detail-actions">
              <CollectionWatchAction
                watchReferenceId={watch.id}
                displayName={displayTitle}
                returnTo={watch.href}
                state={collectionState}
              />
            </div>
          </div>

          <div className="watch-detail-media-shell">
            <div className="product-stage product-stage-detail detail-media p-6 sm:p-9">
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

        {keyFacts.length > 0 ? (
          <dl className="watch-key-specs" aria-label="Ключевые характеристики">
            {keyFacts.map((specification) => (
              <div key={specification.key}>
                <dt>{formatCatalogDisplayValue(specification.value)}</dt>
                <dd>{specification.label}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <nav className="watch-detail-tabs" aria-label="Разделы модели">
          <a href="#overview">Обзор</a>
          <a href="#specifications">Характеристики</a>
          <a href="#fit">На запястье</a>
          <a href="#collection">В коллекции</a>
          <Link href="/journal">Журнал</Link>
        </nav>

        <section id="overview" className="watch-overview-section">
          <div>
            <p className="type-label">Обзор</p>
            <h2 className="type-editorial text-3xl text-balance md:text-5xl">{displayModelTitle}</h2>
          </div>
          <p>{overviewText}</p>
        </section>

        {gallery.length > 1 ? (
          <section id="fit" className="watch-gallery-section">
            {gallery.slice(0, 5).map((image, index) => (
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
            </div>
            <div className="grid gap-x-12 gap-y-9 md:grid-cols-2">
              {groupOrder.map((group) => {
                const specifications = groupedSpecifications[group];
                if (!specifications?.length) {
                  return null;
                }

                return (
                  <section key={group} className="grid content-start gap-4 border-t border-[var(--border)] pt-5">
                    <h3 className="text-lg font-semibold">{groupLabels[group]}</h3>
                    <dl className="grid gap-2 text-sm">
                      {specifications.map((specification) => (
                        <div key={specification.key} className="grid grid-cols-[150px_1fr] gap-4 py-2">
                          <dt className="text-[var(--text-muted)]">{specification.label}</dt>
                          <dd>{formatCatalogDisplayValue(specification.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
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
      </div>
    </EditorialContainer>
  );
}
