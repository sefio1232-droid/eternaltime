const catalogSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isCatalogSlug(value: string): boolean {
  return catalogSlugPattern.test(value);
}

export function slugifyCatalogText(value: string): string | null {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return isCatalogSlug(slug) ? slug : null;
}
