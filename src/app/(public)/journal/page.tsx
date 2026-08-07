import type { Metadata } from "next";
import Link from "next/link";
import { JournalTypographicCover } from "@/components/journal/journal-typographic-cover";
import { JournalWatchComposition } from "@/components/journal/editorial-watch-plate";
import { EditorialWatchVisual } from "@/components/journal/editorial-watch-visual";
import { EditorialWideContainer } from "@/components/ui/editorial-primitives";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { resolveJournalArticleEditorialWatches } from "@/modules/journal/application/journal-catalog-relations";
import { getPublishedJournalArticle } from "@/modules/journal/application/journal-repository";
import { upcomingEditorialStories } from "@/modules/journal/content/upcoming-stories";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { JournalArticle } from "@/modules/journal/domain/read-models";
import styles from "./journal.module.css";

export const metadata: Metadata = {
  title: "Журнал о часах",
  description: "Редакционные материалы Eternal Time о выборе марок, механических часах и осознанном коллекционировании.",
  alternates: { canonical: "/journal" },
  openGraph: { type: "website", title: "Журнал Eternal Time", description: "Материалы о выборе, механизмах и культуре часов.", url: "/journal", siteName: "Eternal Time", locale: "ru_RU" },
};

const issueSlugs = ["pochemu-mekhanicheskie-chasy-populyarny", "kak-vybrat-brend-chasov", "chasy-kak-investitsiya"] as const;

async function loadDataset(): Promise<CatalogReadDataset | null> {
  try { return await getCatalogReadDataset(); } catch { return null; }
}

function ArticleMeta({ article, number }: Readonly<{ article: JournalArticle; number: string }>) {
  return <p className={styles.meta}>{number} / {article.category} · {article.readingTimeMinutes} мин</p>;
}

function WatchStage({ watch, compact = false, treatment }: Readonly<{ watch: CatalogWatchDetail; compact?: boolean; treatment?: "lead-anchor" | "lead-inset" | `investment-${number}` }>) {
  const treatmentClass = treatment === "lead-anchor" ? styles.lead_anchor : treatment === "lead-inset" ? styles.lead_inset : "";
  return (
    <EditorialWatchVisual
      watch={watch}
      className={`${compact ? styles.compactWatch : styles.watchStage} ${treatmentClass}`}
      size={compact ? "small" : treatment === "lead-inset" ? "medium" : "large"}
      surface={treatment === "lead-inset" ? "ink" : treatment === "investment-2" ? "mist" : treatment === "investment-3" ? "stone" : "paper"}
      showBrand={false}
      showReference={false}
      presentationMode={treatment === "investment-1" ? "wide-case" : treatment === "lead-anchor" ? "long-strap" : compact ? "compact" : "large"}
    />
  );
}

function uniqueBrands(watches: CatalogWatchDetail[]): string {
  return [...new Set(watches.map((watch) => watch.brandName))].join(" · ");
}

