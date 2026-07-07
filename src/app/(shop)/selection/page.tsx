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
  const steps = [
    ["Сценарий", "Офис, поездки, спорт, каждый день или первая механика: контекст задает рамку выбора."],
    ["Параметры", "Размер, механизм, стекло, водозащита и материалы становятся объяснимыми критериями."],
    ["Короткий список", "Пользователь получает несколько реальных моделей с понятной логикой выбора."],
  ];

  return (
    <Container className="grid gap-12 py-10 lg:py-16">
      <header className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <p className="type-label">Подбор</p>
          <h1 className="type-page mt-3 text-3xl text-balance md:text-5xl">Выбор часов начинается с роли</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)]">
          Подбор будет вести через понятные вопросы: где вы носите часы, какой размер комфортен, какие материалы уместны и какую роль модель займет рядом с тем, что уже есть.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[0.48fr_1fr]">
        <p className="type-editorial max-w-sm text-3xl text-[var(--text-muted)]">
          Не “лучшие часы вообще”, а модель под конкретную жизнь.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(([title, text], index) => (
            <article key={title} className="border-t border-[var(--border)] pt-5">
              <p className="type-reference">0{index + 1}</p>
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="type-body mt-3 text-[var(--text-muted)]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-y border-[var(--border-strong)] py-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="type-label">Пока подбор готовится</p>
          <h2 className="type-section mt-2 text-3xl">Исследуйте каталог вручную</h2>
        </div>
        <Link
          href="/watches"
          className="inline-flex h-[var(--control-height)] items-center justify-center bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--text-inverse)]"
        >
          Перейти к часам
        </Link>
      </section>
    </Container>
  );
}
