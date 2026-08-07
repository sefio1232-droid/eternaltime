import type { Metadata } from "next";
import { AccountProfileEditor } from "@/components/account/account-foundation";

export const metadata: Metadata = { title: "Профиль" };

export default function AccountProfilePage() {
  return <AccountProfileEditor />;
}
