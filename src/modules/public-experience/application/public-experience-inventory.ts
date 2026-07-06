import { foundationPublicRoutes, publicNavigation, utilityNavigation } from "@/config/navigation";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { listEditorialSelections } from "@/modules/editorial-selections/application/editorial-selection-service";
import { getJournalInventory } from "@/modules/journal/application/journal-repository";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

export type PublicExperienceInventory = {
  generatedAt: string;
  publicRoutes: string[];
  navigationItems: string[];
  catalogCount: number;
  brands: Array<{ name: string; count: number }>;
  publishedJournalArticleCount: number;
  unpublishedDraftCount: number;
  editorialSelectionCount: number;
  routesSelectedForManualVerification: string[];
};

export function buildPublicExperienceInventory(input: {
  preview: CatalogImportPreview;
  imagePlan: CatalogImageUploadPlan | null;
  generatedAt?: string;
}): PublicExperienceInventory {
  const dataset = catalogReadDatasetFromPreview(input);
  const journalInventory = getJournalInventory();
  const detailRoutes = dataset.brands
    .map((brand) => dataset.watches.find((watch) => watch.brandSlug === brand.slug)?.href)
    .filter((href): href is string => Boolean(href))
    .slice(0, 4);

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    publicRoutes: [...foundationPublicRoutes],
    navigationItems: [...publicNavigation, ...utilityNavigation].map((item) => `${item.label}: ${item.href}`),
    catalogCount: dataset.watches.length,
    brands: dataset.brands.map((brand) => ({ name: brand.name, count: brand.watchCount })),
    publishedJournalArticleCount: journalInventory.publishedCount,
    unpublishedDraftCount: journalInventory.unpublishedDraftCount,
    editorialSelectionCount: listEditorialSelections(dataset).length,
    routesSelectedForManualVerification: [
      "/",
      "/watches",
      "/watches/casio",
      ...detailRoutes,
      "/brands",
      "/journal",
      "/journal/why-g-shock-became-cult",
      "/journal/quartz-vs-mechanical-real-difference",
      "/journal/water-resistance-atm-guide",
      "/selection",
      "/collection",
    ],
  };
}

export function renderPublicExperienceInventoryMarkdown(inventory: PublicExperienceInventory): string {
  const lines: string[] = [
    "# Public Experience Inventory",
    "",
    `Generated at: ${inventory.generatedAt}`,
    "",
    "## Public Routes",
    "",
    ...inventory.publicRoutes.map((route) => `- ${route}`),
    "",
    "## Navigation Items",
    "",
    ...inventory.navigationItems.map((item) => `- ${item}`),
    "",
    "## Catalog",
    "",
    `Public catalog count: ${inventory.catalogCount}`,
    "",
    "### Brands",
    "",
    ...inventory.brands.map((brand) => `- ${brand.name}: ${brand.count}`),
    "",
    "## Journal",
    "",
    `Published articles: ${inventory.publishedJournalArticleCount}`,
    `Unpublished drafts: ${inventory.unpublishedDraftCount}`,
    "",
    "## Editorial Selections",
    "",
    `Selection count: ${inventory.editorialSelectionCount}`,
    "",
    "## Routes Selected For Manual Verification",
    "",
    ...inventory.routesSelectedForManualVerification.map((route) => `- ${route}`),
    "",
  ];

  return `${lines.join("\n")}\n`;
}
