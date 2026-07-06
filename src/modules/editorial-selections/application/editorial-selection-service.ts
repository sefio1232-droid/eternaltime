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
      dek: "Референсы с подтверждённой публичной ценой в пределах 30 000 ₽.",
      criteriaLabel: "publicPrice <= 30 000 ₽",
      watches: underThirtyThousand,
    }),
    selection({
      slug: "japanese-brands",
      title: "Японские бренды",
      dek: "Casio, Orient и Citizen из текущего публичного каталога.",
      criteriaLabel: "brand in Casio, Orient, Citizen",
      watches: japaneseBrands,
    }),
    selection({
      slug: "mechanical-references",
      title: "Механические референсы",
      dek: "Модели, где в публичных характеристиках явно указан механический или автоматический механизм.",
      criteriaLabel: "public mechanism text contains mechanical/automatic signal",
      watches: mechanical,
    }),
  ].filter((item): item is EditorialSelection => item !== null);
}
