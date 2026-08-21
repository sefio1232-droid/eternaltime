import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialContainer } from "@/components/ui/editorial-primitives";
import { AdminGalleryImage } from "@/components/admin/admin-catalog-image";
import styles from "@/components/admin/admin.module.css";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import {
  getAdminCatalogDetail,
  getAdminCatalogDictionaries,
} from "@/modules/admin/infrastructure/admin-repository.server";
import {
  updateAdminCatalogImageAction,
  updateAdminCatalogReferenceAction,
} from "@/modules/admin/application/catalog-actions";

export const metadata: Metadata = { title: "Admin catalog item" };
export const dynamic = "force-dynamic";

type AdminCatalogDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function rubValue(amountMinor: number | null) {
  return amountMinor === null ? "" : String(Math.round(amountMinor / 100));
}

function optionList(options: Array<{ id: string; label: string }>, current: string | null, empty = "—") {
  return (
    <>
      <option value="">{empty}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>{option.label}</option>
      ))}
      {current && !options.some((option) => option.id === current) ? <option value={current}>Текущее значение ({current})</option> : null}
    </>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string | null;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select name={name} defaultValue={value ?? ""}>{optionList(options, value)}</select>
    </label>
  );
}

function TextField({ label, name, value }: { label: string; name: string; value: string | number | null }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input name={name} defaultValue={value ?? ""} />
    </label>
  );
}

function TextAreaField({ label, name, value }: { label: string; name: string; value: string | null }) {
  return (
    <label className={`${styles.field} ${styles.span2}`}>
      <span className={styles.label}>{label}</span>
      <textarea name={name} defaultValue={value ?? ""} />
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <p className={styles.note}>{value ?? "—"}</p>
    </div>
  );
}

function CheckField({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className={styles.check}>
      <input name={name} type="checkbox" defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );
}

function issueLabels(issue: string) {
  const labels: Record<string, string> = {
    missing_reference: "нет reference",
    missing_price: "нет цены",
    missing_image: "нет фото",
    missing_movement_type: "нет механизма",
    missing_case_material: "нет корпуса",
    missing_crystal: "нет стекла",
    missing_water_resistance: "нет водозащиты",
    low_data_confidence: "требуется проверка данных",
  };
  return labels[issue] ?? issue;
}

