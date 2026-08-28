import Link from "next/link";
import { CatalogAutoSubmitSelect } from "@/components/catalog/catalog-auto-submit-select";
import { catalogQueryHref, rubMinorToQueryValue } from "@/modules/catalog/application/catalog-read-query";
import { formatCatalogCount } from "@/modules/catalog/application/catalog-format";
import { mechanismGroupLabels, mechanismGroupOrder } from "@/modules/catalog/application/catalog-mechanism-taxonomy";
import {
  caseSizeGroupLabels,
  caseSizeGroupOrder,
  dialColorGroupLabels,
  dialColorGroupOrder,
  dialColorSwatches,
  genderGroupLabels,
  genderGroupOrder,
  strapMaterialGroupLabels,
} from "@/modules/catalog/application/catalog-filter-taxonomy";
import type { CatalogFilterFacets, CatalogFilterOption, CatalogReadQuery } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-filter-panel.module.css";

type SortValue = CatalogReadQuery["sort"];

/** Thousands-separated placeholder ("15 000"), not a raw digit string, so the price fields read
 * as real money the way the rest of the catalog already formats it. */
function formatPriceFieldPlaceholder(amountMinor: number | null): string | null {
  const rub = rubMinorToQueryValue(amountMinor);
  return rub ? formatCatalogCount(Number(rub)) : null;
}

/** "default" reads as "Рекомендуемые" on the curated tab, "По умолчанию" everywhere else. */
export function sortOptionsFor(view: CatalogReadQuery["view"]): Array<{ value: SortValue; label: string }> {
  return [
    { value: "default", label: view === "recommended" ? "Рекомендуемые" : "По умолчанию" },
    { value: "price_asc", label: "Сначала дешевле" },
    { value: "price_desc", label: "Сначала дороже" },
    { value: "name_asc", label: "По названию" },
  ];
}

