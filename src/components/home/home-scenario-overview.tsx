import Link from "next/link";
import Image from "next/image";
import type { HomeScenario } from "@/components/home/home-scenario-model";

export function HomeScenarioOverview({ scenarios }: Readonly<{ scenarios: HomeScenario[] }>) {
  const visibleScenarios = scenarios.slice(0, 4);

  if (visibleScenarios.length === 0) return null;

  return (
    <div className="home-scenario-overview" data-testid="home-scenario-overview">
      {visibleScenarios.map((scenario) => (
        <Link key={scenario.id} href={scenario.catalogHref} className="home-scenario-overview-item" data-home-scenario-id={scenario.id}>
          <span className="home-scenario-overview-copy">
            <span className="type-reference">{scenario.index}</span>
            <strong>{scenario.title}</strong>
            <em>{scenario.description}</em>
          </span>
          <span className="home-scenario-overview-media" aria-hidden="true">
            <Image
              src={scenario.hero.mainWatch.asset.path}
              alt=""
              width={scenario.hero.mainWatch.asset.width}
              height={scenario.hero.mainWatch.asset.height}
              sizes="(max-width: 767px) 32vw, 16vw"
            />
          </span>
        </Link>
      ))}
    </div>
  );
}
