import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountFavoritesPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="Избранное"
      description="Здесь появятся сохраненные часы и быстрый возврат к интересным моделям."
      stateTitle="Избранное пусто"
      stateDescription="Сохранять модели можно будет после подключения личных действий."
    />
  );
}
