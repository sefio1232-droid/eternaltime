import Link from "next/link";
import { catalogQueryHref, rubMinorToQueryValue } from "@/modules/catalog/application/catalog-read-query";
import type { CatalogFilterFacets, CatalogReadQuery } from "@/modules/catalog/domain/read-models";

function controlClassName() {
  return "catalog-filter-control";
}

function FilterIcon({ kind }: Readonly<{ kind: "brand" | "collection" | "movement" | "material" | "glass" | "price" | "sort" | "search" }>) {
  return <span aria-hidden="true" className={`catalog-filter-icon catalog-filter-icon-${kind}`} />;
}

function SelectField({ label, name, value, options, icon }: Readonly<{
  label: string;
  name: string;
  value: string | null;
  options: Array<{ value: string; label: string; count: number }>;
  icon: "brand" | "collection" | "movement" | "material" | "glass" | "sort";
}>) {
  return (
    <label className="catalog-filter-item">
      <FilterIcon kind={icon} />
      <span>{label}</span>
      <select name={name} defaultValue={value ?? ""} className={controlClassName()}>
        <option value="">Все</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.count})</option>)}
      </select>
    </label>
  );
}

export function CatalogFilterPanel({ facets, query, pathname, includeBrandFilter }: Readonly<{
  facets: CatalogFilterFacets;
  query: CatalogReadQuery;
  pathname: string;
  includeBrandFilter: boolean;
}>) {
  const activeFilterCount = [
    query.search,
    includeBrandFilter ? query.brandSlug : null,
    query.brandCollection,
    query.movement,
    query.waterResistance,
    query.caseMaterial,
    query.crystal,
    query.minPriceMinor,
    query.maxPriceMinor,
  ].filter((value) => value !== null && value !== "").length;
  const resetHref = catalogQueryHref(pathname, query, {
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
  });

  return (
    <form action={pathname} className="catalog-filter-bar" data-catalog-filter-count={activeFilterCount}>
      <div className="catalog-filter-primary-row">
        <label className="catalog-filter-item catalog-filter-search">
          <FilterIcon kind="search" />
          <span>Поиск</span>
          <input name="q" defaultValue={query.search} placeholder="Бренд, модель или артикул" className={controlClassName()} />
        </label>
        {includeBrandFilter ? <SelectField label="Бренды" name="brand" value={query.brandSlug} options={facets.brands} icon="brand" /> : null}
        <SelectField label="Коллекции" name="collection" value={query.brandCollection} options={facets.brandCollections} icon="collection" />
        <SelectField label="Механизм" name="movement" value={query.movement} options={facets.movements.slice(0, 80)} icon="movement" />
        <label className="catalog-filter-item">
          <FilterIcon kind="sort" />
          <span>Сортировка</span>
          <select name="sort" defaultValue={query.sort} className={controlClassName()}>
            <option value="default">По умолчанию</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="name_asc">По названию</option>
          </select>
        </label>
        <button type="submit" className="catalog-filter-submit">Применить</button>
      </div>

      <details className="catalog-filter-more">
        <summary>
          <FilterIcon kind="material" />
          Все фильтры{activeFilterCount > 0 ? ` · выбрано ${activeFilterCount}` : ""}
        </summary>
        <div className="catalog-filter-expanded">
          <SelectField label="Водозащита" name="water" value={query.waterResistance} options={facets.waterResistance.slice(0, 80)} icon="material" />
          <SelectField label="Материал" name="caseMaterial" value={query.caseMaterial} options={facets.caseMaterials.slice(0, 80)} icon="material" />
          <SelectField label="Стекло" name="crystal" value={query.crystal} options={facets.crystalTypes.slice(0, 80)} icon="glass" />
          <fieldset className="catalog-filter-price">
            <legend><FilterIcon kind="price" /> Цена</legend>
            <div>
              <input name="priceMin" defaultValue={rubMinorToQueryValue(query.minPriceMinor) ?? ""} placeholder={rubMinorToQueryValue(facets.price.minMinor) ?? "от"} inputMode="numeric" className={controlClassName()} aria-label="Минимальная цена" />
              <input name="priceMax" defaultValue={rubMinorToQueryValue(query.maxPriceMinor) ?? ""} placeholder={rubMinorToQueryValue(facets.price.maxMinor) ?? "до"} inputMode="numeric" className={controlClassName()} aria-label="Максимальная цена" />
            </div>
          </fieldset>
        </div>
      </details>

      {activeFilterCount > 0 ? <Link href={resetHref} className="catalog-filter-reset">Сбросить выбранные фильтры</Link> : null}
    </form>
  );
}
