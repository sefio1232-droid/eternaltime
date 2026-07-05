import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";

export default function HomePage() {
  return (
    <>
      <Container className="grid gap-10 py-14 md:grid-cols-[1fr_220px] md:items-center md:py-20">
        <section>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Eternal Time
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-balance">
            Фундамент сервиса выбора, покупки и владения часами
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
            Phase 1 создаёт техническую основу продукта: маршруты, оболочки, безопасность, SEO,
            Supabase boundaries и проверяемую инфраструктуру разработки.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/watches">Перейти к часам</ButtonLink>
            <ButtonLink href="/account/collection" variant="secondary">
              Моя коллекция
            </ButtonLink>
          </div>
        </section>
        <div className="mx-auto w-44 md:w-full" aria-hidden="true">
          <div className="watch-dial-mark" />
        </div>
      </Container>
      <Container className="grid gap-4 pb-16 md:grid-cols-3">
        <EmptyState
          title="Каталог"
          description="Здесь будет публичный путь к Manufacturer References без фиктивных часов и цен на foundation этапе."
        />
        <EmptyState
          title="Подбор"
          description="Структурированный подбор будет развиваться позже как deterministic flow без обязательного AI."
        />
        <EmptyState
          title="Владение"
          description="User Watch Collection останется отдельной ownership-моделью, независимой от размера каталога."
        />
      </Container>
    </>
  );
}
