import type { Metadata } from "next";
import { AccountOrders } from "@/components/account/account-foundation";

export const metadata: Metadata = { title: "Мои заказы" };

export default function AccountOrdersPage() {
  return <AccountOrders />;
}
