import Image from "next/image";
import Link from "next/link";
import { homepageWatchVisualConfigByReference } from "@/components/home/home-premium-assets";
import {
  getHomeWatchHref,
  type HomeEditorialCuration,
  type HomeScenario,
  type HomeScenarioWatch,
} from "@/components/home/home-scenario-model";
import type { JournalArticleSummary } from "@/modules/journal/domain/read-models";
import styles from "@/components/home/home-ecosystem-sections.module.css";
import type { CSSProperties } from "react";

type CuratedScenarioProps = Readonly<{ scenarios: HomeScenario[]; curation: HomeEditorialCuration }>;
type JournalProps = Readonly<{ articles: JournalArticleSummary[]; scenarios: HomeScenario[]; curation: HomeEditorialCuration }>;
type WatchFigureVariant = "small" | "medium" | "large" | "hero";

export type HomeWatchPlacement = {
  instanceId: string;
  watch: HomeScenarioWatch;
  role: string;
  label: string;
  tone?: "normal" | "finalist" | "quiet" | "next";
};

function isValidationEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function assertUniquePlacementIds(sectionName: string, placements: ReadonlyArray<{ instanceId: string }>) {
  if (!isValidationEnabled()) return;
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const placement of placements) {
    if (seen.has(placement.instanceId)) duplicates.add(placement.instanceId);
    seen.add(placement.instanceId);
  }
  if (duplicates.size > 0) {
    throw new Error(`${sectionName} has duplicate homepage placement ids: ${Array.from(duplicates).join(", ")}`);
  }
}

export function assertNoDuplicateReferencesInComposition(sectionName: string, placements: ReadonlyArray<HomeWatchPlacement>) {
  if (!isValidationEnabled()) return;
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const placement of placements) {
    if (seen.has(placement.watch.reference)) duplicates.add(placement.watch.reference);
    seen.add(placement.watch.reference);
  }
  if (duplicates.size > 0) {
    throw new Error(`${sectionName} has duplicate watch references in one composition: ${Array.from(duplicates).join(", ")}`);
  }
}

function watchAt(scenarios: HomeScenario[], scenarioIndex: number, slotIndex: number): HomeScenarioWatch {
  const fallback = scenarios[0]?.hero.mainWatch;
  const watch = scenarios[scenarioIndex]?.hero.slots[slotIndex] ?? scenarios[scenarioIndex]?.hero.mainWatch ?? fallback;
  if (!watch) throw new Error("Homepage scenarios are empty; cannot render production homepage watch placement.");
  return watch;
}

function uniquePlacements(sectionName: string, placements: HomeWatchPlacement[]): HomeWatchPlacement[] {
  assertUniquePlacementIds(sectionName, placements);
  assertNoDuplicateReferencesInComposition(sectionName, placements);
  return placements;
}

function compactTeaser(text: string, wordLimit = 14): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return `${words.slice(0, wordLimit).join(" ")}${words.length > wordLimit ? "..." : ""}`;
}

function watchFigureStyle(placement: HomeWatchPlacement, variant: WatchFigureVariant): CSSProperties {
  const config = homepageWatchVisualConfigByReference[placement.watch.reference];
  const scaleByVariant = {
    small: Math.min((config?.sectionSmallScale ?? 0.52) * 1.08, 0.72),
    medium: Math.min((config?.sectionMediumScale ?? 0.7) * 1.08, 0.88),
    large: Math.min((config?.sectionLargeScale ?? 0.92) * 1.06, 1),
    hero: Math.min((config?.sectionLargeScale ?? 0.92) * 1.05, 0.98),
  } satisfies Record<WatchFigureVariant, number>;

  return {
    "--home-watch-section-scale": scaleByVariant[variant].toFixed(3),
    "--home-watch-x-correction": `${config?.xCorrection ?? 0}%`,
    "--home-watch-y-correction": `${config?.yCorrection ?? 0}%`,
    "--home-watch-shadow-width": `${Math.max(46, (config?.shadowWidth ?? 0.72) * 100)}%`,
    "--home-watch-shadow-opacity": String(config?.shadowOpacity ?? 0.18),
  } as CSSProperties;
}

