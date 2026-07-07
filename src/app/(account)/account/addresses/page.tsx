import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountAddressesPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="Адреса"
      description="Адресная книга будет использоваться для будущих заказов и доставки."
      stateTitle="Адреса пока не подключены"
      stateDescription="Добавление адресов появится вместе с оформлением заказа."
    />
  );
}
