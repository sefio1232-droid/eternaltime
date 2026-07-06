import type { Metadata } from "next";
import { CatalogListPage } from "@/components/catalog/catalog-list-page";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { parseCatalogReadQuery, type CatalogSearchParams } from "@/modules/catalog/application/catalog-read-query";
import {
  CatalogReadSourceError,
  listPublicCatalogWatches,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";

export const metadata: Metadata = {
  title: "Каталог часов",
  description: "Публичный каталог Eternal Time: Casio, Tissot, Orient и Citizen из проверенного staged preview.",
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
  const resultState = await listPublicCatalogWatches(query)
    .then((result) => ({ type: "ok" as const, result }))
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
        message="Источник публичного каталога не настроен для этого окружения. В локальной разработке включите preview-source явно."
      />
    );
  }

  return (
    <CatalogListPage
      result={resultState.result}
      pathname="/watches"
      title="Каталог часов"
      description="Реальные позиции из текущего подготовленного каталога: только публичные поля, проверенные референсы и утверждённая публичная цена там, где она есть."
      includeBrandFilter
    />
  );
}
