import Image from "next/image";
import Link from "next/link";
import type { HomeScenario } from "@/components/home/home-scenario-model";
import styles from "@/components/home/home-selection-story.module.css";

const selectionParameters = [
  ["01", "Ритм", "Будни, поездки, спорт и редкие поводы требуют разных часов."],
  ["02", "Стиль", "Часы должны поддерживать одежду, характер и привычный жест."],
  ["03", "Коллекция", "Новая модель сильнее, когда понятно, какую роль она закрывает."],
] as const;

const journeySteps = [
  ["01", "Подбор", "Собираем сценарий и требования."],
  ["02", "Сравнение", "Показываем реальные различия моделей."],
  ["03", "Покупка", "Сохраняем понятный путь к заказу."],
  ["04", "Коллекция", "Добавляем часы в личную систему."],
] as const;

function storyWatches(scenarios: HomeScenario[]) {
  return [
    scenarios[1]?.hero.mainWatch,
    scenarios[3]?.hero.mainWatch,
    scenarios[5]?.hero.mainWatch,
  ].filter((watch): watch is HomeScenario["hero"]["mainWatch"] => Boolean(watch?.asset.isHeroApproved && watch.asset.view === "front"));
}

export function HomeSelectionStory({ scenarios }: Readonly<{ scenarios: HomeScenario[] }>) {
  const watches = storyWatches(scenarios);

  return (
    <section className={styles.root} data-testid="home-selection-story" aria-labelledby="home-selection-story-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Персональный подбор</p>
        <h2 id="home-selection-story-title">Подбор начинается не с бренда. Он начинается с человека.</h2>
        <p>
          Eternal Time помогает понять, какие часы подходят именно вам: по образу жизни, одежде, размеру, механике и роли в будущей коллекции.
        </p>
        <Link href="/selection" className={styles.cta}>
          Начать подбор
        </Link>
      </div>

      <div className={styles.parameters} aria-label="Параметры подбора">
        {selectionParameters.map(([number, title, description]) => (
          <div key={number}>
            <span>{number}</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        ))}
      </div>

      <div className={styles.watchComposition} aria-label="Фронтальные модели из подбора">
        {watches.slice(0, 3).map((watch, index) => (
          <Link
            key={`${watch.reference}-${index}`}
            href={watch.href}
            className={styles.watchFigure}
            data-selection-story-reference={watch.reference}
          >
            <Image
              src={watch.asset.path}
              alt={`${watch.brandName} ${watch.shortTitle}`}
              width={watch.asset.width}
              height={watch.asset.height}
              sizes={index === 0 ? "(max-width: 767px) 62vw, 20vw" : "(max-width: 767px) 34vw, 11vw"}
            />
            <span>
              <em>{watch.brandName}</em>
              <strong>{watch.shortTitle}</strong>
            </span>
          </Link>
        ))}
      </div>

      <nav className={styles.journey} aria-label="Маршрут Eternal Time" data-testid="home-value-journey">
        {journeySteps.map(([number, title, description]) => (
          <Link key={number} href={number === "01" ? "/selection" : number === "02" ? "/compare" : number === "03" ? "/watches" : "/collection"}>
            <span>{number}</span>
            <strong>{title}</strong>
            <em>{description}</em>
          </Link>
        ))}
      </nav>
    </section>
  );
}
