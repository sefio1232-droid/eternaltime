import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalCollectionRecommendations } from "@/components/collection/local-collection-recommendations";
import { Container } from "@/components/ui/container";
import {
  isCollectionRecommendationIntent,
} from "@/modules/collection-intelligence/domain/recommendations";
import { loadLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection-catalog.server";
import { parseLocalCollectionDemoScenario } from "@/modules/user-watch-collection/application/local-collection";

export const metadata: Metadata = {
  title: "Персональная подборка",
  description: "Детерминированная подборка для развития личной коллекции часов.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type RecommendationPageProps = Readonly<{
  params: Promise<{ intent: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function CollectionRecommendationPage({
  params,
  searchParams,
}: RecommendationPageProps) {
  const [{ intent }, query] = await Promise.all([params, searchParams]);
  if (!isCollectionRecommendationIntent(intent)) notFound();
  const catalogCandidates = await loadLocalCollectionCatalogCandidates();
  const demoScenario = parseLocalCollectionDemoScenario(query.demo);

  return (
    <Container className="public-page">
      <LocalCollectionRecommendations
        intent={intent}
        demoMode={demoScenario !== null}
        demoScenario={demoScenario}
        catalogCandidates={catalogCandidates}
      />
    </Container>
  );
}
