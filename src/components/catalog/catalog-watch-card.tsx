import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import type { CatalogWatchCard } from "@/modules/catalog/domain/read-models";

export function CatalogWatchCardView({ watch }: Readonly<{ watch: CatalogWatchCard }>) {
  const quickFacts = watch.keySpecifications.slice(0, 2);

  return (
    <article className="catalog-product-card product-card-surface group h-full">
      <Link href="/account/favorites" className="catalog-card-favorite" aria-label="Открыть избранное">
        <span aria-hidden="true" />
      </Link>
      <Link href={watch.href} className="grid h-full content-start gap-3 focus-visible:outline-offset-4">
        <div className={`product-stage product-stage-plain catalog-card-media overflow-hidden p-5 ${watch.primaryImage.kind === "none" ? "max-h-40" : ""}`}>
          <CatalogImage
            image={watch.primaryImage}
            presentation="card"
            compositionSlot="catalog-card"
            className="transition-transform duration-300 group-hover:scale-[1.025]"
          />
        </div>
        <div className="catalog-card-copy">
          <div className="flex min-h-5 items-start justify-between gap-4">
            <span className="type-meta">{watch.brandName}</span>
            <span className="type-reference text-right">Код {watch.referenceDisplay}</span>
          </div>
          <h2 className="text-base font-semibold leading-6">{watch.title}</h2>
          <div className="flex items-end justify-between gap-3">
            <p className="price-plate type-price text-lg">{formatCatalogMoney(watch.publicPrice)}</p>
          </div>
          {quickFacts.length > 0 ? (
            <dl className="catalog-card-facts" aria-label="Ключевые характеристики">
              {quickFacts.map((fact) => (
                <div key={fact.key}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
