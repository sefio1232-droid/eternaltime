import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { Container } from "@/components/ui/container";
import { getPublicEnv } from "@/config/public-env";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import {
  findJournalArticleVisualWatch,
  resolveJournalArticleRelatedWatches,
} from "@/modules/journal/application/journal-catalog-relations";
import {
  getPublishedJournalArticle,
  listPublishedJournalArticles,
} from "@/modules/journal/application/journal-repository";
import type { JournalArticle } from "@/modules/journal/domain/read-models";

type JournalArticlePageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export async function generateMetadata({ params }: JournalArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getPublishedJournalArticle(slug);

  if (!article) {
    return {
      title: "Статья не найдена",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: article.title,
    description: article.dek,
    alternates: {
      canonical: `/journal/${article.slug}`,
    },
  };
}

async function loadCatalogDataset(): Promise<CatalogReadDataset | null> {
  try {
    return await getCatalogReadDataset();
  } catch {
    return null;
  }
}

function ArticleMeta({ article }: Readonly<{ article: JournalArticle }>) {
  return (
    <p className="journal-meta">
      {article.category} / {article.readingTimeMinutes} мин / {article.publishedAt}
    </p>
  );
}

function ArticleHeroPhoto({
  watch,
  article,
}: Readonly<{
  watch: CatalogWatchDetail | null;
  article: JournalArticle;
}>) {
  if (!watch || watch.primaryImage.kind === "none") {
    return null;
  }

  return (
    <figure className="journal-article-hero-photo">
      <CatalogImage image={watch.primaryImage} className="journal-photo-image" />
      <figcaption className="journal-caption">
        {watch.brandName} {watch.referenceDisplay} / визуальная связь с материалом
      </figcaption>
      <span className="sr-only">{article.title}</span>
    </figure>
  );
}

function RecommendedWatchRow({ watch }: Readonly<{ watch: CatalogWatchDetail }>) {
  return (
    <Link href={watch.href} className="journal-watch-row">
      <span className="journal-watch-thumb">
        <CatalogImage image={watch.primaryImage} className="journal-photo-image" />
      </span>
      <span className="min-w-0">
        <span className="journal-meta">{watch.brandName} / {watch.referenceDisplay}</span>
        <span className="mt-2 block text-xl font-semibold leading-tight text-balance">{watch.title}</span>
      </span>
      <span className="journal-watch-price">{formatCatalogMoney(watch.publicPrice)}</span>
    </Link>
  );
}

export default async function JournalArticlePage({ params }: JournalArticlePageProps) {
  const { slug } = await params;
  const article = getPublishedJournalArticle(slug);

  if (!article) {
    notFound();
  }

  const env = getPublicEnv();
  const dataset = await loadCatalogDataset();
  const heroWatch = findJournalArticleVisualWatch(article, dataset);
  const recommendedWatches = resolveJournalArticleRelatedWatches(article, dataset).slice(0, 3);
  const relatedArticles = listPublishedJournalArticles()
    .filter((candidate) => candidate.slug !== article.slug && candidate.category === article.category)
    .slice(0, 3);
  const pullQuote = article.body[0]?.paragraphs[1] ?? article.dek;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    mainEntityOfPage: `${env.appUrl}/journal/${article.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Eternal Time",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main className="journal-page">
        <Container className="max-w-[var(--container-wide)] py-10 lg:py-20">
          <article data-article-layout="magazine-article" className="journal-article">
            <nav aria-label="Возврат к журналу" className="mb-12">
              <Link href="/journal" className="journal-meta hover:text-[var(--text)]">
                Журнал
              </Link>
            </nav>

            <header className="journal-article-header">
              <ArticleMeta article={article} />
              <h1 className="journal-article-title text-balance">{article.title}</h1>
              <p className="journal-article-dek">{article.dek}</p>
            </header>

            <ArticleHeroPhoto watch={heroWatch} article={article} />

            <div className="journal-article-layout">
              <aside className="journal-article-rail" aria-label="Сведения о материале">
                <p className="type-label">Материал</p>
                <dl className="mt-5 grid gap-5">
                  <div>
                    <dt className="journal-meta">Рубрика</dt>
                    <dd className="mt-1 text-sm font-semibold">{article.category}</dd>
                  </div>
                  <div>
                    <dt className="journal-meta">Чтение</dt>
                    <dd className="mt-1 text-sm font-semibold">{article.readingTimeMinutes} мин</dd>
                  </div>
                  <div>
                    <dt className="journal-meta">Дата</dt>
                    <dd className="mt-1 text-sm font-semibold">{article.publishedAt}</dd>
                  </div>
                </dl>
              </aside>

              <div className="journal-article-copy">
                {article.body.map((section, index) => (
                  <section key={`${section.heading ?? "section"}-${index}`} className="grid gap-6">
                    {section.heading ? <h2>{section.heading}</h2> : null}
                    {index === 1 && pullQuote ? <blockquote>{pullQuote}</blockquote> : null}
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </section>
                ))}
              </div>
            </div>

            {recommendedWatches.length > 0 ? (
              <section data-article-section="recommended-watches" className="journal-article-section">
                <div>
                  <p className="type-label">Связанные часы</p>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight text-balance">Модели из материала</h2>
                </div>
                <div className="journal-watch-list">
                  {recommendedWatches.map((watch) => (
                    <RecommendedWatchRow key={watch.id} watch={watch} />
                  ))}
                </div>
              </section>
            ) : null}

            {relatedArticles.length > 0 ? (
              <section
                data-article-section="related-materials"
                data-related-kind="same-category"
                className="journal-article-section"
              >
                <div>
                  <p className="type-label">Читайте также</p>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight text-balance">Близкие материалы</h2>
                </div>
                <div className="journal-list-lines">
                  {relatedArticles.map((relatedArticle) => (
                    <Link key={relatedArticle.slug} href={`/journal/${relatedArticle.slug}`} className="journal-list-line">
                      <span>{relatedArticle.title}</span>
                      <span className="journal-meta">
                        {relatedArticle.category} / {relatedArticle.readingTimeMinutes} мин
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </article>
        </Container>
      </main>
    </>
  );
}
