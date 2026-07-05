import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminImportsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Импорты"
      description="Foundation route для будущего staged Excel/CSV import workflow."
      stateTitle="Импорт не реализован"
      stateDescription="Phase 1 не принимает файлы и не создаёт catalog data."
    />
  );
}
