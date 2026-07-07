import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Моя коллекция",
  description: "Будущая личная коллекция Eternal Time: добавление часов, роли моделей и осознанное развитие набора.",
  alternates: {
    canonical: "/collection",
  },
};

export default function CollectionPage() {
  return (
    <Container className="grid gap-12 py-10 lg:py-16">
      <header className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="type-label">Моя коллекция</p>
          <h1 className="type-page mt-3 text-4xl text-balance md:text-5xl">Личные часы как система, а не список покупок</h1>
        </div>
        <p className="type-body max-w-2xl text-[var(--text-muted)]">
          Коллекция Eternal Time задумана как пространство, где владелец видит роли своих часов, понимает повторения и
          выбирает следующий шаг без случайного накопления.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          ["Собрать", "Сохранить свои часы, источник владения, комплектность и личный контекст."],
          ["Понять", "Увидеть, какие сценарии, размеры, механизмы и стили уже закрыты."],
          ["Развить", "Подбирать следующие часы так, чтобы коллекция становилась осмысленнее."],
        ].map(([title, text]) => (
          <article key={title} className="border-t border-[var(--border-strong)] pt-5">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="type-body mt-3 text-[var(--text-muted)]">{text}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 bg-[var(--surface-graphite)] p-6 text-[var(--text-inverse)] md:grid-cols-[1fr_auto] md:items-center lg:p-8">
        <div>
          <p className="type-label text-[var(--steel)]">Первый слой уже здесь</p>
          <h2 className="type-section mt-2 text-3xl">Каталог помогает понять язык моделей</h2>
        </div>
        <Link
          href="/journal"
          className="inline-flex h-[var(--control-height)] items-center justify-center bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--text)]"
        >
          Читать журнал
        </Link>
      </section>
    </Container>
  );
}
