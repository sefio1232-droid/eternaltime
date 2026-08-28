import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectionExplanation } from "@/components/selection/selection-explanation";
import { SelectionIntro } from "@/components/selection/selection-intro";
import { SelectionOptionGroup } from "@/components/selection/selection-option-group";
import { SelectionWatchImage } from "@/components/selection/selection-watch-image";
import { SelectionStepFocus } from "@/components/selection/selection-step-focus";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import {
  nextSelectionStep,
  previousSelectionStep,
  selectionAnswerLabel,
  selectionFormDefinition,
  selectionStepByCode,
} from "@/modules/selection/application/selection-service";
import { normalizeSelectionFeatures, selectionAnswersToSearchParams } from "@/modules/selection/application/selection-query";
import type {
  SelectionAnswerKey,
  SelectionAnswers,
  SelectionCriterionStatus,
  SelectionRecommendation,
  SelectionStepCode,
} from "@/modules/selection/domain/types";
import styles from "./selection-page.module.css";

const totalSteps = selectionFormDefinition.steps.length;

const statusLabels: Record<SelectionCriterionStatus, string> = {
  match: "Хорошо подходит",
  unknown: "Нужно уточнить",
  conflict: "Есть компромисс",
  neutral: "Оставили открытым",
};

const summaryLabels: Record<SelectionAnswerKey, string> = {
  scenario: "Сценарий",
  fit: "Посадка",
  character: "Характер",
  movement: "Механизм",
  features: "Важно",
  budget: "Бюджет",
};

function selectionHref(
  answers: SelectionAnswers,
  answeredKeys: readonly SelectionAnswerKey[],
  step: SelectionStepCode,
  answer?: { key: SelectionAnswerKey; value: string | string[] },
) {
  const includedKeys = answer
    ? [...new Set<SelectionAnswerKey>([...answeredKeys, answer.key])]
    : answeredKeys;
  const params = selectionAnswersToSearchParams(answers, includedKeys);
  if (answer) {
    if (answer.key === "features") {
      params.set("features", normalizeSelectionFeatures(Array.isArray(answer.value) ? answer.value : [answer.value]).join(","));
    } else {
      params.set(answer.key, String(answer.value));
    }
  }
  params.set("step", step);
  return `/selection?${params.toString()}`;
}

function multiSelectionHrefBase(
  answers: SelectionAnswers,
  answeredKeys: readonly SelectionAnswerKey[],
  nextStep: SelectionStepCode,
) {
  const includedKeys = answeredKeys.filter((key) => key !== "features");
  const params = selectionAnswersToSearchParams(answers, includedKeys);
  params.set("step", nextStep);
  return `/selection?${params.toString()}`;
}

