import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="Обзор личного кабинета"
      description="Здесь будет персональный обзор Eternal Time без generic SaaS dashboard и без fake statistics."
      stateTitle="Персональные данные не подключены"
      stateDescription="Profile, orders и saved actions появятся после auth/RLS фаз."
    />
  );
}
