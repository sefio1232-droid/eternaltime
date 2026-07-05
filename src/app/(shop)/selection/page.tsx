import { FoundationPage } from "@/components/foundation/foundation-page";

export default function SelectionPage() {
  return (
    <FoundationPage
      eyebrow="Подбор часов"
      title="Структурированный подбор без обязательного AI"
      description="Foundation route для будущих selection sessions и объяснимого подбора часов."
      stateTitle="Подбор ещё не считает рекомендации"
      stateDescription="Scoring, Collection Intelligence и Recommendation Engine намеренно не реализуются в Phase 1."
    />
  );
}
