import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Моя коллекция",
  description: "Будущая личная коллекция Eternal Time: добавление часов, профиль коллекции и объяснимые следующие шаги.",
  alternates: {
    canonical: "/collection",
  },
};

export default function CollectionPage() {
  return (
    <Container className="grid gap-10 py-10 lg:py-14">
      <header className="max-w-3xl border-b border-[var(--border)] pb-7">
        <p className="type-meta">Моя коллекция</p>
        <h1 className="type-display mt-3 text-5xl text-balance md:text-6xl">Личные часы как структура, а не список покупок</h1>
        <p className="type-body mt-5 text-lg text-[var(--text-muted)]">
          В будущей коллекции пользователь сможет добавить свои часы, увидеть покрытые сценарии, заметить пробелы и понять,
          какие роли могут стать следующими. Сейчас эта страница описывает продуктовую границу без fake user data.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          ["Добавить", "Сохранить свои часы, референсы и личный контекст владения."],
          ["Понять", "Увидеть, какие сценарии и стили уже закрывает коллекция."],
          ["Развить", "Получить объяснимые варианты следующих часов после реализации Collection Intelligence."],
        ].map(([title, text]) => (
          <article key={title} className="border-t border-[var(--border)] pt-5">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="type-body mt-3 text-[var(--text-muted)]">{text}</p>
          </article>
        ))}
      </section>

      <Link href="/journal" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        Пока можно читать журнал и разбираться в выборе часов
      </Link>
    </Container>
  );
}
