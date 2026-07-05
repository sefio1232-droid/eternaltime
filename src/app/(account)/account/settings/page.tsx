import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountSettingsPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="Настройки"
      description="Foundation route для будущих уведомлений и настроек приватности."
      stateTitle="Настройки пока недоступны"
      stateDescription="Phase 1 создаёт boundaries, но не хранит пользовательские preference records."
    />
  );
}
