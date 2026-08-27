import type { Metadata } from "next";
import { CatalogSourceState } from "@/components/catalog/catalog-source-state";
import { SelectionPageView } from "@/components/selection/selection-page";
import {
  answeredSelectionKeys,
  hasSelectionAnswers,
  parseSelectionAnswers,
  parseSelectionStep,
  type SelectionSearchParams,
} from "@/modules/selection/application/selection-query";
import {
  buildSelectionRecommendations,
  resolveSelectionStep,
} from "@/modules/selection/application/selection-service";
import {
  CatalogReadSourceError,
  getCatalogReadDataset,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";

export const metadata: Metadata = {
  title: "Подбор часов под ваш ритм",
  description:
    "Семь коротких вопросов помогут выбрать несколько моделей Eternal Time по назначению, бюджету, размеру и характеристикам.",
  alternates: {
    canonical: "/selection",
  },
};

export const dynamic = "force-dynamic";

export default async function SelectionPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<SelectionSearchParams>;
}>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const answers = parseSelectionAnswers(resolvedSearchParams);
  const answeredKeys = answeredSelectionKeys(resolvedSearchParams);
  const hasAnswers = hasSelectionAnswers(resolvedSearchParams);
  const requestedStep = parseSelectionStep(resolvedSearchParams);
  const currentStep = resolveSelectionStep({
    requestedStep,
    hasAnswers,
    searchParams: resolvedSearchParams,
  });
  const datasetState = await getCatalogReadDataset()
    .then((dataset) => ({ type: "ok" as const, dataset }))
    .catch((error: unknown) => {
      if (error instanceof CatalogReadSourceError) {
        return { type: "source_error" as const };
      }

      throw error;
    });

  if (datasetState.type === "source_error") {
    return (
      <CatalogSourceState
        title="Подбор пока недоступен"
        message="Для подбора нужны данные каталога. Попробуйте открыть страницу немного позже."
      />
    );
  }

  return (
    <SelectionPageView
      answers={answers}
      answeredKeys={answeredKeys}
      currentStep={currentStep}
      recommendations={
        currentStep === "results" ? buildSelectionRecommendations({ dataset: datasetState.dataset, answers }) : []
      }
    />
  );
}
