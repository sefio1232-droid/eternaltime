import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountCollectionPage() {
  return (
    <FoundationPage
      eyebrow="Моя коллекция"
      title="Личная коллекция часов"
      description="Здесь будет ваша часовая коллекция, история владения и личные заметки."
      stateTitle="Коллекция еще не создана"
      stateDescription="Добавление личных часов появится в отдельном защищенном сценарии."
    />
  );
}
