import type { Metadata } from "next";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import styles from "@/components/admin/admin.module.css";
import { getAdminSystemOverview } from "@/modules/admin/infrastructure/admin-repository.server";

export const metadata: Metadata = { title: "Admin system" };
export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const overview = await getAdminSystemOverview();

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Backoffice / System</p>
        <h1>Состояние магазина</h1>
        <p>Безопасная operational-информация. Значения env, ключи провайдеров и приватные credentials здесь не выводятся.</p>
      </header>

      <section className={styles.metrics}>
        <article className={styles.metric}><span className={styles.label}>Environment</span><strong>{overview.environmentLabel}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Catalog</span><strong>{overview.catalogStats.catalogTotal}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Orders</span><strong>{overview.orderStats.totalOrders}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Generated</span><strong>{new Date(overview.generatedAt).toLocaleTimeString("ru-RU")}</strong></article>
      </section>

      <section className={styles.card}>
        <h2>Catalog health</h2>
        <div className={styles.compactGrid}>
          <p><span className={styles.label}>Published</span><br />{overview.catalogStats.catalogPublished}</p>
          <p><span className={styles.label}>Hidden/draft</span><br />{overview.catalogStats.catalogHidden}</p>
          <p><span className={styles.label}>Without price</span><br />{overview.catalogStats.catalogWithoutPrice}</p>
          <p><span className={styles.label}>Without image</span><br />{overview.catalogStats.catalogWithoutImage}</p>
          <p><span className={styles.label}>Incomplete</span><br />{overview.catalogStats.catalogIncomplete}</p>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Images and shared assets</h2>
        <div className={styles.compactGrid}>
          <p><span className={styles.label}>Production gallery images</span><br />{overview.imageDiagnostics.productionGalleryImages}</p>
          <p><span className={styles.label}>Missing production images</span><br />{overview.imageDiagnostics.missingProductionImages}</p>
          <p><span className={styles.label}>Database image rows</span><br />{overview.imageDiagnostics.databaseImageRows}</p>
        </div>
        <p className={styles.help}>
          Shared catalog assets сохраняются между releases. Обычный deploy остаётся code-only; asset sync требует явного `{overview.deployment.catalogAssetsExplicitFlag}`.
        </p>
      </section>

      <section className={styles.card}>
        <h2>Orders</h2>
        <div className={styles.compactGrid}>
          <p><span className={styles.label}>Awaiting payment</span><br />{overview.orderStats.awaitingPayment}</p>
          <p><span className={styles.label}>Paid</span><br />{overview.orderStats.paid}</p>
          <p><span className={styles.label}>Problem orders</span><br />{overview.orderStats.failedProblemOrders}</p>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Latest audit log entries</h2>
        {overview.latestAuditLogs.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {overview.latestAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("ru-RU")}</td>
                    <td>{log.action}</td>
                    <td>{log.entityType}</td>
                    <td><code>{log.entityId ?? "—"}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>Audit log пока пуст или недоступен.</div>
        )}
      </section>
    </EditorialContainer>
  );
}
