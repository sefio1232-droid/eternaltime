import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/server";
import { createCatalogUserWatchAction } from "@/modules/user-watch-collection/application/actions";
import { createUserWatchCollectionRepository } from "@/modules/user-watch-collection/infrastructure/user-watch-repository.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
          После входа вы вернётесь к этой модели. Добавление произойдёт только после подтверждённой записи.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="text-sm text-[var(--text-muted)]">Коллекция недоступна в этом окружении.</p>;
  }

  const repository = createUserWatchCollectionRepository(supabase);
  const existingCount = await repository.countActiveByReference(currentUser.user.id, watchReferenceId);

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
