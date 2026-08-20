import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { catalogImportOfferMarker, type CatalogApplyDryRunSummary, type ControlledCatalogApplyPlan } from "../domain/database-apply-types";
import {
  createCatalogApplyDatabaseClient,
  readCatalogApplyEnvironment,
  runCatalogDatabasePreflight,
  type CatalogApplyDatabaseClient,
} from "../infrastructure/database-preflight";

type ExistingCatalogSnapshot = {
  brands: Array<{ id: string; name: string; slug: string; status: string }>;
  brandCollections: Array<{ id: string; brand_id: string; name: string; slug: string; status: string }>;
  watchModels: Array<{ id: string; brand_id: string; name: string; slug: string; model_status: string }>;
  watchReferences: Array<{
    id: string;
    brand_id: string;
    watch_model_id: string;
    reference_code_display: string;
    reference_code_normalized: string;
    slug: string;
    display_name: string;
    status: string;
  }>;
  catalogOffers: Array<{
    id: string;
    watch_reference_id: string;
    status: string;
    offer_kind: string;
    condition: string;
    current_price_minor: number | null;
    currency_code: string | null;
    is_visible: boolean;
    seller_note: string | null;
  }>;
  offerPriceHistory: Array<{
    id: string;
    catalog_offer_id: string;
    price_minor: number;
    currency_code: string;
    valid_to: string | null;
  }>;
};

const brandRowsSchema = z.array(z.object({ id: z.string(), name: z.string(), slug: z.string(), status: z.string() }));
const brandCollectionRowsSchema = z.array(
  z.object({ id: z.string(), brand_id: z.string(), name: z.string(), slug: z.string(), status: z.string() }),
);
const watchModelRowsSchema = z.array(
  z.object({ id: z.string(), brand_id: z.string(), name: z.string(), slug: z.string(), model_status: z.string() }),
);
const watchReferenceRowsSchema = z.array(
  z.object({
    id: z.string(),
    brand_id: z.string(),
    watch_model_id: z.string(),
    reference_code_display: z.string(),
    reference_code_normalized: z.string(),
    slug: z.string(),
    display_name: z.string(),
    status: z.string(),
  }),
);
const catalogOfferRowsSchema = z.array(
  z.object({
    id: z.string(),
    watch_reference_id: z.string(),
    status: z.string(),
    offer_kind: z.string(),
    condition: z.string(),
    current_price_minor: z.number().nullable(),
    currency_code: z.string().nullable(),
    is_visible: z.boolean(),
    seller_note: z.string().nullable(),
  }),
);
const offerPriceHistoryRowsSchema = z.array(
  z.object({
    id: z.string(),
    catalog_offer_id: z.string(),
    price_minor: z.number(),
    currency_code: z.string(),
    valid_to: z.string().nullable(),
  }),
);

