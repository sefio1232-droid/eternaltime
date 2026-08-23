import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { formatCommerceMoney, orderStatusLabels, paymentStatusLabels } from "@/modules/commerce/domain/labels";
import { getAdminUserDetail } from "@/modules/admin/infrastructure/admin-repository.server";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Пользователь" };
export const dynamic = "force-dynamic";

type AdminUserDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Admin / User</p>
            <h1>{user.email ?? user.userId}</h1>
          </div>
          <Link className={styles.linkButton} href="/admin/users">К списку</Link>
        </div>
        <p>Только безопасная витрина Auth/Profile/Orders/Collection. Закрытые поля авторизации не запрашиваются и не выводятся.</p>
      </header>

      <div className={styles.twoColumn}>
        <section className={styles.cards}>
          <article className={styles.card}>
            <h2>Профиль</h2>
            <div className={styles.compactGrid}>
              <p><span className={styles.label}>User ID</span><br /><code>{user.userId}</code></p>
              <p><span className={styles.label}>Email</span><br />{user.email ?? "—"}</p>
              <p><span className={styles.label}>Имя</span><br />{user.displayName ?? "—"}</p>
              <p><span className={styles.label}>Телефон</span><br />{user.phone ?? "—"}</p>
              <p><span className={styles.label}>Город</span><br />{user.city ?? "—"}</p>
              <p><span className={styles.label}>Preferred contact</span><br />{user.preferredContact ?? "—"}</p>
              <p><span className={styles.label}>Регистрация</span><br />{formatDate(user.createdAt)}</p>
              <p><span className={styles.label}>Last sign in</span><br />{formatDate(user.lastSignInAt)}</p>
            </div>
          </article>

          <article className={styles.card}>
            <h2>Последние заказы</h2>
            {user.recentOrders.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Заказ</th>
                      <th>Дата</th>
                      <th>Оплата</th>
                      <th>Статус</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td><Link href={`/admin/orders/${order.orderNumber}`}>№{order.orderNumber}</Link></td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{paymentStatusLabels[order.paymentStatus]}</td>
                        <td>{orderStatusLabels[order.orderStatus]}</td>
                        <td>{formatCommerceMoney(order.totalAmountMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.empty}>Заказов пока нет.</div>
            )}
          </article>
        </section>

        <aside className={styles.cards}>
          <section className={styles.card}>
            <h2>Роли</h2>
            <div className={styles.statusRow}>
              {(user.roles.length ? user.roles : ["customer"]).map((role) => <span key={role} className={styles.status}>{role}</span>)}
            </div>
            <p className={styles.help}>
              Управление ролями оставлено read-only в этой фазе: безопасная mutation требует защиты от снятия последнего admin и отдельного confirmation/audit сценария.
            </p>
          </section>

          <section className={styles.card}>
            <h2>Сводка</h2>
            <div className={styles.compactGrid}>
              <p><span className={styles.label}>Заказы</span><br />{user.ordersCount}</p>
              <p><span className={styles.label}>Оплаченные</span><br />{user.paidOrdersCount}</p>
              <p><span className={styles.label}>Lifetime paid</span><br />{formatCommerceMoney(user.lifetimePaidAmountMinor)}</p>
              <p><span className={styles.label}>Коллекция</span><br />{user.collectionWatchesCount}</p>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Коллекция</h2>
            {user.collection.length ? (
              <div className={styles.cards}>
                {user.collection.map((watch) => (
                  <article key={watch.id} className={styles.galleryItem}>
                    <strong>{watch.displayName}</strong>
                    <p className={styles.meta}>{watch.sourceKind} · {watch.ownershipStatus} · {formatDate(watch.createdAt)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>В коллекции пока нет часов.</div>
            )}
          </section>
        </aside>
      </div>
    </EditorialContainer>
  );
}
