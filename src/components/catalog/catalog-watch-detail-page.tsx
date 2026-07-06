import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import { Container } from "@/components/ui/container";
import {
  formatCatalogCount,
  formatCatalogMoney,
} from "@/modules/catalog/application/catalog-format";
import { groupSpecificationsByPublicSection } from "@/modules/catalog/application/catalog-read-service";
import type { CatalogSpecificationGroup, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

const groupLabels: Record<CatalogSpecificationGroup, string> = {
  mechanism: "Механизм",
  case: "Корпус",
  dimensions: "Размеры",
  dial: "Циферблат",
  glass: "Стекло",
  strap: "Ремешок и браслет",
  water_resistance: "Водозащита",
  functions: "Функции",
  other: "Дополнительно",
};

const groupOrder: CatalogSpecificationGroup[] = [
  "mechanism",
  "case",
  "dimensions",
  "dial",
  "glass",
  "strap",
  "water_resistance",
  "functions",
  "other",
];

export function CatalogWatchDetailPage({ watch }: Readonly<{ watch: CatalogWatchDetail }>) {
  const groupedSpecifications = groupSpecificationsByPublicSection(watch.specifications);

  return (
    <Container className="py-8 lg:py-12">
      <div className="grid gap-12">
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

        <section className="grid gap-9 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-start">
          <div className="grid gap-4">
            <div className="aspect-[5/4] border border-[var(--border)] bg-[var(--surface-subtle)] p-6">
              <CatalogImage image={watch.primaryImage} />
            </div>
            {watch.imageGallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {watch.imageGallery.slice(0, 8).map((image, index) => (
                  <div key={`${image.kind}-${image.alt}-${index}`} className="aspect-square border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
                    <CatalogImage image={image} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-8">
            <div>
              <p className="type-meta">{watch.brandName}</p>
              <h1 className="type-display mt-3 text-5xl text-balance md:text-6xl">{watch.title}</h1>
              <p className="type-reference mt-5">{watch.referenceDisplay}</p>
            </div>

            <dl className="grid gap-3 border-y border-[var(--border)] py-5 text-sm">
              {watch.brandCollectionName ? (
                <div className="grid grid-cols-[140px_1fr] gap-4">
                  <dt className="text-[var(--text-muted)]">Коллекция</dt>
                  <dd>{watch.brandCollectionName}</dd>
                </div>
              ) : null}
              <div className="grid grid-cols-[140px_1fr] gap-4">
                <dt className="text-[var(--text-muted)]">Модель</dt>
                <dd>{watch.watchModelName}</dd>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-4">
                <dt className="text-[var(--text-muted)]">Референс</dt>
                <dd>{watch.referenceDisplay}</dd>
              </div>
            </dl>

            <section className="grid gap-3">
              <p className="type-meta">Публичная цена</p>
              <p className="type-price text-4xl">{formatCatalogMoney(watch.publicPrice)}</p>
              <p className="type-body text-sm text-[var(--text-muted)]">
                Покупка и доставка появятся только после финальной настройки коммерческого процесса.
              </p>
            </section>

            {watch.keySpecifications.length > 0 ? (
              <section>
                <h2 className="type-section text-2xl">Главное</h2>
                <dl className="mt-4 grid gap-3">
                  {watch.keySpecifications.map((specification) => (
                    <div key={specification.key} className="grid grid-cols-[140px_1fr] gap-4 border-b border-[var(--border)] pb-3 text-sm">
                      <dt className="text-[var(--text-muted)]">{specification.label}</dt>
                      <dd>{specification.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
          </div>
        </section>

        {watch.specifications.length > 0 ? (
          <section className="grid gap-6">
            <div className="border-b border-[var(--border)] pb-4">
              <p className="type-meta">Спецификация</p>
              <h2 className="type-section mt-2 text-3xl">Публичные характеристики</h2>
            </div>
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
              {groupOrder.map((group) => {
                const specifications = groupedSpecifications[group];
                if (!specifications?.length) {
                  return null;
                }

                return (
                  <section key={group} className="grid gap-4">
                    <h3 className="font-semibold">{groupLabels[group]}</h3>
                    <dl className="grid gap-3 text-sm">
                      {specifications.map((specification) => (
                        <div key={specification.key} className="grid grid-cols-[140px_1fr] gap-4 border-b border-[var(--border)] pb-3">
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
          <section className="grid gap-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <p className="type-meta">Модель</p>
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
