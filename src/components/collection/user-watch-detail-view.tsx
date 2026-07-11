import Link from "next/link";
import { CollectionWatchMedia } from "@/components/collection/collection-watch-media";
import { Button } from "@/components/ui/button";
import { deleteUserWatchAction, updateUserWatchAction } from "@/modules/user-watch-collection/application/actions";
import type { UserWatchDetail } from "@/modules/user-watch-collection/domain/types";

function priceInputValue(amountMinor: number | null) {
  return amountMinor === null ? "" : (amountMinor / 100).toFixed(2);
}

export function UserWatchDetailView({
  watch,
  updated,
  created,
  photoError,
  updateError,
}: Readonly<{
  watch: UserWatchDetail;
  updated: boolean;
  created: boolean;
  photoError: boolean;
  updateError: boolean;
}>) {
  return (
    <div className="grid gap-10">
      <nav className="type-meta">
        <Link href="/collection" className="hover:text-[var(--text)]">Моя коллекция</Link> / {watch.displayName}
      </nav>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <CollectionWatchMedia imageUrl={watch.primaryImageUrl} alt={watch.displayName} className="aspect-square" />
        <div className="grid gap-6 border-t border-[var(--border-strong)] pt-6">
          <div>
            <p className="type-meta">
              {watch.sourceKind === "catalog" ? "Связаны с каталогом" : "Добавлены вручную"}
            </p>
            <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">{watch.displayName}</h1>
            <p className="mt-4 text-[var(--text-muted)]">
              {[watch.brandName, watch.modelName, watch.referenceDisplay].filter(Boolean).join(" / ")}
            </p>
          </div>

          {watch.watchReferenceHref ? (
            <Link href={watch.watchReferenceHref} className="text-sm font-semibold text-[var(--accent-strong)]">
              Открыть публичную модель
            </Link>
          ) : null}

          {created ? <p className="text-sm">Часы добавлены в коллекцию.</p> : null}
          {updated ? <p className="text-sm">Данные владения обновлены.</p> : null}
          {photoError ? <p className="text-sm text-[var(--danger)]">Часы добавлены, но фотографию загрузить не удалось.</p> : null}
          {updateError ? <p className="text-sm text-[var(--danger)]">Проверьте данные владения и попробуйте ещё раз.</p> : null}
        </div>
      </section>

      <section className="grid gap-7 border-t border-[var(--border)] pt-7 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="type-label">Владение</p>
          <h2 className="type-section mt-2 text-2xl">Личные данные</h2>
        </div>
        <form action={updateUserWatchAction} className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="userWatchId" value={watch.id} />
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Название / nickname
            <input required name="displayName" defaultValue={watch.displayName} maxLength={160} className="control-surface px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Статус владения
            <select name="ownershipStatus" defaultValue={watch.ownershipStatus} className="control-surface px-3">
              <option value="owned">Владею сейчас</option>
              <option value="previously_owned">Владел раньше</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Дата приобретения
            <input type="date" name="acquiredAt" defaultValue={watch.acquiredAt ?? ""} className="control-surface px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Цена приобретения
            <input inputMode="decimal" name="acquisitionPrice" defaultValue={priceInputValue(watch.acquisitionPriceMinor)} className="control-surface px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Валюта
            <select name="acquisitionCurrencyCode" defaultValue={watch.acquisitionCurrencyCode ?? "RUB"} className="control-surface px-3">
              <option value="RUB">RUB</option>
              <option value="CNY">CNY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Источник приобретения
            <input name="acquisitionSource" defaultValue={watch.acquisitionSource ?? ""} maxLength={240} className="control-surface px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Личная заметка
            <textarea name="personalNote" defaultValue={watch.personalNote ?? ""} maxLength={5000} rows={6} className="control-surface p-3" />
          </label>
          <Button type="submit" className="justify-self-start sm:col-span-2">Сохранить изменения</Button>
        </form>
      </section>

      <details className="border-t border-[var(--border)] pt-5">
        <summary className="cursor-pointer text-sm font-semibold">Удалить часы из коллекции</summary>
        <div className="mt-4 grid max-w-xl gap-4">
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Часы исчезнут из активной коллекции. Публичная модель и каталог не изменятся.
          </p>
          <form action={deleteUserWatchAction}>
            <input type="hidden" name="userWatchId" value={watch.id} />
            <Button type="submit" variant="secondary">Подтвердить удаление</Button>
          </form>
        </div>
      </details>
    </div>
  );
}
