import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Администрирование Eternal Time"
      description="Защищенная зона для будущего управления каталогом, контентом, заказами и настройками."
      stateTitle="Раздел управления закрыт"
      stateDescription="Доступ определяется серверной авторизацией."
    />
  );
}
