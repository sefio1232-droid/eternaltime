import { EditorialWatchVisual } from "@/components/journal/editorial-watch-visual";
import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import type { CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import styles from "./editorial-watch-plate.module.css";

export type EditorialWatchPlateLayout = "single" | "duo" | "strip" | "four-brand";

export function EditorialWatchPlate({
  watches,
  title,
  description,
  layout,
  showPrice = false,
  showReference = true,
  surface = "paper",
}: Readonly<{
  watches: CatalogWatchDetail[];
  title: string;
  description?: string;
  layout: EditorialWatchPlateLayout;
  showPrice?: boolean;
  showReference?: boolean;
  surface?: "paper" | "ivory" | "navy";
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
          <div className={styles.watchCell} key={`${watch.brandSlug}:${watch.referenceSlug}`}>
            <EditorialWatchVisual
              watch={watch}
              className={styles.watch}
              size={layout === "single" && index === 0 ? "large" : "medium"}
              surface={surface === "navy" ? "ink" : surface === "ivory" ? "stone" : index % 2 ? "mist" : "paper"}
              showBrand
              showReference={showReference}
              presentationMode={layout === "single" ? "long-strap" : "standard"}
              priority={index === 0}
            />
            {showPrice && watch.publicPrice ? <span className={styles.price}>{formatCatalogMoney(watch.publicPrice)}</span> : null}
          </div>
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
