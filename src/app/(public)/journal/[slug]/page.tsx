import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getPublicEnv } from "@/config/public-env";
import {
  getPublishedJournalArticle,
  listPublishedJournalArticles,
} from "@/modules/journal/application/journal-repository";

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

export default async function JournalArticlePage({ params }: JournalArticlePageProps) {
  const { slug } = await params;
  const article = getPublishedJournalArticle(slug);

  if (!article) {
    notFound();
  }

  const env = getPublicEnv();
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
      <Container className="py-10 lg:py-14">
        <article className="grid gap-10 lg:grid-cols-[220px_minmax(0,var(--measure))] lg:justify-center">
          <aside className="grid content-start gap-5 border-t border-[var(--border)] pt-5 lg:sticky lg:top-24">
            <Link href="/journal" className="type-meta hover:text-[var(--text)]">
              Журнал
            </Link>
            <div>
              <p className="type-label">{article.category}</p>
              <p className="type-meta mt-2">{article.readingTimeMinutes} мин чтения</p>
              <p className="type-meta mt-1">{article.publishedAt}</p>
            </div>
          </aside>

          <div>
            <header className="border-b border-[var(--border)] pb-8">
              <h1 className="type-page text-4xl text-balance md:text-5xl">{article.title}</h1>
              <p className="type-body mt-5 text-xl text-[var(--text-muted)]">{article.dek}</p>
            </header>

            <div className="mt-9 grid gap-9">
              {article.body.map((section, index) => (
                <section key={`${section.heading ?? "section"}-${index}`} className="grid gap-4">
                  {section.heading ? <h2 className="type-section text-2xl">{section.heading}</h2> : null}
                  {index === 1 && pullQuote ? (
                    <blockquote className="border-l border-[var(--border-strong)] pl-5 font-[var(--font-editorial)] text-2xl leading-snug text-[var(--text-muted)]">
                      {pullQuote}
                    </blockquote>
                  ) : null}
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="type-body text-lg text-[var(--text)]">
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            {relatedArticles.length > 0 ? (
              <section className="mt-12 border-t border-[var(--border)] pt-7" data-related-kind="same-category">
                <h2 className="type-section text-2xl">Еще по теме</h2>
                <div className="mt-5 grid gap-4">
                  {relatedArticles.map((relatedArticle) => (
                    <Link
                      key={relatedArticle.slug}
                      href={`/journal/${relatedArticle.slug}`}
                      className="grid gap-1 border-t border-[var(--border)] pt-4"
                    >
                      <span className="font-semibold">{relatedArticle.title}</span>
                      <span className="type-meta">
                        {relatedArticle.category} · {relatedArticle.readingTimeMinutes} мин
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>
      </Container>
    </>
  );
}
