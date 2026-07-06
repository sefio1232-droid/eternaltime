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

  return (
    <Container className="grid gap-9 py-10 lg:py-14">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="type-meta">Журнал</p>
        <h1 className="type-display mt-3 text-5xl text-balance md:text-6xl">Читать о часах без шума витрины</h1>
        <p className="type-body mt-5 max-w-2xl text-[var(--text-muted)]">
          Гиды, объяснения и редакционные заметки о том, как выбирать часы и понимать их роль в коллекции.
        </p>
      </header>

      <section className="grid gap-8">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/journal/${article.slug}`}
            className="grid gap-4 border-b border-[var(--border)] pb-8 transition-colors hover:border-[var(--border-strong)] md:grid-cols-[220px_1fr]"
          >
            <div className="type-meta">
              {article.category}
              <br />
              {article.readingTimeMinutes} мин чтения
            </div>
            <div>
              <h2 className="type-section text-3xl">{article.title}</h2>
              <p className="type-body mt-3 max-w-2xl text-[var(--text-muted)]">{article.dek}</p>
            </div>
          </Link>
        ))}
      </section>
    </Container>
  );
}
