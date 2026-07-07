import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminOrdersPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Заказы"
      description="Будущий раздел операционной работы с заказами."
      stateTitle="Заказы пока не подключены"
      stateDescription="Покупка часов будет запускаться отдельным коммерческим этапом."
    />
  );
}
