import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { getPublicEnv } from "@/config/public-env";
import { faqItems, validateFaqItems, type FaqCategory } from "@/modules/faq/content/questions";
import styles from "./faq.module.css";

export const metadata: Metadata = {
  title: "Частые вопросы",
  description: "Ответы Eternal Time о подборе, каталоге, заказе, доставке, подлинности и личной коллекции часов.",
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    title: "Частые вопросы | Eternal Time",
    description: "Проверенные ответы о возможностях сервиса и границах опубликованных данных.",
    url: "/faq",
    siteName: "Eternal Time",
    locale: "ru_RU",
  },
};

const categories: FaqCategory[] = ["Подбор", "Каталог", "Заказ и доставка", "Подлинность и комплект", "Гарантия и возврат", "Коллекция и аккаунт", "Связь"];
const categoryId = (category: FaqCategory) => `faq-${categories.indexOf(category) + 1}`;

export default function FaqPage() {
  const issues = validateFaqItems();
  if (issues.length > 0) throw new Error(`Invalid FAQ content:\n${issues.join("\n")}`);
  const env = getPublicEnv();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "ru-RU",
    url: `${env.appUrl}/faq`,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className={styles.page}>
        <EditorialContainer className={styles.layout}>
          <header className={styles.intro}>
            <p className={styles.kicker}>Eternal Time / Информация</p>
            <h1 className={styles.title}>Частые вопросы</h1>
            <p className={styles.lede}>Здесь собраны ответы на частые вопросы о выборе часов, каталоге, заказе, доставке и личной коллекции Eternal Time. Если ответа не хватило, напишите нам — подскажем следующий шаг.</p>
          </header>

          <nav className={styles.categoryNav} aria-label="Категории частых вопросов">
            {categories.map((category) => <a key={category} href={`#${categoryId(category)}`}>{category}</a>)}
          </nav>

          <div className={styles.groups}>
            {categories.map((category) => {
              const items = faqItems.filter((item) => item.category === category);
              return (
                <section key={category} id={categoryId(category)} className={styles.group}>
                  <h2 className={styles.groupHeading}>{category}</h2>
                  <div className={styles.questions}>
                    {items.map((item) => (
                      <details key={item.id} className={styles.question}>
                        <summary>{item.question}</summary>
                        <div className={styles.answer}>
                          <p>{item.answer}</p>
                          {item.relatedLink ? (
                            item.relatedLink.href.startsWith("mailto:") ? (
                              <a href={item.relatedLink.href}>{item.relatedLink.label}</a>
                            ) : (
                              <Link href={item.relatedLink.href}>{item.relatedLink.label}</Link>
                            )
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <section className={styles.closing} aria-labelledby="faq-more-title">
            <div><h2 id="faq-more-title">Не нашли ответ?</h2><p>Напишите нам на timeeternal@mail.ru — ответим по модели, заказу, доставке или личной коллекции.</p></div>
            <div className={styles.actions}><a href="mailto:timeeternal@mail.ru" className="editorial-button editorial-button-dark">Написать нам</a><Link href="/selection" className="editorial-button">Начать подбор</Link><Link href="/watches" className="editorial-button">Открыть каталог</Link></div>
          </section>
        </EditorialContainer>
      </div>
    </>
  );
}
