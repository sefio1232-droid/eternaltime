import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16">
      <div className="mx-auto max-w-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-soft)]">
        <p className="type-meta">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-balance">Такой страницы нет</h1>
        <p className="mt-4 text-[var(--text-muted)]">
          Возможно, раздел еще не создан или адрес изменился.
        </p>
        <div className="mt-6">
          <ButtonLink href="/">На главную</ButtonLink>
        </div>
      </div>
    </main>
  );
}
