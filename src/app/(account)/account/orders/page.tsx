import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountOrdersPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="Мои заказы"
      description="Foundation route для будущих заказов и immutable order snapshots."
      stateTitle="Заказы ещё не реализованы"
      stateDescription="Order domain, payment status и delivery status относятся к коммерческим фазам."
    />
  );
}
