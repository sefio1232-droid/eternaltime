import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

type PublicReadModelRow = {
  watch_reference_id: string;
  brand_slug: string;
  reference_slug: string;
  reference_code_normalized: string | null;
  read_model_json: JsonRecord;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type CatalogOfferRow = {
  id: string;
  watch_reference_id: string;
  status: string;
  offer_kind: string | null;
  condition: string | null;
  sku: string | null;
  current_price_minor: number | string | null;
  previous_price_minor: number | string | null;
  currency_code: string | null;
  inventory_state_id: string | null;
  delivery_estimate_id: string | null;
  seller_note: string | null;
  purchase_limit: number | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  inventory_states?: {
    code: string;
    label: string;
    is_orderable: boolean;
  } | null;
  delivery_estimates?: {
    label: string | null;
    min_days: number | null;
    max_days: number | null;
  } | null;
};

type WatchReferenceRow = {
  id: string;
  reference_code_display: string | null;
  reference_code_normalized: string | null;
  slug: string | null;
  display_name: string | null;
  status: string | null;
  reference_status: string | null;
  brands?: {
    slug: string;
    name: string;
    status: string | null;
  } | null;
};

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const dryRun = args.has("--dry-run") || !apply;
const rootDir = process.cwd();

function loadEnv() {
  const envLocalPath = path.join(rootDir, ".env.local");
  const lines = readFileSync(envLocalPath, "utf8").split(/\r?\n/);
  const env = new Map<string, string>();
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) env.set(match[1], match[2]);
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.get("NEXT_PUBLIC_SUPABASE_URL");
const supabaseSecretKey = env.get("SUPABASE_SECRET_KEY");
if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local.");
}

