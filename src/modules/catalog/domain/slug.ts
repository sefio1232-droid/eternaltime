const catalogSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isCatalogSlug(value: string): boolean {
  return catalogSlugPattern.test(value);
}
