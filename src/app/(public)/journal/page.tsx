import type { Metadata } from "next";
import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { findJournalArticleVisualWatch } from "@/modules/journal/application/journal-catalog-relations";
import { getPublishedJournalArticle, listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { isProminentCatalogImage } from "@/modules/catalog/application/catalog-image-presentation-policy";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { JournalArticle, JournalArticleCategory } from "@/modules/journal/domain/read-models";

export const metadata: Metadata = {
  title: "Журнал",
  description: "Редакционные материалы Eternal Time о выборе, устройстве и культуре часов.",
  alternates: { canonical: "/journal" },
};

const sectionLabels: Record<JournalArticleCategory, string> = {
  Гиды: "Гиды",
  Материалы: "Механика и материалы",
  "Истории моделей": "Истории моделей",
  Стиль: "Стиль и посадка",
  Механика: "Механика и материалы",
};

async function loadCatalogDataset(): Promise<CatalogReadDataset | null> {
  try {
    return await getCatalogReadDataset();
  } catch {
    return null;
  }
}

function fullArticles(): JournalArticle[] {
  return listPublishedJournalArticles()
    .map((article) => getPublishedJournalArticle(article.slug))
    .filter((article): article is JournalArticle => Boolean(article));
}

function ArticleMeta({ article }: Readonly<{ article: JournalArticle }>) {
  return <p className="journal-meta">{sectionLabels[article.category]} · {article.readingTimeMinutes} мин · {article.publishedAt}</p>;
}

function WatchPhoto({
  watch,
  caption,
  className = "",
  slot = "journal-compact",
}: Readonly<{
  watch: CatalogWatchDetail | null;
  caption: string;
  className?: string;
  slot?: "journal-lead" | "journal-compact";
}>) {
  if (!watch || watch.primaryImage.kind === "none" || !isProminentCatalogImage(watch.primaryImage)) return null;
  return (
    <figure className={`journal-photo ${className}`}>
      <CatalogImage image={watch.primaryImage} presentation="guarded" compositionSlot={slot} className="journal-photo-image" />
      <figcaption className="journal-caption">{caption}</figcaption>
    </figure>
  );
}

export default async function JournalPage() {
  const dataset = await loadCatalogDataset();
  const articles = fullArticles();
  const lead = articles.find((article) => findJournalArticleVisualWatch(article, dataset)) ?? articles[0];
  const leadWatch = lead ? findJournalArticleVisualWatch(lead, dataset) : null;
  const hasLeadImage = Boolean(leadWatch?.primaryImage.kind !== "none" && leadWatch?.primaryImage && isProminentCatalogImage(leadWatch.primaryImage));
  const remaining = articles.filter((article) => article.slug !== lead?.slug);
  const secondary = remaining.slice(0, 3);
  const compact = remaining.slice(3, 6);
  const readingList = remaining.slice(6);
  const groups = Array.from(new Set(articles.map((article) => sectionLabels[article.category]))).map((label) => ({
    label,
    count: articles.filter((article) => sectionLabels[article.category] === label).length,
  }));

  return (
    <main className="journal-page">
      <EditorialContainer className="journal-layout public-page">
        <aside className="journal-sidebar">
          <header>
            <h1 className="journal-masthead">Журнал</h1>
            <p>Идеи, истории и экспертиза о часах и времени</p>
          </header>
          <nav aria-label="Рубрики журнала" className="journal-category-list">
            <span>
              <strong>Все материалы</strong>
              <em>{articles.length}</em>
            </span>
            {groups.map((group) => (
              <span key={group.label}>
                <strong>{group.label}</strong>
                <em>{group.count}</em>
              </span>
            ))}
          </nav>
          <div className="journal-subscribe-note">
            <p>Подборки, истории моделей и практические ориентиры для спокойного выбора.</p>
            <Link href="/selection" className="editorial-button editorial-button-dark">Начать подбор</Link>
          </div>
        </aside>

        <div className="journal-main">
          <header className="journal-topline">
            <p>Время — больше, чем измерение. Это выбор, стиль и детали, которые остаются.</p>
            <Link href="/selection" className="editorial-button">Перейти к подбору</Link>
          </header>

          <section data-journal-layout={hasLeadImage ? "lead-image" : "lead-text"} className={`journal-issue-grid ${hasLeadImage ? "" : "journal-issue-grid-text-led"}`}>
            {lead ? (
              <Link href={`/journal/${lead.slug}`} className="journal-link journal-cover">
                <span className="journal-cover-copy">
                  <ArticleMeta article={lead} />
                  <strong className="journal-cover-title text-balance">{lead.title}</strong>
                  <em>Читать статью</em>
                </span>
                {hasLeadImage ? (
                  <span className="journal-cover-media">
                    <WatchPhoto watch={leadWatch} caption={lead.category} className="aspect-[1.28/1]" slot="journal-lead" />
                  </span>
                ) : null}
              </Link>
            ) : null}

            {secondary.length > 0 ? (
              <div className="journal-right-stack">
                {secondary.map((article) => (
                  <Link key={article.slug} href={`/journal/${article.slug}`} className="journal-link journal-side-story">
                    <span>
                      <ArticleMeta article={article} />
                      <strong>{article.title}</strong>
                    </span>
                    <WatchPhoto watch={findJournalArticleVisualWatch(article, dataset)} caption={article.category} className="aspect-[1.55/1]" slot="journal-compact" />
                  </Link>
                ))}
              </div>
            ) : null}
          </section>

          {compact.length > 0 ? (
            <section data-journal-layout="text-led" className="journal-text-strip">
              <div className="journal-section-label">
                <p className="type-label">Короткое чтение</p>
                <p className="journal-mini-note mt-3">Материалы, которым не нужна большая иллюстрация.</p>
              </div>
              <div className="journal-text-columns">
                {compact.map((article) => (
                  <Link key={article.slug} href={`/journal/${article.slug}`} className="journal-link journal-text-note">
                    <ArticleMeta article={article} />
                    <h2 className="mt-4 text-2xl font-semibold leading-tight text-balance">{article.title}</h2>
                    <p className="journal-copy mt-4">{article.dek}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section data-journal-layout="editorial-quote" className="journal-quote-band">
            <p>Идеальные часы — не о том, чтобы показывать время. Они о том, чтобы напоминать, как его ценить.</p>
          </section>

          <section data-journal-layout="reading-list" className="journal-reading-list">
            <div>
              <p className="type-label">Читайте также</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">Близкие материалы</h2>
            </div>
            <div className="journal-list-lines">
              {readingList.map((article) => (
                <Link key={article.slug} href={`/journal/${article.slug}`} className="journal-list-line">
                  <span>{article.title}</span>
                  <span className="journal-meta">{sectionLabels[article.category]} · {article.readingTimeMinutes} мин</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </EditorialContainer>
    </main>
  );
}