const client = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function fetchAll<T>(table: string, select: string, orderCol = "id"): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(select).order(orderCol, { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function publicPriceMinor(row: PublicReadModelRow): number | null {
  const publicPrice = row.read_model_json.publicPrice as { amountMinor?: unknown } | undefined;
  const value = publicPrice?.amountMinor;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function publicCurrency(row: PublicReadModelRow): string | null {
  const publicPrice = row.read_model_json.publicPrice as { currencyCode?: unknown } | undefined;
  return typeof publicPrice?.currencyCode === "string" ? publicPrice.currencyCode : null;
}

function isLukia(ref: WatchReferenceRow | undefined, publicRow?: PublicReadModelRow): boolean {
  return /lukia/i.test(
    [
      ref?.display_name,
      ref?.reference_code_display,
      ref?.reference_code_normalized,
      ref?.slug,
      publicRow?.read_model_json.title,
      publicRow?.brand_slug,
      publicRow?.reference_slug,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function brandOfRef(ref: WatchReferenceRow | undefined): string | null {
  return ref?.brands?.slug ?? ref?.brands?.name ?? null;
}

async function main() {
  const publicRows = await fetchAll<PublicReadModelRow>(
    "catalog_public_read_models",
    "watch_reference_id,brand_slug,reference_slug,reference_code_normalized,read_model_json,status,created_at,updated_at",
    "watch_reference_id",
  );
  const offers = await fetchAll<CatalogOfferRow>(
    "catalog_offers",
    "id,watch_reference_id,status,offer_kind,condition,sku,current_price_minor,previous_price_minor,currency_code,inventory_state_id,delivery_estimate_id,seller_note,purchase_limit,is_visible,created_at,updated_at,inventory_states(code,label,is_orderable),delivery_estimates(label,min_days,max_days)",
    "id",
  );
  const refs = await fetchAll<WatchReferenceRow>(
    "watch_references",
    "id,reference_code_display,reference_code_normalized,slug,display_name,status,reference_status,brands(slug,name,status)",
    "id",
  );
  const { data: preorderState, error: preorderError } = await client
    .from("inventory_states")
    .select("id,code,is_orderable")
    .eq("code", "preorder")
    .eq("is_orderable", true)
    .single();
  if (preorderError || !preorderState?.id) {
    throw new Error("Orderable preorder inventory state was not found.");
  }

  const publicById = new Map(publicRows.map((row) => [row.watch_reference_id, row]));
  const refsById = new Map(refs.map((row) => [row.id, row]));
  const offersByRef = new Map<string, CatalogOfferRow[]>();
  for (const offer of offers) {
    const list = offersByRef.get(offer.watch_reference_id) ?? [];
    list.push(offer);
    offersByRef.set(offer.watch_reference_id, list);
  }

  const publicReports = publicRows.map((row) => {
    const list = offersByRef.get(row.watch_reference_id) ?? [];
    const exactPriceOffers = list.filter(
      (offer) => offer.currency_code === publicCurrency(row) && Number(offer.current_price_minor) === Number(publicPriceMinor(row)),
    );
    let bucket = "exact_1_to_1";
    if (list.length === 0) bucket = "public_without_offer";
    else if (list.length > 1) bucket = "multiple_offers";
    const priceMismatch = list.length > 0 && exactPriceOffers.length === 0;
    const invalidCurrency = list.some((offer) => offer.currency_code !== "RUB");
    const excludedLukia = isLukia(refsById.get(row.watch_reference_id), row);
    const canonicalActivationEligible = list.length === 1 && !priceMismatch && !invalidCurrency && !excludedLukia;
    const alreadyCanonical =
      canonicalActivationEligible &&
      list[0].status === "active" &&
      list[0].is_visible === true &&
      list[0].inventory_state_id === preorderState.id;
    const needsActivation = canonicalActivationEligible && !alreadyCanonical;
    return {
      brand: row.brand_slug,
      reference: row.reference_slug,
      referenceId: row.watch_reference_id,
      publicPriceMinor: publicPriceMinor(row),
      publicCurrency: publicCurrency(row),
      offerCount: list.length,
      offers: list,
      bucket,
      priceMismatch,
      invalidCurrency,
      excludedLukia,
      canonicalActivationEligible,
      alreadyCanonical,
      needsActivation,
    };
  });

  const eligible = publicReports.filter((row) => row.canonicalActivationEligible);
  const planned = publicReports.filter((row) => row.needsActivation);
  const alreadyCanonical = publicReports.filter((row) => row.alreadyCanonical);
  const skipped = publicReports.filter((row) => !row.canonicalActivationEligible);
  const orphanOffers = offers.filter((offer) => !publicById.has(offer.watch_reference_id));
  const runDir = path.join(rootDir, "artifacts", "commerce-cutover", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });

  const plannedOfferIds = planned.map((row) => row.offers[0].id);
  const snapshot = offers
    .filter((offer) => plannedOfferIds.includes(offer.id))
    .map((offer) => ({
      id: offer.id,
      watch_reference_id: offer.watch_reference_id,
      status: offer.status,
      is_visible: offer.is_visible,
      inventory_state_id: offer.inventory_state_id,
      current_price_minor: offer.current_price_minor,
      currency_code: offer.currency_code,
      updated_at: offer.updated_at,
    }));

  const byBrand: Record<string, { public: number; eligible: number; alreadyCanonical: number; planned: number; skipped: number }> = {};
  for (const row of publicReports) {
    byBrand[row.brand] ??= { public: 0, eligible: 0, alreadyCanonical: 0, planned: 0, skipped: 0 };
    byBrand[row.brand].public += 1;
    if (row.canonicalActivationEligible) byBrand[row.brand].eligible += 1;
    if (row.alreadyCanonical) byBrand[row.brand].alreadyCanonical += 1;
    if (row.needsActivation) byBrand[row.brand].planned += 1;
    if (!row.canonicalActivationEligible) byBrand[row.brand].skipped += 1;
  }

  const report = {
    mode: dryRun ? "dry-run" : "apply",
    publicReferences: publicRows.length,
    catalogOffers: offers.length,
    exactOneToOne: publicReports.filter((row) => row.bucket === "exact_1_to_1").length,
    multipleOffers: publicReports.filter((row) => row.bucket === "multiple_offers").length,
    publicWithoutOffer: publicReports.filter((row) => row.bucket === "public_without_offer").length,
    orphanOffers: orphanOffers.length,
    priceMismatch: publicReports.filter((row) => row.priceMismatch).length,
    invalidCurrency: publicReports.filter((row) => row.invalidCurrency).length,
    excludedLukiaPublic: publicReports.filter((row) => row.excludedLukia).length,
    eligibleForActivation: eligible.length,
    alreadyCanonical: alreadyCanonical.length,
    rowsPlanned: plannedOfferIds.length,
    rowsSkipped: skipped.length,
    inventoryState: { code: preorderState.code, id: preorderState.id },
    byBrand,
    skippedPublicReferences: skipped.map((row) => ({
      brand: row.brand,
      reference: row.reference,
      referenceId: row.referenceId,
      reason: row.excludedLukia
        ? "excluded_lukia"
        : row.bucket === "public_without_offer"
          ? "missing_offer"
          : row.bucket === "multiple_offers"
            ? "multiple_offers"
            : row.priceMismatch
              ? "price_mismatch"
              : row.invalidCurrency
                ? "invalid_currency"
                : "other",
    })),
    orphanOfferRows: orphanOffers.map((offer) => {
      const ref = refsById.get(offer.watch_reference_id);
      return {
        offerId: offer.id,
        referenceId: offer.watch_reference_id,
        brand: brandOfRef(ref),
        reference: ref?.slug ?? ref?.reference_code_normalized ?? null,
        displayName: ref?.display_name ?? null,
        status: offer.status,
        isVisible: offer.is_visible,
        priceMinor: offer.current_price_minor,
        currency: offer.currency_code,
      };
    }),
  };

  writeFileSync(path.join(runDir, "before-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(path.join(runDir, "dry-run-plan.json"), `${JSON.stringify(report, null, 2)}\n`);

  let rowsUpdated = 0;
  if (apply) {
    for (const ids of chunk(plannedOfferIds, 100)) {
      const { data, error } = await client
        .from("catalog_offers")
        .update({
          status: "active",
          is_visible: true,
          inventory_state_id: preorderState.id,
        })
        .in("id", ids)
        .select("id");
      if (error) throw new Error(`catalog_offers update failed: ${error.message}`);
      rowsUpdated += data?.length ?? 0;
    }

    const { error: auditError } = await client.from("audit_logs").insert({
      action: "catalog_offers.canonical_cutover",
      entity_type: "catalog_offer",
      entity_id: null,
      safe_metadata_json: {
        rows_planned: plannedOfferIds.length,
        rows_updated: rowsUpdated,
        rows_skipped: skipped.length,
        public_references: publicRows.length,
        catalog_offers: offers.length,
        artifact: path.relative(rootDir, runDir),
      },
    });
    if (auditError) throw new Error(`audit log insert failed: ${auditError.message}`);
  }

  const finalReport = {
    ...report,
    rowsUpdated,
    snapshotPath: path.relative(rootDir, path.join(runDir, "before-snapshot.json")),
    planPath: path.relative(rootDir, path.join(runDir, "dry-run-plan.json")),
  };
  writeFileSync(path.join(runDir, "result.json"), `${JSON.stringify(finalReport, null, 2)}\n`);
  writeFileSync(
    path.join(runDir, "summary.txt"),
    [
      `MODE=${finalReport.mode}`,
      `PUBLIC_REFERENCES=${finalReport.publicReferences}`,
      `CATALOG_OFFERS=${finalReport.catalogOffers}`,
      `EXACT_1_TO_1=${finalReport.exactOneToOne}`,
      `MULTIPLE_OFFERS=${finalReport.multipleOffers}`,
      `PUBLIC_WITHOUT_OFFER=${finalReport.publicWithoutOffer}`,
      `ORPHAN_OFFERS=${finalReport.orphanOffers}`,
      `PRICE_MISMATCH=${finalReport.priceMismatch}`,
      `INVALID_CURRENCY=${finalReport.invalidCurrency}`,
      `EXCLUDED_LUKIA_PUBLIC=${finalReport.excludedLukiaPublic}`,
      `ALREADY_CANONICAL=${finalReport.alreadyCanonical}`,
      `ROWS_PLANNED=${finalReport.rowsPlanned}`,
      `ROWS_UPDATED=${finalReport.rowsUpdated}`,
      `ROWS_SKIPPED=${finalReport.rowsSkipped}`,
      `SNAPSHOT=${finalReport.snapshotPath}`,
      `PLAN=${finalReport.planPath}`,
    ].join("\n") + "\n",
  );
  console.log(readFileSync(path.join(runDir, "summary.txt"), "utf8"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
