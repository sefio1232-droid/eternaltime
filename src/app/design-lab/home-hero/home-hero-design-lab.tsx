"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  homeHeroScenarios,
  rejectedHomeHeroAlternatives,
  type HomeHeroScenario,
  type HomeHeroSpecCallout,
} from "./home-hero-curation";
import styles from "./home-hero-design-lab.module.css";

type HeroStyle = CSSProperties & Record<`--${string}`, string>;

function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/\s/g, " ")} ₽`;
}

function scenarioStyle(scenario: HomeHeroScenario): HeroStyle {
  return {
    "--mood": scenario.visual.mood,
    "--primary-x": scenario.visual.primaryWord.x,
    "--primary-y": scenario.visual.primaryWord.y,
    "--primary-size": scenario.visual.primaryWord.size,
    "--primary-max": scenario.visual.primaryWord.maxWidth,
    "--primary-line": scenario.visual.primaryWord.lineHeight,
    "--primary-opacity": scenario.visual.primaryWord.opacity,
    "--secondary-phrase-x": scenario.visual.secondaryPhrase.x,
    "--secondary-phrase-y": scenario.visual.secondaryPhrase.y,
    "--secondary-phrase-size": scenario.visual.secondaryPhrase.size,
    "--secondary-phrase-max": scenario.visual.secondaryPhrase.maxWidth,
    "--secondary-phrase-line": scenario.visual.secondaryPhrase.lineHeight,
    "--secondary-phrase-opacity": scenario.visual.secondaryPhrase.opacity,
    "--main-watch-x": scenario.visual.mainWatch.x,
    "--main-watch-y": scenario.visual.mainWatch.y,
    "--main-watch-width": scenario.visual.mainWatch.width,
    "--main-watch-height": scenario.visual.mainWatch.height,
    "--main-watch-max-height": scenario.visual.mainWatch.maxHeight,
    "--main-watch-rotate": scenario.visual.mainWatch.rotate,
    "--main-watch-scale": scenario.visual.mainWatch.scale,
    "--main-watch-shadow": scenario.visual.mainWatch.shadow,
    "--main-safe-top": scenario.visual.mainWatch.safeInsetTop,
    "--main-safe-right": scenario.visual.mainWatch.safeInsetRight,
    "--main-safe-bottom": scenario.visual.mainWatch.safeInsetBottom,
    "--main-safe-left": scenario.visual.mainWatch.safeInsetLeft,
    "--secondary-watch-x": scenario.visual.secondaryWatch.x,
    "--secondary-watch-y": scenario.visual.secondaryWatch.y,
    "--secondary-watch-height": scenario.visual.secondaryWatch.height,
    "--secondary-watch-opacity": scenario.visual.secondaryWatch.opacity,
    "--secondary-watch-scale": scenario.visual.secondaryWatch.scale,
    "--secondary-watch-offset-y": scenario.visual.secondaryWatch.imageOffsetY,
  };
}

function specStyle(spec: HomeHeroSpecCallout): HeroStyle {
  return {
    "--spec-x": spec.x,
    "--spec-y": spec.y,
    "--spec-line": spec.lineLength,
  };
}

function HeroScenario({ scenario }: { scenario: HomeHeroScenario }) {
  return (
    <div className={styles.canvas} style={scenarioStyle(scenario)}>
      <section className={styles.copyZone} aria-label="Homepage hero copy">
        <p className={styles.eyebrow}>Подбор часов, которые говорят о вас</p>
        <h1>
          Ваше время.
          <span>Ваш стиль.</span>
        </h1>
        <p className={styles.description}>
          Мы помогаем выбрать часы по характеру, образу жизни и важным деталям.
        </p>
        <div className={styles.actions}>
          <Link href="/selection">Подобрать часы</Link>
          <Link href="/watches">Смотреть каталог</Link>
        </div>
      </section>

      <section className={styles.productStage} aria-label={`Hero scenario ${scenario.id}: ${scenario.title}`}>
        <div className={styles.backgroundPrimaryLayer} aria-hidden="true">
          <strong className={styles.primaryWord}>{scenario.primaryWord}</strong>
        </div>

        <div className={styles.backgroundSecondaryLayer} aria-hidden="true">
          <strong className={styles.secondaryPhrase}>{scenario.secondaryPhrase}</strong>
        </div>

        <div className={styles.secondaryWatchLayer} aria-label="Alternative watch">
          <div className={styles.alternativeMeta}>
            <span>Альтернатива</span>
            <strong>
              {scenario.secondary.brand} {scenario.secondary.model}
            </strong>
            <em>{formatRub(scenario.secondary.publicPriceRub)}</em>
          </div>
          <Image
            src={scenario.secondary.assetPath}
            alt=""
            width={1800}
            height={1900}
            className={styles.watchImage}
          />
        </div>

        <div className={styles.mainWatchLayer}>
          <Image
            src={scenario.main.assetPath}
            alt={`${scenario.main.brand} ${scenario.main.model}`}
            width={1800}
            height={1900}
            loading={scenario.id === "01" ? "eager" : "lazy"}
            className={styles.watchImage}
          />
        </div>

        <div className={styles.specificationLayer} aria-label="Product specification callouts">
          {scenario.specs.map((spec) => (
            <div
              key={`${spec.value}-${spec.sourceField}`}
              className={spec.align === "right" ? styles.specRight : styles.specLeft}
              data-emphasis={spec.emphasis}
              style={specStyle(spec)}
            >
              <i />
              <strong>{spec.value}</strong>
              <span>{spec.label}</span>
            </div>
          ))}
        </div>
      </section>

      <aside className={styles.informationRailLayer} aria-label="Product information rail">
        <article className={styles.infoRail}>
          <span>{scenario.id} / Сценарий</span>
          <h2>{scenario.title}</h2>
          <p>{scenario.description}</p>
          <div className={styles.railProduct}>
            <em>{scenario.main.brand}</em>
            <strong>{scenario.main.model}</strong>
            <b>{formatRub(scenario.main.publicPriceRub)}</b>
          </div>
          <Link href={scenario.main.href}>Смотреть модель →</Link>
        </article>
      </aside>
    </div>
  );
}

function MiniScenarioPreview({ scenario }: { scenario: HomeHeroScenario }) {
  return (
    <div className={styles.previewCanvas} style={scenarioStyle(scenario)}>
      <span className={styles.previewPrimaryWord}>{scenario.primaryWord}</span>
      <span className={styles.previewSecondaryPhrase}>{scenario.secondaryPhrase}</span>
      {scenario.specs.map((spec) => (
        <span key={spec.value} className={spec.emphasis === "primary" ? styles.previewSpecA : styles.previewSpecB}>
          {spec.value}
        </span>
      ))}
      <Image
        src={scenario.secondary.assetPath}
        alt=""
        width={1800}
        height={1900}
        className={styles.previewSecondaryWatch}
      />
      <Image src={scenario.main.assetPath} alt="" width={1800} height={1900} className={styles.previewMainWatch} />
      <div className={styles.previewCopy}>
        <span>{scenario.id}</span>
        <strong>{scenario.title}</strong>
      </div>
      <div className={styles.previewRail}>
        <span>{scenario.main.brand}</span>
        <strong>{scenario.main.model}</strong>
      </div>
    </div>
  );
}

export function HomeHeroDesignLab() {
  const [activeScenarioId, setActiveScenarioId] = useState<HomeHeroScenario["id"]>(() => {
    if (typeof window === "undefined") return "01";
    const requestedScenario = new URLSearchParams(window.location.search).get("scenario");
    return homeHeroScenarios.some((scenario) => scenario.id === requestedScenario)
      ? (requestedScenario as HomeHeroScenario["id"])
      : "01";
  });
  const activeScenario = homeHeroScenarios.find((scenario) => scenario.id === activeScenarioId) ?? homeHeroScenarios[0];

  return (
    <main className={styles.page}>
      <section className={styles.labHeader} aria-label="Design lab context">
        <Link href="/" className={styles.brand}>
          Eternal Time
        </Link>
        <p>Isolated homepage hero design lab · local only · noindex · manual scenarios only</p>
      </section>

      <section className={styles.labFrame} aria-label="Manual homepage hero scenario review">
        <div className={styles.interactiveHero}>
          <nav className={styles.scenarioSwitcher} aria-label="Choose hero scenario">
            {homeHeroScenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                data-testid={`hero-scenario-${scenario.id}`}
                className={scenario.id === activeScenario.id ? styles.activeScenarioButton : styles.scenarioButton}
                aria-current={scenario.id === activeScenario.id ? "true" : undefined}
                onClick={() => setActiveScenarioId(scenario.id)}
              >
                <span>{scenario.id}</span>
                <em>{scenario.title}</em>
              </button>
            ))}
          </nav>
          <HeroScenario scenario={activeScenario} />
        </div>
      </section>

      <section className={styles.qaPanel} aria-label="Design lab asset notes">
        <div>
          <strong>Static scenario review</strong>
          <span>No autoplay, no timer, no parallax, no mouse tracking, no production integration.</span>
        </div>
        <ul>
          <li>Active scenario: {activeScenario.id}</li>
          <li>
            Main: {activeScenario.main.brand} {activeScenario.main.model} ·{" "}
            {formatRub(activeScenario.main.publicPriceRub)}
          </li>
          <li>
            Secondary: {activeScenario.secondary.brand} {activeScenario.secondary.model} ·{" "}
            {formatRub(activeScenario.secondary.publicPriceRub)}
          </li>
          <li>
            Specs: {activeScenario.specs.map((spec) => `${spec.value} (${spec.sourceField})`).join("; ")}
          </li>
          {activeScenario.missingSpecWarnings?.map((warning) => (
            <li key={warning} className={styles.qualityWarning}>
              {warning}
            </li>
          ))}
          {activeScenario.qualityNote ? <li className={styles.qualityWarning}>{activeScenario.qualityNote}</li> : null}
        </ul>
      </section>

      <section id="all-scenarios-review" className={styles.reviewGrid} aria-label="All scenarios review">
        <div className={styles.reviewHeader}>
          <span>Dev-only</span>
          <h2>All scenarios review</h2>
          <p>Six static states for visual comparison. Click any preview to open it in the main hero.</p>
        </div>
        <div className={styles.previewGrid}>
          {homeHeroScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              data-testid={`hero-preview-${scenario.id}`}
              className={scenario.id === activeScenario.id ? styles.activePreview : styles.preview}
              onClick={() => setActiveScenarioId(scenario.id)}
            >
              <MiniScenarioPreview scenario={scenario} />
            </button>
          ))}
        </div>
      </section>

      <section className={styles.rejectedAlternatives} aria-label="Rejected alternatives">
        <strong>Rejected alternative kept out of hero states</strong>
        {rejectedHomeHeroAlternatives.map((item) => (
          <p key={item.reference}>
            {item.brand} {item.model}: {item.reason}
          </p>
        ))}
      </section>
    </main>
  );
}
