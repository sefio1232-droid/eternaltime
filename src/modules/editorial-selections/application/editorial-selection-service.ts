import { toCatalogWatchCard } from "@/modules/catalog/application/catalog-read-service";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import type { EditorialSelection } from "../domain/read-models";

function priced(watch: CatalogWatchDetail): boolean {
  return watch.publicPrice !== null;
}

function byPriceThenTitle(left: CatalogWatchDetail, right: CatalogWatchDetail): number {
  const leftPrice = left.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY;
  const rightPrice = right.publicPrice?.amountMinor ?? Number.POSITIVE_INFINITY;

  return leftPrice - rightPrice || left.title.localeCompare(right.title, "ru");
}

function selection(input: {
  slug: string;
  title: string;
  dek: string;
  criteriaLabel: string;
  watches: CatalogWatchDetail[];
}): EditorialSelection | null {
  const watches = input.watches.slice(0, 8).map(toCatalogWatchCard);

  if (watches.length === 0) {
    return null;
  }

  return {
    slug: input.slug,
    title: input.title,
    dek: input.dek,
    criteriaLabel: input.criteriaLabel,
    watches,
  };
}

export function listEditorialSelections(dataset: CatalogReadDataset): EditorialSelection[] {
  const underThirtyThousand = dataset.watches
    .filter((watch) => priced(watch) && (watch.publicPrice?.amountMinor ?? 0) <= 3_000_000)
    .sort(byPriceThenTitle);
  const japaneseBrandSlugs = new Set(["casio", "orient", "citizen"]);
  const japaneseBrands = dataset.watches
    .filter((watch) => japaneseBrandSlugs.has(watch.brandSlug))
    .sort((left, right) => left.brandName.localeCompare(right.brandName, "ru") || left.title.localeCompare(right.title, "ru"));
  const mechanical = dataset.watches
    .filter((watch) =>
      watch.specifications.some(
        (specification) =>
          specification.group === "mechanism" &&
          /механ|автомат|mechan|automatic/i.test(specification.value.normalize("NFKC")),
      ),
    )
    .sort(byPriceThenTitle);

  return [
    selection({
      slug: "under-30000-rub",
      title: "До 30 000 ₽",
      dek: "Часы с подтверждённой ценой до 30 000 ₽.",
      criteriaLabel: "По цене",
      watches: underThirtyThousand,
    }),
    selection({
      slug: "japanese-brands",
      title: "Японские бренды",
      dek: "Casio, Orient и Citizen — в одной подборке.",
      criteriaLabel: "По брендам",
      watches: japaneseBrands,
    }),
    selection({
      slug: "mechanical-references",
      title: "Механические часы",
      dek: "Модели с механическим или автоматическим механизмом.",
      criteriaLabel: "По механизму",
      watches: mechanical,
    }),
  ].filter((item): item is EditorialSelection => item !== null);
}
