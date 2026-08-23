import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import { listAdminUsersForPanel, type AdminUserFilters } from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Пользователи" };
export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
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

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

function pageHref(page: number, filters: AdminUserFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.role) params.set("role", filters.role);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/admin/users?${params.toString()}`;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;
  const filters: AdminUserFilters = {
    query: value(params, "q"),
    role: value(params, "role"),
    sort: (value(params, "sort") ?? "registered_desc") as AdminUserFilters["sort"],
    page: numberValue(params, "page"),
    pageSize: 25,
  };
  const result = await listAdminUsersForPanel(filters);

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Admin / Users</p>
            <h1>Пользователи</h1>
          </div>
          <p className={styles.note}>Реестр настоящих Supabase Auth пользователей. Секретные auth-поля, токены и сессии не выводятся.</p>
        </div>
      </header>

      <section className={styles.card}>
        <form className={styles.filters}>
          <label className={styles.field}>
            <span className={styles.label}>Поиск</span>
            <input name="q" defaultValue={filters.query ?? ""} placeholder="email, имя, телефон, город" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Роль</span>
            <select name="role" defaultValue={filters.role ?? ""}>
              <option value="">Все роли</option>
              {result.roles.map((role) => (
                <option key={role.code} value={role.code}>{role.code} ({role.count})</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Сортировка</span>
            <select name="sort" defaultValue={filters.sort ?? "registered_desc"}>
              <option value="registered_desc">Новые регистрации</option>
              <option value="registered_asc">Старые регистрации</option>
              <option value="last_sign_in_desc">Последняя активность</option>
              <option value="orders_desc">Больше заказов</option>
              <option value="paid_desc">Больше paid lifetime</option>
            </select>
          </label>
          <div className={styles.actions}>
            <button className={styles.button} type="submit">Применить</button>
            <Link className={styles.linkButton} href="/admin/users">Сбросить</Link>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        {result.items.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Роли</th>
                  <th>Регистрация</th>
                  <th>Last sign in</th>
                  <th>Профиль</th>
                  <th>Заказы</th>
                  <th>Paid</th>
                  <th>Коллекция</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((user) => (
                  <tr key={user.userId}>
                    <td>
                      <strong>{user.email ?? "Email не указан"}</strong>
                      <p className={styles.meta}>{user.userId}</p>
                    </td>
                    <td>
                      <div className={styles.statusRow}>
                        {(user.roles.length ? user.roles : ["customer"]).map((role) => <span key={role} className={styles.status}>{role}</span>)}
                      </div>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{formatDate(user.lastSignInAt)}</td>
                    <td>
                      <p>{user.displayName ?? "—"}</p>
                      <p className={styles.meta}>{user.phone ?? "—"} · {user.city ?? "—"}</p>
                    </td>
                    <td>{user.ordersCount}</td>
                    <td>
                      <p>{user.paidOrdersCount} заказов</p>
                      <p className={styles.meta}>{formatCommerceMoney(user.lifetimePaidAmountMinor)}</p>
                    </td>
                    <td>{user.collectionWatchesCount}</td>
                    <td><Link className={styles.linkButton} href={`/admin/users/${user.userId}`}>Открыть</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>
            <p className={styles.eyebrow}>Нет данных</p>
            <h2>Пользователи не найдены</h2>
            <p>Измените фильтры или дождитесь первой реальной регистрации.</p>
          </div>
        )}
      </section>

      <nav className={styles.pagination} aria-label="Навигация по пользователям">
        {result.page > 1 ? <Link className={styles.linkButton} href={pageHref(result.page - 1, filters)}>Назад</Link> : null}
        <span className={styles.meta}>Страница {result.page} из {result.pageCount}; всего {result.total}</span>
        {result.page < result.pageCount ? <Link className={styles.linkButton} href={pageHref(result.page + 1, filters)}>Вперёд</Link> : null}
      </nav>
    </EditorialContainer>
  );
}
