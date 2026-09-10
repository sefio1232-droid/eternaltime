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

function formatDateShort(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("ru-RU") : "—";
}

function orderCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} заказ`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} заказа`;
  return `${count} заказов`;
}

function watchCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} час`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} часов`;
  return `${count} часов`;
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
          <div className={styles.userRows}>
            <div className={styles.userRowsHeader} aria-hidden="true">
              <span>Пользователь</span>
              <span>Роль</span>
              <span>Регистрация</span>
              <span>Активность</span>
              <span>Заказы</span>
              <span>Оплачено</span>
              <span>Коллекция</span>
              <span>Действие</span>
            </div>
            {result.items.map((user) => {
              const lastActivityAt = user.lastSignInAt ?? user.lastOrderAt;
              return (
                <article key={user.userId} className={styles.userRow}>
                  <div className={styles.userIdentity}>
                    <span className={styles.userMobileLabel}>Пользователь</span>
                    <strong>{user.displayName ?? user.email ?? "Пользователь без email"}</strong>
                    {user.displayName && user.email ? <p className={styles.meta}>{user.email}</p> : null}
                    <p className={styles.meta}>{[user.phone, user.city].filter(Boolean).join(" · ") || "Профиль не заполнен"}</p>
                  </div>
                  <div>
                    <span className={styles.userMobileLabel}>Роль</span>
                    <div className={styles.statusRow}>
                      {(user.roles.length ? user.roles : ["customer"]).map((role) => <span key={role} className={styles.status}>{role}</span>)}
                    </div>
                  </div>
                  <div>
                    <span className={styles.userMobileLabel}>Регистрация</span>
                    <strong className={styles.valueText}>{formatDateShort(user.createdAt)}</strong>
                    <p className={styles.meta}>{formatDate(user.createdAt)}</p>
                  </div>
                  <div>
                    <span className={styles.userMobileLabel}>Активность</span>
                    <strong className={styles.valueText}>{formatDateShort(lastActivityAt)}</strong>
                    <p className={styles.meta}>{lastActivityAt ? "последняя активность" : "нет данных"}</p>
                  </div>
                  <div className={styles.userKpi}>
                    <span className={styles.userMobileLabel}>Заказы</span>
                    <strong>{user.ordersCount}</strong>
                    <p className={styles.meta}>последний: {formatDateShort(user.lastOrderAt)}</p>
                  </div>
                  <div className={styles.userKpi}>
                    <span className={styles.userMobileLabel}>Оплачено</span>
                    <strong>{formatCommerceMoney(user.lifetimePaidAmountMinor)}</strong>
                    <p className={styles.meta}>{orderCountLabel(user.paidOrdersCount)}</p>
                  </div>
                  <div className={styles.userKpi}>
                    <span className={styles.userMobileLabel}>Коллекция</span>
                    <strong>{watchCountLabel(user.collectionWatchesCount)}</strong>
                  </div>
                  <div className={styles.userAction}>
                    <Link className={styles.linkButton} href={`/admin/users/${user.userId}`} aria-label={`Открыть пользователя ${user.email ?? user.userId}`}>
                      Открыть →
                    </Link>
                  </div>
                </article>
              );
            })}
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
