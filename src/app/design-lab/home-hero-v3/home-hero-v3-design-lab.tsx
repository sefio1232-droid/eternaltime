"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./home-hero-v3-design-lab.module.css";

const heroWatch = {
  brand: "Tissot",
  model: "PR 100 Chronograph",
  reference: "T150.417.11.041.00",
  publicPriceRub: 45678,
  assetPath: "/generated/home-hero/candidates/01-everyday/secondary-01.png",
  href: "/watches/tissot/t1504171104100",
  sourceAssetSize: "1600 x 1700 px",
  approximateDisplaySize: "desktop CSS box: 350 x 372 px; full bezel/crown visible in 1440 x 900 viewport",
  productFieldWidth: "starts at 47vw; about 763 px field width at 1440 px viewport",
};

const heroLayers = [
  "backgroundFieldLayer",
  "dialBackLayer",
  "backgroundWordLayer",
  "watchShadowLayer",
  "mainWatchLayer",
  "specLayer",
  "productMetaLayer",
  "dialForegroundLayer",
  "scenarioRailLayer",
];

const maxOffsets = {
  backgroundFieldLayer: { x: 2, y: 1 },
  dialBackLayer: { x: 6, y: 5, direction: "opposite pointer" },
  backgroundWordLayer: { x: 9, y: 5, direction: "opposite main watch" },
  watchShadowLayer: { x: 8, y: 6 },
  mainWatchLayer: { x: 18, y: 13, rotate: 0.5 },
  specLayer: { x: 2, y: 2 },
  dialForegroundLayer: { x: 26, y: 18 },
  productMetaLayer: { x: 1, y: 1 },
  headerAndScenarioRail: { x: 0, y: 0 },
};

const safeMovement = [
  "background field: x 2 px / y 1 px",
  "dial back: x 6 px / y 5 px, opposite pointer",
  "background word: x 9 px / y 5 px, opposite main watch",
  "watch shadow: x 8 px / y 6 px",
  "main watch: x 18 px / y 13 px / rotate 0.5 deg",
  "foreground dial segment: x 26 px / y 18 px",
  "specs: x 2 px / y 2 px",
  "product meta: x 1 px / y 1 px",
  "text, header and scenario rail: static",
];

const scenarios = [
  ["01", "На каждый день"],
  ["02", "Под рубашку"],
  ["03", "Путешествия"],
  ["04", "Первая механика"],
  ["05", "Спорт"],
  ["06", "В коллекцию"],
] as const;

type MotionState = {
  motion: boolean;
  pointer: boolean;
  idle: boolean;
  intensity: number;
};

type PointerTelemetry = {
  pointerX: number;
  pointerY: number;
  mainX: number;
  mainY: number;
  foregroundX: number;
  foregroundY: number;
};

type HeroCssVars = CSSProperties & Record<`--${string}`, string>;

const idleCssVars = {
  "--field-x": "0px",
  "--field-y": "0px",
  "--dial-back-x": "0px",
  "--dial-back-y": "0px",
  "--word-x": "0px",
  "--word-y": "0px",
  "--shadow-x": "0px",
  "--shadow-y": "0px",
  "--watch-x": "0px",
  "--watch-y": "0px",
  "--watch-rotate": "0deg",
  "--spec-x": "0px",
  "--spec-y": "0px",
  "--foreground-x": "0px",
  "--foreground-y": "0px",
  "--meta-x": "0px",
  "--meta-y": "0px",
} satisfies HeroCssVars;

