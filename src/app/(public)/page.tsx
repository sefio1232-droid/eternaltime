import type { Metadata } from "next";
import {
  HomeCollectionIntelligencePanel,
  HomeComparisonPurchase,
  HomeEcosystemPath,
  HomeJournalFinal,
  HomeSelection,
} from "@/components/home/home-ecosystem-sections";
import { HomeProductHero } from "@/components/home/home-product-hero";
import { HomeTrustPlaques } from "@/components/home/home-trust-plaques";
import { HomeMotionOrchestrator } from "@/components/home/home-motion-orchestrator";
import { buildHomeEditorialCuration, buildHomeOrbitWatches, buildHomeScenarios } from "@/components/home/home-scenario-model";
import { EditorialWideContainer } from "@/components/ui/editorial-primitives";
import type { CatalogReadDataset } from "@/modules/catalog/domain/read-models";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { listPublishedJournalArticles } from "@/modules/journal/application/journal-repository";

export const metadata: Metadata = {
  title: "Eternal Time",
  description: "Оригинальные наручные часы в интернет-магазине Eternal Time. Каталог моделей, подбор по вашим предпочтениям и журнал о часах.",
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
    "pochemu-mekhanicheskie-chasy-populyarny",
    "kak-vybrat-brend-chasov",
    "chasy-kak-investitsiya",
  ] as const;
  const articles = homepageArticleSlugs
    .map((slug) => publishedArticles.find((article) => article.slug === slug))
    .filter((article) => article !== undefined);

  return (
    <>
      <HomeMotionOrchestrator />
      <section className="home-shell">
        <EditorialWideContainer>
          <HomeProductHero scenarios={scenarios} orbitWatches={orbitWatches} reviewEnabled={process.env.NODE_ENV !== "production"} />
        </EditorialWideContainer>
      </section>

      <HomeEcosystemPath scenarios={scenarios} curation={editorialCuration} />
      <HomeSelection scenarios={scenarios} curation={editorialCuration} />
      <HomeTrustPlaques />
      <HomeComparisonPurchase scenarios={scenarios} curation={editorialCuration} />
      <HomeCollectionIntelligencePanel scenarios={scenarios} curation={editorialCuration} />
      <HomeJournalFinal articles={articles} scenarios={scenarios} curation={editorialCuration} />
    </>
  );
}
