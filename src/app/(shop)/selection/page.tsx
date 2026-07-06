import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Подбор часов",
  description: "Будущий подбор часов Eternal Time по сценарию, стилю и характеристикам без фальшивых результатов.",
  alternates: {
    canonical: "/selection",
  },
};

export default function SelectionPage() {
  return (
    <Container className="grid gap-10 py-10 lg:py-14">
      <header className="max-w-3xl border-b border-[var(--border)] pb-7">
        <p className="type-meta">Подбор часов</p>
        <h1 className="type-display mt-3 text-5xl text-balance md:text-6xl">Выбор по роли, а не по случайному фильтру</h1>
        <p className="type-body mt-5 text-lg text-[var(--text-muted)]">
          Подбор Eternal Time будет учитывать сценарий, стиль, размер, характеристики и будущий профиль коллекции. На этой
          фазе мы не показываем искусственные quiz results и не запускаем recommendation engine.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          ["Сценарий", "Повседневные часы, рубашка, путешествия, спорт или первая механика."],
          ["Характеристики", "Размер, механизм, водозащита, стекло и материалы как объяснимые критерии."],
          ["Результат", "Будущая выдача будет ссылаться только на реальные публичные watch references."],
        ].map(([title, text]) => (
          <article key={title} className="border-t border-[var(--border)] pt-5">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="type-body mt-3 text-[var(--text-muted)]">{text}</p>
          </article>
        ))}
      </section>

      <Link href="/watches" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        Пока можно исследовать текущий каталог часов
      </Link>
    </Container>
  );
}
