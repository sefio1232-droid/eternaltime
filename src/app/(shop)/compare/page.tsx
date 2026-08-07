import type { Metadata } from "next";
import { CompareWorkspace } from "@/components/comparison/compare-workspace";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { EditorialWideContainer } from "@/components/ui/editorial-primitives";
import { buildComparisonPresentation } from "@/modules/comparison/application/comparison-presentation";
import { parseComparisonReferences } from "@/modules/comparison/domain/local-comparison";
import { CatalogReadSourceError, getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";

export const metadata: Metadata = {
  title: "Сравнение часов",
  description: "Сопоставление точных моделей часов по подтверждённым характеристикам каталога Eternal Time.",
  alternates: { canonical: "/compare" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const references = parseComparisonReferences(query.refs);

  const resultState = await getCatalogReadDataset()
    .then((dataset) => ({ type: "ok" as const, dataset }))
    .catch((error: unknown) => {
    if (error instanceof CatalogReadSourceError) {
      return { type: "source_error" as const };
    }
    throw error;
  });

  if (resultState.type === "source_error") {
    return <CatalogSourceState title="Сравнение пока недоступно" message="Публичный каталог недоступен, поэтому подтвердить характеристики выбранных моделей сейчас нельзя." />;
  }

  const watches = references
    .map((reference) => resultState.dataset.watches.find((watch) => watch.brandSlug === reference.brandSlug && watch.referenceSlug === reference.referenceSlug))
    .filter((watch) => watch !== undefined);
  const presentation = buildComparisonPresentation(watches);
  return (
    <div className="compare-page">
      <EditorialWideContainer className="public-page">
        <CompareWorkspace
          presentation={presentation}
          requestedCount={references.length}
          unavailableCount={references.length - watches.length}
        />
      </EditorialWideContainer>
    </div>
  );
}