function normalizeCatalogText(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function zeroCounts() {
  return { inserts: 0, updates: 0, noops: 0, conflicts: 0 };
}

function uniqueBy<T>(items: T[], keyFor: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyFor(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

async function selectAll<T>(input: {
  client: CatalogApplyDatabaseClient;
  table: string;
  columns: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  const { data, error } = await input.client.from(input.table).select(input.columns);

  if (error) {
    throw new Error(`Could not read ${input.table}: ${error.message}`);
  }

  return input.schema.parse(data);
}

async function readExistingCatalogSnapshot(client: CatalogApplyDatabaseClient): Promise<ExistingCatalogSnapshot> {
  const [brands, brandCollections, watchModels, watchReferences, catalogOffers, offerPriceHistory] = await Promise.all([
    selectAll({ client, table: "brands", columns: "id,name,slug,status", schema: brandRowsSchema }),
    selectAll({ client, table: "brand_collections", columns: "id,brand_id,name,slug,status", schema: brandCollectionRowsSchema }),
    selectAll({ client, table: "watch_models", columns: "id,brand_id,name,slug,model_status", schema: watchModelRowsSchema }),
    selectAll({
      client,
      table: "watch_references",
      columns: "id,brand_id,watch_model_id,reference_code_display,reference_code_normalized,slug,display_name,status",
      schema: watchReferenceRowsSchema,
    }),
    selectAll({
      client,
      table: "catalog_offers",
      columns: "id,watch_reference_id,status,offer_kind,condition,current_price_minor,currency_code,is_visible,seller_note",
      schema: catalogOfferRowsSchema,
    }),
    selectAll({
      client,
      table: "offer_price_history",
      columns: "id,catalog_offer_id,price_minor,currency_code,valid_to",
      schema: offerPriceHistoryRowsSchema,
    }),
  ]);

  return { brands, brandCollections, watchModels, watchReferences, catalogOffers, offerPriceHistory };
}

function planCounts(plan: ControlledCatalogApplyPlan): CatalogApplyDryRunSummary["planCounts"] {
  return {
    brands: uniqueBy(plan.eligibleRecords, (record) => normalizeCatalogText(record.brand)).length,
    brandCollections: uniqueBy(
      plan.eligibleRecords.filter((record) => record.brandCollection && record.brandCollectionSlug),
      (record) => `${normalizeCatalogText(record.brand)}:${normalizeCatalogText(record.brandCollection ?? "")}`,
    ).length,
    brandLines: 0,
    watchModels: uniqueBy(plan.eligibleRecords, (record) => `${normalizeCatalogText(record.brand)}:${normalizeCatalogText(record.watchModel)}`)
      .length,
    watchReferences: plan.eligibleRecords.length,
    catalogOffers: plan.eligibleRecords.filter((record) => record.publicPriceMinor !== null).length,
    publicPrices: plan.eligibleRecords.filter((record) => record.publicPriceMinor !== null).length,
  };
}

function compareWithSnapshot(input: {
  plan: ControlledCatalogApplyPlan;
  snapshot: ExistingCatalogSnapshot;
}): Pick<CatalogApplyDryRunSummary, "proposedChanges" | "conflicts"> {
  const proposedChanges: CatalogApplyDryRunSummary["proposedChanges"] = {
    brands: zeroCounts(),
    brandCollections: zeroCounts(),
    brandLines: zeroCounts(),
    watchModels: zeroCounts(),
    watchReferences: zeroCounts(),
    catalogOffers: zeroCounts(),
    publicPrices: zeroCounts(),
  };
  const conflicts: CatalogApplyDryRunSummary["conflicts"] = [];
  const brandByName = new Map(input.snapshot.brands.map((brand) => [normalizeCatalogText(brand.name), brand]));
  const brandBySlug = new Map(input.snapshot.brands.map((brand) => [brand.slug, brand]));
  const collectionByBrandName = new Map(
    input.snapshot.brandCollections.map((collection) => [`${collection.brand_id}:${normalizeCatalogText(collection.name)}`, collection]),
  );
  const modelByBrandName = new Map(
    input.snapshot.watchModels.map((model) => [`${model.brand_id}:${normalizeCatalogText(model.name)}`, model]),
  );
  const referenceByBrandCode = new Map(
    input.snapshot.watchReferences.map((reference) => [`${reference.brand_id}:${reference.reference_code_normalized}`, reference]),
  );
  const importOfferByReference = new Map(
    input.snapshot.catalogOffers
      .filter(
        (offer) =>
          offer.offer_kind === "standard" &&
          offer.condition === "new" &&
          offer.seller_note === catalogImportOfferMarker,
      )
      .map((offer) => [offer.watch_reference_id, offer]),
  );
  const currentPriceByOffer = new Map(
    input.snapshot.offerPriceHistory
      .filter((price) => price.valid_to === null)
      .map((price) => [price.catalog_offer_id, price]),
  );
  const brandRecords = uniqueBy(input.plan.eligibleRecords, (record) => normalizeCatalogText(record.brand));

  for (const record of brandRecords) {
    const existingByName = brandByName.get(normalizeCatalogText(record.brand));
    const existingBySlug = brandBySlug.get(record.brandSlug);

    if (!existingByName && existingBySlug) {
      proposedChanges.brands.conflicts += 1;
      conflicts.push({
        entityType: "brand",
        identity: record.brand,
        message: `Brand slug ${record.brandSlug} is already used by a different normalized brand.`,
        candidateId: record.candidateId,
      });
    } else if (existingByName) {
      proposedChanges.brands.noops += 1;
    } else {
      proposedChanges.brands.inserts += 1;
    }
  }

  const collectionRecords = uniqueBy(
    input.plan.eligibleRecords.filter((record) => record.brandCollection && record.brandCollectionSlug),
    (record) => `${normalizeCatalogText(record.brand)}:${normalizeCatalogText(record.brandCollection ?? "")}`,
  );

  for (const record of collectionRecords) {
    const brand = brandByName.get(normalizeCatalogText(record.brand));
    if (!brand) {
      proposedChanges.brandCollections.inserts += 1;
      continue;
    }

    const existing = collectionByBrandName.get(`${brand.id}:${normalizeCatalogText(record.brandCollection ?? "")}`);
    if (existing) {
      proposedChanges.brandCollections.noops += 1;
    } else {
      proposedChanges.brandCollections.inserts += 1;
    }
  }

  const modelRecords = uniqueBy(
    input.plan.eligibleRecords,
    (record) => `${normalizeCatalogText(record.brand)}:${normalizeCatalogText(record.watchModel)}`,
  );

  for (const record of modelRecords) {
    const brand = brandByName.get(normalizeCatalogText(record.brand));
    if (!brand) {
      proposedChanges.watchModels.inserts += 1;
      continue;
    }

    const existing = modelByBrandName.get(`${brand.id}:${normalizeCatalogText(record.watchModel)}`);
    if (existing) {
      proposedChanges.watchModels.noops += 1;
    } else {
      proposedChanges.watchModels.inserts += 1;
    }
  }

  for (const record of input.plan.eligibleRecords) {
    const brand = brandByName.get(normalizeCatalogText(record.brand));
    const existingReference = brand ? referenceByBrandCode.get(`${brand.id}:${record.referenceNormalized}`) : undefined;

    if (!existingReference) {
      proposedChanges.watchReferences.inserts += 1;
    } else if (normalizeCatalogText(existingReference.display_name) !== normalizeCatalogText(record.displayName)) {
      proposedChanges.watchReferences.conflicts += 1;
      conflicts.push({
        entityType: "watch_reference",
        identity: `${record.brand}:${record.referenceNormalized}`,
        message: "Existing watch_reference display name differs from the import display name.",
        candidateId: record.candidateId,
      });
    } else {
      proposedChanges.watchReferences.noops += 1;
    }

    if (record.publicPriceMinor === null) {
      continue;
    }

    if (!existingReference) {
      proposedChanges.catalogOffers.inserts += 1;
      proposedChanges.publicPrices.inserts += 1;
      continue;
    }

    const existingOffer = importOfferByReference.get(existingReference.id);
    if (!existingOffer) {
      proposedChanges.catalogOffers.inserts += 1;
      proposedChanges.publicPrices.inserts += 1;
      continue;
    }

    if (existingOffer.current_price_minor === record.publicPriceMinor && existingOffer.currency_code === "RUB") {
      proposedChanges.catalogOffers.noops += 1;
      const currentPrice = currentPriceByOffer.get(existingOffer.id);
      if (currentPrice?.price_minor === record.publicPriceMinor && currentPrice.currency_code === "RUB") {
        proposedChanges.publicPrices.noops += 1;
      } else {
        proposedChanges.publicPrices.inserts += 1;
      }
    } else {
      proposedChanges.catalogOffers.updates += 1;
      proposedChanges.publicPrices.inserts += 1;
    }
  }

  return { proposedChanges, conflicts };
}

function unavailableChanges(): CatalogApplyDryRunSummary["proposedChanges"] {
  return {
    brands: zeroCounts(),
    brandCollections: zeroCounts(),
    brandLines: zeroCounts(),
    watchModels: zeroCounts(),
    watchReferences: zeroCounts(),
    catalogOffers: zeroCounts(),
    publicPrices: zeroCounts(),
  };
}

export async function buildCatalogApplyDryRun(input: {
  rootDir: string;
  plan: ControlledCatalogApplyPlan;
  client?: CatalogApplyDatabaseClient | null;
}): Promise<CatalogApplyDryRunSummary> {
  const env = readCatalogApplyEnvironment();
  const client = input.client ?? createCatalogApplyDatabaseClient(env);
  const preflight = await runCatalogDatabasePreflight({ rootDir: input.rootDir, env, client });
  const counts = planCounts(input.plan);
  let proposedChanges = unavailableChanges();
  let conflicts: CatalogApplyDryRunSummary["conflicts"] = [];
  const actualApplyBlockers: string[] = [];

  if (!preflight.localSupabaseProject.configPresent) {
    actualApplyBlockers.push("Local Supabase project config is missing.");
  }

  if (!preflight.localSupabaseProject.migrationsPresent) {
    actualApplyBlockers.push("Versioned Supabase migrations are missing.");
  }

  if (!preflight.remoteLink.linked) {
    actualApplyBlockers.push("Repository is not linked to a remote Supabase project.");
  }

  if (!preflight.environment.adminSecretKeyConfigured) {
    actualApplyBlockers.push("Supabase server admin secret key is not configured for privileged apply.");
  }

  if (!preflight.database.comparisonAvailable && preflight.database.blocker) {
    actualApplyBlockers.push(preflight.database.blocker);
  }

  if (preflight.database.comparisonAvailable && client) {
    const snapshot = await readExistingCatalogSnapshot(client);
    const comparison = compareWithSnapshot({ plan: input.plan, snapshot });
    proposedChanges = comparison.proposedChanges;
    conflicts = comparison.conflicts;
  }

  const proposedUpdates = Object.values(proposedChanges).reduce((sum, count) => sum + count.updates, 0);
  const proposedNoops = Object.values(proposedChanges).reduce((sum, count) => sum + count.noops, 0);
  const conflictCount = Object.values(proposedChanges).reduce((sum, count) => sum + count.conflicts, 0);

  if (conflictCount > 0) {
    actualApplyBlockers.push("Apply-level conflicts must be resolved before database writes.");
  }

  return {
    generatedAt: input.plan.generatedAt,
    previewGeneratedAt: input.plan.previewGeneratedAt,
    statusBreakdown: input.plan.statusBreakdown,
    intentionallySkippedMissingReferenceCount: input.plan.statusBreakdown.intentionally_skipped_missing_reference,
    databasePreflight: preflight,
    databaseComparisonStatus: preflight.database.comparisonAvailable ? "available" : "unavailable",
    planCounts: counts,
    proposedChanges,
    totals: {
      eligibleRecords: input.plan.eligibleRecords.length,
      manualReviewRecords: input.plan.manualReviewCandidateIds.length,
      intentionallySkippedRecords: input.plan.intentionallySkippedCandidateIds.length,
      blockedRecords: input.plan.blockedCandidateIds.length,
      proposedUpdates,
      proposedNoops,
      conflicts: conflictCount,
      imageUploadPlanItems: input.plan.imageUploadPlan.itemCount,
    },
    conflicts,
    inventoryAvailability: {
      sourceContainsConfirmedAvailability: false,
      proposedInventoryStateChanges: 0,
      note: "Current source files do not contain confirmed availability or quantity data; importer does not propose in_stock or fake quantity.",
    },
    actualApplyAllowed: actualApplyBlockers.length === 0,
    actualApplyBlockers,
  };
}

function markdownTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "_None._\n";
  }

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`),
    "",
  ].join("\n");
}

export function buildCatalogApplyDryRunMarkdown(summary: CatalogApplyDryRunSummary): string {
  return [
    "# Catalog Apply Dry Run",
    "",
    `Generated at: ${summary.generatedAt}`,
    `Preview generated at: ${summary.previewGeneratedAt}`,
    "",
    "## Eligibility",
    markdownTable(
      ["Status", "Count"],
      Object.entries(summary.statusBreakdown).map(([status, count]) => [status, String(count)]),
    ),
    "## Plan Counts",
    markdownTable(
      ["Entity", "Planned count"],
      Object.entries(summary.planCounts).map(([entity, count]) => [entity, String(count)]),
    ),
    "## Database Preflight",
    markdownTable(
      ["Check", "Result"],
      [
        ["Local Supabase config", summary.databasePreflight.localSupabaseProject.configPresent ? "present" : "missing"],
        ["Versioned migrations", summary.databasePreflight.localSupabaseProject.migrationsPresent ? "present" : "missing"],
        ["Remote link", summary.databasePreflight.remoteLink.linked ? "linked" : "missing"],
        ["Public URL configured", summary.databasePreflight.environment.publicUrlConfigured ? "yes" : "no"],
        ["Publishable key configured", summary.databasePreflight.environment.publishableKeyConfigured ? "yes" : "no"],
        ["Server admin secret key configured", summary.databasePreflight.environment.adminSecretKeyConfigured ? "yes" : "no"],
        ["Database comparison", summary.databaseComparisonStatus],
        ["Database blocker", summary.databasePreflight.database.blocker ?? "none"],
      ],
    ),
    "## Proposed Changes",
    markdownTable(
      ["Entity", "Inserts", "Updates", "No-op", "Conflicts"],
      Object.entries(summary.proposedChanges).map(([entity, count]) => [
        entity,
        String(count.inserts),
        String(count.updates),
        String(count.noops),
        String(count.conflicts),
      ]),
    ),
    "## Inventory And Availability",
    markdownTable(
      ["Metric", "Value"],
      [
        ["Confirmed source availability", summary.inventoryAvailability.sourceContainsConfirmedAvailability ? "yes" : "no"],
        ["Proposed inventory changes", String(summary.inventoryAvailability.proposedInventoryStateChanges)],
        ["Note", summary.inventoryAvailability.note],
      ],
    ),
    "## Image Upload Plan",
    markdownTable([ "Metric", "Count" ], [["Executable image upload items", String(summary.totals.imageUploadPlanItems)]]),
    "No Supabase Storage upload is executed by this dry run.",
    "",
    "## Actual Apply Gate",
    summary.actualApplyAllowed
      ? "Actual apply is allowed only with the exact confirmation token."
      : ["Actual apply is blocked:", ...summary.actualApplyBlockers.map((blocker) => `- ${blocker}`)].join("\n"),
    "",
  ].join("\n");
}

export async function writeCatalogApplyDryRun(input: {
  jsonPath: string;
  reportPath: string;
  summary: CatalogApplyDryRunSummary;
}): Promise<void> {
  await mkdir(path.dirname(input.jsonPath), { recursive: true });
  await mkdir(path.dirname(input.reportPath), { recursive: true });
  await writeFile(input.jsonPath, `${JSON.stringify(input.summary, null, 2)}\n`, "utf8");
  await writeFile(input.reportPath, buildCatalogApplyDryRunMarkdown(input.summary), "utf8");
}
