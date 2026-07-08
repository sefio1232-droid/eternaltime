import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import { Container } from "@/components/ui/container";
import {
  formatCatalogCount,
  formatCatalogMoney,
} from "@/modules/catalog/application/catalog-format";
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
    if (picked.length === 5) {
      break;
    }
  }

  return picked;
}

export function CatalogWatchDetailPage({ watch }: Readonly<{ watch: CatalogWatchDetail }>) {
  const groupedSpecifications = groupSpecificationsByPublicSection(watch.specifications);
  const keyFacts = highlights(watch.specifications);
  const gallery = watch.imageGallery.filter((image) => image.kind !== "none");

  return (
    <Container className="py-8 lg:py-12">
      <div className="grid gap-14">
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

        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.48fr)_minmax(340px,0.82fr)] lg:items-start">
          <div className="grid gap-4">
            <div className="product-stage product-stage-hero min-h-[430px] p-7 lg:min-h-[660px]">
              <CatalogImage image={watch.primaryImage} className="drop-shadow-[0_24px_40px_rgb(16_19_22_/_18%)]" />
            </div>
            {gallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {gallery.slice(0, 8).map((image, index) => (
                  <div key={`${image.kind}-${image.alt}-${index}`} className="product-stage product-stage-plain aspect-square p-2">
                    <CatalogImage image={image} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="editorial-panel grid gap-7 p-6 lg:sticky lg:top-24">
            <div className="border-b border-[var(--border)] pb-6">
              <p className="type-label">{watch.brandName}</p>
              <h1 className="type-page mt-3 text-3xl text-balance md:text-4xl">{watch.title}</h1>
              <p className="type-reference mt-5">Артикул {watch.referenceDisplay}</p>
            </div>

            <dl className="grid gap-3 text-sm">
              {watch.brandCollectionName ? (
                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <dt className="text-[var(--text-muted)]">Коллекция</dt>
                  <dd>{watch.brandCollectionName}</dd>
                </div>
              ) : null}
              <div className="grid grid-cols-[120px_1fr] gap-4">
                <dt className="text-[var(--text-muted)]">Модель</dt>
                <dd>{watch.watchModelName}</dd>
              </div>
            </dl>

            <section className="grid gap-2 border-t border-[var(--border)] pt-5">
              <p className="type-meta">Цена</p>
              <p className="type-price text-3xl">{formatCatalogMoney(watch.publicPrice)}</p>
            </section>

            {keyFacts.length > 0 ? (
              <section className="grid gap-3 border-t border-[var(--border)] pt-5">
                <h2 className="type-section text-xl">Главное</h2>
                <dl className="grid gap-2">
                  {keyFacts.map((specification) => (
                    <div key={specification.key} className="grid grid-cols-[120px_1fr] gap-4 text-sm">
                      <dt className="text-[var(--text-muted)]">{specification.label}</dt>
                      <dd>{specification.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/collection"
                className="inline-flex h-[var(--control-height)] items-center justify-center bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-strong)]"
              >
                В коллекцию
              </Link>
              <Link
                href="/compare"
                className="inline-flex h-[var(--control-height)] items-center justify-center border border-[var(--border-strong)] px-4 text-sm font-semibold hover:border-[var(--accent)]"
              >
                Сравнить
              </Link>
            </div>
          </div>
        </section>

        {watch.specifications.length > 0 ? (
          <section className="grid gap-7">
            <div>
              <p className="type-label">Детали</p>
              <h2 className="type-section mt-2 text-3xl">Характеристики</h2>
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
                          <dd>{specification.value}</dd>
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
          <section className="grid gap-7">
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
    </Container>
  );
}
