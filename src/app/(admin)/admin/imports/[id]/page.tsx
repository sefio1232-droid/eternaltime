import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { getAdminImportDetail } from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Import batch" };
export const dynamic = "force-dynamic";

type AdminImportDetailPageProps = {
  params: Promise<{ id: string }>;
};

function pretty(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

export default async function AdminImportDetailPage({ params }: AdminImportDetailPageProps) {
  const { id } = await params;
  const batch = await getAdminImportDetail(id);
  if (!batch) notFound();

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Admin / Import batch</p>
            <h1>{batch.sourceFilename}</h1>
          </div>
          <Link className={styles.linkButton} href="/admin/imports">К списку</Link>
        </div>
        <p>Диагностика batch из `import_batches`, `import_rows` и `audit_logs`. Apply остаётся только через существующий controlled mechanism.</p>
      </header>

      <section className={styles.metrics}>
        <article className={styles.metric}><span className={styles.label}>Status</span><strong>{batch.status}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Total rows</span><strong>{batch.totalRows}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Eligible</span><strong>{batch.eligibleRows}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Manual review</span><strong>{batch.manualReviewRows}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Blocked</span><strong>{batch.blockedRows}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Errors</span><strong>{batch.errorRows}</strong></article>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.cards}>
          <article className={styles.card}>
            <h2>Problem rows</h2>
            {batch.problemRows.length ? (
              <div className={styles.cards}>
                {batch.problemRows.map((row) => (
                  <article key={row.id} className={styles.galleryItem}>
                    <div className={styles.headerRow}>
                      <strong>Row {row.rowNumber}</strong>
                      <span className={styles.status}>{row.status}</span>
                    </div>
                    <details>
                      <summary>Errors</summary>
                      <pre>{pretty(row.errors)}</pre>
                    </details>
                    <details>
                      <summary>Warnings</summary>
                      <pre>{pretty(row.warnings)}</pre>
                    </details>
                    <details>
                      <summary>Normalized</summary>
                      <pre>{pretty(row.normalized)}</pre>
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>Blocked/manual review rows не найдены.</div>
            )}
          </article>
        </section>

        <aside className={styles.cards}>
          <section className={styles.card}>
            <h2>Summary</h2>
            <p className={styles.meta}>ID: {batch.id}</p>
            <p className={styles.meta}>Source kind: {batch.sourceKind}</p>
            <p className={styles.meta}>Created: {new Date(batch.createdAt).toLocaleString("ru-RU")}</p>
            <p className={styles.meta}>Applied: {batch.appliedAt ? new Date(batch.appliedAt).toLocaleString("ru-RU") : "—"}</p>
            <details open>
              <summary>summary_json</summary>
              <pre>{pretty(batch.summary)}</pre>
            </details>
            <details>
              <summary>mapping_json</summary>
              <pre>{pretty(batch.mapping)}</pre>
            </details>
          </section>

          <section className={styles.card}>
            <h2>Audit</h2>
            {batch.auditLogs.length ? (
              <div className={styles.cards}>
                {batch.auditLogs.map((log) => (
                  <article key={log.id} className={styles.galleryItem}>
                    <strong>{log.action}</strong>
                    <p className={styles.meta}>{new Date(log.createdAt).toLocaleString("ru-RU")}</p>
                    <details>
                      <summary>metadata</summary>
                      <pre>{pretty(log.metadata)}</pre>
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>Audit log по этому batch пока пуст.</div>
            )}
          </section>
        </aside>
      </div>
    </EditorialContainer>
  );
}
