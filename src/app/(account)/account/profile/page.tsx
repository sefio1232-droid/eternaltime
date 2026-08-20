import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountProfileEditor } from "@/components/account/account-foundation";
import { getCurrentUser } from "@/modules/auth/server";
import { loadAccountProfile } from "@/modules/account/profile/profile-repository.server";

export const metadata: Metadata = { title: "Профиль" };

type AccountProfilePageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function AccountProfilePage({ searchParams }: AccountProfilePageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser.status === "configured" && !currentUser.user) {
    redirect("/login?returnTo=/account/profile");
  }

  if (!currentUser.user) {
    return <AccountProfileEditor />;
  }

  const params = await searchParams;
  const profile = await loadAccountProfile(currentUser.user);
  const status = params.profile === "updated" ? "updated" : params.profile === "error" ? "error" : null;

  return <AccountProfileEditor initialProfile={profile.profile} mode="database" status={status} />;
}
