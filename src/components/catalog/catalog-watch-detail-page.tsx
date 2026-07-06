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
      <div className="grid gap-8">
        <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
          <Link href="/watches" className="hover:text-[var(--text)]">
            Каталог
          </Link>
          <span>/</span>
          <Link href={`/watches/${watch.brandSlug}`} className="hover:text-[var(--text)]">
            {watch.brandName}
          </Link>
          <span>/</span>
          <span className="text-[var(--text)]">{watch.referenceDisplay}</span>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start">
          <div className="grid gap-4">
            <div className="aspect-[5/4] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <CatalogImage image={watch.primaryImage} />
            </div>
            {watch.imageGallery.length > 1 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {watch.imageGallery.slice(0, 8).map((image, index) => (
                  <div
                    key={`${image.kind}-${image.alt}-${index}`}
                    className="aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2"
                  >
                    <CatalogImage image={image} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-7">
            <div>
              <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">{watch.brandName}</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">{watch.title}</h1>
              <dl className="mt-6 grid gap-3 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-4">
                  <dt className="text-[var(--text-muted)]">Reference</dt>
                  <dd className="font-medium">{watch.referenceDisplay}</dd>
                </div>
                {watch.brandCollectionName ? (
                  <div className="grid grid-cols-[140px_1fr] gap-4">
                    <dt className="text-[var(--text-muted)]">Brand Collection</dt>
                    <dd>{watch.brandCollectionName}</dd>
                  </div>
                ) : null}
                <div className="grid grid-cols-[140px_1fr] gap-4">
                  <dt className="text-[var(--text-muted)]">Watch Model</dt>
                  <dd>{watch.watchModelName}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-[var(--text-muted)]">Публичная цена</p>
              <p className="mt-2 text-3xl font-semibold">{formatCatalogMoney(watch.publicPrice)}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                Оформление покупки появится после финальной настройки коммерческого процесса.
              </p>
            </div>

            {watch.keySpecifications.length > 0 ? (
              <section>
                <h2 className="text-lg font-semibold">Ключевые характеристики</h2>
                <dl className="mt-4 grid gap-3">
                  {watch.keySpecifications.map((specification) => (
                    <div
                      key={specification.key}
                      className="grid grid-cols-[150px_1fr] gap-4 border-b border-[var(--border)] pb-3 text-sm"
                    >
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
          <section className="grid gap-5">
            <div>
              <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">Спецификация</p>
              <h2 className="mt-2 text-2xl font-semibold">Публичные характеристики</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {groupOrder.map((group) => {
                const specifications = groupedSpecifications[group];
                if (!specifications?.length) {
                  return null;
                }

                return (
                  <section key={group} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5">
                    <h3 className="font-semibold">{groupLabels[group]}</h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      {specifications.map((specification) => (
                        <div key={specification.key} className="grid grid-cols-[150px_1fr] gap-4">
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
          <section className="grid gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">Модель</p>
                <h2 className="mt-2 text-2xl font-semibold">Другие исполнения модели</h2>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {formatCatalogCount(watch.siblingReferences.length)} рядом
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
