import type { Metadata } from "next";
import {
  HomeCollectionIntelligencePanel,
  HomeComparisonPurchase,
  HomeEcosystemPath,
  HomeJournalFinal,
  HomeSelection,
} from "@/components/home/home-ecosystem-sections";
import { HomeProductHero } from "@/components/home/home-product-hero";
import { HomeMotionOrchestrator } from "@/components/home/home-motion-orchestrator";
import { buildHomeEditorialCuration, buildHomeOrbitWatches, buildHomeScenarios } from "@/components/home/home-scenario-model";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";

export const metadata: Metadata = {
  title: "Eternal Time",
  description: "\u0427\u0430\u0441\u044b, \u0436\u0443\u0440\u043d\u0430\u043b \u0438 \u043b\u0438\u0447\u043d\u0430\u044f \u043a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u044f \u0432 \u043e\u0434\u043d\u043e\u0439 \u0441\u043f\u043e\u043a\u043e\u0439\u043d\u043e\u0439 \u0441\u0438\u0441\u0442\u0435\u043c\u0435 \u0432\u044b\u0431\u043e\u0440\u0430.",
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
  const editorialCuration = buildHomeEditorialCuration(dataset);
  const orbitWatches = buildHomeOrbitWatches(scenarios);
  const publishedArticles = listPublishedJournalArticles();
  const homepageArticleSlugs = [
    "choose-watch-size-for-wrist",
    "watches-for-shirt-and-everyday",
    "quartz-vs-mechanical-real-difference",
  ] as const;
  const articles = homepageArticleSlugs
    .map((slug) => publishedArticles.find((article) => article.slug === slug))
    .filter((article) => article !== undefined);

  return (
    <>
      <HomeMotionOrchestrator />
      <section className="home-shell">
        <EditorialContainer>
          <HomeProductHero scenarios={scenarios} orbitWatches={orbitWatches} reviewEnabled={process.env.NODE_ENV !== "production"} />
        </EditorialContainer>
      </section>

      <HomeEcosystemPath scenarios={scenarios} curation={editorialCuration} />
      <HomeSelection scenarios={scenarios} curation={editorialCuration} />
      <HomeComparisonPurchase scenarios={scenarios} curation={editorialCuration} />
      <HomeCollectionIntelligencePanel scenarios={scenarios} curation={editorialCuration} />
      <HomeJournalFinal articles={articles} scenarios={scenarios} curation={editorialCuration} />
    </>
  );
}
