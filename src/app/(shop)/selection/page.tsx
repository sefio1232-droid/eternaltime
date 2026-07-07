import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Подбор часов",
  description: "Подбор часов Eternal Time по сценарию, стилю, размеру и роли в будущей коллекции.",
  alternates: {
    canonical: "/selection",
  },
};

export default function SelectionPage() {
  return (
    <Container className="grid gap-12 py-10 lg:py-16">
      <header className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="type-label">Подбор</p>
          <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">Выбор часов начинается с роли</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)]">
          Eternal Time будет вести подбор через понятные вопросы: где вы носите часы, какой размер комфортен, какие материалы
          уместны и какую роль модель займет рядом с тем, что уже есть.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          ["Сценарий", "Офис, поездки, спорт, каждый день или первая механика: контекст задает рамку выбора."],
          ["Параметры", "Размер, механизм, стекло, водозащита и материалы становятся объяснимыми критериями, а не сухой таблицей."],
          ["Результат", "Пользователь получает короткий список реальных моделей с понятной логикой выбора."],
        ].map(([title, text]) => (
          <article key={title} className="bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="type-body mt-3 text-[var(--text-muted)]">{text}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 bg-[var(--surface-graphite)] p-6 text-[var(--text-inverse)] md:grid-cols-[1fr_auto] md:items-center lg:p-8">
        <div>
          <p className="type-label text-[var(--steel)]">Пока подбор готовится</p>
          <h2 className="type-section mt-2 text-3xl">Исследуйте каталог вручную</h2>
        </div>
        <Link
          href="/watches"
          className="inline-flex h-[var(--control-height)] items-center justify-center bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--text)]"
        >
          Перейти к часам
        </Link>
      </section>
    </Container>
  );
}
