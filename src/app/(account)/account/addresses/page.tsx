import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AccountAddressesPage() {
  return (
    <FoundationPage
      eyebrow="Аккаунт"
      title="Адреса"
      description="Foundation route для будущей адресной книги и checkout snapshots."
      stateTitle="Адреса не подключены"
      stateDescription="User-owned address tables и RLS будут реализованы в соответствующей фазе."
    />
  );
}
