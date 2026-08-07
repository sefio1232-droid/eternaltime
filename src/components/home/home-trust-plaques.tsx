import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import styles from "./home-trust-plaques.module.css";

const plaques = [
  {
    eyebrow: "НАШ ПОДХОД",
    title: "Выбор начинается не с бренда",
    copy: "Eternal Time помогает определить задачу, сопоставить реальные характеристики и перейти от большого каталога к нескольким моделям, которые действительно стоит сравнить.",
    action: "Пройти подбор",
    href: "/selection",
  },
  {
    eyebrow: "НАША ЦЕЛЬ",
    title: "Сделать выбор часов понятнее",
    copy: "Редакционные материалы, точный каталог и личная коллекция помогают не просто найти модель, а понять ее место в повседневной жизни и среди уже выбранных часов.",
    action: "Открыть коллекцию",
    href: "/collection",
  },
] as const;

export function HomeTrustPlaques() {
  return (
    <section id="home-trust" className={styles.section} data-home-section="trust-plaques" aria-label="Подход Eternal Time">
      <EditorialContainer className={styles.grid}>
        {plaques.map((plaque, index) => (
          <article key={plaque.eyebrow} className={styles.plaque}>
            <div className={styles.topline}>
              <p>{plaque.eyebrow}</p>
              <span aria-hidden="true">0{index + 1}</span>
            </div>
            <h2>{plaque.title}</h2>
            <p className={styles.copy}>{plaque.copy}</p>
            <Link href={plaque.href}>{plaque.action} →</Link>
          </article>
        ))}
      </EditorialContainer>
    </section>
  );
}
