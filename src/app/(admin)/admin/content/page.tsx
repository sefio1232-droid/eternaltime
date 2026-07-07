import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminContentPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Контент"
      description="Редакционные статьи, гиды и материалы будут управляться отсюда."
      stateTitle="Система контента пока недоступна"
      stateDescription="Публичный журнал сейчас читает только опубликованные материалы."
    />
  );
}
