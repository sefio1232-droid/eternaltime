import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminSettingsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Настройки"
      description="Будущий раздел централизованных настроек Eternal Time."
      stateTitle="Настройки пока не заполнены"
      stateDescription="Юридические и коммерческие данные появятся только из проверенного источника."
    />
  );
}
