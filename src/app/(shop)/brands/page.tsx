import type { Metadata } from "next";
import Link from "next/link";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { Container } from "@/components/ui/container";
import { formatCatalogCount } from "@/modules/catalog/application/catalog-format";
import {
  CatalogReadSourceError,
  listPublicCatalogBrands,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";

export const metadata: Metadata = {
  title: "Бренды",
  description: "Бренды в публичном каталоге Eternal Time с количеством референсов и доступными коллекциями.",
  alternates: {
    canonical: "/brands",
  },
};

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const resultState = await listPublicCatalogBrands()
    .then((brands) => ({ type: "ok" as const, brands }))
    .catch((error: unknown) => {
      if (error instanceof CatalogReadSourceError) {
        return { type: "source_error" as const };
      }

      throw error;
    });

  if (resultState.type === "source_error") {
    return (
      <CatalogSourceState
        title="Бренды пока недоступны"
        message="Источник публичного каталога не настроен для этого окружения. В локальной разработке включите preview-source явно."
      />
    );
  }

  return (
    <Container className="grid gap-9 py-10 lg:py-14">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="type-meta">Бренды</p>
        <h1 className="type-display mt-3 text-5xl text-balance md:text-6xl">Исследовать каталог по бренду</h1>
        <p className="type-body mt-5 max-w-2xl text-[var(--text-muted)]">
          Эта страница строится из публичного catalog read repository: только бренды, у которых есть доступные watch references.
        </p>
      </header>

      <section className="grid gap-8">
        {resultState.brands.map((brand) => (
          <article key={brand.slug} className="grid gap-5 border-b border-[var(--border)] pb-8 lg:grid-cols-[0.65fr_1.35fr]">
            <div className="grid content-start gap-3">
              <Link href={`/watches/${brand.slug}`} className="text-4xl font-semibold hover:text-[var(--accent-strong)]">
                {brand.name}
              </Link>
              <p className="type-meta">{formatCatalogCount(brand.watchCount)} публичных референсов</p>
              {brand.collectionNames.length > 0 ? (
                <p className="type-body text-sm text-[var(--text-muted)]">{brand.collectionNames.slice(0, 6).join(" · ")}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {brand.representativeWatches.map((watch) => (
                <Link key={watch.id} href={watch.href} className="grid gap-2">
                  <span className="aspect-square border border-[var(--border)] bg-[var(--surface-subtle)] p-2">
                    <CatalogImage image={watch.primaryImage} />
                  </span>
                  <span className="type-reference">{watch.referenceDisplay}</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </Container>
  );
}
