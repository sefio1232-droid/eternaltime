import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminBrandCollectionsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Brand Collections"
      description="Управление брендовыми продуктовыми семействами будет жить в этом разделе."
      stateTitle="Brand Collections пока не редактируются"
      stateDescription="Раздел откроется после подключения управляемых catalog workflows."
    />
  );
}