export default async function AdminCatalogDetailPage({ params, searchParams }: AdminCatalogDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [detail, dictionaries] = await Promise.all([getAdminCatalogDetail(id), getAdminCatalogDictionaries()]);
  if (!detail) notFound();
  const saved = query.saved === "1";
  const imagesSaved = query.imagesSaved === "1";
  const publicHref = detail.brandSlug && detail.referenceSlug ? `/watches/${detail.brandSlug}/${detail.referenceSlug}` : null;

  return (
    <EditorialContainer className={`${styles.shell} public-page`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Backoffice / Catalog item</p>
            <h1>{detail.brandName} {detail.referenceDisplay}</h1>
          </div>
          <div className={styles.actions}>
            <Link className={styles.linkButton} href="/admin/catalog">К списку</Link>
            {publicHref ? <Link className={styles.linkButton} href={publicHref}>Открыть public</Link> : null}
          </div>
        </div>
        <p>
          Редактирование использует существующие таблицы `watch_references`, `catalog_offers` и `watch_images`.
          Storage upload/delete намеренно не включены: production images сейчас обслуживаются из shared catalog assets.
        </p>
        {saved ? <p className={styles.status}>Изменения товара сохранены</p> : null}
        {imagesSaved ? <p className={styles.status}>Изменения изображения сохранены</p> : null}
      </header>

      <section className={styles.metrics}>
        <article className={styles.metric}><span className={styles.label}>Публикация</span><strong>{detail.status}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Цена</span><strong>{formatCommerceMoney(detail.priceMinor, detail.currencyCode ?? "RUB")}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Offer</span><strong>{detail.offerStatus ?? "—"}</strong></article>
        <article className={styles.metric}><span className={styles.label}>Data</span><strong>{detail.dataConfidence}</strong></article>
      </section>

      {detail.issueCodes.length ? (
        <section className={styles.card}>
          <div className={styles.issueRow}>
            {detail.issueCodes.map((issue) => <span key={issue} className={styles.issue}>{issueLabels(issue)}</span>)}
          </div>
        </section>
      ) : null}

      <div className={styles.twoColumn}>
        <form action={updateAdminCatalogReferenceAction} className={styles.cards}>
          <input type="hidden" name="id" value={detail.id} />

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Identity</h2>
              <span className={styles.meta}>ID: {detail.id}</span>
            </div>
            <div className={styles.formGrid}>
              <SelectField label="Бренд" name="brandId" value={detail.brandId} options={dictionaries.brands} />
              <SelectField label="Модель" name="modelId" value={detail.modelId} options={dictionaries.models} />
              <ReadonlyField label="Collection" value={detail.collectionName} />
              <ReadonlyField label="Line" value={detail.lineName} />
              <TextField label="Название" name="displayName" value={detail.displayName} />
              <TextField label="Reference" name="referenceDisplay" value={detail.referenceDisplay} />
              <label className={styles.field}>
                <span className={styles.label}>Publication status</span>
                <select name="status" defaultValue={detail.status}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archival">archival</option>
                  <option value="hidden">hidden</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Reference status</span>
                <select name="referenceStatus" defaultValue={detail.referenceStatus}>
                  <option value="current">current</option>
                  <option value="discontinued">discontinued</option>
                  <option value="catalog_only">catalog_only</option>
                  <option value="unknown">unknown</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Data confidence</span>
                <select name="dataConfidence" defaultValue={detail.dataConfidence}>
                  <option value="verified">verified</option>
                  <option value="imported">imported</option>
                  <option value="partial">partial</option>
                  <option value="unknown">unknown</option>
                </select>
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Commercial</h2>
            <div className={styles.formGrid}>
              <TextField label="Цена, ₽" name="priceRub" value={rubValue(detail.priceMinor)} />
              <label className={styles.field}>
                <span className={styles.label}>Offer status</span>
                <select name="offerStatus" defaultValue={detail.offerStatus ?? "active"}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="draft">draft</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <SelectField label="Inventory" name="inventoryStateId" value={detail.inventoryStateId} options={dictionaries.inventoryStates} />
              <TextField label="Purchase limit" name="purchaseLimit" value={detail.purchaseLimit} />
              <label className={styles.check}>
                <input name="isVisible" type="checkbox" defaultChecked={detail.isVisible} />
                <span>Visible offer</span>
              </label>
              <TextAreaField label="Seller note" name="sellerNote" value={detail.sellerNote} />
            </div>
          </section>

          <section className={styles.card}>
            <h2>Specifications</h2>
            <div className={styles.formGrid}>
              <SelectField label="Тип механизма" name="movementTypeId" value={detail.movementTypeId} options={dictionaries.movementTypes} />
              <SelectField label="Калибр" name="movementId" value={detail.movementId} options={dictionaries.movements} />
              <SelectField label="Материал корпуса" name="caseMaterialId" value={detail.caseMaterialId} options={dictionaries.materials} />
              <SelectField label="Покрытие корпуса" name="caseCoatingMaterialId" value={detail.caseCoatingMaterialId} options={dictionaries.materials} />
              <SelectField label="Форма корпуса" name="caseShapeId" value={detail.caseShapeId} options={dictionaries.caseShapes} />
              <SelectField label="Цвет корпуса" name="caseColorId" value={detail.caseColorId} options={dictionaries.colors} />
              <SelectField label="Цвет циферблата" name="dialColorId" value={detail.dialColorId} options={dictionaries.colors} />
              <SelectField label="Стекло" name="crystalTypeId" value={detail.crystalTypeId} options={dictionaries.crystalTypes} />
              <SelectField label="Ремешок" name="strapMaterialId" value={detail.strapMaterialId} options={dictionaries.materials} />
              <SelectField label="Браслет" name="braceletMaterialId" value={detail.braceletMaterialId} options={dictionaries.materials} />
              <SelectField label="Застёжка" name="claspTypeId" value={detail.claspTypeId} options={dictionaries.claspTypes} />
              <TextField label="Диаметр, мм" name="caseDiameterMm" value={detail.caseDiameterMm} />
              <TextField label="Ширина, мм" name="caseWidthMm" value={detail.caseWidthMm} />
              <TextField label="Lug-to-lug, мм" name="lugToLugMm" value={detail.lugToLugMm} />
              <TextField label="Толщина, мм" name="caseThicknessMm" value={detail.caseThicknessMm} />
              <TextField label="Ширина ремешка, мм" name="lugWidthMm" value={detail.lugWidthMm} />
              <TextField label="Вес, г" name="weightG" value={detail.weightG} />
              <TextField label="Водозащита, м" name="waterResistanceM" value={detail.waterResistanceM} />
            </div>
            <div className={styles.compactGrid}>
              <CheckField label="Дата" name="hasDate" checked={detail.hasDate} />
              <CheckField label="День/дата" name="hasDayDate" checked={detail.hasDayDate} />
              <CheckField label="GMT" name="hasGmt" checked={detail.hasGmt} />
              <CheckField label="Хронограф" name="hasChronograph" checked={detail.hasChronograph} />
              <CheckField label="Тахиметр" name="hasTachymeter" checked={detail.hasTachymeter} />
              <CheckField label="World time" name="hasWorldTime" checked={detail.hasWorldTime} />
              <CheckField label="Alarm" name="hasAlarm" checked={detail.hasAlarm} />
              <CheckField label="Stopwatch" name="hasStopwatch" checked={detail.hasStopwatch} />
              <CheckField label="Timer" name="hasTimer" checked={detail.hasTimer} />
              <CheckField label="Moon phase" name="hasMoonPhase" checked={detail.hasMoonPhase} />
              <CheckField label="Rotating bezel" name="hasRotatingBezel" checked={detail.hasRotatingBezel} />
            </div>
          </section>

          <section className={styles.card}>
            <h2>SEO и описания</h2>
            <div className={styles.formGrid}>
              <TextAreaField label="Короткое описание" name="shortDescription" value={detail.shortDescription} />
              <TextAreaField label="Описание товара" name="description" value={detail.description} />
              <TextAreaField label="Механизм" name="movementDescription" value={detail.movementDescription} />
              <TextAreaField label="Посадка" name="fitDescription" value={detail.fitDescription} />
              <TextAreaField label="Водозащита" name="waterResistanceDescription" value={detail.waterResistanceDescription} />
              <TextAreaField label="Комплектация" name="setContentsDescription" value={detail.setContentsDescription} />
              <TextAreaField label="Аутентичность" name="authenticityDescription" value={detail.authenticityDescription} />
            </div>
            <div className={styles.srPreview}>
              <span className={styles.meta}>Search preview</span>
              <strong>{detail.displayName} {detail.referenceDisplay} | Eternal Time</strong>
              <p>{detail.shortDescription || detail.description || "Meta description не задана. Шаблонный текст автоматически не генерируется."}</p>
            </div>
          </section>

          <div className={styles.actions}>
            <button className={styles.button} type="submit">Сохранить товар</button>
            <Link className={styles.linkButton} href="/admin/catalog">Отмена</Link>
          </div>
        </form>

        <aside className={styles.cards} id="images">
          <section className={styles.card}>
            <h2>Production gallery</h2>
            <p className={styles.help}>
              Это фактическая галерея, которую видит сайт после применения shared manifest policy. Новые файлы не загружаются из админки.
            </p>
            <div className={styles.gallery}>
              {detail.productionGallery.length ? detail.productionGallery.map((image, index) => (
                <article key={`${image.kind}-${index}`} className={styles.galleryItem}>
                  <AdminGalleryImage image={image} label={`${detail.referenceDisplay} image ${index + 1}`} />
                  <span className={styles.meta}>{image.kind}</span>
                </article>
              )) : (
                <div className={styles.empty}>Production gallery empty.</div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <h2>Database image rows</h2>
            <p className={styles.help}>
              Можно менять порядок, alt text, статус и primary для уже существующих rows. Upload/delete требует отдельного storage design.
            </p>
            <div className={styles.cards}>
              {detail.images.length ? detail.images.map((image) => (
                <form key={image.id} action={updateAdminCatalogImageAction} className={styles.galleryItem}>
                  <input type="hidden" name="watchReferenceId" value={detail.id} />
                  <input type="hidden" name="imageId" value={image.id} />
                  <span className={styles.meta}>{image.storageBucket}</span>
                  <code className={styles.meta}>{image.storagePath}</code>
                  <label className={styles.field}>
                    <span className={styles.label}>Alt text</span>
                    <input name="altText" defaultValue={image.altText ?? ""} />
                  </label>
                  <TextField label="Sort order" name="sortOrder" value={image.sortOrder} />
                  <label className={styles.field}>
                    <span className={styles.label}>Status</span>
                    <select name="imageStatus" defaultValue={image.status}>
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="hidden">hidden</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>
                  <label className={styles.check}>
                    <input name="isPrimary" type="checkbox" defaultChecked={image.isPrimary} />
                    <span>Primary image</span>
                  </label>
                  <button className={styles.linkButton} type="submit">Сохранить image row</button>
                </form>
              )) : (
                <div className={styles.empty}>
                  В `watch_images` пока нет rows для этой модели. Production может всё равно показывать архивные shared images.
                </div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <h2>Architectural gap</h2>
            <p className={styles.help}>
              Безопасная загрузка новых изображений из браузера требует отдельного публичного catalog storage
              (например Supabase Storage/S3), политики доступа, генерации derivatives и явного связывания с
              `watch_images`. Shared archive assets не должны мутироваться обычной админкой.
            </p>
          </section>
        </aside>
      </div>
    </EditorialContainer>
  );
}