function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/\s/g, " ")} ₽`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function SearchIcon() {
  return <span className={styles.searchIcon} aria-hidden="true" />;
}

function HeartIcon() {
  return (
    <span className={styles.heartIcon} aria-hidden="true">
      ♡
    </span>
  );
}

function AccountIcon() {
  return <span className="icon-account" aria-hidden="true" />;
}

function CartIcon() {
  return <span className={styles.cartIcon} aria-hidden="true" />;
}

function DialGraphic() {
  const ticks = Array.from({ length: 22 }, (_, index) => {
    const angle = -142 + index * 7.4;
    return <i key={angle} style={{ "--tick-angle": `${angle}deg` } as CSSProperties} />;
  });

  return (
    <>
      <div className={styles.dialArc} aria-hidden="true" />
      <div className={styles.minuteTicks} aria-hidden="true">
        {ticks}
      </div>
      <span className={styles.minute05}>05</span>
      <span className={styles.minute10}>10</span>
      <span className={styles.minute15}>15</span>
      <span className={styles.scenarioMark}>01 / 06</span>
      <span className={styles.radialLine} aria-hidden="true" />
    </>
  );
}

function ReviewPanel({
  motionState,
  telemetry,
  reducedMotion,
  onMotionChange,
  onResetPointer,
}: Readonly<{
  motionState: MotionState;
  telemetry: PointerTelemetry;
  reducedMotion: boolean;
  onMotionChange: (state: MotionState) => void;
  onResetPointer: () => void;
}>) {
  return (
    <section id="review-panel" className={styles.reviewPanel} aria-label="V3 prototype review panel">
      <div className={styles.reviewHeader}>
        <div>
          <span>Dev-only review</span>
          <h2>Homepage Hero V3 Kinetic Editorial Prototype</h2>
        </div>
        <div className={styles.reviewLinks}>
          <Link href="/design-lab/home-hero-v2">Open V2</Link>
          <Link href="/design-lab/home-hero">Open original lab</Link>
        </div>
      </div>

      <div className={styles.motionControls} aria-label="Dev motion controls">
        <label>
          <span>Motion</span>
          <em>{motionState.motion ? "ON" : "OFF"}</em>
          <input
            type="checkbox"
            checked={motionState.motion}
            onChange={(event) => onMotionChange({ ...motionState, motion: event.currentTarget.checked })}
          />
        </label>
        <label>
          <span>Pointer parallax</span>
          <em>{motionState.pointer ? "ON" : "OFF"}</em>
          <input
            type="checkbox"
            checked={motionState.pointer}
            onChange={(event) => onMotionChange({ ...motionState, pointer: event.currentTarget.checked })}
          />
        </label>
        <label>
          <span>Idle motion</span>
          <em>{motionState.idle ? "ON" : "OFF"}</em>
          <input
            type="checkbox"
            checked={motionState.idle}
            onChange={(event) => onMotionChange({ ...motionState, idle: event.currentTarget.checked })}
          />
        </label>
        <label className={styles.intensityControl}>
          <span>Intensity {motionState.intensity}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={motionState.intensity}
            onChange={(event) =>
              onMotionChange({ ...motionState, intensity: Number.parseInt(event.currentTarget.value, 10) })
            }
          />
        </label>
        <button type="button" onClick={onResetPointer}>
          Reset pointer
        </button>
      </div>

      <dl className={styles.reviewGrid}>
        <div>
          <dt>Model</dt>
          <dd>
            {heroWatch.brand} {heroWatch.model} / {heroWatch.reference}
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
          <dt>Hero layer list</dt>
          <dd>{heroLayers.join("; ")}</dd>
        </div>
        <div>
          <dt>Main-watch dimensions</dt>
          <dd>{heroWatch.approximateDisplaySize}</dd>
        </div>
        <div>
          <dt>Product field width</dt>
          <dd>{heroWatch.productFieldWidth}</dd>
        </div>
        <div>
          <dt>Maximum offsets</dt>
          <dd>{safeMovement.join("; ")}</dd>
        </div>
        <div>
          <dt>Pointer values</dt>
          <dd>
            x {telemetry.pointerX.toFixed(2)} / y {telemetry.pointerY.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>Layer values</dt>
          <dd>
            main {telemetry.mainX.toFixed(1)}px / {telemetry.mainY.toFixed(1)}px; foreground{" "}
            {telemetry.foregroundX.toFixed(1)}px / {telemetry.foregroundY.toFixed(1)}px
          </dd>
        </div>
        <div>
          <dt>Reduced motion</dt>
          <dd>{reducedMotion ? "active" : "inactive"}</dd>
        </div>
      </dl>
    </section>
  );
}

export function HomeHeroV3DesignLab({ reviewOnly = false }: Readonly<{ reviewOnly?: boolean }>) {
  const heroRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const [motionState, setMotionState] = useState<MotionState>({
    motion: true,
    pointer: true,
    idle: true,
    intensity: 100,
  });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [telemetry, setTelemetry] = useState<PointerTelemetry>({
    pointerX: 0,
    pointerY: 0,
    mainX: 0,
    mainY: 0,
    foregroundX: 0,
    foregroundY: 0,
  });

  const motionEnabled = motionState.motion && !reducedMotion;
  const pointerEnabled = motionEnabled && motionState.pointer;
  const intensity = clamp(motionState.intensity / 100, 0, 1);

  const heroClassName = useMemo(
    () =>
      [
        styles.hero,
        !motionEnabled ? styles.motionDisabled : "",
        !motionState.idle || !motionEnabled ? styles.idleDisabled : "",
      ]
        .filter(Boolean)
        .join(" "),
    [motionEnabled, motionState.idle],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(media.matches);

    updateReducedMotion();
    media.addEventListener("change", updateReducedMotion);

    return () => media.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) {
      return;
    }

    const writeVars = (x: number, y: number) => {
      const mainX = x * maxOffsets.mainWatchLayer.x * intensity;
      const mainY = y * maxOffsets.mainWatchLayer.y * intensity;
      const foregroundX = x * maxOffsets.dialForegroundLayer.x * intensity;
      const foregroundY = y * maxOffsets.dialForegroundLayer.y * intensity;

      hero.style.setProperty("--field-x", `${x * maxOffsets.backgroundFieldLayer.x * intensity}px`);
      hero.style.setProperty("--field-y", `${y * maxOffsets.backgroundFieldLayer.y * intensity}px`);
      hero.style.setProperty("--dial-back-x", `${x * -maxOffsets.dialBackLayer.x * intensity}px`);
      hero.style.setProperty("--dial-back-y", `${y * -maxOffsets.dialBackLayer.y * intensity}px`);
      hero.style.setProperty("--word-x", `${x * -maxOffsets.backgroundWordLayer.x * intensity}px`);
      hero.style.setProperty("--word-y", `${y * -maxOffsets.backgroundWordLayer.y * intensity}px`);
      hero.style.setProperty("--shadow-x", `${x * maxOffsets.watchShadowLayer.x * intensity}px`);
      hero.style.setProperty("--shadow-y", `${y * maxOffsets.watchShadowLayer.y * intensity}px`);
      hero.style.setProperty("--watch-x", `${mainX}px`);
      hero.style.setProperty("--watch-y", `${mainY}px`);
      hero.style.setProperty("--watch-rotate", `${x * maxOffsets.mainWatchLayer.rotate * intensity}deg`);
      hero.style.setProperty("--spec-x", `${x * maxOffsets.specLayer.x * intensity}px`);
      hero.style.setProperty("--spec-y", `${y * maxOffsets.specLayer.y * intensity}px`);
      hero.style.setProperty("--foreground-x", `${foregroundX}px`);
      hero.style.setProperty("--foreground-y", `${foregroundY}px`);
      hero.style.setProperty("--meta-x", `${x * maxOffsets.productMetaLayer.x * intensity}px`);
      hero.style.setProperty("--meta-y", `${y * maxOffsets.productMetaLayer.y * intensity}px`);

      setTelemetry({
        pointerX: x,
        pointerY: y,
        mainX,
        mainY,
        foregroundX,
        foregroundY,
      });
    };

    const animate = () => {
      const current = currentRef.current;
      const target = pointerEnabled ? targetRef.current : { x: 0, y: 0 };
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      writeVars(current.x, current.y);
      frameRef.current = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerEnabled) {
        return;
      }

      const rect = hero.getBoundingClientRect();
      targetRef.current = {
        x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
        y: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
      };
    };

    const handlePointerLeave = () => {
      targetRef.current = { x: 0, y: 0 };
    };

    hero.addEventListener("pointermove", handlePointerMove);
    hero.addEventListener("pointerleave", handlePointerLeave);
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      hero.removeEventListener("pointermove", handlePointerMove);
      hero.removeEventListener("pointerleave", handlePointerLeave);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [intensity, pointerEnabled]);

  const handleResetPointer = () => {
    targetRef.current = { x: 0, y: 0 };
  };

  if (reviewOnly) {
    return (
      <main className={`${styles.page} ${styles.reviewOnlyPage}`}>
        <ReviewPanel
          motionState={motionState}
          telemetry={telemetry}
          reducedMotion={reducedMotion}
          onMotionChange={setMotionState}
          onResetPointer={handleResetPointer}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.prototype} aria-label="Homepage hero V3 kinetic editorial prototype">
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

        <section
          ref={heroRef}
          className={heroClassName}
          style={idleCssVars as CSSProperties}
          aria-label="Kinetic editorial product hero"
        >
          <div className={styles.backgroundFieldLayer} aria-hidden="true" />

          <div className={styles.messageZone}>
            <p className={styles.kicker}>Ваше время. Ваш стиль.</p>
            <p className={styles.eyebrow}>01 / Повседневный ритм</p>
            <h1>
              <span className={styles.headlineLine}>На каждый</span>
              <span className={styles.headlineAccent}>день</span>
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
            <div className={styles.dialBackLayer}>
              <DialGraphic />
            </div>

            <div className={styles.backgroundWordLayer} aria-hidden="true">
              <span>Ритм</span>
              <span className={styles.backgroundWordEcho}>Ритм</span>
            </div>

            <div className={styles.watchShadowLayer} aria-hidden="true" />

            <div className={styles.mainWatchLayer}>
              <Image
                src={heroWatch.assetPath}
                alt={`${heroWatch.brand} ${heroWatch.model}`}
                width={1600}
                height={1700}
                loading="eager"
                priority
                className={styles.watchImage}
              />
              <span className={styles.watchGlint} aria-hidden="true" />
            </div>

            <div className={styles.specLayer} aria-label="Ключевые характеристики">
              <div className={styles.specDiameter}>
                <i />
                <strong>40 мм</strong>
                <span>Диаметр</span>
              </div>
              <div className={styles.specFunction}>
                <i />
                <strong>Хронограф</strong>
                <span>Функция</span>
              </div>
            </div>

            <div className={styles.productMetaLayer}>
              <span>{heroWatch.brand}</span>
              <strong>{heroWatch.model}</strong>
              <em>{formatRub(heroWatch.publicPriceRub)}</em>
              <Link href={heroWatch.href}>Смотреть модель →</Link>
            </div>

            <div className={styles.dialForegroundLayer} aria-hidden="true">
              <span className={styles.foregroundArc} />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.nextScenario}>
            <span>Следующий сценарий</span>
            <strong>02 — Под рубашку →</strong>
          </div>

          <nav className={styles.scenarioRailLayer} aria-label="Сценарии подбора">
            {scenarios.map(([number, label]) => (
              <span key={number} data-active={number === "01" ? "true" : undefined}>
                <strong>{number}</strong>
                {label}
              </span>
            ))}
          </nav>
        </section>
      </section>

      <ReviewPanel
        motionState={motionState}
        telemetry={telemetry}
        reducedMotion={reducedMotion}
        onMotionChange={setMotionState}
        onResetPointer={handleResetPointer}
      />
    </main>
  );
}
