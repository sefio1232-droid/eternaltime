import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import styles from "./home-hero-v2-design-lab.module.css";

const heroWatch = {
  brand: "Tissot",
  model: "PR 100 Chronograph",
  reference: "T150.417.11.041.00",
  publicPriceRub: 47500,
  assetPath: "/generated/home-hero/candidates/01-everyday/secondary-01.png",
  href: "/watches/tissot/t1504171104100",
};

const confirmedSpecs = [
  {
    value: "40 мм",
    label: "Диаметр",
    sourceField: "identity.title",
  },
  {
    value: "Хронограф",
    label: "Функция",
    sourceField: "specifications.firstClass.movement_raw",
  },
];

const futureLayers = [
  "dialGraphicBackLayer",
  "backgroundWordLayer",
  "watchShadowLayer",
  "mainWatchLayer",
  "specificationLayer",
  "productMetaLayer",
  "foregroundTickLayer",
];

function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/\s/g, " ")} ₽`;
}

function SearchIcon() {
  return <span className={styles.searchIcon} aria-hidden="true" />;
}

function HeartIcon() {
  return <span className={styles.heartIcon} aria-hidden="true">♡</span>;
}

function AccountIcon() {
  return <span className="icon-account" aria-hidden="true" />;
}

function CartIcon() {
  return <span className={styles.cartIcon} aria-hidden="true" />;
}

function DialGraphic() {
  const ticks = Array.from({ length: 28 }, (_, index) => {
    const angle = -122 + index * 6.5;
    return <i key={angle} style={{ "--tick-angle": `${angle}deg` } as CSSProperties} />;
  });

  return (
    <>
      <div className={styles.dialArc} aria-hidden="true" />
      <div className={styles.tickField} aria-hidden="true">
        {ticks}
      </div>
      <span className={styles.minute05}>05</span>
      <span className={styles.minute10}>10</span>
      <span className={styles.minute15}>15</span>
      <span className={styles.scenarioMark}>01</span>
      <span className={styles.radialLine} />
    </>
  );
}

function ReviewPanel() {
  return (
    <section id="review-panel" className={styles.reviewPanel} aria-label="V2 prototype review panel">
      <div className={styles.reviewHeader}>
        <div>
          <span>Dev-only review</span>
          <h2>Homepage Hero V2 Static Art Direction Prototype</h2>
        </div>
        <Link href="/design-lab/home-hero">Open previous hero lab</Link>
      </div>

      <dl className={styles.reviewGrid}>
        <div>
          <dt>Active scenario</dt>
          <dd>01 — На каждый день</dd>
        </div>
        <div>
          <dt>Main model</dt>
          <dd>
            {heroWatch.brand} {heroWatch.model}
          </dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{formatRub(heroWatch.publicPriceRub)}</dd>
        </div>
        <div>
          <dt>Asset path</dt>
          <dd>{heroWatch.assetPath}</dd>
        </div>
        <div>
          <dt>Confirmed specs</dt>
          <dd>{confirmedSpecs.map((spec) => `${spec.value} (${spec.sourceField})`).join("; ")}</dd>
        </div>
        <div>
          <dt>Future layer list</dt>
          <dd>{futureLayers.join("; ")}</dd>
        </div>
      </dl>
    </section>
  );
}

export function HomeHeroV2DesignLab({ reviewOnly = false }: Readonly<{ reviewOnly?: boolean }>) {
  if (reviewOnly) {
    return (
      <main className={`${styles.page} ${styles.reviewOnlyPage}`}>
        <ReviewPanel />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.prototype} aria-label="Homepage hero V2 prototype">
        <header className={styles.header}>
          <Link href="/" className={styles.logo} aria-label="Eternal Time">
            Eternal Time
          </Link>

          <nav className={styles.navigation} aria-label="Основная навигация">
            <Link href="/watches">Каталог</Link>
            <Link href="/selection">Подбор часов</Link>
            <Link href="/brands">Бренды</Link>
            <Link href="/journal">Журнал</Link>
            <Link href="/collection">Коллекция</Link>
          </nav>

          <div className={styles.actions} aria-label="Действия">
            <Link href="/watches" aria-label="Поиск">
              <SearchIcon />
            </Link>
            <Link href="/account/favorites" aria-label="Избранное">
              <HeartIcon />
            </Link>
            <Link href="/account" aria-label="Профиль">
              <AccountIcon />
            </Link>
            <Link href="/cart" aria-label="Кандидаты">
              <CartIcon />
            </Link>
          </div>
        </header>

        <section className={styles.hero} aria-label="Cinematic editorial product hero">
          <div className={styles.messageZone}>
            <p className={styles.eyebrow}>Ваше время. Ваш стиль.</p>
            <h1>
              На каждый
              <span>день</span>
            </h1>
            <p className={styles.description}>Часы для спокойного ежедневного ритма, работы и города.</p>
            <div className={styles.ctaGroup}>
              <Link href="/selection" className={styles.primaryCta}>
                Подобрать часы
              </Link>
              <Link href={heroWatch.href} className={styles.secondaryCta}>
                Смотреть модель
              </Link>
            </div>
          </div>

          <div className={styles.productStage} aria-label={`${heroWatch.brand} ${heroWatch.model}`}>
            <div className={styles.dialGraphicBackLayer}>
              <DialGraphic />
            </div>

            <div className={styles.backgroundWordLayer} aria-hidden="true">
              Ритм
            </div>

            <div className={styles.watchShadowLayer} aria-hidden="true" />

            <div className={styles.mainWatchLayer}>
              <Image
                src={heroWatch.assetPath}
                alt={`${heroWatch.brand} ${heroWatch.model}`}
                width={1800}
                height={1900}
                loading="eager"
                className={styles.watchImage}
              />
            </div>

            <div className={styles.specificationLayer} aria-label="Ключевые характеристики">
              <div className={styles.specDiameter}>
                <i />
                <strong>{confirmedSpecs[0].value}</strong>
                <span>{confirmedSpecs[0].label}</span>
              </div>
              <div className={styles.specFunction}>
                <i />
                <strong>{confirmedSpecs[1].value}</strong>
                <span>{confirmedSpecs[1].label}</span>
              </div>
            </div>

            <div className={styles.productMetaLayer}>
              <div>
                <span>{heroWatch.brand}</span>
                <strong>{heroWatch.model}</strong>
              </div>
              <em>{formatRub(heroWatch.publicPriceRub)}</em>
              <Link href={heroWatch.href}>Смотреть модель →</Link>
            </div>

            <div className={styles.foregroundTickLayer} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <nav className={styles.scenarioNavigation} aria-label="Сценарии">
              {["01", "02", "03", "04", "05", "06"].map((scenario) => (
                <span key={scenario} data-active={scenario === "01" ? "true" : undefined}>
                  {scenario}
                </span>
              ))}
            </nav>

            <Link href="/design-lab/home-hero-v2" className={styles.nextScenario}>
              <span>Следующий сценарий</span>
              <strong>02 — Под рубашку →</strong>
            </Link>
          </div>
        </section>
      </section>

      <ReviewPanel />
    </main>
  );
}
