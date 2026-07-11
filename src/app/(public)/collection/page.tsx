import type { Metadata } from "next";
import { CollectionEmptyState } from "@/components/collection/collection-empty-state";
import { CollectionOverview } from "@/components/collection/collection-overview";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";
import { listUserWatches } from "@/modules/user-watch-collection/application/collection-service";
import { createUserWatchCollectionRepository } from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Моя коллекция",
  description: "Личное пространство Eternal Time для часов, которыми вы владеете или владели.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type CollectionPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function CollectionPage({ searchParams }: CollectionPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();

  if (!currentUser.user) {
    return (
      <Container className="grid gap-10 py-10 lg:py-14">
        <header className="grid gap-5 border-b border-[var(--border)] pb-7 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <p className="type-label">Моя коллекция</p>
            <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">Личное пространство для реальных часов</h1>
          </div>
          <p className="type-body max-w-2xl text-[var(--text-muted)]">
            Здесь хранятся только часы, которыми вы владеете или владели: каталог, ручные записи, история приобретения и заметки.
          </p>
        </header>
        <CollectionEmptyState authenticated={false} />
        {currentUser.status === "unconfigured" || params.collection === "unavailable" ? (
          <p className="text-sm text-[var(--danger)]">Supabase Auth не настроен для этого окружения.</p>
        ) : null}
      </Container>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <Container className="py-12">
        <CollectionEmptyState authenticated={true} />
      </Container>
    );
  }

  const watches = await listUserWatches(createUserWatchCollectionRepository(supabase), currentUser.user.id);

  return (
    <Container className="py-10 lg:py-14">
      {watches.length > 0 ? <CollectionOverview watches={watches} /> : (
        <div className="grid gap-10">
          <header>
            <p className="type-label">Моя коллекция</p>
            <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">Часы, которыми вы владеете</h1>
          </header>
          <CollectionEmptyState authenticated />
        </div>
      )}
      {params.deleted === "1" ? <p className="mt-6 text-sm">Часы удалены из активной коллекции.</p> : null}
    </Container>
  );
}
