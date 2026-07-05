import { FoundationPage } from "@/components/foundation/foundation-page";

export default function AdminBrandCollectionsPage() {
  return (
    <FoundationPage
      eyebrow="Admin"
      title="Brand Collections"
      description="Foundation route для брендовых продуктовых семейств, не User Watch Collections."
      stateTitle="Brand Collections не подключены"
      stateDescription="Терминология закреплена в DOMAIN.md; таблицы появятся в catalog phase."
    />
  );
}
