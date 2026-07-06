import { Container } from "@/components/ui/container";

export function CatalogSourceState({
  title,
  message,
}: Readonly<{
  title: string;
  message: string;
}>) {
  return (
    <Container className="py-16">
      <section className="max-w-2xl border-t border-[var(--border)] pt-8">
        <p className="type-meta">Каталог часов</p>
        <h1 className="type-section mt-3 text-3xl">{title}</h1>
        <p className="type-body mt-4 text-[var(--text-muted)]">{message}</p>
      </section>
    </Container>
  );
}
