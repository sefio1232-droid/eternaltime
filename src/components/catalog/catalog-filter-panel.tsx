import Link from "next/link";
import {
  catalogQueryHref,
  rubMinorToQueryValue,
} from "@/modules/catalog/application/catalog-read-query";
import type { CatalogFilterFacets, CatalogReadQuery } from "@/modules/catalog/domain/read-models";

function controlClassName() {
  return "min-h-11 border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--border-strong)]";
}

function SelectField({
  label,
  name,
  value,
  options,
}: Readonly<{
  label: string;
  name: string;
  value: string | null;
  options: Array<{ value: string; label: string; count: number }>;
}>) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <select name={name} defaultValue={value ?? ""} className={controlClassName()}>
        <option value="">Все</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}

export function CatalogFilterPanel({
  facets,
  query,
  pathname,
  includeBrandFilter,
}: Readonly<{
  facets: CatalogFilterFacets;
  query: CatalogReadQuery;
  pathname: string;
  includeBrandFilter: boolean;
}>) {
  return (
    <form action={pathname} className="grid gap-5">
      <label className="grid gap-2 text-sm">
        <span className="text-[var(--text-muted)]">Поиск</span>
        <input
          name="q"
          defaultValue={query.search}
          placeholder="Бренд, модель или референс"
          className={controlClassName()}
        />
      </label>

      {includeBrandFilter ? (
        <SelectField label="Бренд" name="brand" value={query.brandSlug} options={facets.brands} />
      ) : null}

      <SelectField label="Коллекция" name="collection" value={query.brandCollection} options={facets.brandCollections} />
      <SelectField label="Механизм" name="movement" value={query.movement} options={facets.movements.slice(0, 80)} />
      <SelectField label="Водозащита" name="water" value={query.waterResistance} options={facets.waterResistance.slice(0, 80)} />
      <SelectField label="Материал корпуса" name="caseMaterial" value={query.caseMaterial} options={facets.caseMaterials.slice(0, 80)} />
      <SelectField label="Стекло" name="crystal" value={query.crystal} options={facets.crystalTypes.slice(0, 80)} />

      <fieldset className="grid gap-2 text-sm">
        <legend className="text-[var(--text-muted)]">Цена, ₽</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="priceMin"
            defaultValue={rubMinorToQueryValue(query.minPriceMinor) ?? ""}
            placeholder={rubMinorToQueryValue(facets.price.minMinor) ?? "от"}
            inputMode="numeric"
            className={controlClassName()}
            aria-label="Минимальная цена"
          />
          <input
            name="priceMax"
            defaultValue={rubMinorToQueryValue(query.maxPriceMinor) ?? ""}
            placeholder={rubMinorToQueryValue(facets.price.maxMinor) ?? "до"}
            inputMode="numeric"
            className={controlClassName()}
            aria-label="Максимальная цена"
          />
        </div>
      </fieldset>

      <label className="grid gap-2 text-sm">
        <span className="text-[var(--text-muted)]">Сортировка</span>
        <select name="sort" defaultValue={query.sort} className={controlClassName()}>
          <option value="default">По умолчанию</option>
          <option value="price_asc">Сначала дешевле</option>
          <option value="price_desc">Сначала дороже</option>
          <option value="name_asc">По названию</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="submit"
          className="min-h-11 border border-[var(--surface-strong)] bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--text-inverse)]"
        >
          Применить
        </button>
        <Link
          href={catalogQueryHref(pathname, query, {
            search: "",
            brandSlug: null,
            brandCollection: null,
            movement: null,
            waterResistance: null,
            caseMaterial: null,
            crystal: null,
            minPriceMinor: null,
            maxPriceMinor: null,
            sort: "default",
            page: 1,
          })}
          className="inline-flex min-h-11 items-center justify-center border border-[var(--border)] px-4 text-sm font-medium"
        >
          Сбросить
        </Link>
      </div>
    </form>
  );
}
