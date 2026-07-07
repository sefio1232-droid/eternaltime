import Link from "next/link";
import {
  catalogQueryHref,
  rubMinorToQueryValue,
} from "@/modules/catalog/application/catalog-read-query";
import type { CatalogFilterFacets, CatalogReadQuery } from "@/modules/catalog/domain/read-models";

function controlClassName() {
  return "h-[var(--control-height)] w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]";
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
    <label className="grid gap-2">
      <span className="type-meta">{label}</span>
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
    <form action={pathname} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.35fr_repeat(6,minmax(0,1fr))]">
        <label className="grid gap-2">
          <span className="type-meta">Поиск</span>
          <input
            name="q"
            defaultValue={query.search}
            placeholder="Бренд, модель или артикул"
            className={controlClassName()}
          />
        </label>

        {includeBrandFilter ? (
          <SelectField label="Бренд" name="brand" value={query.brandSlug} options={facets.brands} />
        ) : null}

        <SelectField label="Коллекция" name="collection" value={query.brandCollection} options={facets.brandCollections} />
        <SelectField label="Механизм" name="movement" value={query.movement} options={facets.movements.slice(0, 80)} />
        <SelectField label="Водозащита" name="water" value={query.waterResistance} options={facets.waterResistance.slice(0, 80)} />
        <SelectField label="Корпус" name="caseMaterial" value={query.caseMaterial} options={facets.caseMaterials.slice(0, 80)} />
        <SelectField label="Стекло" name="crystal" value={query.crystal} options={facets.crystalTypes.slice(0, 80)} />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
        <fieldset className="grid gap-2 md:col-span-2">
          <legend className="type-meta">Цена, руб.</legend>
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

        <label className="grid gap-2">
          <span className="type-meta">Порядок</span>
          <select name="sort" defaultValue={query.sort} className={controlClassName()}>
            <option value="default">По умолчанию</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="name_asc">По названию</option>
          </select>
        </label>

        <button
          type="submit"
          className="h-[var(--control-height)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-strong)]"
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
          className="inline-flex h-[var(--control-height)] items-center justify-center border border-[var(--border)] px-5 text-sm font-semibold"
        >
          Сбросить
        </Link>
      </div>
    </form>
  );
}
