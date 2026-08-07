import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialWatchPlate } from "@/components/journal/editorial-watch-plate";
import { EditorialWatchVisual } from "@/components/journal/editorial-watch-visual";
import { JournalTypographicCover } from "@/components/journal/journal-typographic-cover";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { getPublicEnv } from "@/config/public-env";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { resolveJournalArticleEditorialWatches } from "@/modules/journal/application/journal-catalog-relations";
import { getPublishedJournalArticle, listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { JournalArticle, JournalPresentationBlock } from "@/modules/journal/domain/read-models";
import styles from "./article.module.css";

type JournalArticlePageProps = Readonly<{ params: Promise<{ slug: string }> }>;
const articleNumbers: Record<string, string> = { "pochemu-mekhanicheskie-chasy-populyarny": "01", "kak-vybrat-brend-chasov": "02", "chasy-kak-investitsiya": "03" };
const coverKeywords: Record<string, string> = { feature: "Механизмы", guide: "Выбор", essay: "Ценность", analysis: "Разбор" };

export function generateStaticParams() { return listPublishedJournalArticles().map((article) => ({ slug: article.slug })); }

export async function generateMetadata({ params }: JournalArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getPublishedJournalArticle(slug);
  if (!article) return { title: "Статья не найдена", robots: { index: false, follow: false } };
  const description = article.dek || article.excerpt;
  return { title: article.title, description, alternates: { canonical: `/journal/${article.slug}` }, openGraph: { type: "article", title: article.title, description, url: `/journal/${article.slug}`, siteName: "Eternal Time", locale: "ru_RU", ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}), ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}), ...(article.heroImage ? { images: [{ url: article.heroImage.src, alt: article.heroImage.alt }] } : {}) } };
}

async function loadDataset(): Promise<CatalogReadDataset | null> { try { return await getCatalogReadDataset(); } catch { return null; } }
function articleHeadings(article: JournalArticle) { return article.body.flatMap((section, index) => section.heading ? [{ label: section.heading, id: `section-${index + 1}` }] : []); }
function ArticleMeta({ article, number }: Readonly<{ article: JournalArticle; number: string }>) { return <p className={styles.meta}>{number} / {article.category} · {article.readingTimeMinutes} мин</p>; }

function HeroVisual({ watches, variant }: Readonly<{ watches: CatalogWatchDetail[]; variant: JournalArticle["layoutVariant"] }>) {
  const heroWatches = variant === "guide"
    ? watches.filter((watch, index, all) => all.findIndex((candidate) => candidate.brandSlug === watch.brandSlug) === index)
    : watches.slice(0, 3);
  return (
    <div className={styles.heroVisual} data-variant={variant}>
      {heroWatches.map((watch, index) => (
        <EditorialWatchVisual
          watch={watch}
          key={watch.referenceSlug}
          className={styles.heroWatch}
          size={variant === "guide" ? "medium" : index === 0 ? "large" : index === 1 ? "medium" : "small"}
          surface={variant === "feature" && index === 0 ? "paper" : index === 1 ? "mist" : index === 2 ? "stone" : "paper"}
          showBrand={variant === "guide"}
          showReference={false}
          presentationMode={watch.brandSlug === "casio" ? "compact" : index === 0 ? "long-strap" : "standard"}
          priority={index === 0}
          index={index}
        />
      ))}
      {variant === "guide" ? <><div className={styles.brandMarker}><strong>Casio</strong><span>Практичность и узнаваемость</span><small>Подходящее предметное изображение в текущем каталоге недоступно.</small></div><div className={styles.brandMarker}><strong>Citizen</strong><span>Технологии и удобство</span><small>Типографическая композиция: безопасное изображение отсутствует.</small></div></> : null}
    </div>
  );
}

function ArticleHero({ article, number, watches }: Readonly<{ article: JournalArticle; number: string; watches: CatalogWatchDetail[] }>) {
  return (
    <header className={styles.hero} data-variant={article.layoutVariant}>
      <div className={styles.heroCopy}>
        <ArticleMeta article={article} number={number} />
        {article.layoutVariant === "essay" ? <span className={styles.essayNumber} aria-hidden="true">{number}</span> : null}
        <h1>{article.title}</h1>
        <p className={styles.dek}>{article.dek}</p>
      </div>
      {watches.length ? <HeroVisual watches={watches} variant={article.layoutVariant} /> : <JournalTypographicCover category={article.category} number={number} keyword={coverKeywords[article.layoutVariant]} variant="ink" size="lead" title={article.title} />}
    </header>
  );
}

