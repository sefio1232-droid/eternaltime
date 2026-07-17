import { Button } from "@/components/ui/button";
import { createManualUserWatchAction } from "@/modules/user-watch-collection/application/actions";

export function QuickAddForm({ hasError = false }: Readonly<{ hasError?: boolean }>) {
  return (
    <form action={createManualUserWatchAction} className="grid gap-6" encType="multipart/form-data">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Как вы называете эти часы?
          <input required name="displayName" maxLength={160} className="control-surface px-3" placeholder="Например, мои повседневные часы" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Бренд <span className="font-normal text-[var(--text-muted)]">необязательно</span>
          <input name="brandName" maxLength={120} className="control-surface px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Модель <span className="font-normal text-[var(--text-muted)]">необязательно</span>
          <input name="modelName" maxLength={160} className="control-surface px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Код модели <span className="font-normal text-[var(--text-muted)]">необязательно</span>
          <input name="reference" maxLength={120} className="control-surface px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Фотография <span className="font-normal text-[var(--text-muted)]">необязательно, до 8 МБ</span>
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="control-surface px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Заметка <span className="font-normal text-[var(--text-muted)]">необязательно</span>
          <textarea name="note" maxLength={3000} rows={4} className="control-surface p-3" />
        </label>
      </div>

      {hasError ? <p className="text-sm text-[var(--danger)]">Проверьте название и попробуйте ещё раз.</p> : null}
      <p className="text-sm leading-6 text-[var(--text-muted)]">
        Технические характеристики можно добавить позднее. Эти данные остаются личными и не создают публичную карточку часов.
      </p>
      <Button type="submit" className="justify-self-start">Добавить в коллекцию</Button>
    </form>
  );
}
