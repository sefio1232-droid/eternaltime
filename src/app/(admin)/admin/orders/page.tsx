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

function shipmentLabel(status: keyof typeof shipmentStatusLabels | null) {
  if (!status) return "Нет отправления";
  if (status === "creation_failed") return "Ошибка создания отправления";
  return shipmentStatusLabels[status];
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
          <p className={styles.note}>Найдено: {result.total}. Карточки показывают кто заказал, что купил, куда отправлять и что нужно сделать дальше.</p>
        </div>
      </header>

      <section className={styles.card}>
        <form className={styles.filters}>
          <label className={styles.field}>
            <span className={styles.label}>Поиск</span>
            <input name="q" defaultValue={filters.query ?? ""} placeholder="номер, email, телефон, tracking, reference" />
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
          <div className={styles.orderRows}>
            {result.items.map((order) => (
              <article key={order.id} className={styles.orderRow}>
                <div>
                  <p className={styles.eyebrow}>{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
                  <h2><Link href={`/admin/orders/${order.orderNumber}`}>№{order.orderNumber}</Link></h2>
                  <p className={styles.meta}>{order.id}</p>
                </div>
                <div className={styles.orderRowMain}>
                  <strong>{order.itemSummary}</strong>
                  <p className={styles.meta}>{order.customerName} · {order.customerEmail} · {order.customerPhone}</p>
                  <p className={styles.meta}>
                    {order.deliveryMethod === "cdek_pickup" ? "ПВЗ CDEK" : "Курьер"} · {order.city}
                    {order.pickupPointCode ? ` · ${order.pickupPointCode}` : ""}
                  </p>
                </div>
                <div className={styles.orderRowAside}>
                  <strong>{formatCommerceMoney(order.totalAmountMinor)}</strong>
                  <div className={styles.statusRow}>
                    <span className={styles.status}>{paymentStatusLabels[order.paymentStatus]}</span>
                    <span className={styles.status}>{orderStatusLabels[order.orderStatus]}</span>
                    <span className={order.lastErrorCode ? styles.issue : styles.status}>{shipmentLabel(order.shipmentStatus)}</span>
                  </div>
                  <p className={styles.meta}>Обновлён: {new Date(order.updatedAt).toLocaleString("ru-RU")}</p>
                  {order.lastErrorCode ? <p className={styles.meta}>Тех. код: {order.lastErrorCode}</p> : null}
                  <Link className={styles.linkButton} href={`/admin/orders/${order.orderNumber}`}>Открыть заказ</Link>
                </div>
              </article>
            ))}
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
