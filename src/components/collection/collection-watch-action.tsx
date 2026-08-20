import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/server";
import { CollectionServiceError } from "@/modules/user-watch-collection/application/collection-service";
import { createCatalogUserWatchAction } from "@/modules/user-watch-collection/application/actions";
import { createUserWatchCollectionRepository } from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function safeCountActiveByReference(
  repository: ReturnType<typeof createUserWatchCollectionRepository>,
  userId: string,
  watchReferenceId: string,
): Promise<{ available: true; count: number } | { available: false }> {
  try {
    return {
      available: true,
      count: await repository.countActiveByReference(userId, watchReferenceId),
    };
  } catch (error) {
    const code = error instanceof CollectionServiceError ? error.code : "unknown";
    console.warn("User watch collection count is unavailable for catalog detail page.", { code });
    return { available: false };
  }
}

export async function CollectionWatchAction({
  watchReferenceId,
  displayName,
  returnTo,
  state,
}: Readonly<{
  watchReferenceId: string;
  displayName: string;
  returnTo: string;
  state?: string;
}>) {
  const currentUser = await getCurrentUser();

  if (!currentUser.user) {
    return (
      <div className="grid gap-3">
        <ButtonLink href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Добавить в коллекцию</ButtonLink>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          После входа вы вернетесь к этой модели. Добавление произойдет только после подтвержденной записи.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="text-sm text-[var(--text-muted)]">Коллекция недоступна в этом окружении.</p>;
  }

  const repository = createUserWatchCollectionRepository(supabase);
  const existing = await safeCountActiveByReference(repository, currentUser.user.id, watchReferenceId);

  if (!existing.available) {
    return (
      <div className="grid gap-3 border-t border-[var(--border)] pt-4">
        <p className="text-sm text-[var(--text-muted)]">
          Коллекция временно недоступна, но карточка модели и оформление заказа работают.
        </p>
        <Link href="/collection" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          Открыть мою коллекцию
        </Link>
      </div>
    );
  }

  const existingCount = existing.count;

  if (existingCount > 0) {
    return (
      <div className="grid gap-3 border-t border-[var(--border)] pt-4">
        <p className="text-sm">Эта модель уже есть в вашей коллекции ({existingCount}).</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/collection">Открыть коллекцию</ButtonLink>
          <form action={createCatalogUserWatchAction}>
            <input type="hidden" name="watchReferenceId" value={watchReferenceId} />
            <input type="hidden" name="displayName" value={displayName} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="allowDuplicate" value="true" />
            <Button type="submit" variant="secondary">Добавить второй экземпляр</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <form action={createCatalogUserWatchAction}>
        <input type="hidden" name="watchReferenceId" value={watchReferenceId} />
        <input type="hidden" name="displayName" value={displayName} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit">Добавить в коллекцию</Button>
      </form>
      {state === "invalid_reference" ? (
        <p className="text-sm text-[var(--danger)]">Эту модель пока нельзя связать с коллекцией.</p>
      ) : null}
      {state === "duplicate" ? (
        <p className="text-sm text-[var(--danger)]">Подтвердите добавление второго экземпляра.</p>
      ) : null}
      <Link href="/collection" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        Открыть мою коллекцию
      </Link>
    </div>
  );
}
