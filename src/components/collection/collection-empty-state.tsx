import { ButtonLink } from "@/components/ui/button";

export function CollectionEmptyState({ authenticated }: Readonly<{ authenticated: boolean }>) {
  const manualHref = authenticated ? "/collection/new" : "/login?returnTo=%2Fcollection%2Fnew";

  return (
    <section className="grid gap-7 border-y border-[var(--border-strong)] py-7 md:grid-cols-[0.72fr_1.28fr] md:items-start">
      <div>
        <p className="type-label">Первый шаг</p>
        <h2 className="type-section mt-3 text-3xl text-balance">Начните с часов, которые уже носите</h2>
      </div>
      <div className="grid gap-6">
        <p className="type-body max-w-2xl text-[var(--text-muted)]">
          Коллекция хранит реальные часы, историю владения и личные заметки. Начните с одной модели и дополняйте запись в удобном темпе.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/watches">Найти часы в каталоге</ButtonLink>
          <ButtonLink href={manualHref} variant="secondary">Добавить вручную</ButtonLink>
        </div>
      </div>
    </section>
  );
}