function WatchFigure({
  placement,
  variant = "medium",
  priority = false,
  reveal = false,
  revealIndex = 0,
  continuous = false,
  showCaption = true,
}: Readonly<{
  placement: HomeWatchPlacement;
  variant?: WatchFigureVariant;
  priority?: boolean;
  reveal?: boolean;
  revealIndex?: number;
  continuous?: boolean;
  showCaption?: boolean;
}>) {
  const href = getHomeWatchHref(placement.watch);
  const content = (
    <>
      <span className={styles.watchMedia} data-home-continuous-media={continuous ? "true" : undefined}>
        <Image
          src={placement.watch.asset.path}
          alt={`${placement.watch.brandName} ${placement.watch.shortTitle}`}
          width={placement.watch.asset.width}
          height={placement.watch.asset.height}
          sizes={variant === "hero" ? "(max-width: 767px) 70vw, 22vw" : variant === "large" ? "(max-width: 767px) 58vw, 20vw" : "(max-width: 767px) 46vw, 13vw"}
          priority={priority}
          quality={92}
        />
      </span>
      {showCaption ? (
        <figcaption data-home-reveal={reveal ? "caption" : undefined} data-home-reveal-index={reveal ? Math.min(revealIndex + 1, 7) : undefined}>
          <span>{placement.label}</span>
          <strong>{placement.watch.brandName}</strong>
          <em>{placement.watch.shortTitle}</em>
        </figcaption>
      ) : null}
    </>
  );

  return (
    <figure
      className={`${styles.watchFigure} ${styles[`watchFigure_${variant}`]}`}
      style={watchFigureStyle(placement, variant)}
      data-home-placement-id={placement.instanceId}
      data-home-watch-reference={placement.watch.reference}
      data-home-source-dimensions={`${placement.watch.asset.sourceWidth}x${placement.watch.asset.sourceHeight}`}
      data-home-generated-dimensions={`${placement.watch.asset.width}x${placement.watch.asset.height}`}
      data-home-reveal={reveal ? "watch" : undefined}
      data-home-reveal-index={reveal ? revealIndex : undefined}
      data-home-continuous={continuous ? "true" : undefined}
      data-home-watch-href={href ?? ""}
      data-home-missing-href={href ? undefined : "true"}
    >
      {href ? (
        <Link
          href={href}
          className={styles.watchFigureLink}
          aria-label={`Открыть модель ${placement.watch.brandName} ${placement.watch.shortTitle} — ${placement.watch.reference}`}
          data-home-watch-link
          data-home-watch-link-reference={placement.watch.reference}
        >
          {content}
        </Link>
      ) : (
        <span className={styles.watchFigureLink}>{content}</span>
      )}
    </figure>
  );
}

export function HomeEcosystemPath({ scenarios, curation }: CuratedScenarioProps) {
  const pathWatch: HomeWatchPlacement = {
    instanceId: "ecosystem-path-watch-t120417",
    watch: curation.path ?? watchAt(scenarios, 2, 0),
    role: "path-anchor",
    label: "Маршрут выбора",
  };
  assertUniquePlacementIds("ecosystem-path", [pathWatch]);
  const steps = [
    ["01", "Понять"],
    ["02", "Подобрать"],
    ["03", "Сравнить"],
    ["04", "Выбрать"],
    ["05", "Носить"],
    ["06", "Развивать"],
  ] as const;

  return (
    <section className={`${styles.section} ${styles.ecosystemPath}`} data-home-section="ecosystem-path" data-home-transition="light-dark-light">
      <div className={`${styles.homeContent} ${styles.ecosystemContent}`}>
        <div className={`${styles.sectionCopy} ${styles.ecosystemCopy}`} data-home-grid-area="ecosystem-copy" data-home-overlap-copy>
          <p className={styles.eyebrow} data-home-reveal="eyebrow" data-home-reveal-index="0">Не просто каталог</p>
          <h2 data-home-reveal="heading" data-home-reveal-index="1">
            От первого вопроса
            <br />
            <span>до личной коллекции</span>
          </h2>
          <p data-home-reveal="body" data-home-reveal-index="2">
            Подбор, сравнение, покупка
            <br />
            и коллекция — в одном маршруте.
          </p>
          <Link href="/selection" className={`editorial-button ${styles.ctaPrimaryDark}`} data-home-cta-variant="primary-dark" data-home-reveal="cta" data-home-reveal-index="3">
            Как работает Eternal Time
          </Link>
        </div>
        <div className={styles.pathSteps} aria-label="Маршрут Eternal Time" data-home-grid-area="ecosystem-journey">
          <i className={styles.pathLine} data-home-reveal="line-y" data-home-reveal-index="4" aria-hidden="true" />
          {steps.map(([number, label], index) => (
            <p key={`ecosystem-step-${number}`} data-home-reveal="label" data-home-reveal-index={Math.min(index + 4, 7)}>
              <i className={styles.pathNode} data-home-reveal="node" data-home-reveal-index={Math.min(index + 4, 7)} aria-hidden="true" />
              <span>{number}</span>
              <strong>{label}</strong>
            </p>
          ))}
        </div>
        <div className={styles.pathWatch} data-home-grid-area="ecosystem-watch" data-home-watch-stage data-home-overlap-watch>
          <WatchFigure placement={pathWatch} variant="large" reveal revealIndex={7} />
        </div>
      </div>
    </section>
  );
}

