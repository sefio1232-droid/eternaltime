import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { legalDocuments } from "@/content/legal";
import styles from "./legal.module.css";

export const metadata: Metadata = {
  title: "Юридические документы",
  description: "Юридический раздел Eternal Time со списком действующих документов.",
  alternates: { canonical: "/legal" },
};

export default function LegalCenterPage() {
  return (
    <div className={styles.page}>
      <EditorialContainer className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Eternal Time / документы</p>
          <h1>Юридические документы</h1>
          <p>Действующие документы Eternal Time для заказов, доставки, оплаты и защиты персональных данных.</p>
        </section>

        <nav className={styles.documentGrid} aria-label="Действующие юридические документы">
          {legalDocuments.map((document) => (
            <Link key={document.slug} href={document.route} className={styles.documentCard}>
              <span>
                <strong>{document.title}</strong>
                <span>{document.purpose}</span>
              </span>
              <small>Открыть →</small>
            </Link>
          ))}
        </nav>
      </EditorialContainer>
    </div>
  );
}
