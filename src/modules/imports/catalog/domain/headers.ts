export type CanonicalCatalogColumn =
  | "brand"
  | "brandCollection"
  | "siteTitle"
  | "officialName"
  | "reference"
  | "priceCny"
  | "priceRubCalculated"
  | "sitePriceRub"
  | "marketPriceRub"
  | "publicSitePriceRub"
  | "difference"
  | "sourceUrl"
  | "seoDescription"
  | "characteristics"
  | "image";

export function normalizeHeader(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—―-]/g, "")
    .replace(/[_\s"'`«».,:;()[\]{}]+/g, "")
    .replace(/×/g, "x");
}

export function mapCatalogHeader(input: string): CanonicalCatalogColumn | null {
  const header = normalizeHeader(input);

  if (!header) {
    return null;
  }

  if (header === "бренд" || header === "brand") {
    return "brand";
  }

  if (header === "серия") {
    return "brandCollection";
  }

  if (header === "названиедлясайта") {
    return "siteTitle";
  }

  if (header === "официальноеназвание") {
    return "officialName";
  }

  if (header === "артикул" || header === "reference" || header === "ref") {
    return "reference";
  }

  if (header === "ссылка" || header === "url" || header === "источник") {
    return "sourceUrl";
  }

  if (header === "seoописание" || header === "подробноеseoописание") {
    return "seoDescription";
  }

  if (header === "характеристики") {
    return "characteristics";
  }

  if (header === "разница") {
    return "difference";
  }

  if (header.startsWith("фото") || header.includes("image") || header.includes("изображение")) {
    return "image";
  }

  if (header.includes("ценанасайте") || header.includes("публичнаяценасайта")) {
    return header.includes("публичная") ? "publicSitePriceRub" : "sitePriceRub";
  }

  if (header.includes("ценавроссии")) {
    return "marketPriceRub";
  }

  if (header.includes("цена") && (header.includes("₽") || header.includes("руб"))) {
    return header.includes("¥x12") || header.includes("¥12") ? "priceRubCalculated" : "sitePriceRub";
  }

  if (header.includes("цена") && (header.includes("¥") || header.includes("юан") || header.includes("cny"))) {
    return "priceCny";
  }

  return null;
}

export function isRecognizedHeader(input: string): boolean {
  return mapCatalogHeader(input) !== null;
}
