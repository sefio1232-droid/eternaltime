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
  description: "Бренды Eternal Time: Casio, Tissot, Orient и Citizen с моделями, коллекциями и переходом в каталог.",
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
    <Container className="grid gap-10 public-page">
      <header className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
        <div>
          <p className="type-label">Бренды</p>
          <h1 className="public-heading mt-3">Бренды и их характер</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)] lg:justify-self-end">
          От японских инструментальных моделей до швейцарской повседневной механики: бренд задает тон, но выбор всегда уточняется моделью, посадкой и сценарием.
        </p>
      </header>

      <section className="grid gap-7">
        {resultState.brands.map((brand, index) => {
          const watchesWithImages = brand.representativeWatches.filter((watch) => watch.primaryImage.kind !== "none").slice(0, 4);
          const isTextLed = watchesWithImages.length < 2;

          return (
            <article
              key={brand.slug}
              className={`grid gap-6 border-t border-[var(--border)] pt-6 ${
                isTextLed ? "lg:grid-cols-[0.72fr_1.28fr]" : "lg:grid-cols-[0.55fr_1.45fr]"
              }`}
            >
              <div className="grid content-start gap-4">
                <div>
                  <p className="type-meta">{String(index + 1).padStart(2, "0")}</p>
                  <Link href={`/watches/${brand.slug}`} className="type-section mt-2 block text-3xl hover:text-[var(--accent-strong)] md:text-4xl">
                    {brand.name}
                  </Link>
                </div>
                <p className="type-meta">{formatCatalogCount(brand.watchCount)} моделей</p>
                {brand.collectionNames.length > 0 ? <p className="type-meta max-w-sm">{brand.collectionNames.slice(0, 3).join(" · ")}</p> : null}
                <Link href={`/watches/${brand.slug}`} className="text-sm font-semibold text-[var(--accent-strong)]">
                  Смотреть модели
                </Link>
              </div>

              {watchesWithImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {watchesWithImages.map((watch) => (
                    <Link key={watch.id} href={watch.href} className="group grid gap-2">
                      <span className="product-stage product-stage-contact aspect-square p-3">
                        <CatalogImage image={watch.primaryImage} presentation="card" />
                      </span>
                      <span className="type-reference group-hover:text-[var(--accent-strong)]">Код {watch.referenceDisplay}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="grid content-start gap-4 border-t border-[var(--border)] pt-5">
                  <p className="type-body max-w-2xl text-[var(--text-muted)]">
                    Для этого бренда сейчас важнее текстовая навигация: коллекции, артикулы, цены и характеристики уже доступны в каталоге.
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </Container>
  );
}
