import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocalCollectionCoreExperience } from "@/components/collection/local-collection-core-experience";
import { UserWatchDetailView } from "@/components/collection/user-watch-detail-view";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";
import { getUserWatch } from "@/modules/user-watch-collection/application/collection-service";
import { createUserWatchCollectionRepository } from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection-catalog.server";
import { parseLocalCollectionDemoScenario } from "@/modules/user-watch-collection/application/local-collection";

export const metadata: Metadata = {
  title: "Часы из коллекции",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type UserWatchPageProps = Readonly<{
  params: Promise<{ userWatchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function UserWatchPage({ params, searchParams }: UserWatchPageProps) {
  const { userWatchId } = await params;
  const query = await searchParams;
  const currentUser = await getCurrentUser();
  const demoScenario = parseLocalCollectionDemoScenario(query.demo);

  if (demoScenario || currentUser.status === "unconfigured" || !currentUser.user) {
    const catalogCandidates = await loadLocalCollectionCatalogCandidates();
    return (
      <Container className="public-page">
        <LocalCollectionCoreExperience
          initialMode={demoScenario ? "demo" : "empty"}
          initialDemoScenario={demoScenario}
          initialSelectedId={userWatchId}
          catalogCandidates={catalogCandidates}
        />
      </Container>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/collection?collection=unavailable");
  }

  const watch = await getUserWatch(
    createUserWatchCollectionRepository(supabase),
    currentUser.user.id,
    userWatchId,
  );
  if (!watch) {
    notFound();
  }

  return (
    <Container className="public-page">
      <UserWatchDetailView
        watch={watch}
        created={query.created === "1"}
        updated={query.updated === "1"}
        photoError={query.photo === "error"}
        updateError={query.update === "error"}
      />
    </Container>
  );
}
