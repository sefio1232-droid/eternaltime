import type { CatalogPublicSpecification, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

function normalizeDisplayText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function startsWithBrand(value: string, brandName: string): boolean {
  return normalizeDisplayText(value).toLocaleLowerCase("ru").startsWith(`${normalizeDisplayText(brandName).toLocaleLowerCase("ru")} `);
}

export function displayWatchTitle(input: { brandName: string; title: string }): string {
  const title = normalizeDisplayText(input.title);
  const brandName = normalizeDisplayText(input.brandName);

  if (!title) {
    return brandName;
  }

  if (startsWithBrand(title, brandName)) {
    return title;
  }

  return `${brandName} ${title}`;
}

export function formatCatalogDisplayValue(value: string): string {
  const normalized = normalizeDisplayText(value)
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*,\s*/g, ", ");

  if (!normalized.includes(" / ")) {
    return normalized;
  }

  const parts = normalized.split(" / ").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return normalized;
  }

  return parts
    .map((part, index) => {
      const lower = part.toLocaleLowerCase("ru");
      return index === 0 ? lower.charAt(0).toLocaleUpperCase("ru") + lower.slice(1) : lower;
    })
    .join(", ");
}

function specByKeys(specifications: CatalogPublicSpecification[], keys: string[]): CatalogPublicSpecification | null {
  return specifications.find((specification) => keys.includes(specification.key)) ?? null;
}

export function buildFactualWatchDescription(watch: CatalogWatchDetail): string {
  const title = displayWatchTitle({ brandName: watch.brandName, title: watch.title });
  const movement = specByKeys(watch.specifications, ["movement_type_raw", "movement_raw"]);
  const caseMaterial = specByKeys(watch.specifications, ["case_material_raw"]);
  const crystal = specByKeys(watch.specifications, ["crystal_type_raw"]);
  const strap = specByKeys(watch.specifications, ["strap_material_raw", "bracelet_material_raw", "strap_bracelet_raw"]);
  const dial = specByKeys(watch.specifications, ["dial_color_raw", "dial_raw"]);
  const firstSentenceParts = [
    movement ? formatCatalogDisplayValue(movement.value).toLocaleLowerCase("ru") : null,
    caseMaterial ? `корпус: ${formatCatalogDisplayValue(caseMaterial.value).toLocaleLowerCase("ru")}` : null,
    crystal ? `стекло: ${formatCatalogDisplayValue(crystal.value).toLocaleLowerCase("ru")}` : null,
  ].filter(Boolean);
  const secondSentenceParts = [
    strap ? `браслет или ремешок: ${formatCatalogDisplayValue(strap.value).toLocaleLowerCase("ru")}` : null,
    dial ? `циферблат: ${formatCatalogDisplayValue(dial.value).toLocaleLowerCase("ru")}` : null,
  ].filter(Boolean);

  if (firstSentenceParts.length > 0) {
    const firstSentence = `${title} — ${firstSentenceParts.join(", ")}.`;
    return secondSentenceParts.length > 0 ? `${firstSentence} ${secondSentenceParts.join("; ")}.` : firstSentence;
  }

  if (watch.brandCollectionName) {
    return `${title} относится к коллекции ${formatCatalogDisplayValue(watch.brandCollectionName)}. На странице показаны только подтвержденные публичные характеристики модели.`;
  }

  return `${title}. На странице показаны только подтвержденные публичные характеристики модели.`;
}
