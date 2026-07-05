export function EmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-[var(--text-muted)]">{description}</p>
    </section>
  );
}
