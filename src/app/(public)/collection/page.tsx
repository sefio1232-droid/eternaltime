import type { Metadata } from "next";
import { CollectionEmptyState } from "@/components/collection/collection-empty-state";
import { CollectionOverview } from "@/components/collection/collection-overview";
import { LocalCollectionCoreExperience } from "@/components/collection/local-collection-core-experience";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";
import { analyzeCollection } from "@/modules/collection-intelligence/domain/analyze";
import type {
  CollectionAnalysisItem,
  CollectionRecommendationCandidate,
} from "@/modules/collection-intelligence/domain/types";
import { listCandidates } from "@/modules/candidates/application/candidate-service";
import { createCandidateRepository } from "@/modules/candidates/infrastructure/candidate-repository.server";
import { listUserWatches } from "@/modules/user-watch-collection/application/collection-service";
import { createUserWatchCollectionRepository } from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection-catalog.server";
import { parseLocalCollectionDemoScenario } from "@/modules/user-watch-collection/application/local-collection";
import type { UserWatchSummary } from "@/modules/user-watch-collection/domain/types";

export const metadata: Metadata = {
  title: "Моя коллекция",
  description: "Личное пространство Eternal Time для часов, которыми вы владеете или владели раньше.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type CollectionPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function analysisItemFromUserWatch(
  watch: UserWatchSummary,
  catalogCandidates: CollectionRecommendationCandidate[],
): CollectionAnalysisItem {
  const catalogCandidate = catalogCandidates.find((candidate) => candidate.href === watch.watchReferenceHref);
  return {
    id: watch.id,
    displayName: watch.displayName,
    sourceKind: watch.sourceKind,
    ownershipStatus: watch.ownershipStatus,
    catalogReferenceId: catalogCandidate?.catalogReferenceId ?? null,
    catalogHref: watch.watchReferenceHref,
    brandName: watch.brandName,
    modelName: watch.modelName,
    referenceDisplay: watch.referenceDisplay,
    imageUrl: watch.primaryImageUrl,
    acquiredAt: watch.acquiredAt,
    roles: catalogCandidate?.roles ?? [],
    movementType: catalogCandidate?.movementType ?? "unknown",
    dialColorFamily: catalogCandidate?.dialColorFamily ?? "unknown",
    materialFamily: catalogCandidate?.materialFamily ?? "unknown",
    sizeBand: catalogCandidate?.sizeBand ?? "unknown",
    attachmentType: catalogCandidate?.attachmentType ?? "unknown",
    wearFrequency: "unknown",
    condition: "unknown",
    waterReady: catalogCandidate?.waterReady ?? null,
  };
}

export default async function CollectionPage({ searchParams }: CollectionPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const demoScenario = parseLocalCollectionDemoScenario(params.demo);
  const localMode = demoScenario ? "demo" : "empty";

  if (!currentUser.user) {
    const catalogCandidates = await loadLocalCollectionCatalogCandidates();
    return (
      <Container className="public-page">
        <LocalCollectionCoreExperience
          initialMode={localMode}
          initialDemoScenario={demoScenario}
          catalogCandidates={catalogCandidates}
        />
      </Container>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const catalogCandidates = await loadLocalCollectionCatalogCandidates();
    return (
      <Container className="public-page">
        <LocalCollectionCoreExperience
          initialMode={localMode}
          initialDemoScenario={demoScenario}
          catalogCandidates={catalogCandidates}
        />
      </Container>
    );
  }

  const watches = await listUserWatches(createUserWatchCollectionRepository(supabase), currentUser.user.id);
  const catalogCandidates = await loadLocalCollectionCatalogCandidates();
  const savedCandidates = await listCandidates(createCandidateRepository(supabase), currentUser.user.id);
  const analysis = watches.length > 0
    ? analyzeCollection(
        watches.map((watch) => analysisItemFromUserWatch(watch, catalogCandidates)),
        catalogCandidates,
        {
          candidateContext: savedCandidates
            .filter((candidate) => candidate.watch !== null)
            .map((candidate) => ({
              catalogReferenceId: candidate.watchReferenceId,
              status: candidate.status,
            })),
        },
      )
    : null;

  return (
    <Container className="public-page">
      {watches.length > 0 ? (
        <CollectionOverview watches={watches} analysis={analysis} />
      ) : (
        <div className="grid gap-10">
          <header>
            <p className="type-label">Моя коллекция</p>
            <h1 className="public-heading mt-3">Часы в вашей коллекции</h1>
          </header>
          <CollectionEmptyState authenticated />
        </div>
      )}
      {params.deleted === "1" ? (
        <p className="mt-6 text-sm">Часы удалены из активной коллекции.</p>
      ) : null}
    </Container>
  );
}
