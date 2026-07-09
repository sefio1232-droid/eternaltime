import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import type { CatalogWatchCard } from "@/modules/catalog/domain/read-models";

export function CatalogWatchCardView({ watch }: Readonly<{ watch: CatalogWatchCard }>) {
  return (
    <article className="product-card-surface group h-full">
      <Link href={watch.href} className="grid h-full gap-4 focus-visible:outline-offset-4">
        <div className="product-stage product-stage-plain aspect-[1/1.08] overflow-hidden p-7">
          <CatalogImage image={watch.primaryImage} className="transition-transform duration-300 group-hover:scale-[1.035]" />
        </div>
        <div className="grid gap-3 border-t border-[var(--border)] pt-3">
          <div className="flex min-h-5 items-start justify-between gap-4">
            <span className="type-meta">{watch.brandName}</span>
            <span className="type-reference text-right">Код {watch.referenceDisplay}</span>
          </div>
          <h2 className="min-h-12 text-base font-semibold leading-6">{watch.title}</h2>
          <div className="flex items-end justify-between gap-3">
            <p className="price-plate type-price text-lg">{formatCatalogMoney(watch.publicPrice)}</p>
            <span className="card-cta-line">Смотреть</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
