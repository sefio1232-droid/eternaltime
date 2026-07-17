import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { HomeScenario, HomeScenarioWatch } from "@/components/home/home-scenario-model";
import type { JournalArticleSummary } from "@/modules/journal/domain/read-models";
import styles from "@/components/home/home-ecosystem-sections.module.css";

type ScenarioProps = Readonly<{
  scenarios: HomeScenario[];
}>;

type JournalProps = Readonly<{
  articles: JournalArticleSummary[];
}>;

function watchAt(scenarios: HomeScenario[], scenarioIndex: number, slotIndex: number): HomeScenarioWatch | null {
  return scenarios[scenarioIndex]?.hero.slots[slotIndex] ?? scenarios[scenarioIndex]?.hero.mainWatch ?? null;
}

function WatchFigure({ watch, label }: Readonly<{ watch: HomeScenarioWatch | null; label: string }>) {
  if (!watch) return null;

  return (
    <figure className={styles.watchFigure}>
      <Image src={watch.asset.path} alt={`${watch.brandName} ${watch.shortTitle}`} width={420} height={480} sizes="(max-width: 767px) 44vw, 18vw" />
      <figcaption>
        <span>{label}</span>
        <strong>{watch.brandName}</strong>
        <em>{watch.shortTitle}</em>
      </figcaption>
    </figure>
  );
}

export function HomeEcosystemIntro({ scenarios }: ScenarioProps) {
  const leadWatch = watchAt(scenarios, 0, 0);
  const loop = ["ПОДБОР", "КАНДИДАТЫ", "СРАВНЕНИЕ", "ВЫБОР", "ПОКУПКА", "КОЛЛЕКЦИЯ", "АНАЛИЗ", "СЛЕДУЮЩАЯ МОДЕЛЬ"];

  return (
    <section className={`${styles.section} ${styles.ecosystemIntro}`} data-home-section="ecosystem-intro">
      <div className={styles.sectionCopy}>
        <p className={styles.eyebrow}>НЕ ПРОСТО КАТАЛОГ</p>
        <h2>
          ОТ ПЕРВОГО ВОПРОСА
          <br />
          ДО ЛИЧНОЙ КОЛЛЕКЦИИ
        </h2>
        <p>
          Eternal Time помогает понять часы, сравнить кандидатов, выбрать модель под реальный сценарий и развивать коллекцию дальше.
        </p>
        <Link href="/selection" className="editorial-button">
          Как работает Eternal Time
        </Link>
      </div>
      <div className={styles.loopDiagram} aria-label="Путь пользователя Eternal Time">
        {loop.map((step, index) => (
          <span key={step} style={{ "--step-index": index } as CSSProperties}>
            {step}
          </span>
        ))}
        <WatchFigure watch={leadWatch} label="Старт" />
      </div>
    </section>
  );
}

