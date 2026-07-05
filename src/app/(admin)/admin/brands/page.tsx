import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminBrandsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Бренды"
      description="Foundation route для будущего управления Brands."
      stateTitle="Данные брендов отсутствуют"
      stateDescription="Admin writes будут доступны только после role model и catalog migrations."
    />
  );
}
