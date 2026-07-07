import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountCollectionAnalysisPage() {
  return (
    <FoundationPage
      eyebrow="Моя коллекция"
      title="Анализ коллекции"
      description="Будущий анализ покажет роли, повторы и недостающие сценарии в личном наборе часов."
      stateTitle="Анализ еще не рассчитывается"
      stateDescription="Сначала коллекция должна получить реальные пользовательские данные."
    />
  );
}
