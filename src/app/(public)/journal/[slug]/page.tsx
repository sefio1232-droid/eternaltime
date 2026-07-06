import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getPublicEnv } from "@/config/public-env";
import { getPublishedJournalArticle } from "@/modules/journal/application/journal-repository";

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
        <article className="mx-auto max-w-[var(--measure)]">
          <Link href="/journal" className="type-meta hover:text-[var(--text)]">
            Журнал
          </Link>
          <header className="mt-5 border-b border-[var(--border)] pb-7">
            <p className="type-meta">
              {article.category} · {article.readingTimeMinutes} мин чтения · {article.publishedAt}
            </p>
            <h1 className="type-display mt-4 text-5xl text-balance md:text-6xl">{article.title}</h1>
            <p className="type-body mt-5 text-xl text-[var(--text-muted)]">{article.dek}</p>
          </header>

          <div className="mt-9 grid gap-9">
            {article.body.map((section, index) => (
              <section key={`${section.heading ?? "section"}-${index}`} className="grid gap-4">
                {section.heading ? <h2 className="type-section text-3xl">{section.heading}</h2> : null}
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="type-body text-lg text-[var(--text)]">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </Container>
    </>
  );
}
