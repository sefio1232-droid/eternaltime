import type { Metadata } from "next";
import Link from "next/link";
import { JournalTypographicCover } from "@/components/journal/journal-typographic-cover";
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
  description:
    "Редакционные материалы Eternal Time о выборе марок, механических часах и осознанном коллекционировании.",
  alternates: { canonical: "/journal" },
  openGraph: {
    type: "website",
    title: "Журнал Eternal Time",
    description: "Материалы о выборе, механизмах и культуре часов.",
    url: "/journal",
    siteName: "Eternal Time",
    locale: "ru_RU",
  },
};

const issueSlugs = [
  "pochemu-mekhanicheskie-chasy-populyarny",
  "kak-vybrat-brend-chasov",
  "chasy-kak-investitsiya",
] as const;

async function loadDataset(): Promise<CatalogReadDataset | null> {
  try {
    return await getCatalogReadDataset();
  } catch {
    return null;
  }
}

function articleNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function ArticleMeta({ article, number }: Readonly<{ article: JournalArticle; number: string }>) {
  return (
    <p className={styles.meta}>
      {number} / {article.category} · {article.readingTimeMinutes} мин
    </p>
  );
}

function WatchStage({
  watch,
  tone = "paper",
  small = false,
}: Readonly<{
  watch: CatalogWatchDetail;
  tone?: "paper" | "ink" | "mist" | "stone";
  small?: boolean;
}>) {
  return (
    <EditorialWatchVisual
      watch={watch}
      className={small ? styles.watchMini : styles.watchPlate}
      size={small ? "small" : "medium"}
      surface={tone}
      showBrand={false}
      showReference={false}
      link={false}
      presentationMode={small ? "compact" : "standard"}
    />
  );
}

function articleFirstParagraph(article: JournalArticle): string {
  return article.body[0]?.paragraphs[0] ?? article.excerpt;
}

function uniqueBrands(watches: CatalogWatchDetail[]): string {
  const brands = [...new Set(watches.map((watch) => watch.brandName))];
  return brands.length > 0 ? brands.join(" · ") : "Каталог Eternal Time";
}

