import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";

export const metadata: Metadata = {
  title: "Журнал",
  description: "Редакционные материалы Eternal Time о выборе, устройстве и культуре часов.",
  alternates: {
    canonical: "/journal",
  },
};

export default function JournalPage() {
  const articles = listPublishedJournalArticles();
  const [featured, ...secondary] = articles;

  return (
    <Container className="grid gap-10 py-10 lg:py-14">
      <header className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="type-label">Журнал</p>
          <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">Разбирать часы без шума витрины</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)] lg:justify-self-end">
          Гиды, объяснения и редакционные заметки о том, как выбирать часы, читать характеристики и понимать роль модели в
          личной коллекции.
        </p>
      </header>

      {featured ? (
        <Link
          href={`/journal/${featured.slug}`}
          className="grid gap-6 bg-[var(--surface-graphite)] p-6 text-[var(--text-inverse)] transition-colors hover:bg-[var(--surface-dark)] md:grid-cols-[0.75fr_1.25fr] lg:p-8"
        >
          <div className="type-meta text-[var(--steel)]">
            {featured.category}
            <br />
            {featured.readingTimeMinutes} мин чтения
          </div>
          <div>
            <h2 className="type-section text-3xl md:text-4xl">{featured.title}</h2>
            <p className="type-body mt-4 max-w-2xl text-[var(--steel)]">{featured.dek}</p>
          </div>
        </Link>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2">
        {secondary.map((article) => (
          <Link
            key={article.slug}
            href={`/journal/${article.slug}`}
            className="grid gap-4 border-t border-[var(--border)] pt-5 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="type-meta">
              {article.category} · {article.readingTimeMinutes} мин чтения
            </div>
            <div>
              <h2 className="type-section text-2xl">{article.title}</h2>
              <p className="type-body mt-3 text-[var(--text-muted)]">{article.dek}</p>
            </div>
          </Link>
        ))}
      </section>
    </Container>
  );
}
