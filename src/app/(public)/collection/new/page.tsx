import type { Metadata } from "next";
import { LocalCollectionCoreExperience } from "@/components/collection/local-collection-core-experience";
import { QuickAddForm } from "@/components/collection/quick-add-form";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/modules/auth/server";
import { loadLocalCollectionCatalogCandidates } from "@/modules/user-watch-collection/application/local-collection-catalog.server";
import { parseLocalCollectionDemoScenario } from "@/modules/user-watch-collection/application/local-collection";

export const metadata: Metadata = {
  title: "Добавить часы",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type QuickAddPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function QuickAddPage({ searchParams }: QuickAddPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const demoScenario = parseLocalCollectionDemoScenario(params.demo);

  if (demoScenario || currentUser.status === "unconfigured" || !currentUser.user) {
    const catalogCandidates = await loadLocalCollectionCatalogCandidates();
    const initialCatalogReference =
      typeof params.catalogReferenceId === "string"
        ? params.catalogReferenceId
        : typeof params.reference === "string"
          ? params.reference
          : null;
    return (
      <Container className="public-page">
        <LocalCollectionCoreExperience
          initialMode={demoScenario ? "demo" : "empty"}
          initialDemoScenario={demoScenario}
          initialPanel="add"
          initialCatalogReference={initialCatalogReference}
          initialAddMode={params.mode === "manual" ? "manual" : "catalog"}
          catalogCandidates={catalogCandidates}
        />
      </Container>
    );
  }

  return (
    <Container className="max-w-4xl public-page">
      <div className="grid gap-8 border-t border-[var(--border-strong)] pt-7 md:grid-cols-[0.62fr_1.38fr]">
        <div>
          <p className="type-label">Новая запись</p>
          <h1 className="type-page mt-3 text-3xl text-balance md:text-4xl">Добавить часы вручную</h1>
          <p className="type-body mt-4 text-[var(--text-muted)]">
            Достаточно личного названия. Бренд, модель, артикул, фотография и заметка необязательны.
          </p>
        </div>
        <QuickAddForm hasError={params.error === "validation"} />
      </div>
    </Container>
  );
}