export default async function JournalPage() {
  const articles = issueSlugs
    .map((slug) => getPublishedJournalArticle(slug))
    .filter((article): article is JournalArticle => Boolean(article));
  const dataset = await loadDataset();
  const articleWatches = new Map(
    articles.map((article) => [article.slug, resolveJournalArticleEditorialWatches(article, dataset)]),
  );
  const [leadArticle, ...secondaryArticles] = articles;
  const leadWatches = leadArticle ? articleWatches.get(leadArticle.slug) ?? [] : [];

  return (
    <div className={styles.page}>
      <EditorialWideContainer className={styles.shell}>
        <header className={styles.masthead}>
          <div className={styles.mastheadCopy}>
            <p className={styles.eyebrow}>ET / Journal / Issue 01</p>
            <h1>Журнал</h1>
            <p className={styles.intro}>
              Не витрина картинок, а спокойный редакционный выпуск: как выбирать бренд, зачем сегодня нужна механика
              и почему часы редко стоит воспринимать как быструю инвестицию.
            </p>
            <dl className={styles.issueFacts} aria-label="Состав выпуска">
              <div>
                <dt>Материалов</dt>
                <dd>{articles.length}</dd>
              </div>
              <div>
                <dt>Формат</dt>
                <dd>гид / эссе / разбор</dd>
              </div>
              <div>
                <dt>Оптика</dt>
                <dd>модели из каталога</dd>
              </div>
            </dl>
          </div>

          <aside className={styles.coverNote} aria-label="Обложка выпуска">
            <div className={styles.coverFolio}>
              <span>Issue</span>
              <strong>01</strong>
            </div>
            <div className={styles.coverObject}>
              <JournalTypographicCover category="Журнал" number="01" keyword="Время" variant="ink" size="lead" />
            </div>
            <p>
              Главная роль изображений здесь — не украшать страницу, а показывать масштаб, форму и характер часов,
              о которых говорит текст.
            </p>
          </aside>
        </header>

        <nav className={styles.tableOfContents} aria-label="Содержание выпуска">
          <span className={styles.tocLabel}>Содержание</span>
          {articles.map((article, index) => (
            <Link href={`/journal/${article.slug}`} key={article.slug}>
              <span>{articleNumber(index)}</span>
              <strong>{article.title}</strong>
              <em>{article.category}</em>
            </Link>
          ))}
        </nav>

        {leadArticle ? (
          <section className={styles.leadStory} aria-labelledby="journal-lead-title">
            <div className={styles.leadKicker}>
              <ArticleMeta article={leadArticle} number="01" />
              <span>Главный материал</span>
            </div>
            <div className={styles.leadBody}>
              <h2 id="journal-lead-title">
                <Link href={`/journal/${leadArticle.slug}`}>{leadArticle.title}</Link>
              </h2>
              <p className={styles.leadDek}>{leadArticle.dek}</p>
              <p>{articleFirstParagraph(leadArticle)}</p>
              <div className={styles.storyActions}>
                <Link href={`/journal/${leadArticle.slug}`}>Читать материал</Link>
                <span>{uniqueBrands(leadWatches)}</span>
              </div>
            </div>
            <div className={styles.leadAside}>
              <div className={styles.editorNote}>
                <span>Редакционная заметка</span>
                <strong>Сначала смысл, потом объект</strong>
                <p>
                  Модели из каталога появляются рядом с текстом как примеры формы, масштаба и характера — не как
                  бесконечная витрина.
                </p>
              </div>
              {leadWatches.slice(0, 2).map((watch, index) => (
                <div className={styles.objectStudy} key={watch.referenceSlug}>
                  <WatchStage watch={watch} tone={index === 0 ? "mist" : "ink"} small={index > 0} />
                  <p>
                    {watch.brandName} · {watch.referenceDisplay}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.readingGrid} aria-labelledby="journal-reading-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Читать дальше</p>
            <h2 id="journal-reading-title">Материалы выпуска</h2>
          </div>
          <div className={styles.storyStack}>
            {secondaryArticles.map((article, index) => {
              const number = articleNumber(index + 1);
              const watches = articleWatches.get(article.slug) ?? [];
              const firstWatch = watches[0];

              return (
                <article className={styles.storyRow} key={article.slug}>
                  <div className={styles.storyRowNumber}>{number}</div>
                  <div className={styles.storyRowCopy}>
                    <ArticleMeta article={article} number={number} />
                    <h3>
                      <Link href={`/journal/${article.slug}`}>{article.title}</Link>
                    </h3>
                    <p>{article.excerpt}</p>
                    <Link className={styles.textLink} href={`/journal/${article.slug}`}>
                      Открыть статью →
                    </Link>
                  </div>
                  <div className={styles.storyRowVisual}>
                    {firstWatch ? (
                      <WatchStage watch={firstWatch} tone={index % 2 === 0 ? "paper" : "stone"} small />
                    ) : (
                      <JournalTypographicCover
                        category={article.category}
                        number={number}
                        keyword="ET"
                        variant={index % 2 === 0 ? "paper" : "ink"}
                        size="compact"
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.editorialShelf} aria-labelledby="journal-shelf-title">
          <div>
            <p className={styles.eyebrow}>Модели из каталога</p>
            <h2 id="journal-shelf-title">Часы в контексте</h2>
          </div>
          <p>
            В материалах Журнала мы показываем реальные модели, чтобы различия в дизайне, механизмах и характере часов
            можно было увидеть, а не только прочитать о них.
          </p>
          <div className={styles.shelfObjects}>
            {articles
              .flatMap((article) => articleWatches.get(article.slug) ?? [])
              .slice(0, 4)
              .map((watch) => (
                <Link href={watch.href} className={styles.shelfObject} key={`${watch.brandSlug}-${watch.referenceSlug}`}>
                  <WatchStage watch={watch} tone="paper" small />
                  <span>{watch.brandName}</span>
                  <strong>{watch.referenceDisplay}</strong>
                </Link>
              ))}
          </div>
        </section>

        <section className={styles.upcoming} aria-labelledby="journal-upcoming-title">
          <header className={styles.upcomingHeader}>
            <p className={styles.eyebrow}>Следующий выпуск</p>
            <h2 id="journal-upcoming-title">Редакция готовит</h2>
          </header>
          <div className={styles.upcomingRail}>
            {upcomingEditorialStories.map((story) => (
              <article key={story.id} className={styles.upcomingStory} data-number={story.number}>
                <div>
                  <span>{story.number}</span>
                  <strong>Скоро</strong>
                </div>
                <p className={styles.meta}>{story.category}</p>
                <h3>{story.title}</h3>
                <p>{story.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.bridge} aria-labelledby="journal-bridge-title">
          <div>
            <p className={styles.eyebrow}>От чтения к выбору</p>
            <h2 id="journal-bridge-title">Продолжите с конкретными моделями</h2>
          </div>
          <p>
            После материала можно перейти в каталог или подбор — уже с языком, который помогает отличать стиль,
            механизм и сценарий носки, а не просто листать красивые фотографии.
          </p>
          <nav aria-label="Продолжить">
            <Link href="/watches">Каталог →</Link>
            <Link href="/selection">Подбор →</Link>
          </nav>
        </section>
      </EditorialWideContainer>
    </div>
  );
}
