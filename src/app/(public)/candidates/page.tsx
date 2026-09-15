import type { Metadata } from "next";
import Link from "next/link";
import { CandidateStatusControls } from "@/components/candidates/candidate-action";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import { getCurrentUser } from "@/modules/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCandidates } from "@/modules/candidates/application/candidate-service";
import { candidateStatusLabels, candidateStatuses, type CandidateStatus } from "@/modules/candidates/domain/types";
import { createCandidateRepository } from "@/modules/candidates/infrastructure/candidate-repository.server";
import { buildComparisonHref } from "@/modules/comparison/domain/local-comparison";

export const metadata: Metadata = {
  title: "Кандидаты",
  description: "Модели Eternal Time, которые вы рассматриваете перед покупкой.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function statusIntro(status: CandidateStatus): string {
  if (status === "finalist") return "Финальные варианты для ближайшего решения.";
  if (status === "considering") return "Модели, которые стоит спокойно сопоставить между собой.";
  return "Сохранённые часы для дальнейшего изучения.";
}

export default async function CandidatesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser.user) {
    return (
      <Container className="public-page">
        <div className="grid gap-8 border-t border-[var(--border-strong)] pt-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="type-label">Кандидаты</p>
            <h1 className="public-heading mt-3">Сохраните модели, которые рассматриваете</h1>
          </div>
          <div className="grid gap-5">
            <p className="type-body text-[var(--text-muted)]">
              Кандидаты — это не коллекция и не покупка. Это личный список часов, которые вы изучаете:
              можно сохранить модель, перевести её в рассмотрение или отметить финалистом.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/login?returnTo=${encodeURIComponent("/candidates")}`}>
                Войти и открыть кандидаты
              </ButtonLink>
              <ButtonLink href="/watches" variant="secondary">Вернуться в каталог</ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <Container className="public-page">
        <p className="type-label">Кандидаты</p>
        <h1 className="public-heading mt-3">Кандидаты временно недоступны</h1>
      </Container>
    );
  }

  const candidates = await listCandidates(createCandidateRepository(supabase), currentUser.user.id);
  const groups = candidateStatuses.map((status) => ({
    status,
    items: candidates.filter((candidate) => candidate.status === status),
  }));

  return (
    <Container className="public-page">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--border)] pb-6">
        <div>
          <p className="type-label">Кандидаты</p>
          <h1 className="public-heading mt-3">Модели, которые вы рассматриваете</h1>
          <p className="type-body mt-3 max-w-2xl text-[var(--text-muted)]">
            Здесь живёт выбор до покупки: сохранённые модели, варианты в рассмотрении и финалисты.
            После доставки купленные часы переходят в коллекцию.
          </p>
        </div>
        <ButtonLink href="/watches" variant="secondary">Добавить из каталога</ButtonLink>
      </div>

      {candidates.length === 0 ? (
        <div className="mt-10 grid gap-5 border-y border-[var(--border)] py-8">
          <h2 className="text-2xl font-semibold">Пока нет кандидатов</h2>
          <p className="max-w-2xl text-[var(--text-muted)]">
            Откройте карточку часов, подбор или сравнение и нажмите «Сохранить». Это не создаёт заказ и
            не добавляет часы в коллекцию.
          </p>
          <ButtonLink href="/selection" className="justify-self-start">Пройти подбор</ButtonLink>
        </div>
      ) : (
        <div className="grid gap-12 pt-10">
          {groups.map((group) => (
            <section key={group.status} className="grid gap-5" aria-labelledby={`candidate-${group.status}`}>
              <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
                <div>
                  <p className="type-label">{candidateStatusLabels[group.status]}</p>
                  <h2 id={`candidate-${group.status}`} className="text-2xl font-semibold">{statusIntro(group.status)}</h2>
                </div>
                <span className="type-meta">{group.items.length}</span>
              </header>
              {group.items.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">В этом статусе пока пусто.</p>
              ) : (
                <div className="grid gap-0 border-t border-[var(--border)]">
                  {group.items.map((candidate) => {
                    const watch = candidate.watch;
                    if (!watch) {
                      return (
                        <article key={candidate.id} className="grid gap-3 border-b border-[var(--border)] py-5">
                          <p className="font-semibold">Модель больше не доступна в публичном каталоге</p>
                          <CandidateStatusControls
                            watchReferenceId={candidate.watchReferenceId}
                            returnTo="/candidates"
                            initialStatus={candidate.status}
                          />
                        </article>
                      );
                    }

                    const price = watch.publicCommerceState.priceVisible && watch.publicPrice
                      ? formatCatalogMoney(watch.publicPrice)
                      : watch.publicCommerceState.shortLabel;
                    return (
                      <article
                        key={candidate.id}
                        className="grid gap-5 border-b border-[var(--border)] py-5 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center"
                      >
                        <Link href={watch.href} className="block aspect-square overflow-hidden bg-[var(--surface-muted)] p-4">
                          <CatalogImage image={watch.image} presentation="card" />
                        </Link>
                        <div className="min-w-0">
                          <p className="type-meta">{watch.brandName} / {watch.referenceDisplay}</p>
                          <Link href={watch.href} className="mt-1 block text-2xl font-semibold leading-tight hover:text-[var(--accent-strong)]">
                            {watch.displayName}
                          </Link>
                          <p className="mt-2 text-sm text-[var(--text-muted)]">{price}</p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Link href={watch.href} className="text-sm font-semibold underline underline-offset-4">Открыть модель</Link>
                            <Link
                              href={buildComparisonHref([{ brandSlug: watch.brandSlug, referenceSlug: watch.referenceSlug }])}
                              className="text-sm font-semibold underline underline-offset-4"
                            >
                              Сравнить
                            </Link>
                            {watch.publicCommerceState.purchaseAllowed ? (
                              <Link
                                href={`/checkout?source=buy_now&brand=${watch.brandSlug}&ref=${watch.referenceNormalized}&qty=1`}
                                className="text-sm font-semibold underline underline-offset-4"
                              >
                                Купить сейчас
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        <CandidateStatusControls
                          watchReferenceId={candidate.watchReferenceId}
                          returnTo="/candidates"
                          initialStatus={candidate.status}
                        />
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
