import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/account-foundation";
import { getCurrentUser } from "@/modules/auth/server";
import { loadAccountProfile } from "@/modules/account/profile/profile-repository.server";
import { loadLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection-catalog.server";

export const metadata: Metadata = { title: "Личный кабинет" };

export default async function AccountPage() {
  const catalogCandidates = await loadLocalCollectionCatalogCandidates();
  const currentUser = await getCurrentUser();
  const profile = currentUser.user ? await loadAccountProfile(currentUser.user) : null;
  const profileReady = profile ? Object.values(profile.profile).some((value) => value !== "") : undefined;

  return <AccountOverview catalogCandidates={catalogCandidates} profileReady={profileReady} />;
}
