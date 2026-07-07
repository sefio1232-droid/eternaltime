import type { Metadata } from "next";
import { AccessRequiredState, ProtectedShell } from "@/components/shell/protected-shell";
import { adminNavigation } from "@/config/navigation";
import { requireAdminAccess } from "@/modules/auth/authorization";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await requireAdminAccess();

  if (!access.allowed) {
    return (
      <AccessRequiredState
        title="Административная зона закрыта"
        description="Этот раздел доступен только пользователям с правами управления Eternal Time."
      />
    );
  }

  return (
    <ProtectedShell
      title="Администрирование"
      description="Зона управления Eternal Time для каталога, контента, заказов и служебных процессов."
      navigation={adminNavigation}
    >
      {children}
    </ProtectedShell>
  );
}
