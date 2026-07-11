import type { Metadata } from "next";
import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { Container } from "@/components/ui/container";
import {
  findJournalArticleVisualWatch,
} from "@/modules/journal/application/journal-catalog-relations";
import {
  getPublishedJournalArticle,
  listPublishedJournalArticles,
} from "@/modules/journal/application/journal-repository";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { JournalArticle, JournalArticleCategory } from "@/modules/journal/domain/read-models";

export const metadata: Metadata = {
  title: "Журнал",
  description: "Редакционные материалы Eternal Time о выборе, устройстве и культуре часов.",
  alternates: {
    canonical: "/journal",
  },
};

const sectionLabels: Record<JournalArticleCategory, string> = {
  Гиды: "Гиды",
  Материалы: "Материалы и устройство",
  "Истории моделей": "Истории моделей",
  Стиль: "Стиль и посадка",
  Механика: "Механика",
};

async function loadCatalogDataset(): Promise<CatalogReadDataset | null> {
  try {
    return await getCatalogReadDataset();
  } catch {
    return null;
  }
}

function listFullPublishedArticles(): JournalArticle[] {
  return listPublishedJournalArticles()
    .map((article) => getPublishedJournalArticle(article.slug))
    .filter((article): article is JournalArticle => Boolean(article));
}

function ArticleMeta({ article }: Readonly<{ article: JournalArticle }>) {
  return (
    <p className="journal-meta">
      {article.category} / {article.readingTimeMinutes} мин / {article.publishedAt}
    </p>
  );
}

function ArticleLink({
  article,
  children,
  className = "",
}: Readonly<{
  article: JournalArticle;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <Link href={`/journal/${article.slug}`} className={`journal-link ${className}`}>
      {children}
    </Link>
  );
}

function WatchPhoto({
  watch,
  caption,
  className = "",
}: Readonly<{
  watch: CatalogWatchDetail | null;
  caption: string;
  className?: string;
}>) {
  if (!watch || watch.primaryImage.kind === "none") {
    return null;
  }

  return (
    <figure className={`journal-photo ${className}`}>
      <CatalogImage image={watch.primaryImage} className="journal-photo-image" />
      <figcaption className="journal-caption">{caption}</figcaption>
    </figure>
  );
}