function InlineContents({ headings }: Readonly<{ headings: Array<{ label: string; id: string }> }>) {
  if (headings.length < 3) return null;
  const primary = headings.slice(0, 6);
  const remaining = headings.slice(6);
  return (
    <nav className={styles.inlineToc} aria-label="Содержание статьи">
      <p className={styles.label}>В этом материале</p>
      <ol>{primary.map((heading, index) => <li key={heading.id}><span>{String(index + 1).padStart(2, "0")}</span><a href={`#${heading.id}`}>{heading.label}</a></li>)}</ol>
      {remaining.length ? <details><summary>Все разделы</summary><ol>{remaining.map((heading, index) => <li key={heading.id}><span>{String(index + 7).padStart(2, "0")}</span><a href={`#${heading.id}`}>{heading.label}</a></li>)}</ol></details> : null}
    </nav>
  );
}

function Paragraphs({ paragraphs }: Readonly<{ paragraphs: string[] }>) { return <>{paragraphs.map((text, index) => <p key={`${index}-${text.slice(0, 24)}`}>{text}</p>)}</>; }
function PresentationBlock({ block }: Readonly<{ block: JournalPresentationBlock }>) {
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "section-intro") return <p className={styles.sectionIntro}>{block.text}</p>;
  if (block.type === "heading") return <h2 id={block.id}>{block.text}</h2>;
  if (block.type === "statement" || block.type === "pull-quote") return <blockquote className={styles.statement}>{block.text}</blockquote>;
  if (block.type === "key-point") return <aside className={styles.keyPoint}><span>Ключевая мысль</span><p>{block.text}</p></aside>;
  if (block.type === "definition") return <aside className={styles.definition}><strong>{block.term}</strong><p>{block.text}</p></aside>;
  if (block.type === "side-note") return <aside className={styles.sideNote}>{block.text}</aside>;
  if (block.type === "divider") return <hr />;
  if (block.type === "related-link") return <Link className={styles.inlineRelated} href={`/journal/${block.slug}`}>{block.label}</Link>;
  if (block.type === "comparison") return <section className={styles.comparison}><h3>{block.title}</h3><Paragraphs paragraphs={block.paragraphs} /></section>;
  if (block.type === "ordered-section") return <section id={block.id} className={styles.orderedSection}><span aria-hidden="true">{block.number}</span><div><h2>{block.title}</h2><Paragraphs paragraphs={block.paragraphs} /></div></section>;
  return <section className={styles.conclusion}><p className={styles.label}>Вывод</p><h2 id="conclusion">{block.title}</h2><Paragraphs paragraphs={block.paragraphs} /></section>;
}

function VisualizedBody({ article, watches }: Readonly<{ article: JournalArticle; watches: CatalogWatchDetail[] }>) {
  const firstBreak = Math.max(2, Math.floor(article.presentationBlocks.length * 0.28));
  const secondBreak = Math.max(firstBreak + 2, Math.floor(article.presentationBlocks.length * 0.62));
  const firstSelection = article.layoutVariant === "feature" ? watches.slice(1, 2) : article.layoutVariant === "guide" ? watches.slice(0, 2) : watches.slice(0, 1);
  const secondSelection = article.layoutVariant === "feature" ? [watches[0], watches[2]].filter((watch): watch is CatalogWatchDetail => Boolean(watch)) : article.layoutVariant === "guide" ? watches.slice(2, 4) : watches.slice(1, 3);
  return <div className={styles.copy}>{article.presentationBlocks.map((block, index) => (
    <div className={styles.block} key={`${block.type}-${index}`}>
      <PresentationBlock block={block} />
      {index === firstBreak && firstSelection.length ? <EditorialWatchPlate watches={firstSelection} title={article.layoutVariant === "guide" ? "Характер начинается с пропорций" : article.layoutVariant === "essay" ? "Предметный пример из каталога" : "Другой характер механики"} description={article.layoutVariant === "guide" ? "Tissot и Orient показаны точными моделями из каталога." : "Редакционно выбранный визуальный пример; статья не посвящена этой конкретной модели."} layout={article.layoutVariant === "guide" ? "duo" : "single"} surface={article.layoutVariant === "essay" ? "ivory" : "paper"} /> : null}
      {index === secondBreak && secondSelection.length ? <EditorialWatchPlate watches={secondSelection} title={article.layoutVariant === "feature" ? "Механика в разных характерах" : article.layoutVariant === "essay" ? "Цена и позиционирование — разные контексты" : "Модели для сравнения"} description={article.layoutVariant === "guide" ? "Ещё два точных предметных примера Tissot и Orient. Casio и Citizen не подменяются случайными фотографиями." : article.layoutVariant === "essay" ? "Визуальные примеры, а не прогноз стоимости или инвестиционная рекомендация." : "Сравните форму, пропорции и характер — без рейтинга и без подмены содержания статьи."} layout="duo" showPrice={article.layoutVariant === "feature"} surface={article.layoutVariant === "feature" ? "navy" : "paper"} /> : null}
    </div>
  ))}</div>;
}

