import type { Metadata } from "next";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import { listAdminUsersForPanel } from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/commerce/commerce.module.css";

export const metadata: Metadata = { title: "Пользователи" };
export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

export default async function AdminUsersPage() {
  const users = await listAdminUsersForPanel();

  return (
    <EditorialContainer className={`${styles.ordersPage} public-page`}>
      <header className={styles.commerceHeading}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Пользователи</h1>
        <span>
          Реестр настоящих регистраций Supabase Auth с безопасной витриной публичного профиля и заказной статистики.
        </span>
      </header>

      <section className={styles.panel}>
        {users.length ? (
          <div className={styles.adminList}>
            {users.map((user) => (
              <article key={user.userId} className={styles.adminListItem}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.eyebrow}>{user.roles.length ? user.roles.join(", ") : "customer"}</p>
                    <h2 className={styles.lineTitle}>{user.email ?? "Email не указан"}</h2>
                    <p className={styles.lineMeta}>User ID: {user.userId}</p>
                  </div>
                  <div>
                    <strong>{formatCommerceMoney(user.lifetimePaidAmountMinor)}</strong>
                    <p className={styles.lineMeta}>lifetime paid</p>
                  </div>
                </div>
                <div className={styles.adminOrderGrid}>
                  <p>
                    <span>Регистрация</span>
                    {formatDate(user.createdAt)}
                  </p>
                  <p>
                    <span>Last sign in</span>
                    {formatDate(user.lastSignInAt)}
                  </p>
                  <p>
                    <span>Имя</span>
                    {user.displayName ?? "—"}
                  </p>
                  <p>
                    <span>Телефон</span>
                    {user.phone ?? "—"}
                  </p>
                  <p>
                    <span>Город</span>
                    {user.city ?? "—"}
                  </p>
                  <p>
                    <span>Заказы</span>
                    {user.ordersCount}
                  </p>
                  <p>
                    <span>Оплаченные заказы</span>
                    {user.paidOrdersCount}
                  </p>
                  <p>
                    <span>Часы в коллекции</span>
                    {user.collectionWatchesCount}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>Нет данных</p>
            <h2>Регистраций пока нет</h2>
            <p>
              После первой реальной регистрации Supabase Auth пользователь появится здесь. Секретные auth-поля в UI не
              выводятся.
            </p>
          </div>
        )}
      </section>
    </EditorialContainer>
  );
}
