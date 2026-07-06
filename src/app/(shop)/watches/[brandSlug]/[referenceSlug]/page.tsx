import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { CatalogWatchDetailPage } from "@/components/catalog/catalog-watch-detail-page";
import { getPublicEnv } from "@/config/public-env";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import {
  CatalogReadSourceError,
  getPublicCatalogWatch,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";

type WatchPageProps = Readonly<{
  params: Promise<{ brandSlug: string; referenceSlug: string }>;
}>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { brandSlug, referenceSlug } = await params;

  try {
    const watch = await getPublicCatalogWatch({ brandSlug, referenceSlug });
    if (!watch) {
      return {
        title: "Часы не найдены",
      };
    }

    return {
      title: `${watch.title} ${watch.referenceDisplay}`,
      description: `${watch.brandName} ${watch.referenceDisplay}: публичная цена ${formatCatalogMoney(
        watch.publicPrice,
      )}, характеристики и изображения в каталоге Eternal Time.`,
      alternates: {
        canonical: watch.href,
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

function productStructuredData(watch: Awaited<ReturnType<typeof getPublicCatalogWatch>>) {
  if (!watch) {
    return null;
  }

  const env = getPublicEnv();
  const image =
    watch.primaryImage.kind === "none"
      ? undefined
      : /^https?:\/\//i.test(watch.primaryImage.src)
        ? watch.primaryImage.src
        : `${env.appUrl}${watch.primaryImage.src}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: watch.title,
    brand: {
      "@type": "Brand",
      name: watch.brandName,
    },
    sku: watch.referenceDisplay,
    mpn: watch.referenceDisplay,
    url: `${env.appUrl}${watch.href}`,
  };

  if (image) {
    data.image = [image];
  }

  if (watch.publicPrice) {
    data.offers = {
      "@type": "Offer",
      price: (watch.publicPrice.amountMinor / 100).toFixed(0),
      priceCurrency: watch.publicPrice.currencyCode,
      url: `${env.appUrl}${watch.href}`,
    };
  }

  return data;
}

export default async function WatchReferencePage({ params }: WatchPageProps) {
  const { brandSlug, referenceSlug } = await params;
  const resultState = await getPublicCatalogWatch({ brandSlug, referenceSlug })
    .then((watch) => ({ type: "ok" as const, watch }))
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
        message="Источник публичного каталога не настроен для этого окружения. В локальной разработке включите preview-источник явно."
      />
    );
  }

  if (!resultState.watch) {
    notFound();
  }

  const structuredData = productStructuredData(resultState.watch);

  return (
    <>
      {structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      ) : null}
      <CatalogWatchDetailPage watch={resultState.watch} />
    </>
  );
}
