import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageAnalyticsEvent } from "@/components/analytics/page-analytics";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { CatalogWatchDetailPage } from "@/components/catalog/catalog-watch-detail-page";
import { getPublicEnv } from "@/config/public-env";
import { displayWatchSeoTitle } from "@/modules/catalog/application/catalog-display";
import { getPublicCommerceState } from "@/modules/commerce/domain/public-commerce-state";
import {
  CatalogReadSourceError,
  getPublicCatalogRelatedWatches,
  getPublicCatalogWatch,
  getPublicCatalogWatchSeoOverlay,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";

type WatchPageProps = Readonly<{
  params: Promise<{ brandSlug: string; referenceSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export const revalidate = 300;

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { brandSlug, referenceSlug } = await params;

  try {
    const watch = await getPublicCatalogWatch({ brandSlug, referenceSlug });
    if (!watch) {
      return {
        title: "Часы не найдены",
      };
    }

    const seoOverlay = await getPublicCatalogWatchSeoOverlay({
      brandSlug: watch.brandSlug,
      referenceNormalized: watch.referenceNormalized,
    });

    return {
      title:
        seoOverlay?.seoTitle ||
        displayWatchSeoTitle({
          brandName: watch.brandName,
          title: watch.title,
          referenceDisplay: watch.referenceDisplay,
        }),
      description:
        seoOverlay?.metaDescription ||
        `${watch.brandName} ${watch.referenceDisplay}: характеристики, изображения и статус заказа в каталоге Eternal Time.`,
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

function productStructuredData(
  watch: Awaited<ReturnType<typeof getPublicCatalogWatch>>,
  seoOverlay: Awaited<ReturnType<typeof getPublicCatalogWatchSeoOverlay>>,
) {
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
    name: displayWatchSeoTitle({
      brandName: watch.brandName,
      title: watch.title,
      referenceDisplay: watch.referenceDisplay,
    }),
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

  const description = seoOverlay?.shortDescription || seoOverlay?.metaDescription;
  if (description) {
    data.description = description;
  }

  const commerceState = watch.publicCommerceState ?? getPublicCommerceState({ publicPrice: watch.publicPrice });
  if (watch.publicPrice && commerceState.kind === "purchasable") {
    data.offers = {
      "@type": "Offer",
      price: (watch.publicPrice.amountMinor / 100).toFixed(0),
      priceCurrency: watch.publicPrice.currencyCode,
      url: `${env.appUrl}${watch.href}`,
      availability: "https://schema.org/PreOrder",
    };
  }

  return data;
}

export default async function WatchReferencePage({ params, searchParams }: WatchPageProps) {
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
        message="Мы готовим витрину к показу. Вернитесь чуть позже или перейдите в журнал Eternal Time."
      />
    );
  }

  if (!resultState.watch) {
    notFound();
  }

  const seoOverlay = await getPublicCatalogWatchSeoOverlay({
    brandSlug: resultState.watch.brandSlug,
    referenceNormalized: resultState.watch.referenceNormalized,
  });
  const relatedWatches = await getPublicCatalogRelatedWatches(resultState.watch);
  const structuredData = productStructuredData(resultState.watch, seoOverlay);
  const commerceState = resultState.watch.publicCommerceState ?? getPublicCommerceState({ publicPrice: resultState.watch.publicPrice });
  const query = await searchParams;
  const collectionState = typeof query.collection === "string" ? query.collection : undefined;

  return (
    <>
      {structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      ) : null}
      <PageAnalyticsEvent
        eventName="watch_view"
        properties={{
          brand: resultState.watch.brandName,
          reference: resultState.watch.referenceDisplay,
          commerce_state: commerceState.kind,
        }}
      />
      <CatalogWatchDetailPage
        watch={resultState.watch}
        collectionState={collectionState}
        seoOverlay={seoOverlay}
        relatedWatches={relatedWatches}
      />
    </>
  );
}
