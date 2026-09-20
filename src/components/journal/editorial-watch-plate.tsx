import { TrackedLink } from "@/components/analytics/tracked-link";
import { EditorialWatchVisual } from "@/components/journal/editorial-watch-visual";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import type { CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import styles from "./editorial-watch-plate.module.css";

export type EditorialWatchPlateLayout = "single" | "duo" | "strip" | "four-brand";
export type EditorialShowcaseEmphasis = "fit" | "water" | "movement";

const emphasisSpecKeys: Record<EditorialShowcaseEmphasis, string[]> = {
  fit: ["case_width_raw", "case_diameter_raw", "lug_to_lug_raw", "case_thickness_raw", "strap_width_raw"],
  water: ["water_resistance_raw", "case_material_raw", "crystal_type_raw", "functions_raw"],
  movement: ["movement_type_raw", "movement_family_raw", "caliber_raw", "power_reserve_raw", "functions_raw"],
};

function showcaseSpecs(watch: CatalogWatchDetail, emphasis: EditorialShowcaseEmphasis) {
  const seen = new Set<string>();
  return emphasisSpecKeys[emphasis].flatMap((key) => {
    const spec = watch.specifications.find((candidate) => candidate.key === key);
    if (!spec || !spec.value.trim() || seen.has(spec.label)) return [];
    seen.add(spec.label);
    return [{ label: spec.label, value: spec.value }];
  }).slice(0, 4);
}

function commerceLabel(watch: CatalogWatchDetail): string {
  if (watch.publicCommerceState?.kind === "purchasable") return "Доступно для заказа";
  if (watch.publicCommerceState?.kind === "temporarily_unavailable") return "Сейчас недоступно";
  return "Сейчас без активного предложения";
}

export function EditorialWatchPlate({
  watches,
  title,
  description,
  layout,
  showPrice = false,
  showReference = true,
  surface = "paper",
  articleSlug,
}: Readonly<{
  watches: CatalogWatchDetail[];
  title: string;
  description?: string;
  layout: EditorialWatchPlateLayout;
  showPrice?: boolean;
  showReference?: boolean;
  surface?: "paper" | "ivory" | "navy";
  articleSlug?: string;
}>) {
  if (watches.length === 0) return null;
  return (
    <figure className={styles.plate} data-layout={layout} data-surface={surface}>
      <figcaption className={styles.caption}>
        <span>ET / EDITORIAL SELECTION</span>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </figcaption>
      <div className={styles.grid}>
        {watches.map((watch, index) => (
          <TrackedLink
            href={watch.href}
            className={styles.watchCell}
            key={`${watch.brandSlug}:${watch.referenceSlug}`}
            eventName="journal_product_click"
            properties={{
              article_slug: articleSlug ?? "journal-index",
              brand: watch.brandName,
              reference: watch.referenceDisplay,
              commerce_state: watch.publicCommerceState?.kind,
              block_position: index,
            }}
          >
            <EditorialWatchVisual
              watch={watch}
              className={styles.watch}
              size={layout === "single" && index === 0 ? "large" : "medium"}
              surface={surface === "navy" ? "ink" : surface === "ivory" ? "stone" : index % 2 ? "mist" : "paper"}
              showBrand
              showReference={showReference}
              link={false}
              presentationMode={layout === "single" ? "long-strap" : "standard"}
              priority={index === 0}
            />
            {showPrice && watch.publicPrice ? <span className={styles.price}>{formatCatalogMoney(watch.publicPrice)}</span> : null}
          </TrackedLink>
        ))}
      </div>
    </figure>
  );
}

export function JournalWatchComposition({
  watches,
  label = "Выпуск 01",
}: Readonly<{ watches: CatalogWatchDetail[]; label?: string }>) {
  if (watches.length === 0) return null;
  return (
    <div className={styles.composition} aria-label="Редакционная композиция часов из каталога">
      <span className={styles.compositionNumber} aria-hidden="true">01</span>
      <p>{label}</p>
      {watches.slice(0, 3).map((watch, index) => (
        <EditorialWatchVisual
          watch={watch}
          key={`${watch.brandSlug}:${watch.referenceSlug}`}
          className={styles.compositionWatch}
          size={index === 0 ? "large" : index === 1 ? "medium" : "small"}
          surface={index === 0 ? "paper" : index === 1 ? "ink" : "mist"}
          showBrand={false}
          showReference={false}
          presentationMode={index === 0 ? "long-strap" : index === 2 ? "wide-case" : "standard"}
          priority={index === 0}
        />
      ))}
      <div className={styles.compositionMarkers} aria-hidden="true"><span>МЕХАНИЗМЫ · ВЫБОР · ЦЕННОСТЬ</span></div>
    </div>
  );
}

export function EditorialWatchShowcase({
  watches,
  title,
  description,
  emphasis,
  articleSlug,
}: Readonly<{
  watches: CatalogWatchDetail[];
  title: string;
  description?: string;
  emphasis: EditorialShowcaseEmphasis;
  articleSlug: string;
}>) {
  const useful = watches.map((watch) => ({ watch, specs: showcaseSpecs(watch, emphasis) })).filter((item) => item.specs.length > 0);
  if (useful.length === 0) return null;

  return (
    <section className={styles.showcase} data-emphasis={emphasis}>
      <header className={styles.showcaseHead}>
        <span>ET / CONTEXTUAL WATCH EXAMPLES</span>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <div className={styles.showcaseGrid}>
        {useful.slice(0, 4).map(({ watch, specs }, index) => (
          <TrackedLink
            href={watch.href}
            className={styles.showcaseCard}
            key={`${watch.brandSlug}:${watch.referenceSlug}`}
            eventName="journal_product_click"
            properties={{
              article_slug: articleSlug,
              brand: watch.brandName,
              reference: watch.referenceDisplay,
              commerce_state: watch.publicCommerceState?.kind,
              block_position: index,
              showcase_emphasis: emphasis,
            }}
          >
            <EditorialWatchVisual
              watch={watch}
              className={styles.showcaseVisual}
              size="medium"
              surface={index % 2 ? "mist" : "paper"}
              showBrand
              showReference
              link={false}
              priority={index === 0}
            />
            <dl className={styles.showcaseSpecs}>
              {specs.map((spec) => (
                <div key={`${watch.id}:${spec.label}`}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
            <span className={styles.showcaseCommerce}>{commerceLabel(watch)}</span>
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}