function SelectField({
  label,
  name,
  value,
  options,
  className = "",
}: Readonly<{
  label: string;
  name: string;
  value: string | null;
  options: Array<{ value: string; label: string; count: number }>;
  className?: string;
}>) {
  return (
    <label className={`${styles.field} ${className}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <select name={name} defaultValue={value ?? ""} className={styles.control}>
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

type ActiveChip = { key: string; label: string; removeHref: string };

function optionLabel(options: CatalogFilterOption[], value: string): string {
  const known = options.find((option) => option.value === value)?.label;
  if (known) {
    return known;
  }

  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("ru")}${part.slice(1)}`)
    .join(" ");
}

function buildActiveChips(input: {
  facets: CatalogFilterFacets;
  query: CatalogReadQuery;
  pathname: string;
  includeBrandFilter: boolean;
}): ActiveChip[] {
  const { facets, query, pathname, includeBrandFilter } = input;
  const chips: ActiveChip[] = [];

  if (query.search) {
    chips.push({
      key: "q",
      label: `«${query.search}»`,
      removeHref: catalogQueryHref(pathname, query, { search: "", page: 1 }),
    });
  }

  if (includeBrandFilter && query.brandSlug) {
    chips.push({
      key: "brand",
      label: optionLabel(facets.brands, query.brandSlug),
      removeHref: catalogQueryHref(pathname, query, { brandSlug: null, page: 1 }),
    });
  }

  if (query.brandCollection) {
    chips.push({
      key: "collection",
      label: optionLabel(facets.brandCollections, query.brandCollection),
      removeHref: catalogQueryHref(pathname, query, { brandCollection: null, page: 1 }),
    });
  }

  if (query.gender) {
    chips.push({
      key: "gender",
      label: genderGroupLabels[query.gender as keyof typeof genderGroupLabels] ?? optionLabel(facets.genders, query.gender),
      removeHref: catalogQueryHref(pathname, query, { gender: null, page: 1 }),
    });
  }

  if (query.caseSize) {
    chips.push({
      key: "size",
      label: caseSizeGroupLabels[query.caseSize as keyof typeof caseSizeGroupLabels] ?? optionLabel(facets.caseSizes, query.caseSize),
      removeHref: catalogQueryHref(pathname, query, { caseSize: null, page: 1 }),
    });
  }

  if (query.movement) {
    chips.push({
      key: "movement",
      label: mechanismGroupLabels[query.movement as keyof typeof mechanismGroupLabels] ?? optionLabel(facets.movements, query.movement),
      removeHref: catalogQueryHref(pathname, query, { movement: null, page: 1 }),
    });
  }

  if (query.dialColor) {
    chips.push({
      key: "dialColor",
      label: dialColorGroupLabels[query.dialColor as keyof typeof dialColorGroupLabels] ?? optionLabel(facets.dialColors, query.dialColor),
      removeHref: catalogQueryHref(pathname, query, { dialColor: null, page: 1 }),
    });
  }

  if (query.strapMaterial) {
    chips.push({
      key: "strap",
      label:
        strapMaterialGroupLabels[query.strapMaterial as keyof typeof strapMaterialGroupLabels] ??
        optionLabel(facets.strapMaterials, query.strapMaterial),
      removeHref: catalogQueryHref(pathname, query, { strapMaterial: null, page: 1 }),
    });
  }

  if (query.waterResistance) {
    chips.push({
      key: "water",
      label: optionLabel(facets.waterResistance, query.waterResistance),
      removeHref: catalogQueryHref(pathname, query, { waterResistance: null, page: 1 }),
    });
  }

  if (query.caseMaterial) {
    chips.push({
      key: "caseMaterial",
      label: optionLabel(facets.caseMaterials, query.caseMaterial),
      removeHref: catalogQueryHref(pathname, query, { caseMaterial: null, page: 1 }),
    });
  }

  if (query.crystal) {
    chips.push({
      key: "crystal",
      label: optionLabel(facets.crystalTypes, query.crystal),
      removeHref: catalogQueryHref(pathname, query, { crystal: null, page: 1 }),
    });
  }

  if (query.minPriceMinor !== null || query.maxPriceMinor !== null) {
    const min = rubMinorToQueryValue(query.minPriceMinor);
    const max = rubMinorToQueryValue(query.maxPriceMinor);
    const label = min && max ? `${min}–${max} ₽` : min ? `от ${min} ₽` : `до ${max} ₽`;

    chips.push({
      key: "price",
      label,
      removeHref: catalogQueryHref(pathname, query, { minPriceMinor: null, maxPriceMinor: null, page: 1 }),
    });
  }

  return chips;
}

/** Counts how many *expanded-panel* dimensions are active, for the "Фильтры · N" toggle label —
 * search has its own always-visible field and isn't counted here. */
function countExpandedFilters(query: CatalogReadQuery, includeBrandFilter: boolean): number {
  let count = 0;
  if (includeBrandFilter && query.brandSlug) count += 1;
  if (query.brandCollection) count += 1;
  if (query.gender) count += 1;
  if (query.caseSize) count += 1;
  if (query.movement) count += 1;
  if (query.dialColor) count += 1;
  if (query.strapMaterial) count += 1;
  if (query.waterResistance) count += 1;
  if (query.caseMaterial) count += 1;
  if (query.crystal) count += 1;
  if (query.minPriceMinor !== null || query.maxPriceMinor !== null) count += 1;
  return count;
}

export function catalogFilterResetHref(pathname: string, query: CatalogReadQuery): string {
  return catalogQueryHref(pathname, query, {
    search: "",
    brandSlug: null,
    brandCollection: null,
    gender: null,
    caseSize: null,
    movement: null,
    dialColor: null,
    strapMaterial: null,
    waterResistance: null,
    caseMaterial: null,
    crystal: null,
    positioning: null,
    minPriceMinor: null,
    maxPriceMinor: null,
    sort: "default",
    page: 1,
  });
}

/**
 * The catalog control bar's search field — always visible, never collapses. Standalone (not
 * grouped with sort) so the persistent control bar can place it on the left, next to the result
 * count, while sort and the filter-dialog trigger sit on the right
 * (docs/CATALOG_SHOWROOM_RECOVERY.md "Phase 4 control bar").
 */
function CatalogFilterSearchField({ query, idPrefix = "catalog" }: Readonly<{ query: CatalogReadQuery; idPrefix?: string }>) {
  const searchInputId = `${idPrefix}-search-input`;
  return (
    <div className={styles.searchField}>
      <label className={styles.srOnly} htmlFor={searchInputId}>
        Поиск по бренду, модели или артикулу
      </label>
      <input
        id={searchInputId}
        name="q"
        defaultValue={query.search}
        placeholder="Бренд, модель или артикул"
        className={styles.searchInput}
      />
      <button type="submit" className={styles.searchSubmit} aria-label="Найти">
        <span aria-hidden="true" className={styles.searchIcon} />
      </button>
    </div>
  );
}

/** The control bar's sort field — standalone (see `CatalogFilterSearchField`). Auto-submits on
 * change since it has no nearby submit button of its own (see CatalogAutoSubmitSelect). */
function CatalogFilterSortField({ query, idPrefix = "catalog" }: Readonly<{ query: CatalogReadQuery; idPrefix?: string }>) {
  const sortId = `${idPrefix}-sort-select`;
  return (
    <label className={styles.sortField} htmlFor={sortId}>
      <span className={styles.srOnly}>Сортировка</span>
      <CatalogAutoSubmitSelect id={sortId} name="sort" defaultValue={query.sort} className={styles.control}>
        {sortOptionsFor(query.view).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CatalogAutoSubmitSelect>
    </label>
  );
}

/**
 * Everything behind the "Расширенные фильтры" toggle: brand/collection (where relevant),
 * customer-facing discovery groups over normalized derived facets. Raw import values never render
 * as public options; unknown/unclassified values remain internal audit state, not shopper-facing
 * filters.
 */
function CatalogFilterExpandedFields({
  facets,
  query,
  includeBrandFilter,
  totalRecords,
  idPrefix = "catalog",
  showFooter = true,
}: Readonly<{
  facets: CatalogFilterFacets;
  query: CatalogReadQuery;
  includeBrandFilter: boolean;
  totalRecords: number;
  idPrefix?: string;
  showFooter?: boolean;
}>) {
  const showCollectionFilter = facets.brandCollections.length > 1;

  return (
    <div id={`${idPrefix}-expanded-filters`} className={styles.expandedPanel}>
      <div className={styles.expandedGrid}>
        {facets.genders.length > 0 ? (
          <fieldset className={styles.mechanismField}>
            <legend className={styles.fieldLabel}>Для кого</legend>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input type="radio" name="gender" value="" defaultChecked={!query.gender} />
                <span>Все</span>
              </label>
              {genderGroupOrder.map((group) => {
                const option = facets.genders.find((entry) => entry.value === group);
                if (!option || option.count === 0) return null;
                return (
                  <label key={group} className={styles.radioOption}>
                    <input type="radio" name="gender" value={group} defaultChecked={query.gender === group} />
                    <span>
                      {genderGroupLabels[group]} ({option.count})
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {facets.caseSizes.length > 0 ? (
          <fieldset className={styles.mechanismField}>
            <legend className={styles.fieldLabel}>Размер корпуса</legend>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input type="radio" name="size" value="" defaultChecked={!query.caseSize} />
                <span>Любой</span>
              </label>
              {caseSizeGroupOrder.map((group) => {
                const option = facets.caseSizes.find((entry) => entry.value === group);
                if (!option || option.count === 0) return null;
                return (
                  <label key={group} className={styles.radioOption}>
                    <input type="radio" name="size" value={group} defaultChecked={query.caseSize === group} />
                    <span>
                      {caseSizeGroupLabels[group]} ({option.count})
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={styles.fieldHint}>Размер корпуса считается по заявленному диаметру или ширине, без привязки к полу.</p>
          </fieldset>
        ) : null}

        <fieldset className={styles.mechanismField}>
          <legend className={styles.fieldLabel}>Механизм</legend>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input type="radio" name="movement" value="" defaultChecked={!query.movement} />
              <span>Любой</span>
            </label>
            {mechanismGroupOrder.map((group) => {
              const option = facets.movements.find((entry) => entry.value === group);
              if (!option || option.count === 0) return null;
              return (
                <label key={group} className={styles.radioOption}>
                  <input type="radio" name="movement" value={group} defaultChecked={query.movement === group} />
                  <span>
                    {mechanismGroupLabels[group]} ({option.count})
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className={styles.priceField}>
          <legend className={styles.fieldLabel}>Цена, ₽</legend>
          <div className={styles.priceGroup}>
            <input
              name="priceMin"
              defaultValue={rubMinorToQueryValue(query.minPriceMinor) ?? ""}
              placeholder={formatPriceFieldPlaceholder(facets.price.minMinor) ?? "от"}
              inputMode="numeric"
              className={styles.priceInput}
              aria-label="Минимальная цена"
            />
            <span aria-hidden="true" className={styles.priceDash}>

            </span>
            <input
              name="priceMax"
              defaultValue={rubMinorToQueryValue(query.maxPriceMinor) ?? ""}
              placeholder={formatPriceFieldPlaceholder(facets.price.maxMinor) ?? "до"}
              inputMode="numeric"
              className={styles.priceInput}
              aria-label="Максимальная цена"
            />
          </div>
        </fieldset>

        {includeBrandFilter ? (
          <SelectField label="Бренд" name="brand" value={query.brandSlug} options={facets.brands} className={styles.moreField} />
        ) : null}
        {showCollectionFilter ? (
          <SelectField
            label="Коллекция"
            name="collection"
            value={query.brandCollection}
            options={facets.brandCollections.slice(0, 80)}
            className={styles.moreField}
          />
        ) : null}
        {facets.dialColors.length > 1 ? (
          <fieldset className={styles.mechanismField}>
            <legend className={styles.fieldLabel}>Цвет циферблата</legend>
            <div className={`${styles.radioGroup} ${styles.colorGroup}`}>
              <label className={styles.radioOption}>
                <input type="radio" name="dialColor" value="" defaultChecked={!query.dialColor} />
                <span>Любой</span>
              </label>
              {dialColorGroupOrder.map((group) => {
                const option = facets.dialColors.find((entry) => entry.value === group);
                if (!option || option.count === 0) return null;
                return (
                  <label key={group} className={`${styles.radioOption} ${styles.colorOption}`}>
                    <input type="radio" name="dialColor" value={group} defaultChecked={query.dialColor === group} />
                    <span className={styles.colorSwatch} style={{ background: dialColorSwatches[group] }} aria-hidden="true" />
                    <span>
                      {dialColorGroupLabels[group]} ({option.count})
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        {facets.strapMaterials.length > 1 ? (
          <SelectField
            label="Ремешок / браслет"
            name="strap"
            value={query.strapMaterial}
            options={facets.strapMaterials.slice(0, 80)}
            className={styles.moreField}
          />
        ) : null}
        {/* Each field below is only rendered when the current dataset actually has more than one
            real option for it — a select offering nothing but "Все" isn't a filter, it's dead UI
            (real user feedback: Tissot has no usable water-resistance data at all, so that field
            was showing up empty for the entire brand). */}
        {facets.waterResistance.length > 1 ? (
          <SelectField
            label="Водозащита"
            name="water"
            value={query.waterResistance}
            options={facets.waterResistance.slice(0, 80)}
            className={styles.moreField}
          />
        ) : null}
        {facets.caseMaterials.length > 1 ? (
          <SelectField
            label="Материал корпуса"
            name="caseMaterial"
            value={query.caseMaterial}
            options={facets.caseMaterials.slice(0, 80)}
            className={styles.moreField}
          />
        ) : null}
        {facets.crystalTypes.length > 1 ? (
          <SelectField
            label="Стекло"
            name="crystal"
            value={query.crystal}
            options={facets.crystalTypes.slice(0, 80)}
            className={styles.moreField}
          />
        ) : null}
      </div>

      {showFooter ? (
        <div className={styles.expandedFooter}>
          <button type="submit" className={styles.applyButton}>
            Применить
          </button>
          <span className={styles.expandedCount}>{formatCatalogCount(totalRecords)} моделей</span>
        </div>
      ) : null}
    </div>
  );
}

/** Active-filter chips row — a plain list of links, rendered directly under the control bar by
 * `catalog-list-page.tsx` (not inside the filter dialog) so what's filtered stays visible even
 * while the dialog itself is closed. */
function CatalogFilterChipsRow({
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
  const activeChips = buildActiveChips({ facets, query, pathname, includeBrandFilter });
  if (activeChips.length === 0) {
    return null;
  }

  const resetHref = catalogFilterResetHref(pathname, query);

  return (
    <div className={styles.chipRow}>
      <ul className={styles.chipList}>
        {activeChips.map((chip) => (
          <li key={chip.key}>
            <Link href={chip.removeHref} className={styles.chip}>
              {chip.label}
              <span aria-hidden="true" className={styles.chipRemove}>×</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={resetHref} className={styles.resetAll}>
        Сбросить все
      </Link>
    </div>
  );
}

export {
  CatalogFilterSearchField,
  CatalogFilterSortField,
  CatalogFilterExpandedFields,
  CatalogFilterChipsRow,
  buildActiveChips,
  countExpandedFilters,
};
