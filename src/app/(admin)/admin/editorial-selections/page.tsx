import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminEditorialSelectionsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Editorial Selections"
      description="Foundation route для редакционных и коммерческих подборок."
      stateTitle="Подборки не подключены"
      stateDescription="SEO-safe Editorial Selections будут управляться через content/catalog workflow."
    />
  );
}
