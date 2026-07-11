import Link from "next/link";
import { CollectionWatchMedia } from "@/components/collection/collection-watch-media";
import { ButtonLink } from "@/components/ui/button";
import type { UserWatchSummary } from "@/modules/user-watch-collection/domain/types";

function ownershipLabel(status: UserWatchSummary["ownershipStatus"]) {
  return status === "owned" ? "В коллекции" : "Ранее в коллекции";
}

function sourceLabel(source: UserWatchSummary["sourceKind"]) {
  return source === "catalog" ? "Связаны с каталогом" : "Добавлены вручную";
}

export function CollectionOverview({ watches }: Readonly<{ watches: UserWatchSummary[] }>) {
  const [lead, ...rest] = watches;

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <p className="type-label">Моя коллекция</p>
          <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">Часы, которыми вы владеете</h1>
          <p className="type-body mt-3 max-w-2xl text-[var(--text-muted)]">
            Личное пространство для реальных часов, истории приобретения и заметок.
          </p>
        </div>
        <ButtonLink href="/collection/new" variant="secondary">Добавить часы</ButtonLink>
      </div>

      {lead ? (
        <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
          <Link href={`/collection/${lead.id}`} className="block">
            <CollectionWatchMedia imageUrl={lead.primaryImageUrl} alt={lead.displayName} className="aspect-[1.45/1]" />
          </Link>
          <div className="border-t border-[var(--border-strong)] pt-5">
            <p className="type-meta">{sourceLabel(lead.sourceKind)} / {ownershipLabel(lead.ownershipStatus)}</p>
            <Link href={`/collection/${lead.id}`} className="mt-3 block text-3xl font-semibold leading-tight text-balance md:text-4xl">
              {lead.displayName}
            </Link>
            <p className="mt-3 text-[var(--text-muted)]">
              {[lead.brandName, lead.modelName, lead.referenceDisplay].filter(Boolean).join(" / ")}
            </p>
            {lead.acquiredAt ? <p className="type-meta mt-5">Приобретены: {lead.acquiredAt}</p> : null}
          </div>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className="grid gap-0 border-t border-[var(--border)]">
          {rest.map((watch, index) => (
            <Link
              key={watch.id}
              href={`/collection/${watch.id}`}
              className="collection-watch-row grid gap-4 border-b border-[var(--border)] py-5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
            >
              <CollectionWatchMedia imageUrl={watch.primaryImageUrl} alt={watch.displayName} className="aspect-square" />
              <span className="min-w-0">
                <span className="type-meta">{String(index + 2).padStart(2, "0")} / {sourceLabel(watch.sourceKind)}</span>
                <span className="mt-1 block text-xl font-semibold leading-tight">{watch.displayName}</span>
                <span className="mt-1 block text-sm text-[var(--text-muted)]">
                  {[watch.brandName, watch.modelName, watch.referenceDisplay].filter(Boolean).join(" / ")}
                </span>
              </span>
              <span className="type-meta">{ownershipLabel(watch.ownershipStatus)}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
