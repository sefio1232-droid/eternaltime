import type { Metadata } from "next";
import { FoundationPage } from "@/components/foundation/foundation-page";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return (
    <FoundationPage
      eyebrow="Корзина"
      title="Коммерческий flow появится позже"
      description="Foundation route для будущей корзины, guest cart и merge после авторизации."
      stateTitle="Корзина ещё не подключена"
      stateDescription="Checkout, payment и delivery integrations не входят в Phase 1."
    />
  );
}