export function HomeSelection({ scenarios, curation }: CuratedScenarioProps) {
  const lenses = [
    ["Ритм", "город / офис / выходные"],
    ["Посадка", "размер / профиль / манжета"],
    ["Роль", "первая модель / дополнение"],
  ] as const;
  const profileWatch = curation.selection ?? watchAt(scenarios, 3, 0);
  const profileHref = getHomeWatchHref(profileWatch);

  return (
    <section className={`${styles.section} ${styles.selection}`} data-home-section="selection" data-home-transition="dark-light">
      <div className={styles.homeContent}>
        <div className={styles.selectionTop} data-home-composition="selection">
          <div className={styles.sectionCopy} data-home-grid-area="selection-copy">
            <p className={styles.eyebrow} data-home-reveal="eyebrow" data-home-reveal-index="0">Подбор начинается с вас</p>
            <h2 data-home-reveal="heading" data-home-reveal-index="1">
              Сначала сценарий.
              <br />
              Потом модель.
            </h2>
            <p data-home-reveal="body" data-home-reveal-index="2">
              Учитываем образ жизни,
              <br />
              посадку и роль часов.
            </p>
            <Link href="/selection" className={`editorial-button ${styles.ctaPrimaryLight} ${styles.selectionDesktopAction}`} data-home-cta-variant="primary-light" data-home-reveal="cta" data-home-reveal-index="3">
              Начать подбор
            </Link>
          </div>
          <div className={styles.selectionProfile} data-home-grid-area="selection-profile" data-home-watch-stage data-home-overlap-watch>
            <span className={styles.profileArc} data-home-reveal="line-x" data-home-reveal-index="3" aria-hidden="true" />
            {profileHref ? (
              <Link
                href={profileHref}
                className={styles.profileWatchLink}
                aria-label={`Открыть модель ${profileWatch.brandName} ${profileWatch.shortTitle} — ${profileWatch.reference}`}
                data-home-watch-link
                data-home-watch-link-reference={profileWatch.reference}
              >
                <span className={styles.profileWatch} data-home-reveal="watch" data-home-reveal-index="3">
                  <Image src={profileWatch.asset.path} alt={`${profileWatch.brandName} ${profileWatch.shortTitle}`} width={profileWatch.asset.width} height={profileWatch.asset.height} sizes="(max-width: 767px) 82vw, 32vw" quality={92} />
                </span>
                <span className={styles.profileIdentity}>
                  <i>{profileWatch.brandName}</i>
                  <strong>{profileWatch.shortTitle}</strong>
                  <em>{profileWatch.reference}</em>
                </span>
              </Link>
            ) : (
              <span className={styles.profileWatch} data-home-reveal="watch" data-home-reveal-index="3">
                <Image src={profileWatch.asset.path} alt={`${profileWatch.brandName} ${profileWatch.shortTitle}`} width={profileWatch.asset.width} height={profileWatch.asset.height} sizes="(max-width: 767px) 82vw, 32vw" quality={92} />
              </span>
            )}
          </div>
          <div className={styles.profileCriteria} aria-label="Критерии подбора" data-home-grid-area="selection-criteria">
            {lenses.map(([title, value], index) => (
              <p key={`selection-lens-${title}`} data-home-reveal="body" data-home-reveal-index={index + 4}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <span>{title}</span>
                <strong>{value}</strong>
              </p>
            ))}
          </div>
          <Link href="/selection" className={`editorial-button ${styles.ctaPrimaryLight} ${styles.selectionMobileAction}`} data-home-cta-variant="primary-light">
            Начать подбор
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeComparisonPurchase({ scenarios, curation }: CuratedScenarioProps) {
  const models = uniquePlacements("comparison-purchase", [
    { instanceId: "comparison-purchase-pr100-34-t150210", watch: watchAt(scenarios, 0, 2), role: "compact", label: "Компактная посадка" },
    { instanceId: "comparison-purchase-finalist-t150410", watch: watchAt(scenarios, 1, 0), role: "finalist", label: "Финалист", tone: "finalist" },
    { instanceId: "comparison-purchase-seastar-t120417", watch: curation.comparisonSeastar ?? watchAt(scenarios, 2, 0), role: "sport", label: "Спортивная роль" },
  ]);
  const modelDetails = [
    {
      headerRole: "Компактная посадка",
      specs: [
        ["Размер", "34 мм"],
        ["Механизм", "Кварц"],
        ["Сценарий", "Повседневный"],
        ["Роль", "Первая модель"],
      ],
    },
    {
      headerRole: "Финалист",
      specs: [
        ["Размер", "40 мм"],
        ["Механизм", "Кварц"],
        ["Сценарий", "Универсальный"],
        ["Роль", "Основная база"],
      ],
    },
    {
      headerRole: "Спортивная роль",
      specs: [
        ["Размер", "45,5 мм"],
        ["Механизм", "Хронограф"],
        ["Сценарий", "Спорт и поездки"],
        ["Роль", "Спортивный акцент"],
      ],
    },
  ] as const;
  const journey = ["Сохранен", "Финалист", "Заказ", "Доставлен", "В коллекции"] as const;

  return (
    <section className={`${styles.section} ${styles.comparisonPurchase}`} data-home-section="comparison-purchase" data-home-transition="light-light">
      <div className={`${styles.homeContent} ${styles.comparisonContent}`}>
        <div className={styles.sectionCopy} data-home-grid-area="comparison-copy">
          <p className={styles.eyebrow} data-home-reveal="eyebrow" data-home-reveal-index="0">Финальный выбор</p>
          <h2 data-home-reveal="heading" data-home-reveal-index="1">
            Сравниваем
            <br />
            главные различия
          </h2>
          <p data-home-reveal="body" data-home-reveal-index="2">
            Посадка, механизм,
            <br />
            универсальность и роль.
          </p>
          <Link href="/compare" className={`editorial-button ${styles.ctaSecondaryLight}`} data-home-cta-variant="secondary-light" data-home-reveal="cta" data-home-reveal-index="3">
            Сравнить модели
          </Link>
        </div>
        <div className={styles.comparisonMatrix}>
          <div className={styles.comparisonModels} data-home-grid-area="comparison-models" data-home-watch-stage>
            {models.map((placement, index) => {
              const details = modelDetails[index];
              return (
                <article key={placement.instanceId} className={index === 1 ? styles.comparisonModelFinalist : styles.comparisonModel}>
                  <div className={styles.comparisonWatchStage}>
                    <WatchFigure placement={placement} variant={index === 1 ? "large" : "medium"} reveal revealIndex={index + 3} showCaption={false} />
                  </div>
                  <div className={styles.comparisonIdentity} data-home-reveal="caption" data-home-reveal-index={index + 4}>
                    <span>{details?.headerRole}</span>
                    <strong>{placement.watch.shortTitle}</strong>
                    <em>{placement.watch.brandName}</em>
                  </div>
                  <dl className={styles.comparisonRows}>
                    {details?.specs.map(([label, value]) => (
                      <div key={`${placement.instanceId}-${label}`}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
          <div className={styles.purchasePanel} data-home-grid-area="comparison-criteria">
            <div className={styles.purchaseJourney}>
              <span className={styles.purchaseJourneyLabel}>Путь модели</span>
              <ol className={styles.purchasePath}>
                <i className={styles.purchaseLine} data-home-reveal="line-x" data-home-reveal-index="5" aria-hidden="true" />
                {journey.map((step, index) => (
                  <li key={`purchase-step-${step}`} data-home-reveal="label" data-home-reveal-index={Math.min(index + 5, 7)}>
                    <i className={styles.purchaseNode} data-home-reveal="node" data-home-reveal-index={Math.min(index + 5, 7)} aria-hidden="true" />
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeCollectionIntelligencePanel({ scenarios, curation }: CuratedScenarioProps) {
  const curatedOwned = curation.collectionOwned.length === 4
    ? curation.collectionOwned
    : [watchAt(scenarios, 0, 2), watchAt(scenarios, 3, 0), watchAt(scenarios, 1, 0), watchAt(scenarios, 2, 1)];
  const recommendation = curation.collectionRecommendation ?? watchAt(scenarios, 5, 0);
  const placements = uniquePlacements("collection-intelligence", [
    { instanceId: "collection-owned-tissot-pr100-chronograph", watch: curatedOwned[0], role: "daily", label: "Хронограф" },
    { instanceId: "collection-owned-casio-edifice", watch: curatedOwned[1], role: "mechanical", label: "Первая механика" },
    { instanceId: "collection-owned-orient-classic", watch: curatedOwned[2], role: "classic", label: "Фактура" },
    { instanceId: "collection-owned-citizen-dress", watch: curatedOwned[3], role: "classic", label: "Под рубашку" },
    { instanceId: "collection-next-orient-mako-green", watch: recommendation, role: "next", label: "Следующий шаг", tone: "next" },
  ]);
  const ownedPlacements = placements.slice(0, 4);
  const nextPlacement = placements[4];
  const insights = [
    ["Сильная база", "Повседневные роли закрыты."],
    ["Пробел", "Нет спортивного акцента."],
    ["Следующий шаг", "Добавить цвет и водозащиту."],
  ] as const;
  const nextHref = getHomeWatchHref(nextPlacement.watch);

  return (
    <section className={`${styles.section} ${styles.collectionIntelligence}`} data-home-section="collection-intelligence" data-home-transition="light-dark-light">
      <div className={`${styles.homeContent} ${styles.collectionContent}`}>
        <div className={styles.collectionCopy} data-home-overlap-copy>
          <p className={styles.eyebrow} data-home-reveal="eyebrow" data-home-reveal-index="0">Коллекция становится умнее</p>
          <h2 data-home-reveal="heading" data-home-reveal-index="1">
            Коллекция подсказывает
            <br />
            следующий шаг
          </h2>
        </div>
        <div className={styles.collectionAction}>
          <p data-home-reveal="body" data-home-reveal-index="2">
            Роли и пробелы
            <br />
            видны сразу.
          </p>
          <Link href="/collection" className={styles.collectionOverviewAction} data-home-reveal="cta" data-home-reveal-index="3">
            Открыть коллекцию
          </Link>
        </div>
        <div className={styles.collectionOwnedRow} data-home-grid-area="collection-owned" data-home-next-watch-container>
          <i className={styles.collectionShelf} data-home-reveal="line-x" data-home-reveal-index="1" aria-hidden="true" />
          {ownedPlacements.map((placement, index) => (
            <article key={placement.instanceId} className={styles.collectionOwnedItem} data-home-placement-id={placement.instanceId} data-home-reveal="watch" data-home-reveal-index={index + 2}>
              <WatchFigure placement={placement} variant="medium" />
            </article>
          ))}
        </div>
        <div className={styles.collectionGap} data-home-reveal="label" data-home-reveal-index="5">
          <span className={styles.collectionGapRoute} aria-hidden="true" />
          <i aria-hidden="true" />
          <strong>Не хватает спортивного акцента</strong>
          <p>Цвет и водозащита.</p>
        </div>
        <article className={styles.collectionNext} data-home-placement-id={nextPlacement.instanceId} data-home-overlap-watch data-home-grid-area="collection-next">
          <div className={styles.nextWatchStage} data-home-watch-stage>
            <WatchFigure placement={nextPlacement} variant="large" reveal revealIndex={3} continuous showCaption={false} />
          </div>
          <div className={styles.nextWatchCopy}>
            <i className={styles.nextWatchRole}>{nextPlacement.label}</i>
            <span>{nextPlacement.watch.brandName}</span>
            <strong>{nextPlacement.watch.shortTitle}</strong>
            <em>{nextPlacement.watch.reference}</em>
            {nextHref ? (
              <Link href={nextHref} className={styles.nextWatchAction} aria-label={`Открыть модель ${nextPlacement.watch.brandName} ${nextPlacement.watch.shortTitle}`}>
                Посмотреть модель
              </Link>
            ) : null}
          </div>
        </article>
        <div className={styles.insightPanel} data-home-grid-area="collection-insights">
          <i className={styles.insightLine} data-home-reveal="line-x" data-home-reveal-index="0" aria-hidden="true" />
          {insights.map(([title, text], index) => (
            <p key={`collection-insight-${title}`} data-home-reveal="label" data-home-reveal-index={index + 1}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <em>{text}</em>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeJournalFinal({ articles, scenarios, curation }: JournalProps) {
  const [lead, ...secondary] = articles;
  const visibleSecondary = secondary.slice(0, 2);
  const finalWatches = curation.final.length === 2
    ? curation.final
    : [watchAt(scenarios, 5, 0), watchAt(scenarios, 3, 0)];
  const [finalPrimary, finalSecondary] = uniquePlacements("journal-final", [
    { instanceId: "journal-final-primary-prx-gold-t137407", watch: finalWatches[0] ?? watchAt(scenarios, 5, 0), role: "next", label: "Современная форма", tone: "next" },
    { instanceId: "journal-final-secondary-citizen-nj0210", watch: finalWatches[1] ?? watchAt(scenarios, 3, 0), role: "classic", label: "Спокойная классика", tone: "quiet" },
  ]);

  return (
    <section className={`${styles.section} ${styles.journalFinal}`} data-home-section="journal-final" data-home-transition="dark-light-dark">
      <div className={`${styles.homeContent} ${styles.journalContent}`} data-home-composition="journal">
        <div className={`${styles.sectionCopy} ${styles.journalIntro}`} data-home-grid-area="journal-intro">
          <div className={styles.journalIntroTitle}>
            <p className={styles.eyebrow} data-home-reveal="eyebrow" data-home-reveal-index="0">Журнал Eternal Time</p>
            <h2 data-home-reveal="heading" data-home-reveal-index="1">
              Понять часы.
              <br />
              Потом выбрать.
            </h2>
          </div>
          <p data-home-reveal="body" data-home-reveal-index="2">
            Короткие материалы
            <br />
            о посадке, механизмах и стиле.
          </p>
        </div>
        {lead ? (
          <article className={styles.journalLead} data-home-grid-area="journal-lead" data-home-reveal="journal-lead" data-home-reveal-index="1">
            <Link href={`/journal/${lead.slug}`} className={styles.journalLeadText} aria-label={`Читать материал «${lead.title}»`}>
              <span>{lead.category}</span>
              <strong>{lead.title}</strong>
              <p>{compactTeaser(lead.dek)}</p>
              <em>{lead.readingTimeMinutes} мин</em>
            </Link>
            <span className={styles.journalLeadVisual} aria-hidden="true"><span>ET / Editorial</span></span>
          </article>
        ) : null}
        <div className={styles.journalList} data-home-grid-area="journal-supporting">
          {visibleSecondary.map((article, index) => {
            return (
              <article key={`journal-link-${article.slug}`} className={`${styles.journalStory} ${index === 0 ? styles.journalStorySteel : styles.journalStoryBurgundy}`} data-home-reveal="journal-supporting" data-home-reveal-index={index + 2}>
                <Link href={`/journal/${article.slug}`} className={styles.journalStoryText} aria-label={`Читать материал «${article.title}»`}>
                  <span>{article.category}</span>
                  <strong>{article.title}</strong>
                  <p>{compactTeaser(article.dek, 12)}</p>
                  <em>{article.readingTimeMinutes} мин</em>
                </Link>
                <span className={styles.journalStoryVisual} aria-hidden="true"><span>{article.category}</span></span>
              </article>
            );
          })}
        </div>
      </div>
      <div className={styles.finalStrip} data-home-grid-area="final-cta">
        <span className={styles.finalMaterial} data-home-reveal="material-field" data-home-reveal-index="0" aria-hidden="true" />
        <div className={`${styles.homeContent} ${styles.finalInner}`} data-home-composition="final-cta">
          <div className={styles.finalCopy} data-home-overlap-copy>
            <p data-home-reveal="heading" data-home-reveal-index="1">
              Найдите часы,
              <br />
              которые займут
              <br />
              свое место
            </p>
            <div className={styles.finalActions}>
              <Link href="/selection" className={`editorial-button ${styles.ctaPrimaryDark}`} data-home-cta-variant="primary-dark" data-home-reveal="cta" data-home-reveal-index="2">
                Начать подбор
              </Link>
              <Link href="/collection" className={`editorial-button ${styles.ctaSecondaryDark}`} data-home-cta-variant="secondary-dark" data-home-reveal="cta" data-home-reveal-index="3">
                Создать коллекцию
              </Link>
            </div>
          </div>
          <div className={styles.finalWatches} aria-label="Финальная подборка часов Eternal Time" data-home-watch-stage data-home-overlap-watch>
            {finalSecondary ? <WatchFigure placement={finalSecondary} variant="large" reveal revealIndex={5} showCaption={false} /> : null}
            {finalPrimary ? <WatchFigure placement={finalPrimary} variant="hero" priority reveal revealIndex={4} continuous showCaption={false} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
