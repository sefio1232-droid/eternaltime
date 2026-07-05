import { PublicShell } from "@/components/shell/public-shell";

export default function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PublicShell>{children}</PublicShell>;
}
