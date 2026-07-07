"use client";

import { Button } from "@/components/ui/button";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-16">
      <div className="mx-auto max-w-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-soft)]">
        <p className="type-meta">Eternal Time</p>
        <h1 className="mt-4 text-3xl font-semibold text-balance">Не удалось открыть раздел</h1>
        <p className="mt-4 text-[var(--text-muted)]">
          Мы показали безопасное сообщение об ошибке. Попробуйте обновить раздел.
        </p>
        <div className="mt-6">
          <Button type="button" onClick={reset}>
            Повторить
          </Button>
        </div>
      </div>
    </main>
  );
}
