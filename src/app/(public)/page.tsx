import type { Metadata } from "next";
import {
  HomeCollectionIntelligence,
  HomeCollectionStory,
  HomeCompareStory,
  HomeEcosystemIntro,
  HomeFinalCall,
  HomeJournalPreview,
  HomePurchaseJourney,
  HomeSelectionProfile,
} from "@/components/home/home-ecosystem-sections";
import { HomeProductHero } from "@/components/home/home-product-hero";
import { buildHomeOrbitWatches, buildHomeScenarios } from "@/components/home/home-scenario-model";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";

export const metadata: Metadata = {
  title: "Eternal Time",
  description: "Часы, журнал и личная коллекция в одной спокойной системе выбора.",
  alternates: { canonical: "/" },
};

async function loadDataset(): Promise<CatalogReadDataset | null> {
  try {
    return await getCatalogReadDataset();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const dataset = await loadDataset();
  const scenarios = buildHomeScenarios(dataset);
  const orbitWatches = buildHomeOrbitWatches(scenarios);
  const articles = listPublishedJournalArticles().slice(0, 3);

  return (
    <>
      <section className="home-shell">
        <EditorialContainer>
          <HomeProductHero scenarios={scenarios} orbitWatches={orbitWatches} />
        </EditorialContainer>
      </section>

      <EditorialContainer>
        <HomeEcosystemIntro scenarios={scenarios} />
        <HomeSelectionProfile scenarios={scenarios} />
        <HomeCompareStory scenarios={scenarios} />
        <HomePurchaseJourney />
        <HomeCollectionStory scenarios={scenarios} />
        <HomeCollectionIntelligence scenarios={scenarios} />
        <HomeJournalPreview articles={articles} />
        <HomeFinalCall />
      </EditorialContainer>
    </>
  );
}
