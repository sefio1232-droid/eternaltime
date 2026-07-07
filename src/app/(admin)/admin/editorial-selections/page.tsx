import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminEditorialSelectionsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Editorial Selections"
      description="Будущий раздел управления редакционными подборками."
      stateTitle="Подборки пока не редактируются"
      stateDescription="Публичные подборки сейчас формируются безопасным read-only слоем."
    />
  );
}
