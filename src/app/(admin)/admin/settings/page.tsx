import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminSettingsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Настройки"
      description="Foundation route для будущей централизованной legal/business configuration."
      stateTitle="Настройки не заполнены"
      stateDescription="Юридические и коммерческие данные нельзя выдумывать или hardcode-ить."
    />
  );
}
