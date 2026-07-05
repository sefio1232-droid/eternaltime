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
        title="Admin area закрыта"
        description="Phase 1 не создаёт fake-admin fallback. Доступ к admin routes запрещён, пока Phase 2 не подключит server-side role model."
      />
    );
  }

  return (
    <ProtectedShell
      title="Администрирование"
      description="Утилитарная зона управления Eternal Time для будущих catalog, orders, content, SEO и imports workflows."
      navigation={adminNavigation}
    >
      {children}
    </ProtectedShell>
  );
}
