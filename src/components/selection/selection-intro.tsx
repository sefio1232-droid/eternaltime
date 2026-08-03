import type { ReactNode } from "react";
import styles from "./selection-intro.module.css";

function SelectionDialMotif() {
  return (
    <svg
      className={styles.dial}
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
    >
      <path className={styles.dialArc} d="M 38 270 A 220 220 0 0 1 290 34" pathLength="1" />
      <g className={styles.dialTicks}>
        <line className={styles.activeTick} x1="47" y1="252" x2="61" y2="241" />
        <line x1="39" y1="199" x2="57" y2="197" />
        <line x1="55" y1="143" x2="72" y2="149" />
        <line x1="88" y1="95" x2="102" y2="107" />
        <line x1="137" y1="58" x2="146" y2="75" />
        <line x1="195" y1="38" x2="198" y2="57" />
        <line x1="254" y1="40" x2="250" y2="59" />
      </g>
      <line className={styles.dialIndex} x1="160" y1="176" x2="61" y2="241" />
      <circle className={styles.dialPin} cx="160" cy="176" r="3" />
    </svg>
  );
}

export function SelectionIntro({ progress }: Readonly<{ progress: ReactNode }>) {
  return (
    <section className={styles.prelude} aria-labelledby="selection-intro-title">
      <div className={styles.composition}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Подбор часов</p>
          <h1 id="selection-intro-title">
            Найдите часы{" "}
            <span>под свой ритм</span>
          </h1>
          <p className={styles.deck}>
            Ответьте на семь коротких вопросов. Мы сопоставим ваши предпочтения с реальными
            характеристиками моделей и покажем несколько подходящих вариантов с понятным объяснением.
          </p>
        </header>

        <aside className={styles.process} aria-label="Как проходит подбор">
          <SelectionDialMotif />
          <div className={styles.processCopy}>
            <p className={styles.processNumber} aria-hidden="true">01 / 07</p>
            <h2>Семь шагов до вашей подборки</h2>
            <p>Ответы сохраняются в ссылке. К подбору можно вернуться позже или поделиться результатом.</p>
          </div>
          <ol className={styles.facts} aria-label="Что входит в подбор">
            <li>
              <span>01</span>
              <strong>7</strong>
              <small>вопросов</small>
            </li>
            <li>
              <span>02</span>
              <strong>3–4</strong>
              <small>варианта</small>
            </li>
            <li>
              <span>03</span>
              <strong>Только</strong>
              <small>реальные модели</small>
            </li>
          </ol>
        </aside>
      </div>
      <div className={styles.progressFrame}>{progress}</div>
    </section>
  );
}
