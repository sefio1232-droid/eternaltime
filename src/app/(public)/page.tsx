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
  description: "Часы, журнал и инструменты для осмысленного выбора следующей модели.",
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

function pickHeroWatch(dataset: CatalogReadDataset | null) {
  return dataset?.watches.find((watch) => watch.primaryImage.kind !== "none") ?? dataset?.watches[0] ?? null;
}

export default async function HomePage() {
  const dataset = await loadDataset();
  const heroWatch = pickHeroWatch(dataset);
  const watches = dataset?.watches.slice(0, 4) ?? [];
  const selections = dataset ? listEditorialSelections(dataset).slice(0, 2) : [];
  const articles = listPublishedJournalArticles();
  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1, 3);

  return (
    <>
      <section className="overflow-hidden bg-[var(--canvas)]">
        <Container className="grid min-h-[640px] gap-10 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-16">
          <div className="max-w-[640px]">
            <p className="type-label">Modern horology</p>
            <h1 className="type-display mt-5 text-4xl text-balance sm:text-5xl lg:text-6xl">
              Выбирайте часы по роли в коллекции.
            </h1>
            <p className="type-body mt-6 max-w-xl text-lg text-[var(--text-muted)]">
              Eternal Time помогает смотреть на часы шире отдельной покупки: понимать стиль, сценарий, материалы и то,
              какую роль следующая модель добавит к вашему набору.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/watches">Смотреть часы</ButtonLink>
              <Link href="/collection" className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
                Как работает коллекция
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px]">
            <div className="watch-media-dark absolute inset-x-8 bottom-0 top-10" aria-hidden="true" />
            <div className="relative ml-auto grid max-w-[620px] gap-5">
              <div className="h-[430px] p-8">
                {heroWatch ? (
                  <CatalogImage image={heroWatch.primaryImage} className="drop-shadow-[0_26px_42px_rgb(0_0_0_/_28%)]" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--surface-steel)]">Eternal Time</div>
                )}
              </div>
              {heroWatch ? (
                <Link href={heroWatch.href} className="justify-self-end bg-[var(--surface-graphite)] px-5 py-4 text-right text-[var(--text-inverse)]">
                  <span className="type-meta block text-[var(--surface-steel)]">{heroWatch.brandName}</span>
                  <span className="mt-1 block text-lg font-semibold">{heroWatch.title}</span>
                  <span className="type-reference mt-2 block text-[var(--surface-steel)]">{heroWatch.referenceDisplay}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[var(--surface-graphite)] text-[var(--text-inverse)]">
        <Container className="grid gap-6 py-8 md:grid-cols-[auto_auto_1fr] md:items-center">
          <div>
            <p className="font-[var(--font-reference)] text-4xl font-semibold">{formatCatalogCount(dataset?.watches.length ?? 0)}</p>
            <p className="type-meta text-[var(--surface-steel)]">часов в каталоге</p>
          </div>
          <div>
            <p className="font-[var(--font-reference)] text-4xl font-semibold">{formatCatalogCount(dataset?.brands.length ?? 0)}</p>
            <p className="type-meta text-[var(--surface-steel)]">бренда</p>
          </div>
          <p className="type-body max-w-xl text-[var(--surface-steel)] md:justify-self-end">
            Каталог, журнал и будущая коллекция работают как единая карта выбора.
          </p>
        </Container>
      </section>

      <Container className="grid gap-20 py-16">
        <section className="grid gap-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="type-label">Каталог</p>
              <h2 className="type-section mt-2 text-3xl md:text-4xl">Смотреть часы</h2>
            </div>
            <Link href="/watches" className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
              Открыть каталог
            </Link>
          </div>
          {watches.length > 0 ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {watches.map((watch) => (
                <CatalogWatchCardView key={watch.id} watch={watch} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="type-label">Бренды</p>
            <h2 className="type-section mt-2 text-3xl md:text-4xl">Четыре входа в каталог</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(dataset?.brands ?? []).map((brand) => {
              const brandWatches = dataset?.watches.filter((watch) => watch.brandSlug === brand.slug).slice(0, 3) ?? [];
              return (
                <Link key={brand.slug} href={`/watches/${brand.slug}`} className="group bg-[var(--surface)] p-5 shadow-[0_1px_0_var(--border)]">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <span className="text-2xl font-semibold">{brand.name}</span>
                    <span className="type-meta">{formatCatalogCount(brand.watchCount)} моделей</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {brandWatches.map((watch) => (
                      <span key={watch.id} className="watch-media aspect-square p-2">
                        <CatalogImage image={watch.primaryImage} />
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {featuredArticle ? (
          <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <Link href={`/journal/${featuredArticle.slug}`} className="bg-[var(--surface)] p-8">
              <p className="type-label">{featuredArticle.category}</p>
              <h2 className="type-editorial mt-4 max-w-2xl text-4xl text-balance md:text-5xl">{featuredArticle.title}</h2>
              <p className="type-body mt-5 max-w-xl text-[var(--text-muted)]">{featuredArticle.dek}</p>
              <p className="type-meta mt-6">{featuredArticle.readingTimeMinutes} мин чтения</p>
            </Link>
            <div className="grid content-start gap-5">
              <p className="type-label">Журнал</p>
              {secondaryArticles.map((article) => (
                <Link key={article.slug} href={`/journal/${article.slug}`} className="grid gap-2 bg-[var(--surface)] p-5">
                  <span className="type-meta">
                    {article.category} · {article.readingTimeMinutes} мин
                  </span>
                  <span className="text-2xl font-semibold">{article.title}</span>
                  <span className="type-body text-[var(--text-muted)]">{article.dek}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {selections.length > 0 ? (
          <section className="grid gap-8">
            <div>
              <p className="type-label">Подборки</p>
              <h2 className="type-section mt-2 text-3xl md:text-4xl">Быстрые маршруты выбора</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {selections.map((selection) => (
                <article key={selection.slug} className="grid gap-5 bg-[var(--surface)] p-6 md:grid-cols-[1fr_180px]">
                  <div>
                    <p className="type-label">{selection.criteriaLabel}</p>
                    <h3 className="mt-3 text-2xl font-semibold">{selection.title}</h3>
                    <p className="type-body mt-3 text-[var(--text-muted)]">{selection.dek}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selection.watches.slice(0, 4).map((watch) => (
                      <Link key={watch.id} href={watch.href} className="watch-media aspect-square p-2">
                        <CatalogImage image={watch.primaryImage} />
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </Container>

      <section className="bg-[var(--surface-graphite)] text-[var(--text-inverse)]">
        <Container className="grid gap-8 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="type-label text-[var(--surface-steel)]">Коллекция</p>
            <h2 className="type-section mt-3 text-4xl md:text-5xl">Поймите, чего не хватает вашим часам.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {["Добавить часы", "Увидеть профиль", "Найти пробелы", "Выбрать следующее"].map((item, index) => (
              <div key={item} className="border-l border-[var(--border-strong)] pl-4">
                <p className="type-reference text-[var(--surface-steel)]">0{index + 1}</p>
                <p className="mt-3 font-semibold">{item}</p>
              </div>
            ))}
          </div>
          <Link href="/collection" className="text-sm font-semibold text-[var(--surface-steel)] hover:text-white lg:col-start-2">
            Подробнее о коллекции
          </Link>
        </Container>
      </section>

      <Container className="py-16">
        <section className="grid gap-5 bg-[var(--surface)] p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="type-label">Подбор</p>
            <h2 className="type-section mt-2 text-3xl">Начните со сценария, а не с бренда.</h2>
            <p className="type-body mt-3 max-w-2xl text-[var(--text-muted)]">
              Повседневные, под рубашку, для поездок или первая механика — подбор поможет сузить каталог по тому, как вы
              будете носить часы.
            </p>
          </div>
          <ButtonLink href="/selection" variant="secondary">Как это устроено</ButtonLink>
        </section>
      </Container>
    </>
  );
}
