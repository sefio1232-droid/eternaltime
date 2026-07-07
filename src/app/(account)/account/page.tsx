import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="Обзор личного кабинета"
      description="Здесь появится персональный обзор Eternal Time: сохраненные часы, сравнения и личные настройки."
      stateTitle="Персональные данные пока недоступны"
      stateDescription="После входа здесь будут собраны ваши действия и сохраненные материалы."
    />
  );
}
