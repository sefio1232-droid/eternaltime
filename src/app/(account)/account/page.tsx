import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/account-foundation";
import { loadLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection-catalog.server";

export const metadata: Metadata = { title: "Личный кабинет" };

export default async function AccountPage() {
  const catalogCandidates = await loadLocalCollectionCatalogCandidates();
  return <AccountOverview catalogCandidates={catalogCandidates} />;
}
