import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import styles from "@/components/admin/admin.module.css";
import {
  formatCommerceMoney,
  orderStatusLabels,
  paymentStatusLabels,
  shipmentStatusLabels,
} from "@/modules/commerce/domain/labels";
import { listAdminOrdersForPanel, type AdminOrderFilters } from "@/modules/admin/infrastructure/admin-repository.server";

export const metadata: Metadata = { title: "Заказы" };
export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
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

function pageHref(page: number, filters: AdminOrderFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.orderNumber) params.set("orderNumber", filters.orderNumber);
  if (filters.customer) params.set("customer", filters.customer);
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.deliveryStatus) params.set("deliveryStatus", filters.deliveryStatus);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/admin/orders?${params.toString()}`;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const filters: AdminOrderFilters = {
    status: value(params, "status"),
    paymentStatus: value(params, "paymentStatus"),
    deliveryStatus: value(params, "deliveryStatus"),
    dateFrom: value(params, "dateFrom"),
    dateTo: value(params, "dateTo"),
    customer: value(params, "customer"),
    orderNumber: value(params, "orderNumber"),
    query: value(params, "q"),
    sort: (value(params, "sort") ?? "created_desc") as AdminOrderFilters["sort"],
    page: numberValue(params, "page"),
    pageSize: 25,
  };
  const result = await listAdminOrdersForPanel(filters);

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Admin / Orders</p>
            <h1>Заказы</h1>
          </div>
          <p className={styles.note}>Найдено: {result.total}. Серверная фильтрация, сортировка и pagination без загрузки всей базы в браузер.</p>
        </div>
      </header>

      <section className={styles.card}>
        <form className={styles.filters}>
          <label className={styles.field}>
            <span className={styles.label}>Поиск</span>
            <input name="q" defaultValue={filters.query ?? ""} placeholder="номер, email, телефон, tracking" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Номер</span>
            <input name="orderNumber" defaultValue={filters.orderNumber ?? ""} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Клиент</span>
            <input name="customer" defaultValue={filters.customer ?? ""} placeholder="email / телефон / имя" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Оплата</span>
            <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""}>
              <option value="">Все</option>
              {Object.entries(paymentStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Заказ</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">Все</option>
              {Object.entries(orderStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Доставка</span>
            <select name="deliveryStatus" defaultValue={filters.deliveryStatus ?? ""}>
              <option value="">Все</option>
              {Object.entries(shipmentStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Дата от</span>
            <input name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Дата до</span>
            <input name="dateTo" type="date" defaultValue={filters.dateTo ?? ""} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Сортировка</span>
            <select name="sort" defaultValue={filters.sort ?? "created_desc"}>
              <option value="created_desc">Новые сверху</option>
              <option value="created_asc">Старые сверху</option>
              <option value="updated_desc">Недавно обновлены</option>
              <option value="total_desc">Сумма ↓</option>
              <option value="total_asc">Сумма ↑</option>
            </select>
          </label>
          <div className={styles.actions}>
            <button className={styles.button} type="submit">Применить</button>
            <Link className={styles.linkButton} href="/admin/orders">Сбросить</Link>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        {result.items.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Заказ</th>
                  <th>Создан</th>
                  <th>Клиент</th>
                  <th>Сумма</th>
                  <th>Оплата</th>
                  <th>Статус</th>
                  <th>Доставка</th>
                  <th>CDEK</th>
                  <th>Обновлён</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.orderNumber}`}>№{order.orderNumber}</Link>
                      <p className={styles.meta}>{order.id}</p>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleString("ru-RU")}</td>
                    <td>
                      <strong>{order.customerName}</strong>
                      <p className={styles.meta}>{order.customerEmail}</p>
                      <p className={styles.meta}>{order.customerPhone}</p>
                    </td>
                    <td>{formatCommerceMoney(order.totalAmountMinor)}</td>
                    <td><span className={styles.status}>{paymentStatusLabels[order.paymentStatus]}</span></td>
                    <td><span className={styles.status}>{orderStatusLabels[order.orderStatus]}</span></td>
                    <td>
                      <span className={styles.status}>{order.shipmentStatus ? shipmentStatusLabels[order.shipmentStatus] : "Нет отправления"}</span>
                      <p className={styles.meta}>{order.deliveryMethod} · {order.city}</p>
                    </td>
                    <td>
                      <p className={styles.meta}>{order.cdekOrderNumber ?? "—"}</p>
                      <p className={styles.meta}>{order.trackingNumber ?? "—"}</p>
                      {order.lastErrorCode ? <span className={styles.issue}>{order.lastErrorCode}</span> : null}
                    </td>
                    <td>{new Date(order.updatedAt).toLocaleString("ru-RU")}</td>
                    <td><Link className={styles.linkButton} href={`/admin/orders/${order.orderNumber}`}>Открыть</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>
            <p className={styles.eyebrow}>Нет данных</p>
            <h2>Заказы не найдены</h2>
            <p>Измените фильтры или дождитесь первого реального checkout.</p>
          </div>
        )}
      </section>

      <nav className={styles.pagination} aria-label="Навигация по заказам">
        {result.page > 1 ? <Link className={styles.linkButton} href={pageHref(result.page - 1, filters)}>Назад</Link> : null}
        <span className={styles.meta}>Страница {result.page} из {result.pageCount}</span>
        {result.page < result.pageCount ? <Link className={styles.linkButton} href={pageHref(result.page + 1, filters)}>Вперёд</Link> : null}
      </nav>
    </EditorialContainer>
  );
}
