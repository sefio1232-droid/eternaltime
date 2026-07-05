import Link from "next/link";
import type { NavigationItem } from "@/config/navigation";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";

export function ProtectedShell({
  title,
  description,
  navigation,
  children,
}: Readonly<{
  title: string;
  description: string;
  navigation: NavigationItem[];
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Container className="grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <Link href="/" className="text-sm font-semibold tracking-[0.08em]">
            Eternal Time
          </Link>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
          <nav aria-label={title} className="mt-6 grid gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </Container>
    </div>
  );
}

export function AccessRequiredState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Container className="py-12">
        <EmptyState title={title} description={description} />
      </Container>
    </div>
  );
}
