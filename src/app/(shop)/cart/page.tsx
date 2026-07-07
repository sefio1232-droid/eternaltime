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
      title="Покупка часов появится позже"
      description="Сейчас Eternal Time сфокусирован на выборе, каталоге и редакционном контексте."
      stateTitle="Корзина пока недоступна"
      stateDescription="Можно изучить каталог, журнал и будущие сценарии подбора."
    />
  );
}
