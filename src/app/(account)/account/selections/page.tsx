import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountSelectionsPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="История подборов"
      description="Будущие подборы часов можно будет сохранять и продолжать из личного кабинета."
      stateTitle="Подборы еще не сохраняются"
      stateDescription="История появится после запуска персональных сценариев выбора."
    />
  );
}
