"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { HomeScenario, HomeScenarioId } from "@/components/home/home-scenario-model";

export function HomeScenarioSelector({ scenarios }: Readonly<{ scenarios: HomeScenario[] }>) {
  const [activeScenarioId, setActiveScenarioId] = useState<HomeScenarioId | null>(scenarios[0]?.id ?? null);
  const activeScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0] ?? null,
    [activeScenarioId, scenarios],
  );

  if (!activeScenario) {
    return null;
  }

  return (
    <section className="home-scenario-selector" data-testid="home-scenario-selector" aria-label="Подбор часов по сценарию">
      <nav className="home-scenario-nav" aria-label="Сценарии выбора часов">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            className="home-scenario-nav-button"
            aria-current={scenario.id === activeScenario.id ? "true" : undefined}
            onClick={() => setActiveScenarioId(scenario.id)}
          >
            <span>{scenario.index}</span>
            {scenario.title}
          </button>
        ))}
      </nav>

      <div className="home-scenario-panel" data-testid="home-scenario-active-panel" key={activeScenario.id}>
        <div className="home-scenario-copy">
          <p className="type-reference">{activeScenario.index} / сценарий</p>
          <h2>{activeScenario.title}</h2>
          <p>{activeScenario.description}</p>
          <ul className="home-scenario-criteria" aria-label={`Критерии: ${activeScenario.title}`}>
            {activeScenario.criteria.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
          <Link href={activeScenario.catalogHref} className="home-scenario-cta">
            Смотреть модели
          </Link>
        </div>

        <div className="home-scenario-watches" data-testid="home-scenario-watches">
          {activeScenario.hero.slots
            .filter((watch) => watch.asset.qualityClass !== "REJECTED" && watch.opacity > 0)
            .slice(0, 3)
            .map((watch, index) => (
            <Link key={watch.id} href={watch.href} className="home-scenario-watch" data-depth={index + 1}>
              <span className="home-scenario-watch-media">
                <Image
                  src={watch.asset.path}
                  alt={`${watch.brandName} ${watch.shortTitle}`}
                  width={watch.asset.width}
                  height={watch.asset.height}
                  sizes="(max-width: 767px) 42vw, 16vw"
                  className="home-scenario-watch-image"
                />
              </span>
              <span className="home-scenario-watch-meta">
                <span>{watch.brandName}</span>
                <strong>{watch.shortTitle}</strong>
                {watch.priceLabel ? <span>{watch.priceLabel}</span> : null}
              </span>
            </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
