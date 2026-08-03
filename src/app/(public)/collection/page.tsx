import type { Metadata } from "next";
import { CollectionEmptyState } from "@/components/collection/collection-empty-state";
import { CollectionOverview } from "@/components/collection/collection-overview";
import { LocalCollectionCoreExperience } from "@/components/collection/local-collection-core-experience";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";
import { listUserWatches } from "@/modules/user-watch-collection/application/collection-service";
import { createUserWatchCollectionRepository } from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection-catalog.server";
import { parseLocalCollectionDemoScenario } from "@/modules/user-watch-collection/application/local-collection";

export const metadata: Metadata = {
  title: "Моя коллекция",
  description: "Личное пространство Eternal Time для часов, которыми вы владеете или владели раньше.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type CollectionPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

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

  return (
    <Container className="public-page">
      {watches.length > 0 ? (
        <CollectionOverview watches={watches} />
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
