import type { Metadata } from "next";
import Link from "next/link";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { AdminCatalogImage } from "@/components/admin/admin-catalog-image";
import styles from "@/components/admin/admin.module.css";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import {
  listAdminCatalogForPanel,
  type AdminCatalogFilters,
} from "@/modules/admin/infrastructure/admin-repository.server";
import { bulkUpdateAdminCatalogPublicationAction } from "@/modules/admin/application/catalog-actions";

export const metadata: Metadata = { title: "Admin catalog" };
export const dynamic = "force-dynamic";

type AdminCatalogPageProps = {
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

function pageHref(page: number, filters: AdminCatalogFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.status) params.set("status", filters.status);
  if (filters.publication) params.set("publication", filters.publication);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/admin/catalog?${params.toString()}`;
}

const issueLabels: Record<string, string> = {
  missing_reference: "нет reference",
  missing_price: "нет цены",
  missing_image: "нет фото",
  missing_movement_type: "нет механизма",
  missing_case_material: "нет корпуса",
  missing_crystal: "нет стекла",
  missing_water_resistance: "нет WR",
  low_data_confidence: "данные требуют проверки",
};

export default async function AdminCatalogPage({ searchParams }: AdminCatalogPageProps) {
  const params = await searchParams;
  const filters: AdminCatalogFilters = {
    query: value(params, "q"),
    brand: value(params, "brand"),
    status: value(params, "status"),
    publication: (value(params, "publication") ?? "") as AdminCatalogFilters["publication"],
    sort: (value(params, "sort") ?? "updated_desc") as AdminCatalogFilters["sort"],
    page: numberValue(params, "page"),
    pageSize: 50,
  };
  const result = await listAdminCatalogForPanel(filters);

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Backoffice / Catalog</p>
            <h1>Каталог товаров</h1>
          </div>
          <Link className={styles.linkButton} href="/admin/system">Диагностика</Link>
        </div>
        <p>
          Реальные записи `watch_references`, текущие `catalog_offers` и production-фотографии из существующей
          shared asset-схемы. Обычный deploy остаётся code-only; загрузка новых файлов здесь намеренно не включена.
        </p>
      </header>

      <section className={styles.metrics} aria-label="Сводка каталога">
        <article className={styles.metric}><span className={styles.label}>Найдено</span><strong>{result.total}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Страница</span><strong>{result.page}/{result.pageCount}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Бренды</span><strong>{result.brands.length}</strong></article>
      </section>

      <section className={styles.card}>
        <form className={styles.filters}>
          <label className={styles.field}>
            <span className={styles.label}>Поиск</span>
            <input name="q" defaultValue={filters.query ?? ""} placeholder="brand, model, reference" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Бренд</span>
            <select name="brand" defaultValue={filters.brand ?? ""}>
              <option value="">Все бренды</option>
              {result.brands.map((brand) => (
                <option key={brand.slug} value={brand.slug}>{brand.name} ({brand.count})</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Status</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">Любой</option>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="hidden">hidden</option>
              <option value="archival">archival</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Публикация</span>
            <select name="publication" defaultValue={filters.publication ?? ""}>
              <option value="">Любая</option>
              <option value="published">published</option>
              <option value="unpublished">unpublished</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Сортировка</span>
            <select name="sort" defaultValue={filters.sort ?? "updated_desc"}>
              <option value="updated_desc">Сначала изменённые</option>
              <option value="updated_asc">Старые изменения</option>
              <option value="brand_asc">Бренд / модель</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
            </select>
          </label>
          <div className={styles.actions}>
            <button className={styles.button} type="submit">Применить</button>
            <Link className={styles.linkButton} href="/admin/catalog">Сбросить</Link>
          </div>
        </form>
      </section>

      <form action={bulkUpdateAdminCatalogPublicationAction} className={styles.card}>
        <div className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>Bulk actions</p>
            <p className={styles.note}>Только публикация/скрытие выбранных товаров. Массового удаления нет.</p>
          </div>
          <div className={styles.actions}>
            <select name="bulkAction" aria-label="Массовое действие">
              <option value="publish">Опубликовать</option>
              <option value="unpublish">Скрыть</option>
            </select>
            <button className={styles.linkButton} type="submit">Выполнить</button>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Выбор</th>
                <th>Фото</th>
                <th>Бренд / модель</th>
                <th>Reference</th>
                <th>Цена</th>
                <th>Публикация</th>
                <th>Продажа</th>
                <th>Проблемы</th>
                <th>Изменено</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td><input name="selectedReferenceId" type="checkbox" value={item.id} aria-label={`Выбрать ${item.referenceDisplay}`} /></td>
                  <td><AdminCatalogImage image={item.primaryImage} label={`${item.brandName} ${item.referenceDisplay}`} /></td>
                  <td>
                    <strong>{item.brandName}</strong>
                    <p className={styles.meta}>{item.modelName}</p>
                    <p className={styles.meta}>{item.displayName}</p>
                  </td>
                  <td>
                    <code>{item.referenceDisplay}</code>
                    <p className={styles.meta}>{item.referenceNormalized ?? "—"}</p>
                  </td>
                  <td>{formatCommerceMoney(item.priceMinor, item.currencyCode ?? "RUB")}</td>
                  <td>
                    <div className={styles.statusRow}>
                      <span className={styles.status}>{item.status}</span>
                      <span className={styles.status}>{item.referenceStatus}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.statusRow}>
                      <span className={styles.status}>{item.offerStatus ?? "no offer"}</span>
                      <span className={styles.status}>{item.isVisible ? "visible" : "hidden"}</span>
                      {item.inventoryLabel ? <span className={styles.status}>{item.inventoryLabel}</span> : null}
                    </div>
                  </td>
                  <td>
                    {item.issueCodes.length ? (
                      <div className={styles.issueRow}>
                        {item.issueCodes.map((issue) => <span key={issue} className={styles.issue}>{issueLabels[issue] ?? issue}</span>)}
                      </div>
                    ) : (
                      <span className={styles.status}>OK</span>
                    )}
                  </td>
                  <td>{new Date(item.updatedAt).toLocaleString("ru-RU")}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link className={styles.linkButton} href={`/admin/catalog/${item.id}`}>Редактировать</Link>
                      {item.href !== "#" ? <Link className={styles.linkButton} href={item.href}>Public</Link> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <nav className={styles.pagination} aria-label="Навигация по каталогу">
        {result.page > 1 ? <Link className={styles.linkButton} href={pageHref(result.page - 1, filters)}>Назад</Link> : null}
        <span className={styles.meta}>Страница {result.page} из {result.pageCount}</span>
        {result.page < result.pageCount ? <Link className={styles.linkButton} href={pageHref(result.page + 1, filters)}>Вперёд</Link> : null}
      </nav>
    </EditorialContainer>
  );
}
