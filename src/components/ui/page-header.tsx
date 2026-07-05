import { Container } from "@/components/ui/container";

export function PageHeader({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
}>) {
  return (
    <Container className="py-12 sm:py-16">
      {eyebrow ? (
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-balance sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
          {description}
        </p>
      ) : null}
    </Container>
  );
}
