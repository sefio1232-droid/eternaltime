import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountCollectionAnalysisPage() {
  return (
    <FoundationPage
      eyebrow="Моя коллекция"
      title="Анализ коллекции"
      description="Foundation route для будущего Collection Profile, gaps и объяснимых recommendation scenarios."
      stateTitle="Анализ ещё не рассчитывается"
      stateDescription="Collection Intelligence rules и scoring не входят в Phase 1."
    />
  );
}