function SelectionProgress({
  answers,
  answeredKeys,
  currentStep,
}: Readonly<{
  answers: SelectionAnswers;
  answeredKeys: readonly SelectionAnswerKey[];
  currentStep: SelectionStepCode;
}>) {
  const activeIndex =
    currentStep === "results"
      ? totalSteps
      : Math.max(0, selectionFormDefinition.steps.findIndex((step) => step.code === currentStep));
  const answerCount = answeredKeys.length;
  const answerLabel = answerCount === 1 ? "ответ" : answerCount >= 2 && answerCount <= 4 ? "ответа" : "ответов";

  return (
    <div className={styles.progressBlock}>
      <span className={styles.progressStep}>
        {currentStep === "results" ? "Подбор завершён" : `Шаг ${activeIndex + 1} из ${totalSteps}`}
      </span>
      <ol className={styles.progress} aria-label="Шаги подбора">
        {selectionFormDefinition.steps.map((step, index) => {
          const state = index < activeIndex || currentStep === "results" ? "complete" : index === activeIndex ? "current" : "next";
          const content = <span aria-hidden="true" />;
          return (
            <li
              key={step.code}
              data-step-state={state}
              aria-current={state === "current" ? "step" : undefined}
              aria-label={`Шаг ${index + 1}: ${summaryLabels[step.answerKey]}${state === "current" ? ", текущий" : ""}`}
            >
              {state === "complete" ? (
                <Link
                  href={selectionHref(answers, answeredKeys, step.code)}
                  aria-label={`Вернуться к шагу ${index + 1}: ${summaryLabels[step.answerKey]}`}
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
      <span className={styles.progressAnswers}>{answerCount} {answerLabel}</span>
    </div>
  );
}

function AnswerSummaryList({
  answers,
  answeredKeys,
  currentStep,
}: Readonly<{
  answers: SelectionAnswers;
  answeredKeys: readonly SelectionAnswerKey[];
  currentStep: SelectionStepCode;
}>) {
  const answered = selectionFormDefinition.steps.filter((step) => answeredKeys.includes(step.answerKey));

  if (answered.length === 0) {
    return <p className={styles.summaryEmpty}>Здесь появятся выбранные ответы.</p>;
  }

  return (
    <dl className={styles.answerSummary} aria-label="Выбранные ответы">
      {answered.map((step) => (
        <div key={step.code} data-current={step.code === currentStep ? "true" : undefined}>
          <dt>{summaryLabels[step.answerKey]}</dt>
          <dd>
            <Link href={selectionHref(answers, answeredKeys, step.code)}>
              {selectionAnswerLabel(step.answerKey, answers[step.answerKey])}
            </Link>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SelectionSummary(props: Readonly<{
  answers: SelectionAnswers;
  answeredKeys: readonly SelectionAnswerKey[];
  currentStep: SelectionStepCode;
}>) {
  return (
    <>
      <aside className={styles.summaryDesktop} aria-label="Ваши ответы">
        <p className={styles.summaryTitle}>Ваши ответы</p>
        <AnswerSummaryList {...props} />
        <Link href="/watches" className={styles.catalogLink}>Открыть весь каталог</Link>
      </aside>
      <details className={styles.summaryMobile}>
        <summary>Ваши ответы <span>{props.answeredKeys.length} из {totalSteps}</span></summary>
        <div className={styles.summaryMobilePanel}>
          <AnswerSummaryList {...props} />
          <Link href="/watches" className={styles.catalogLink}>Открыть весь каталог</Link>
        </div>
      </details>
    </>
  );
}

function SelectionQuestion({
  answers,
  answeredKeys,
  stepCode,
  shouldFocus,
}: Readonly<{
  answers: SelectionAnswers;
  answeredKeys: readonly SelectionAnswerKey[];
  stepCode: Exclude<SelectionStepCode, "start" | "results">;
  shouldFocus: boolean;
}>) {
  const step = selectionStepByCode(stepCode);
  if (!step) return null;

  const nextStep = nextSelectionStep(step.code);
  const previousStep = previousSelectionStep(step.code);
  const selectedValue = answeredKeys.includes(step.answerKey) && step.answerKey !== "features"
    ? String(answers[step.answerKey])
    : null;
  const selectedValues = step.answerKey === "features" && answeredKeys.includes("features") ? answers.features : [];
  const optionLinks = step.options.map((option) => ({
    ...option,
    href: selectionHref(answers, answeredKeys, nextStep, { key: step.answerKey, value: option.code }),
  }));

  return (
    <section className={styles.question} aria-labelledby="selection-question-title" key={step.code}>
      <SelectionStepFocus targetId="selection-question-title" active={shouldFocus} />
      <div className={styles.questionCopy}>
        <p className={styles.eyebrow}>{step.eyebrow}</p>
        <h2 id="selection-question-title" tabIndex={-1}>{step.title}</h2>
        <p>{step.deck}</p>
      </div>
      <SelectionOptionGroup
        key={step.code}
        legend={step.title}
        options={optionLinks}
        selectedValue={selectedValue}
        selectedValues={selectedValues}
        multiple={step.multiple}
        multiHrefBase={step.answerKey === "features" ? multiSelectionHrefBase(answers, answeredKeys, nextStep) : undefined}
        continueLabel={nextStep === "results" ? "Показать варианты" : "Продолжить"}
      />
      {step.code !== "scenario" ? (
        <nav className={styles.questionActions} aria-label="Навигация по вопросам">
          <Link href={previousStep === "start" ? "/selection" : selectionHref(answers, answeredKeys, previousStep)}>
            Назад
          </Link>
        </nav>
      ) : null}
    </section>
  );
}

function CriteriaList({ recommendation }: Readonly<{ recommendation: SelectionRecommendation }>) {
  return (
    <dl className={styles.criteria} aria-label="Почему модель попала в подбор">
      {recommendation.criteria
        .filter((criterion) => criterion.key !== "data")
        .map((criterion) => (
          <div key={criterion.key} data-status={criterion.status}>
            <dt>{criterion.label}</dt>
            <dd>
              <strong>{statusLabels[criterion.status]}</strong>
              <span>{criterion.reason}</span>
            </dd>
          </div>
        ))}
    </dl>
  );
}

function SelectionDataNotice({ recommendation }: Readonly<{ recommendation: SelectionRecommendation }>) {
  if (recommendation.compromises.length === 0) return null;
  return (
    <div className={styles.dataNotice} data-notice={recommendation.confidenceLabel === "Есть компромисс" ? "conflict" : "unknown"}>
      <strong>{recommendation.confidenceLabel}</strong>
      <span>{recommendation.compromises.join(". ")}.</span>
    </div>
  );
}

function SelectionResultCard({
  recommendation,
  variant,
}: Readonly<{
  recommendation: SelectionRecommendation;
  variant: "featured" | "alternative" | "additional";
}>) {
  const watch = recommendation.watch;
  const Heading = variant === "featured" ? "h2" : "h3";

  return (
    <article className={styles.resultCard} data-variant={variant}>
      <Link href={watch.href} className={styles.resultMedia} aria-label={`Открыть ${watch.title}`}>
        <SelectionWatchImage
          images={recommendation.imageCandidates}
          alt={`${watch.brandName} ${watch.title}`}
          priority={variant === "featured"}
        />
      </Link>
      <div className={styles.resultCopy}>
        <div className={styles.resultRole}>
          <span>{recommendation.roleLabel}</span>
          <small>{recommendation.roleDescription}</small>
        </div>
        <p className={styles.matchLabel}>{recommendation.matchLabel}</p>
        <div className={styles.watchIdentity}>
          <p>{watch.brandName}</p>
          <Heading>{watch.title}</Heading>
          <span>Артикул {watch.referenceDisplay}</span>
        </div>
        <p className={styles.price}>{formatCatalogMoney(watch.publicPrice)}</p>
        {recommendation.reasons.length > 0 ? (
          <ul className={styles.reasons}>
            {recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        ) : null}
        <SelectionDataNotice recommendation={recommendation} />
        <div className={styles.resultActions}>
          <Link href={watch.href} className={styles.primaryLink}>Открыть модель</Link>
        </div>
        <SelectionExplanation>
          <CriteriaList recommendation={recommendation} />
        </SelectionExplanation>
      </div>
    </article>
  );
}

function SelectionResults({
  answers,
  answeredKeys,
  recommendations,
}: Readonly<{
  answers: SelectionAnswers;
  answeredKeys: readonly SelectionAnswerKey[];
  recommendations: SelectionRecommendation[];
}>) {
  const [featured, ...alternatives] = recommendations;

  return (
    <section className={styles.results} aria-labelledby="selection-results-title">
      <SelectionStepFocus targetId="selection-results-title" active />
      <div className={styles.resultsHead}>
        <p className={styles.eyebrow}>Результаты подбора</p>
        <h1 id="selection-results-title" tabIndex={-1}>Ваши варианты</h1>
        <p>Модели расставлены по соответствию вашим ответам. Если в каталоге не хватает отдельных данных, это указано отдельно.</p>
      </div>

      {featured ? (
        <div className={styles.resultComposition}>
          <SelectionResultCard recommendation={featured} variant="featured" />
          {alternatives.length > 0 ? (
            <div className={styles.alternatives}>
              {alternatives.slice(0, 2).map((recommendation) => (
                <SelectionResultCard key={recommendation.watch.href} recommendation={recommendation} variant="alternative" />
              ))}
            </div>
          ) : null}
          {alternatives[2] ? (
            <SelectionResultCard key={alternatives[2].watch.href} recommendation={alternatives[2]} variant="additional" />
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Подходящих моделей не найдено"
          description="Попробуйте расширить бюджет, оставить механизм открытым или выбрать более широкий сценарий."
        />
      )}

      <nav className={styles.resultsActions} aria-label="Действия с подбором">
        <Link href={selectionHref(answers, answeredKeys, "scenario")}>Изменить ответы</Link>
        <Link href="/selection">Начать заново</Link>
      </nav>
    </section>
  );
}

export function SelectionPageView({
  answers,
  answeredKeys,
  currentStep,
  recommendations,
}: Readonly<{
  answers: SelectionAnswers;
  answeredKeys: SelectionAnswerKey[];
  currentStep: SelectionStepCode;
  recommendations: SelectionRecommendation[];
}>) {
  const questionStep = currentStep === "start" ? "scenario" : currentStep !== "results" ? currentStep : null;
  const isFirstStep = questionStep === "scenario";
  const showCompactIntro = questionStep !== null && !isFirstStep;
  const flow = (
    <section className={styles.flow} data-initial={isFirstStep ? "true" : undefined} aria-label="Вопросы и результаты подбора">
      {!isFirstStep ? <SelectionSummary answers={answers} answeredKeys={answeredKeys} currentStep={currentStep} /> : null}
      <div className={styles.workspace}>
        {questionStep ? (
          <SelectionQuestion
            answers={answers}
            answeredKeys={answeredKeys}
            stepCode={questionStep}
            shouldFocus={!isFirstStep}
          />
        ) : null}
        {currentStep === "results" ? (
          <SelectionResults answers={answers} answeredKeys={answeredKeys} recommendations={recommendations} />
        ) : null}
      </div>
    </section>
  );

  return (
    <EditorialContainer className={`${styles.page} public-page`}>
      {isFirstStep ? (
        <div className={styles.initialExperience}>
          <SelectionIntro />
          {flow}
        </div>
      ) : null}

      {showCompactIntro ? (
        <header className={styles.compactHeader}>
          <p className={styles.eyebrow}>Подбор часов</p>
          <h1>Шесть шагов до вашей подборки</h1>
        </header>
      ) : null}

      {!isFirstStep && currentStep !== "results" ? (
        <SelectionProgress answers={answers} answeredKeys={answeredKeys} currentStep={currentStep} />
      ) : null}

      {!isFirstStep ? flow : null}
    </EditorialContainer>
  );
}
