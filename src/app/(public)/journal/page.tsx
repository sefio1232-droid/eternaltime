import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";
import type { JournalArticleCategory, JournalArticleSummary } from "@/modules/journal/domain/read-models";

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

function articlesByCategory(articles: JournalArticleSummary[], category: JournalArticleCategory) {
  return articles.filter((article) => article.category === category);
}

export default function JournalPage() {
  const articles = listPublishedJournalArticles();
  const [featured, ...rest] = articles;
  const secondary = rest.slice(0, 2);
  const compact = rest.slice(2, 6);
  const categories: JournalArticleCategory[] = ["Гиды", "Материалы", "Истории моделей", "Стиль", "Механика"];

  return (
    <Container className="grid gap-12 py-10 lg:py-14">
      <header className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <p className="type-label">Журнал</p>
          <h1 className="type-page mt-3 text-3xl text-balance md:text-5xl">Разбирать часы без шума витрины</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)] lg:justify-self-end">
          Гиды, заметки и истории моделей: как читать характеристики, понимать материалы и выбирать часы под реальную жизнь.
        </p>
      </header>

      {featured ? (
        <section data-journal-layout="featured" className="grid gap-6 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="grid content-between gap-8 border-y border-[var(--border-strong)] py-6">
            <p className="type-meta">
              {featured.category} · {featured.readingTimeMinutes} мин чтения
            </p>
            <p className="type-editorial text-3xl text-[var(--text-muted)]">Материал недели</p>
          </div>
          <Link href={`/journal/${featured.slug}`} className="border-y border-[var(--border-strong)] py-6">
            <h2 className="type-editorial max-w-3xl text-4xl text-balance md:text-6xl">{featured.title}</h2>
            <p className="type-body mt-5 max-w-2xl text-[var(--text-muted)]">{featured.dek}</p>
          </Link>
        </section>
      ) : null}

      {secondary.length > 0 ? (
        <section data-journal-layout="secondary" className="grid gap-6 md:grid-cols-2">
          {secondary.map((article) => (
            <Link key={article.slug} href={`/journal/${article.slug}`} className="grid gap-5 border-t border-[var(--border)] pt-5">
              <span className="type-meta">
                {article.category} · {article.readingTimeMinutes} мин
              </span>
              <span className="text-3xl font-semibold leading-tight">{article.title}</span>
              <span className="type-body text-[var(--text-muted)]">{article.dek}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {compact.length > 0 ? (
        <section data-journal-layout="compact" className="grid gap-4 border-y border-[var(--border)] py-6 md:grid-cols-2 lg:grid-cols-4">
          {compact.map((article) => (
            <Link key={article.slug} href={`/journal/${article.slug}`} className="grid content-start gap-3">
              <span className="type-meta">{article.category}</span>
              <span className="font-semibold leading-6">{article.title}</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="grid gap-10">
        {categories.map((category) => {
          const categoryArticles = articlesByCategory(articles, category);
          if (categoryArticles.length === 0) {
            return null;
          }

          return (
            <div key={category} className="grid gap-5 lg:grid-cols-[0.34fr_1fr]">
              <h2 className="type-section border-t border-[var(--border)] pt-5 text-2xl">{sectionLabels[category]}</h2>
              <div className="grid gap-4">
                {categoryArticles.slice(0, 3).map((article) => (
                  <Link
                    key={article.slug}
                    href={`/journal/${article.slug}`}
                    className="grid gap-2 border-t border-[var(--border)] pt-5 md:grid-cols-[1fr_auto] md:items-start"
                  >
                    <span className="font-semibold">{article.title}</span>
                    <span className="type-meta">{article.readingTimeMinutes} мин</span>
                    <span className="type-body text-[var(--text-muted)] md:col-span-2">{article.dek}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </Container>
  );
}
