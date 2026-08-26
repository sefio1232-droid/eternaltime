import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { getPublicEnv } from "@/config/public-env";
import { getLegalDocument, legalDocuments, type LegalContentBlock, type LegalDocument } from "@/content/legal";
import styles from "../legal.module.css";

type LegalPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

export function generateStaticParams() {
  return legalDocuments.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) {
    return { title: "Документ не найден", robots: { index: false, follow: false } };
  }
  return {
    title: document.title,
    description: `Страница документа: ${document.title}.`,
    alternates: { canonical: document.route },
  };
}

function isSectionHeading(text: string): boolean {
  return text === "ПРЕАМБУЛА" || /^\d+\.\s+\S/.test(text);
}

function isRevisionLine(text: string): boolean {
  return /^Редакция от\s+/i.test(text);
}

function LegalTable({ rows }: Readonly<{ rows: string[][] }>) {
  return (
    <div className={styles.tableWrap}>
      <table>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegalBlock({ block, index }: Readonly<{ block: LegalContentBlock; index: number }>) {
  if (block.type === "table") {
    return <LegalTable rows={block.rows} />;
  }

  if (index === 0) {
    return <h1>{block.text}</h1>;
  }

  if (isSectionHeading(block.text)) {
    return <h2>{block.text}</h2>;
  }

  return (
    <p className={isRevisionLine(block.text) ? styles.revisionLine : index <= 3 ? styles.documentTitleLine : undefined}>
      {block.text}
    </p>
  );
}

function JsonLd({ document }: Readonly<{ document: LegalDocument }>) {
  const env = getPublicEnv();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: document.title,
    url: `${env.appUrl}${document.route}`,
    inLanguage: "ru-RU",
    isPartOf: {
      "@type": "WebSite",
      name: "Eternal Time",
      url: env.appUrl,
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />;
}

export default async function LegalDocumentPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();

  return (
    <>
      <JsonLd document={document} />
      <div className={styles.page}>
        <EditorialContainer className={styles.shell}>
          <nav aria-label="Хлебные крошки" className={styles.breadcrumbs}>
            <Link href="/">Главная</Link>
            <span aria-hidden="true">/</span>
            <Link href="/legal">Юридические документы</Link>
          </nav>

          <article className={styles.article}>
            <div className={styles.content}>
              {document.blocks.map((block, index) => (
                <LegalBlock key={`${block.type}-${index}`} block={block} index={index} />
              ))}
            </div>
            <Link href="/legal" className={styles.backLink}>
              ← Вернуться в юридический раздел
            </Link>
          </article>
        </EditorialContainer>
      </div>
    </>
  );
}
