import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListPage } from "@/components/catalog/catalog-list-page";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { parseCatalogReadQuery, type CatalogSearchParams } from "@/modules/catalog/application/catalog-read-query";
import {
  CatalogReadSourceError,
  getPublicCatalogBrand,
  listPublicCatalogWatches,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";

type BrandPageProps = Readonly<{
  params: Promise<{ brandSlug: string }>;
  searchParams?: Promise<CatalogSearchParams>;
}>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brandSlug } = await params;

  try {
    const brand = await getPublicCatalogBrand(brandSlug);
    if (!brand) {
      return {
        title: "Бренд не найден",
      };
    }

    return {
      title: `${brand.name}: каталог часов`,
      description: `Часы ${brand.name} в каталоге Eternal Time: публичные референсы, цены и характеристики.`,
      alternates: {
        canonical: `/watches/${brand.slug}`,
      },
    };
  } catch (error) {
    if (error instanceof CatalogReadSourceError) {
      return {
        title: "Каталог часов",
      };
    }

    throw error;
  }
}

export default async function BrandCatalogPage({ params, searchParams }: BrandPageProps) {
  const { brandSlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = parseCatalogReadQuery({ searchParams: resolvedSearchParams, brandSlug });
  const resultState = await Promise.all([getPublicCatalogBrand(brandSlug), listPublicCatalogWatches(query)])
    .then(([brand, result]) => ({ type: "ok" as const, brand, result }))
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

  if (!resultState.brand) {
    notFound();
  }

  return (
    <CatalogListPage
      result={resultState.result}
      pathname={`/watches/${resultState.brand.slug}`}
      title={`Часы ${resultState.brand.name}`}
      description={`Все доступные публичные карточки ${resultState.brand.name}: референсы, текущая публичная цена и нормализованные характеристики.`}
      includeBrandFilter={false}
    />
  );
}