export default async function JournalPage() {
  const articles = issueSlugs.map((slug) => getPublishedJournalArticle(slug)).filter((article): article is JournalArticle => Boolean(article));
  const [mechanical, brandGuide, investment] = articles;
  const dataset = await loadDataset();
  const mechanicalWatches = mechanical ? resolveJournalArticleEditorialWatches(mechanical, dataset) : [];
  const brandWatches = brandGuide ? resolveJournalArticleEditorialWatches(brandGuide, dataset) : [];
  const investmentWatches = investment ? resolveJournalArticleEditorialWatches(investment, dataset) : [];

  return (
    <div className={styles.page}>
      <EditorialWideContainer className={styles.shell}>
        <header className={styles.masthead}>
          <div className={styles.issueCopy}>
            <p className={styles.eyebrow}>ET / JOURNAL</p>
            <h1>Журнал</h1>
            <p className={styles.intro}>Предметный разговор о механизмах, марках и ценности часов — с реальными моделями для визуального сравнения.</p>
            <div className={styles.issueMeta}><span>Выпуск 01</span><span>{articles.length} материала</span></div>
          </div>
          {mechanicalWatches.length ? <JournalWatchComposition watches={mechanicalWatches} /> : <JournalTypographicCover category="Журнал" number="01" keyword="Время" variant="ink" size="lead" />}
        </header>

        <nav className={styles.issueIndex} aria-label="Содержание выпуска">
          <span className={styles.issueIndexLabel}>В выпуске</span>
          {articles.map((article, index) => (
            <Link href={`/journal/${article.slug}`} key={article.slug}>
              <span>{String(index + 1).padStart(2, "0")} / {article.category}</span>
              <strong>{article.title}</strong>
            </Link>
          ))}
        </nav>

        <div className={styles.issue}>
          {mechanical ? (
            <article className={styles.lead}>
              <div className={styles.leadMedia}>
                {mechanicalWatches[0] ? <WatchStage watch={mechanicalWatches[0]} treatment="lead-anchor" /> : null}
                {mechanicalWatches[1] ? <WatchStage watch={mechanicalWatches[1]} treatment="lead-inset" /> : null}
                <span className={styles.storyNumber}>01 / OBJECTS IN DIALOGUE</span>
              </div>
              <div className={styles.leadCopy}>
                <ArticleMeta article={mechanical} number="01" />
                <h2><Link href={`/journal/${mechanical.slug}`}>{mechanical.title}</Link></h2>
                <p>{mechanical.excerpt}</p>
                <div className={styles.modelMarkers}><span>{mechanicalWatches.length} механические модели из каталога</span></div>
                <Link className={styles.textLink} href={`/journal/${mechanical.slug}`}>Читать материал →</Link>
              </div>
            </article>
          ) : null}

          {brandGuide ? (
            <article className={styles.guide}>
              <div className={styles.guideCopy}>
                <ArticleMeta article={brandGuide} number="02" />
                <h2><Link href={`/journal/${brandGuide.slug}`}>{brandGuide.title}</Link></h2>
                <p>{brandGuide.excerpt}</p>
                <Link className={styles.textLink} href={`/journal/${brandGuide.slug}`}>Читать гид →</Link>
              </div>
              <div className={styles.brandRail} aria-label="Четыре марки — четыре разных характера">
                {(["tissot", "orient"] as const).map((brandSlug) => {
                  const watch = brandWatches.find((candidate) => candidate.brandSlug === brandSlug);
                  const direction = brandSlug === "tissot" ? "Классический" : "Механический";
                  return watch ? (
                    <div className={styles.brandPanel} key={brandSlug}>
                      <EditorialWatchVisual watch={watch} size="medium" surface={brandSlug === "orient" ? "mist" : "paper"} showBrand showReference presentationMode="standard" />
                      <span className={styles.brandDirection}>{direction}</span>
                    </div>
                  ) : null;
                })}
                <div className={styles.brandTextStage}><strong>Casio</strong><span>Практичный</span><small>Редакционная обложка</small></div>
                <div className={styles.brandTextStage}><strong>Citizen</strong><span>Технологичный</span><small>Редакционная обложка</small></div>
              </div>
            </article>
          ) : null}

          {investment ? (
            <article className={styles.investment}>
              <span className={styles.editorialNumber} aria-hidden="true">03</span>
              <div className={styles.investmentTitle}><ArticleMeta article={investment} number="03" /><h2><Link href={`/journal/${investment.slug}`}>{investment.title}</Link></h2></div>
              <div className={styles.investmentGallery}>{investmentWatches.map((watch, index) => <WatchStage key={watch.referenceSlug} watch={watch} compact treatment={`investment-${index + 1}`} />)}</div>
              <div className={styles.investmentCopy}><p>{investment.dek}</p><div className={styles.modelMarkers}><span>{uniqueBrands(investmentWatches)}</span></div><Link className={styles.textLink} href={`/journal/${investment.slug}`}>Читать эссе →</Link></div>
            </article>
          ) : null}
        </div>

        <section className={styles.upcoming} aria-labelledby="journal-upcoming-title">
          <header className={styles.upcomingHeader}><p className={styles.eyebrow}>СЛЕДУЮЩИЙ ВЫПУСК</p><h2 id="journal-upcoming-title">Редакция готовит</h2></header>
          <div className={styles.upcomingRail}>
            {upcomingEditorialStories.map((story) => (
              <article key={story.id} className={styles.upcomingStory} data-number={story.number}>
                <div><span>{story.number}</span><strong>СКОРО</strong></div>
                <p className={styles.meta}>{story.category}</p>
                <h3>{story.title}</h3>
                <p>{story.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.bridge} aria-labelledby="journal-bridge-title">
          <div><p className={styles.eyebrow}>ОТ ЧТЕНИЯ К ВЫБОРУ</p><h2 id="journal-bridge-title">Продолжите с конкретными моделями</h2></div>
          <p>Сопоставьте увиденные характеры с каталогом или уточните свои критерии в подборе.</p>
          <nav aria-label="Продолжить"><Link href="/watches">Каталог →</Link><Link href="/selection">Подбор →</Link></nav>
        </section>
      </EditorialWideContainer>
    </div>
  );
}
