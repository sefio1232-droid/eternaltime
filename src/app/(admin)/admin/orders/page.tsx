import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminOrdersPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Заказы"
      description="Foundation route для будущих order operations."
      stateTitle="Заказы не реализованы"
      stateDescription="Payment/delivery events и order status history будут добавлены позже."
    />
  );
}
