import Link from "next/link";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import type { CatalogWatchCard } from "@/modules/catalog/domain/read-models";
import { CatalogImage } from "@/components/catalog/catalog-image";

export function CatalogWatchCardView({ watch }: Readonly<{ watch: CatalogWatchCard }>) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--border-strong)]">
      <Link href={watch.href} className="flex h-full flex-col focus-visible:outline-offset-[-3px]">
        <div className="aspect-[4/3] bg-[var(--surface-muted)] p-4">
          <CatalogImage image={watch.primaryImage} className="transition-transform duration-300 group-hover:scale-[1.02]" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <span>{watch.brandName}</span>
              <span className="text-right">{watch.referenceDisplay}</span>
            </div>
            <h2 className="text-base font-semibold leading-6 text-[var(--text)]">{watch.title}</h2>
            {watch.brandCollectionName ? (
              <p className="text-sm text-[var(--text-muted)]">{watch.brandCollectionName}</p>
            ) : null}
          </div>

          {watch.keySpecifications.length > 0 ? (
            <dl className="grid gap-2 text-sm text-[var(--text-muted)]">
              {watch.keySpecifications.map((specification) => (
                <div key={specification.key} className="grid grid-cols-[112px_1fr] gap-3">
                  <dt>{specification.label}</dt>
                  <dd className="min-w-0 text-[var(--text)]">{specification.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-auto border-t border-[var(--border)] pt-4 text-base font-semibold">
            {formatCatalogMoney(watch.publicPrice)}
          </div>
        </div>
      </Link>
    </article>
  );
}
