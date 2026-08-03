"use client";

import { CatalogListError } from "@/components/catalog/catalog-list-error";

export default function BrandCatalogError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return <CatalogListError reset={reset} />;
}
