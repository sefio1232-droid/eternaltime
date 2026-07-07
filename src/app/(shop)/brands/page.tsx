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
  description: "Бренды Eternal Time: Casio, Tissot, Orient и Citizen с моделями, изображениями и быстрым переходом в каталог.",
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
        message="Мы готовим витрину к показу. Вернитесь чуть позже или перейдите в журнал Eternal Time."
      />
    );
  }

  return (
    <Container className="grid gap-10 py-10 lg:py-14">
      <header className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="type-label">Бренды</p>
          <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">Четыре направления современной часовой культуры</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)] lg:justify-self-end">
          От японских инструментальных часов до швейцарской повседневной механики: каждый бренд открывает свой язык формы,
          материалов и сценариев.
        </p>
      </header>

      <section className="grid gap-8">
        {resultState.brands.map((brand, index) => (
          <article
            key={brand.slug}
            className="grid gap-6 border-t border-[var(--border)] pt-8 lg:grid-cols-[0.55fr_1.45fr]"
          >
            <div className="grid content-start gap-4">
              <div>
                <p className="type-meta">{String(index + 1).padStart(2, "0")}</p>
                <Link href={`/watches/${brand.slug}`} className="type-section mt-2 block text-4xl hover:text-[var(--accent-strong)]">
                  {brand.name}
                </Link>
              </div>
              <p className="type-meta">{formatCatalogCount(brand.watchCount)} моделей</p>
              {brand.collectionNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {brand.collectionNames.slice(0, 4).map((collectionName) => (
                    <span key={collectionName} className="border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)]">
                      {collectionName}
                    </span>
                  ))}
                </div>
              ) : null}
              <Link href={`/watches/${brand.slug}`} className="text-sm font-semibold text-[var(--accent-strong)]">
                Смотреть часы
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {brand.representativeWatches.map((watch) => (
                <Link key={watch.id} href={watch.href} className="group grid gap-2">
                  <span className="watch-media aspect-square p-3">
                    <CatalogImage image={watch.primaryImage} />
                  </span>
                  <span className="type-reference group-hover:text-[var(--accent-strong)]">{watch.referenceDisplay}</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </Container>
  );
}
