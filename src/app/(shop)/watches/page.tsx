import type { Metadata } from "next";
import { CatalogListPage } from "@/components/catalog/catalog-list-page";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { parseCatalogReadQuery, type CatalogSearchParams } from "@/modules/catalog/application/catalog-read-query";
import {
  CatalogReadSourceError,
  getPublicCatalogCuratorialPaths,
  listPublicCatalogWatches,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { getCatalogReviewSanitationEntries } from "@/modules/catalog/infrastructure/catalog-review-dev-data.server";

export const metadata: Metadata = {
  title: "Каталог часов",
  description: "Каталог Eternal Time: Casio, Tissot, Orient, Citizen и Seiko с ценами, изображениями и характеристиками.",
  alternates: {
    canonical: "/watches",
  },
};

export const dynamic = "force-dynamic";

export default async function WatchesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<CatalogSearchParams>;
}>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = parseCatalogReadQuery({ searchParams: resolvedSearchParams });
  const reviewMode = process.env.NODE_ENV !== "production" && resolvedSearchParams.catalogReview === "1";
  const resultState = await Promise.all([listPublicCatalogWatches(query), getPublicCatalogCuratorialPaths()])
    .then(([result, curatorialPaths]) => ({ type: "ok" as const, result, curatorialPaths }))
    .catch((error: unknown) => {
      if (error instanceof CatalogReadSourceError) {
        return { type: "source_error" as const };
      }

      throw error;
    });

  if (resultState.type === "source_error") {
    return (
      <CatalogSourceState
        title="Каталог пока недоступен"
        message="Мы готовим витрину к показу. Вернитесь чуть позже или перейдите в журнал Eternal Time."
      />
    );
  }

  const sanitationEntries = reviewMode ? await getCatalogReviewSanitationEntries() : [];

  return (
    <CatalogListPage
      result={resultState.result}
      pathname="/watches"
      title="Каталог часов"
      description="Реальные модели, проверенные цены и понятные различия без лишнего шума."
      includeBrandFilter
      curatorialPaths={resultState.curatorialPaths}
      reviewMode={reviewMode}
      sanitationEntries={sanitationEntries}
    />
  );
}
