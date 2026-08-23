import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { listAdminImportBatches, type AdminImportFilters } from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Импорты" };
export const dynamic = "force-dynamic";

type AdminImportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function numberValue(params: Record<string, string | string[] | undefined>, key: string) {
  const parsed = Number(value(params, key));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function pageHref(page: number, filters: AdminImportFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.status) params.set("status", filters.status);
  if (filters.sourceKind) params.set("sourceKind", filters.sourceKind);
  params.set("page", String(page));
  return `/admin/imports?${params.toString()}`;
}

export default async function AdminImportsPage({ searchParams }: AdminImportsPageProps) {
  const params = await searchParams;
  const filters: AdminImportFilters = {
    query: value(params, "q"),
    status: value(params, "status"),
    sourceKind: value(params, "sourceKind"),
    page: numberValue(params, "page"),
    pageSize: 25,
  };
  const result = await listAdminImportBatches(filters);

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Admin / Imports</p>
            <h1>Импорты</h1>
          </div>
          <p className={styles.note}>Read-only monitor существующей controlled pipeline. Apply из браузера не включён.</p>
        </div>
      </header>

      <section className={styles.card}>
        <form className={styles.filters}>
          <label className={styles.field}>
            <span className={styles.label}>Поиск</span>
            <input name="q" defaultValue={filters.query ?? ""} placeholder="файл, source, batch id" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Status</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">Все</option>
              {result.statuses.map((item) => <option key={item.status} value={item.status}>{item.status} ({item.count})</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Source kind</span>
            <select name="sourceKind" defaultValue={filters.sourceKind ?? ""}>
              <option value="">Все</option>
              {result.sourceKinds.map((item) => <option key={item.sourceKind} value={item.sourceKind}>{item.sourceKind} ({item.count})</option>)}
            </select>
          </label>
          <div className={styles.actions}>
            <button className={styles.button} type="submit">Применить</button>
            <Link className={styles.linkButton} href="/admin/imports">Сбросить</Link>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        {result.items.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Eligible</th>
                  <th>Manual review</th>
                  <th>Blocked</th>
                  <th>Skipped</th>
                  <th>Applied</th>
                  <th>Errors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      {new Date(batch.createdAt).toLocaleString("ru-RU")}
                      <p className={styles.meta}>{batch.appliedAt ? `Applied ${new Date(batch.appliedAt).toLocaleString("ru-RU")}` : "not applied"}</p>
                    </td>
                    <td>
                      <strong>{batch.sourceFilename}</strong>
                      <p className={styles.meta}>{batch.sourceKind}</p>
                      <p className={styles.meta}>{batch.id}</p>
                    </td>
                    <td><span className={styles.status}>{batch.status}</span></td>
                    <td>{batch.totalRows}</td>
                    <td>{batch.eligibleRows}</td>
                    <td>{batch.manualReviewRows}</td>
                    <td>{batch.blockedRows}</td>
                    <td>{batch.skippedRows}</td>
                    <td>{batch.appliedRows}</td>
                    <td>{batch.errorRows}</td>
                    <td><Link className={styles.linkButton} href={`/admin/imports/${batch.id}`}>Открыть</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>
            <p className={styles.eyebrow}>Нет данных</p>
            <h2>Import batches не найдены</h2>
            <p>Когда controlled import pipeline создаст batch, он появится здесь.</p>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2>Import apply</h2>
        <p className={styles.help}>
          DEFERRED: новый import engine не создаётся. Browser-based apply не включён, чтобы не обходить существующий dry-run → controlled apply gate.
        </p>
      </section>

      <nav className={styles.pagination} aria-label="Навигация по импортам">
        {result.page > 1 ? <Link className={styles.linkButton} href={pageHref(result.page - 1, filters)}>Назад</Link> : null}
        <span className={styles.meta}>Страница {result.page} из {result.pageCount}; всего {result.total}</span>
        {result.page < result.pageCount ? <Link className={styles.linkButton} href={pageHref(result.page + 1, filters)}>Вперёд</Link> : null}
      </nav>
    </EditorialContainer>
  );
}