function RelatedStories({ article }: Readonly<{ article: JournalArticle }>) {
  const related = article.relatedArticleSlugs.map((slug) => getPublishedJournalArticle(slug)).filter((candidate): candidate is JournalArticle => candidate !== null && candidate.slug !== article.slug).filter((candidate, index, all) => all.findIndex((item) => item.slug === candidate.slug) === index).slice(0, 2);
  if (!related.length) return null;
  return <section className={styles.related} data-article-section="related-materials" data-related-kind="explicit"><div><p className={styles.label}>Читайте также</p><h2>Продолжить исследование</h2></div><div className={styles.relatedGrid}>{related.map((item) => { const n = articleNumbers[item.slug] ?? "—"; return <Link key={item.slug} href={`/journal/${item.slug}`} className={styles.relatedCard}><JournalTypographicCover category={item.category} number={n} keyword={coverKeywords[item.layoutVariant]} variant={item.layoutVariant === "essay" ? "stone" : "paper"} size="compact" motif="none" title={item.title} /><span className={styles.meta}>{n} / {item.category} · {item.readingTimeMinutes} мин</span><strong>{item.title}</strong></Link>; })}</div></section>;
}

export default async function JournalArticlePage({ params }: JournalArticlePageProps) {
  const { slug } = await params;
  const article = getPublishedJournalArticle(slug);
  if (!article) notFound();
  const dataset = await loadDataset();
  const watches = resolveJournalArticleEditorialWatches(article, dataset);
  const env = getPublicEnv();
  const number = articleNumbers[article.slug] ?? "—";
  const headings = articleHeadings(article);
  const structuredData = { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.dek, inLanguage: "ru-RU", mainEntityOfPage: `${env.appUrl}/journal/${article.slug}`, publisher: { "@type": "Organization", name: "Eternal Time" }, ...(article.author ? { author: { "@type": "Person", name: article.author } } : {}), ...(article.publishedAt ? { datePublished: article.publishedAt } : {}), ...(article.updatedAt ? { dateModified: article.updatedAt } : {}), ...(article.heroImage ? { image: `${env.appUrl}${article.heroImage.src}` } : {}) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><div className={styles.page}><EditorialContainer className={styles.shell}><article data-article-layout={article.layoutVariant} data-media-presentation="catalog-editorial"><nav aria-label="Хлебные крошки" className={styles.breadcrumbs}><Link href="/">Главная</Link><span aria-hidden="true">/</span><Link href="/journal">Журнал</Link><span aria-hidden="true">/</span><span>{article.category}</span></nav><ArticleHero article={article} number={number} watches={watches} /><InlineContents headings={headings} /><VisualizedBody article={article} watches={watches} /><RelatedStories article={article} /><section className={styles.bridge} aria-labelledby="article-bridge-title"><div><p className={styles.label}>От чтения к выбору</p><h2 id="article-bridge-title">Сопоставьте выводы с реальными моделями</h2></div><div><p>Продолжите в каталоге или уточните критерии в подборе.</p><nav><Link href="/watches">Каталог →</Link><Link href="/selection">Подбор →</Link></nav></div></section><Link className={styles.finalBack} href="/journal">← Вернуться в Журнал</Link></article></EditorialContainer></div></>;
}
