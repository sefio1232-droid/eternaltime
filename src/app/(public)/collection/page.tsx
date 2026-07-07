import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Моя коллекция",
  description: "Будущая личная коллекция Eternal Time: роли моделей, осознанное развитие набора и связь с каталогом.",
  alternates: {
    canonical: "/collection",
  },
};

export default function CollectionPage() {
  const ideas = [
    ["Собрать", "Сохранить свои часы, источник владения, комплектность и личный контекст."],
    ["Понять", "Увидеть, какие сценарии, размеры, механизмы и стили уже закрыты."],
    ["Развить", "Выбирать следующие часы так, чтобы коллекция становилась осмысленнее."],
  ];

  return (
    <Container className="grid gap-12 py-10 lg:py-16">
      <header className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <p className="type-label">Моя коллекция</p>
          <h1 className="type-page mt-3 text-3xl text-balance md:text-5xl">Личные часы как система, а не список покупок</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)]">
          Коллекция задумана как пространство, где владелец видит роли своих часов, понимает повторы и выбирает следующий шаг без случайного накопления.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[0.46fr_1fr]">
        <p className="type-editorial max-w-sm text-3xl text-[var(--text-muted)]">
          Каталог показывает модели. Коллекция будет показывать отношения между ними.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {ideas.map(([title, text], index) => (
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
          <p className="type-label">Первый слой уже здесь</p>
          <h2 className="type-section mt-2 text-3xl">Каталог помогает понять язык моделей</h2>
        </div>
        <Link
          href="/journal"
          className="inline-flex h-[var(--control-height)] items-center justify-center bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--text-inverse)]"
        >
          Читать журнал
        </Link>
      </section>
    </Container>
  );
}
