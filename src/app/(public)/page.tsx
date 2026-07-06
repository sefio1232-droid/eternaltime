import type { Metadata } from "next";
import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogWatchCardView } from "@/components/catalog/catalog-watch-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatCatalogCount } from "@/modules/catalog/application/catalog-format";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { listEditorialSelections } from "@/modules/editorial-selections/application/editorial-selection-service";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";

export const metadata: Metadata = {
  title: "Eternal Time",
  description: "Каталог часов, журнал и будущие инструменты для подбора и развития коллекции.",
  alternates: {
    canonical: "/",
  },
};

async function loadDataset(): Promise<CatalogReadDataset | null> {
  try {
    return await getCatalogReadDataset();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const dataset = await loadDataset();
  const heroWatch = dataset?.watches.find((watch) => watch.primaryImage.kind !== "none") ?? dataset?.watches[0] ?? null;
  const watches = dataset?.watches.slice(0, 3) ?? [];
  const selections = dataset ? listEditorialSelections(dataset).slice(0, 2) : [];
  const articles = listPublishedJournalArticles().slice(0, 3);

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="grid gap-10 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-end lg:py-16">
          <div className="max-w-2xl">
            <p className="type-meta">Eternal Time</p>
            <h1 className="type-display mt-5 text-5xl text-balance sm:text-6xl lg:text-7xl">
              Часы, которые подходят вашей коллекции.
            </h1>
            <p className="type-body mt-6 max-w-xl text-lg text-[var(--text-muted)]">
              Каталог помогает смотреть на часы не как на бесконечную витрину, а как на последовательный выбор:
              разобраться, сравнить роль модели и постепенно собрать осмысленную коллекцию.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/watches">Смотреть часы</ButtonLink>
              <ButtonLink href="/journal" variant="secondary">
                Читать журнал
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="aspect-[5/4] border border-[var(--border)] bg-[var(--surface-subtle)] p-6">
              {heroWatch ? (
                <CatalogImage image={heroWatch.primaryImage} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                  Каталог подключается через preview source
                </div>
              )}
            </div>
            {heroWatch ? (
              <Link href={heroWatch.href} className="grid gap-1 border-t border-[var(--border)] pt-4">
                <span className="type-meta">{heroWatch.brandName}</span>
                <span className="text-xl font-semibold">{heroWatch.title}</span>
                <span className="type-reference">{heroWatch.referenceDisplay}</span>
              </Link>
            ) : null}
          </div>
        </Container>
      </section>

      <Container className="grid gap-14 py-14">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <p className="type-meta">Из каталога</p>
              <h2 className="type-section mt-2 text-3xl">Сейчас в каталоге</h2>
            </div>
            <Link href="/watches" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
              {dataset ? `${formatCatalogCount(dataset.watches.length)} позиций` : "Открыть каталог"}
            </Link>
          </div>
          {watches.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {watches.map((watch) => (
                <CatalogWatchCardView key={watch.id} watch={watch} />
              ))}
            </div>
          ) : (
            <p className="type-body max-w-xl text-[var(--text-muted)]">
              В production каталог будет читать подтверждённые записи из базы. В локальной разработке включите preview source.
            </p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="type-meta">Бренды</p>
            <h2 className="type-section mt-2 text-3xl">Исследовать по бренду</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(dataset?.brands ?? []).map((brand) => (
              <Link
                key={brand.slug}
                href={`/watches/${brand.slug}`}
                className="border-t border-[var(--border)] py-5 transition-colors hover:border-[var(--border-strong)]"
              >
                <span className="block text-2xl font-semibold">{brand.name}</span>
                <span className="type-meta">{formatCatalogCount(brand.watchCount)} позиций</span>
              </Link>
            ))}
          </div>
        </section>

        {selections.length > 0 ? (
          <section className="grid gap-6">
            <div>
              <p className="type-meta">Редакционные подборки</p>
              <h2 className="type-section mt-2 text-3xl">Подборки из текущих данных</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {selections.map((selection) => (
                <article key={selection.slug} className="border-t border-[var(--border)] pt-5">
                  <p className="type-meta">{selection.criteriaLabel}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{selection.title}</h3>
                  <p className="type-body mt-3 text-[var(--text-muted)]">{selection.dek}</p>
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {selection.watches.slice(0, 4).map((watch) => (
                      <Link key={watch.id} href={watch.href} className="aspect-square bg-[var(--surface-subtle)] p-2">
                        <CatalogImage image={watch.primaryImage} />
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="type-meta">Журнал</p>
            <h2 className="type-section mt-2 text-3xl">Читать о часах</h2>
          </div>
          <div className="grid gap-5">
            {articles.map((article) => (
              <Link key={article.slug} href={`/journal/${article.slug}`} className="border-t border-[var(--border)] py-5">
                <span className="type-meta">
                  {article.category} · {article.readingTimeMinutes} мин
                </span>
                <span className="mt-2 block text-2xl font-semibold">{article.title}</span>
                <span className="type-body mt-2 block text-[var(--text-muted)]">{article.dek}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-[var(--border)] pt-10 lg:grid-cols-2">
          <Link href="/collection" className="grid gap-3">
            <p className="type-meta">Моя коллекция</p>
            <h2 className="type-section text-3xl">От владения к пониманию</h2>
            <p className="type-body text-[var(--text-muted)]">
              В будущей коллекции пользователь сможет добавить свои часы, увидеть покрытые сценарии и понять, какая роль
              пока отсутствует.
            </p>
          </Link>
          <Link href="/selection" className="grid gap-3">
            <p className="type-meta">Подбор часов</p>
            <h2 className="type-section text-3xl">Выбор по сценарию</h2>
            <p className="type-body text-[var(--text-muted)]">
              Подбор будет строиться на стиле, размере, характеристиках и роли часов. Без фальшивых результатов до
              появления реального механизма.
            </p>
          </Link>
        </section>
      </Container>
    </>
  );
}
