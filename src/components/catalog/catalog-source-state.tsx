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
      <section className="max-w-2xl rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">Каталог часов</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-4 leading-7 text-[var(--text-muted)]">{message}</p>
      </section>
    </Container>
  );
}