export function HomeSelectionProfile({ scenarios }: ScenarioProps) {
  const watches = [watchAt(scenarios, 0, 1), watchAt(scenarios, 1, 0), watchAt(scenarios, 3, 0)];

  return (
    <section className={`${styles.section} ${styles.selectionProfile}`} data-home-section="selection-profile">
      <div className={styles.sectionCopy}>
        <p className={styles.eyebrow}>ПОДБОР НАЧИНАЕТСЯ С ВАС</p>
        <h2>
          МЫ СМОТРИМ НЕ ТОЛЬКО
          <br />
          НА БРЕНД И ЦЕНУ
        </h2>
        <p>Сначала фиксируем ритм жизни, стиль одежды и характер будущей коллекции. Потом показываем модели, у которых есть причина быть на вашем запястье.</p>
        <Link href="/selection" className="editorial-button editorial-button-dark">
          Начать подбор
        </Link>
      </div>
      <div className={styles.axisSystem}>
        {["РИТМ", "СТИЛЬ", "ХАРАКТЕР"].map((axis, index) => (
          <div key={axis} className={styles.axisRow}>
            <span>{axis}</span>
            <i style={{ "--axis-fill": `${58 + index * 13}%` } as CSSProperties} />
            <em>{["каждый день", "форма и посадка", "роль в коллекции"][index]}</em>
          </div>
        ))}
        <div className={styles.selectionWatches}>
          {watches.map((watch, index) => (
            <WatchFigure key={watch?.reference ?? index} watch={watch} label={`0${index + 1}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeCompareStory({ scenarios }: ScenarioProps) {
  const candidates = [watchAt(scenarios, 0, 1), watchAt(scenarios, 1, 0), watchAt(scenarios, 5, 0)];
  const finalist = candidates[1];

  return (
    <section className={`${styles.section} ${styles.compareStory}`} data-home-section="compare-story">
      <div className={styles.sectionCopy}>
        <p className={styles.eyebrow}>КОГДА ОСТАЛОСЬ НЕСКОЛЬКО ВАРИАНТОВ</p>
        <h2>
          СРАВНИВАЕМ НЕ ШУМ.
          <br />
          СРАВНИВАЕМ РАЗЛИЧИЯ.
        </h2>
        <p>Сравнение должно объяснять, какую роль модель займет в жизни и коллекции, а не просто складывать характеристики в таблицу.</p>
        <Link href="/compare" className="editorial-button">
          Сравнить кандидатов
        </Link>
      </div>
      <div className={styles.compareBoard}>
        <div className={styles.candidateLine}>
          {candidates.map((watch, index) => (
            <WatchFigure key={watch?.reference ?? index} watch={watch} label={index === 1 ? "Финалист" : "Кандидат"} />
          ))}
        </div>
        <div className={styles.compareRows}>
          {["ПОСАДКА", "МЕХАНИЗМ", "УНИВЕРСАЛЬНОСТЬ", "РОЛЬ В КОЛЛЕКЦИИ"].map((row, index) => (
            <p key={row}>
              <span>{row}</span>
              <strong>{["спокойная под манжету", "кварц / автомат / Powermatic", "офис, город, вечер", finalist?.shortTitle ?? "финальная модель"][index]}</strong>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePurchaseJourney() {
  return (
    <section className={`${styles.section} ${styles.purchaseJourney}`} data-home-section="purchase-journey">
      <div className={styles.sectionCopy}>
        <p className={styles.eyebrow}>ПОНЯТНЫЙ ПУТЬ К ПОКУПКЕ</p>
        <h2>
          ОТ ФИНАЛИСТА
          <br />
          ДО ЧАСОВ НА ЗАПЯСТЬЕ
        </h2>
        <p>Покупка не прерывает исследование. Она становится спокойным финалом выбора, когда модель уже понятна и сохранена как кандидат.</p>
      </div>
      <ol className={styles.purchaseTrack}>
        {["СОХРАНЕНО", "РАССМАТРИВАЕТСЯ", "ФИНАЛИСТ", "ЗАКАЗ", "ДОСТАВЛЕНО"].map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}

export function HomeCollectionStory({ scenarios }: ScenarioProps) {
  const collectionWatches = [watchAt(scenarios, 0, 0), watchAt(scenarios, 1, 1), watchAt(scenarios, 4, 0), watchAt(scenarios, 2, 0)];

  return (
    <section className={`${styles.section} ${styles.collectionStory}`} data-home-section="collection-story">
      <div className={styles.sectionCopy}>
        <p className={styles.eyebrow}>ВАША ЧАСОВАЯ СИСТЕМА</p>
        <h2>
          ПОКУПКА ЗАКАНЧИВАЕТ ЗАКАЗ.
          <br />
          НО НЕ ИСТОРИЮ.
        </h2>
        <p>Коллекция показывает, какие роли уже закрыты, какие модели дублируют друг друга и где следующий осмысленный шаг.</p>
        <Link href="/collection" className="editorial-button">
          Открыть коллекцию
        </Link>
      </div>
      <div className={styles.collectionPreview}>
        {["DAILY", "CLASSIC", "SPORT", "TRAVEL"].map((role, index) => (
          <WatchFigure key={role} watch={collectionWatches[index]} label={role} />
        ))}
      </div>
    </section>
  );
}

export function HomeCollectionIntelligence({ scenarios }: ScenarioProps) {
  const recommendation = watchAt(scenarios, 5, 0);

  return (
    <section className={`${styles.section} ${styles.collectionIntelligence}`} data-home-section="collection-intelligence">
      <div className={styles.sectionCopy}>
        <p className={styles.eyebrow}>КОЛЛЕКЦИЯ СТАНОВИТСЯ УМНЕЕ</p>
        <h2>
          ПОНИМАЙТЕ,
          <br />
          ЧЕГО В НЕЙ НЕ ХВАТАЕТ
        </h2>
        <p>После первой покупки Eternal Time помогает видеть пробелы: не хватает деловой классики, спортивной модели или часов с характером.</p>
        <Link href="/collection" className="editorial-button">
          Посмотреть анализ
        </Link>
      </div>
      <div className={styles.insightPanel}>
        {["ПРОБЕЛ", "ДУБЛИРОВАНИЕ", "СЛЕДУЮЩИЙ ШАГ"].map((title, index) => (
          <p key={title}>
            <span>0{index + 1}</span>
            <strong>{title}</strong>
            <em>{["нет строгой модели", "две похожие роли", recommendation?.shortTitle ?? "модель с характером"][index]}</em>
          </p>
        ))}
      </div>
    </section>
  );
}

export function HomeJournalPreview({ articles }: JournalProps) {
  if (articles.length === 0) return null;
  const [lead, ...secondary] = articles;

  return (
    <section className={`${styles.section} ${styles.journalPreview}`} data-home-section="journal-preview">
      <div className={styles.sectionCopy}>
        <p className={styles.eyebrow}>ЖУРНАЛ</p>
        <h2>
          СНАЧАЛА ПОНЯТЬ ЧАСЫ.
          <br />
          ПОТОМ ВЫБИРАТЬ.
        </h2>
        <p>Редакционные материалы становятся продолжением подбора: объясняют модели, механизмы, сценарии и культуру владения.</p>
        <Link href="/journal" className="editorial-button">
          Все материалы
        </Link>
      </div>
      <div className={styles.journalLayout}>
        {lead ? (
          <Link href={`/journal/${lead.slug}`} className={styles.journalLead}>
            <span>{lead.category}</span>
            <strong>{lead.title}</strong>
            <em>{lead.readingTimeMinutes} мин</em>
          </Link>
        ) : null}
        <div className={styles.journalRows}>
          {secondary.slice(0, 2).map((article) => (
            <Link key={article.slug} href={`/journal/${article.slug}`}>
              <span>{article.category}</span>
              <strong>{article.title}</strong>
              <em>{article.readingTimeMinutes} мин</em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeFinalCall() {
  return (
    <section className={`${styles.section} ${styles.finalCall}`} data-home-section="final-call">
      <p className={styles.eyebrow}>ETERNAL TIME</p>
      <h2>
        НАЙДИТЕ ЧАСЫ,
        <br />
        КОТОРЫЕ ЗАЙМУТ
        <br />
        СВОЕ МЕСТО
      </h2>
      <p>Начните с подбора или откройте коллекцию, чтобы увидеть, какой модели действительно не хватает.</p>
      <div className={styles.finalActions}>
        <Link href="/selection" className="editorial-button editorial-button-dark">
          Подобрать часы
        </Link>
        <Link href="/collection" className="editorial-button">
          Моя коллекция
        </Link>
      </div>
    </section>
  );
}
