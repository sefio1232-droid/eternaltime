import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminWatchesPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Управление часами"
      description="Будущий раздел для карточек часов, характеристик, изображений и коммерческого состояния."
      stateTitle="Управление каталогом пока закрыто"
      stateDescription="Сейчас доступен только публичный слой чтения каталога."
    />
  );
}
