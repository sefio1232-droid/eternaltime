import type { Metadata } from "next";
import { accountNavigation } from "@/config/navigation";
import { AccessRequiredState, ProtectedShell } from "@/components/shell/protected-shell";
import { requireAuthenticatedUser } from "@/modules/auth/authorization";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await requireAuthenticatedUser();

  if (!access.allowed) {
    return (
      <AccessRequiredState
        title="Личный кабинет защищён"
        description="Account routes используют server-side auth boundary. В Phase 1 Supabase может быть не настроен, поэтому приватные разделы не раскрывают пользовательские данные."
      />
    );
  }

  return (
    <ProtectedShell
      title="Личный кабинет"
      description="Персональная зона Eternal Time для заказов, избранного, сравнений и User Watch Collection."
      navigation={accountNavigation}
    >
      {children}
    </ProtectedShell>
  );
}
