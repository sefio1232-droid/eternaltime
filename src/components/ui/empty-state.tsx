export function EmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <section className="border-t border-[var(--border)] pt-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="type-body mt-3 text-[var(--text-muted)]">{description}</p>
    </section>
  );
}
