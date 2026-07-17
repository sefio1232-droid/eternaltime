import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { UserWatchDetailView } from "@/components/collection/user-watch-detail-view";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";
import { getUserWatch } from "@/modules/user-watch-collection/application/collection-service";
import { createUserWatchCollectionRepository } from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Часы в моей коллекции",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type UserWatchPageProps = Readonly<{
  params: Promise<{ userWatchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function UserWatchPage({ params, searchParams }: UserWatchPageProps) {
  const { userWatchId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser.user) {
    redirect(`/login?returnTo=${encodeURIComponent(`/collection/${userWatchId}`)}`);
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

  const query = await searchParams;

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