export default async function JournalPage() {
  const dataset = await loadCatalogDataset();
  const articles = listFullPublishedArticles();
  const coverArticle = articles.find((article) => findJournalArticleVisualWatch(article, dataset)) ?? articles[0];
  const coverWatch = coverArticle ? findJournalArticleVisualWatch(coverArticle, dataset) : null;
  const remaining = articles.filter((article) => article.slug !== coverArticle?.slug);
  const visualArticles = remaining.filter((article) => findJournalArticleVisualWatch(article, dataset));
  const textArticles = remaining.filter((article) => !findJournalArticleVisualWatch(article, dataset));
  const wideArticle = visualArticles[0] ?? remaining[0];
  const narrowArticle = textArticles[0] ?? visualArticles[1] ?? remaining[1];
  const textStrip = textArticles.filter((article) => article.slug !== narrowArticle?.slug).slice(0, 3);
  const photoFeature = visualArticles.find((article) => article.slug !== wideArticle?.slug) ?? visualArticles[0];
  const readingList = articles.filter(
    (article) =>
      article.slug !== coverArticle?.slug &&
      article.slug !== wideArticle?.slug &&
      article.slug !== narrowArticle?.slug &&
      article.slug !== photoFeature?.slug,
  );
  const categories = Array.from(new Set(articles.map((article) => article.category)));

  return (
    <main className="journal-page">
      <Container className="max-w-[var(--container-wide)] py-12 lg:py-20">
        <header className="journal-issue-head">
          <div>
            <p className="type-label">Журнал Eternal Time</p>
            <h1 className="journal-display mt-4 max-w-5xl text-balance">Часы как культура выбора, формы и привычки</h1>
          </div>
          <p className="journal-deck">
            Материалы о моделях, механике, посадке и деталях без рыночного шума. Меньше витрины, больше взгляда.
          </p>
        </header>

        {coverArticle ? (
          <section data-journal-layout="magazine-cover" className="journal-cover">
            <div className="journal-cover-copy">
              <ArticleMeta article={coverArticle} />
              <ArticleLink article={coverArticle}>
                <h2 className="journal-cover-title text-balance">{coverArticle.title}</h2>
                <p className="journal-deck mt-6 max-w-2xl">{coverArticle.dek}</p>
              </ArticleLink>
            </div>
            <ArticleLink article={coverArticle} className="journal-cover-media">
              <WatchPhoto watch={coverWatch} caption={coverWatch?.title ?? coverArticle.category} className="aspect-[1.12/1]" />
            </ArticleLink>
          </section>
        ) : null}

        {wideArticle && narrowArticle ? (
          <section data-journal-layout="asymmetric-pair" className="journal-asymmetric">
            <ArticleLink article={wideArticle} className="journal-asymmetric-wide">
              <WatchPhoto
                watch={findJournalArticleVisualWatch(wideArticle, dataset)}
                caption={wideArticle.category}
                className="mb-8 aspect-[1.55/1]"
              />
              <ArticleMeta article={wideArticle} />
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-balance md:text-6xl">
                {wideArticle.title}
              </h2>
              <p className="journal-copy mt-5 max-w-2xl">{wideArticle.dek}</p>
            </ArticleLink>

            <ArticleLink article={narrowArticle} className="journal-asymmetric-narrow">
              <ArticleMeta article={narrowArticle} />
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-balance">{narrowArticle.title}</h2>
              <p className="journal-copy mt-5">{narrowArticle.dek}</p>
            </ArticleLink>
          </section>
        ) : null}

        {textStrip.length > 0 ? (
          <section data-journal-layout="text-led" className="journal-text-strip">
            <div className="journal-section-label">
              <p className="type-label">Без иллюстраций</p>
              <p className="journal-mini-note">Текстовые материалы, где важнее понятная мысль, а не картинка.</p>
            </div>
            <div className="journal-text-columns">
              {textStrip.map((article) => (
                <ArticleLink key={article.slug} article={article} className="journal-text-note">
                  <ArticleMeta article={article} />
                  <h2 className="mt-4 text-2xl font-semibold leading-tight text-balance">{article.title}</h2>
                  <p className="journal-copy mt-4">{article.dek}</p>
                </ArticleLink>
              ))}
            </div>
          </section>
        ) : null}

        <section data-journal-layout="editorial-quote" className="journal-quote-band">
          <p>
            Хорошая статья о часах не торопит к покупке. Она помогает увидеть пропорции, понять компромисс и спокойнее
            выбрать вещь, которая останется с вами надолго.
          </p>
        </section>

        {photoFeature ? (
          <section data-journal-layout="full-bleed-photo" className="journal-photo-feature">
            <ArticleLink article={photoFeature}>
              <WatchPhoto
                watch={findJournalArticleVisualWatch(photoFeature, dataset)}
                caption={photoFeature.category}
                className="aspect-[2.15/1]"
              />
              <div className="journal-photo-feature-copy">
                <ArticleMeta article={photoFeature} />
                <h2 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-balance md:text-6xl">
                  {photoFeature.title}
                </h2>
              </div>
            </ArticleLink>
          </section>
        ) : null}

        <section data-journal-layout="reading-list" className="journal-reading-list">
          <div>
            <p className="type-label">Читайте также</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight">Редакционная полка</h2>
          </div>
          <div className="journal-list-lines">
            {readingList.map((article) => (
              <ArticleLink key={article.slug} article={article} className="journal-list-line">
                <span>{article.title}</span>
                <span className="journal-meta">{sectionLabels[article.category]} / {article.readingTimeMinutes} мин</span>
              </ArticleLink>
            ))}
            {readingList.length === 0
              ? categories.map((category) => (
                  <div key={category} className="journal-list-line">
                    <span>{sectionLabels[category]}</span>
                    <span className="journal-meta">Новые материалы появятся после публикации</span>
                  </div>
                ))
              : null}
          </div>
        </section>
      </Container>
    </main>
  );
}
