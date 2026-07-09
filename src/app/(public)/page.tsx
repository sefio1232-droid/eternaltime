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
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

export const metadata: Metadata = {
  title: "Eternal Time",
  description: "Часы, каталог и коллекция в одной спокойной системе выбора.",
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

function watchesWithImages(dataset: CatalogReadDataset | null): CatalogWatchDetail[] {
  return dataset?.watches.filter((watch) => watch.primaryImage.kind !== "none") ?? [];
}

function brandWatches(dataset: CatalogReadDataset | null, brandSlug: string): CatalogWatchDetail[] {
  return watchesWithImages(dataset)
    .filter((watch) => watch.brandSlug === brandSlug)
    .slice(0, 3);
}

export default async function HomePage() {
  const dataset = await loadDataset();
  const imageWatches = watchesWithImages(dataset);
  const heroWatches = imageWatches.slice(0, 5);
  const focusWatch = heroWatches[0] ?? dataset?.watches[0] ?? null;
  const catalogWatches = (imageWatches.length > 0 ? imageWatches : dataset?.watches ?? []).slice(0, 4);
  const selections = dataset ? listEditorialSelections(dataset).slice(0, 2) : [];
  const articles = listPublishedJournalArticles();
  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1, 4);

  return (
    <>
      <section className="overflow-hidden border-b border-[var(--border)] bg-[var(--canvas)]">
        <Container className="grid gap-12 py-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:py-16">
          <div className="max-w-[640px]">
            <p className="type-label">Eternal Time</p>
            <h1 className="type-display mt-5 text-4xl text-balance sm:text-5xl lg:text-6xl">
              Часы как предмет, выбор как система.
            </h1>
            <p className="type-body mt-6 max-w-xl text-lg text-[var(--text-muted)]">
              Каталог, журнал и будущая личная коллекция соединены в один спокойный маршрут: сначала увидеть модель, затем понять детали и только потом выбирать следующую роль.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/watches">Смотреть каталог</ButtonLink>
              <Link href="/selection" className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
                Начать с роли
              </Link>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-2 border-y border-[var(--border)]">
              <div className="border-r border-[var(--border)] py-4 pr-5">
                <p className="font-[var(--font-reference)] text-3xl font-semibold">{formatCatalogCount(dataset?.watches.length ?? 0)}</p>
                <p className="type-meta">моделей</p>
              </div>
              <div className="py-4 pl-5">
                <p className="font-[var(--font-reference)] text-3xl font-semibold">{formatCatalogCount(dataset?.brands.length ?? 0)}</p>
                <p className="type-meta">бренда</p>
              </div>
            </div>

            <div className="commerce-strip mt-6 grid max-w-xl grid-cols-2 gap-px overflow-hidden text-sm sm:grid-cols-4">
              {["Реальные модели", "Цены без шума", "Характеристики", "Гиды к выбору"].map((item) => (
                <span key={item} className="bg-[rgb(255_255_255_/_54%)] px-3 py-3 text-[var(--text-muted)]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            {focusWatch ? (
              <div className="grid gap-4">
                <Link href={focusWatch.href} className="product-stage product-stage-hero min-h-[480px] p-8 lg:min-h-[620px]">
                  <CatalogImage image={focusWatch.primaryImage} className="drop-shadow-[0_32px_44px_rgb(16_19_22_/_22%)]" />
                  <span className="absolute bottom-6 left-6 right-6 grid gap-1 border-t border-[var(--border)] bg-[rgb(248_250_251_/_78%)] pt-4 backdrop-blur-md sm:left-auto sm:w-72">
                    <span className="type-meta">{focusWatch.brandName}</span>
                    <span className="font-semibold leading-6">{focusWatch.title}</span>
                    <span className="type-reference">Код {focusWatch.referenceDisplay}</span>
                  </span>
                </Link>

                {heroWatches.length > 1 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {heroWatches.slice(1, 5).map((watch) => (
                      <Link key={watch.id} href={watch.href} className="product-stage product-stage-contact aspect-square p-3">
                        <CatalogImage image={watch.primaryImage} />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="border-y border-[var(--border)] py-10">
                <p className="type-label">Каталог</p>
                <p className="type-section mt-3 max-w-xl text-3xl">
                  Витрина доступна как текстовый каталог: бренд, модель, артикул, цена и характеристики остаются читаемыми даже без изображения.
                </p>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="blueprint-panel text-[var(--text-inverse)]">
        <Container className="grid gap-8 py-12 lg:grid-cols-[0.42fr_1fr] lg:items-start">
          <div>
            <p className="type-label text-[var(--surface-steel)]">Система</p>
            <h2 className="type-section mt-3 text-3xl">Не витрина ради витрины.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["01", "Каталог", "Факты, цены, изображения и характеристики собраны в читаемую витрину."],
              ["02", "Журнал", "Материалы объясняют размер, стекло, механизм, водозащиту и историю моделей."],
              ["03", "Коллекция", "Следующий слой будет помогать видеть роли часов и выбирать осмысленнее."],
            ].map(([number, title, text]) => (
              <Link key={title} href={title === "Каталог" ? "/watches" : title === "Журнал" ? "/journal" : "/collection"} className="grid gap-4 border-t border-[rgb(255_255_255_/_22%)] pt-5">
                <span className="type-reference text-[var(--surface-steel)]">{number}</span>
                <span className="text-xl font-semibold">{title}</span>
                <span className="type-body text-[var(--surface-steel)]">{text}</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <Container className="grid gap-20 py-16">
        {catalogWatches.length > 0 ? (
          <section className="grid gap-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="type-label">Каталог</p>
                <h2 className="type-section mt-2 text-3xl md:text-4xl">Модели выглядят как предметы, а не как превью</h2>
              </div>
              <Link href="/watches" className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
                Открыть каталог
              </Link>
            </div>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {catalogWatches.map((watch) => (
                <CatalogWatchCardView key={watch.id} watch={watch} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="type-label">Бренды</p>
            <h2 className="type-section mt-2 text-3xl md:text-4xl">Четыре входа в каталог</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(dataset?.brands ?? []).map((brand) => {
              const watches = brandWatches(dataset, brand.slug);
              return (
                <Link key={brand.slug} href={`/watches/${brand.slug}`} className="group grid gap-5 border-t border-[var(--border)] pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-2xl font-semibold group-hover:text-[var(--accent-strong)]">{brand.name}</span>
                    <span className="type-meta">{formatCatalogCount(brand.watchCount)} моделей</span>
                  </div>
                  {watches.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {watches.map((watch) => (
                        <span key={watch.id} className="product-stage product-stage-contact aspect-square p-2">
                          <CatalogImage image={watch.primaryImage} />
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="type-body text-[var(--text-muted)]">Доступен текстовый каталог моделей, коллекций и цен.</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {featuredArticle ? (
          <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <Link href={`/journal/${featuredArticle.slug}`} className="editorial-panel grid content-between gap-10 p-8">
              <div>
                <p className="type-label">{featuredArticle.category}</p>
                <h2 className="type-editorial mt-4 max-w-2xl text-4xl text-balance md:text-5xl">{featuredArticle.title}</h2>
                <p className="type-body mt-5 max-w-xl text-[var(--text-muted)]">{featuredArticle.dek}</p>
              </div>
              <p className="type-meta">{featuredArticle.readingTimeMinutes} мин чтения</p>
            </Link>
            <div className="grid content-start gap-5">
              <p className="type-label">Журнал</p>
              {secondaryArticles.map((article) => (
                <Link key={article.slug} href={`/journal/${article.slug}`} className="grid gap-2 border-t border-[var(--border)] pt-5">
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
              <h2 className="type-section mt-2 text-3xl md:text-4xl">Короткие маршруты выбора</h2>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              {selections.map((selection) => (
                <article key={selection.slug} className="editorial-panel grid gap-5 p-6 md:grid-cols-[1fr_180px]">
                  <div>
                    <p className="type-label">{selection.criteriaLabel}</p>
                    <h3 className="mt-3 text-2xl font-semibold">{selection.title}</h3>
                    <p className="type-body mt-3 text-[var(--text-muted)]">{selection.dek}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selection.watches
                      .filter((watch) => watch.primaryImage.kind !== "none")
                      .slice(0, 4)
                      .map((watch) => (
                        <Link key={watch.id} href={watch.href} className="product-stage product-stage-plain aspect-square p-2">
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
            <h2 className="type-section mt-3 text-3xl md:text-4xl">Следующий слой — понимать, чего не хватает вашим часам.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {["Добавить часы", "Увидеть профиль", "Найти повторы", "Выбрать следующее"].map((item, index) => (
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
    </>
  );
}
