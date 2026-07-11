import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QuickAddForm } from "@/components/collection/quick-add-form";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";

export const metadata: Metadata = {
  title: "Добавить часы вручную",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type QuickAddPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function QuickAddPage({ searchParams }: QuickAddPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser.user) {
    redirect("/login?returnTo=%2Fcollection%2Fnew");
  }

  const params = await searchParams;

  return (
    <Container className="max-w-4xl py-10 lg:py-14">
      <div className="grid gap-8 border-t border-[var(--border-strong)] pt-7 md:grid-cols-[0.62fr_1.38fr]">
        <div>
          <p className="type-label">Quick Add</p>
          <h1 className="type-page mt-3 text-4xl text-balance">Добавить часы вручную</h1>
          <p className="type-body mt-4 text-[var(--text-muted)]">
            Достаточно личного названия. Бренд, модель, артикул, фотография и заметка необязательны.
          </p>
        </div>
        <QuickAddForm hasError={params.error === "validation"} />
      </div>
    </Container>
  );
}
