import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  applyMasterPatchToWatch,
  attachMasterSiblingReferences,
  buildMasterImportPatches,
  countProhibitedSpecifications,
  masterCharacteristicsApplyConfirmationPhrase,
  parseMasterWorkbook,
  type MasterBrandSlug,
  type MasterImportPatch,
} from "@/modules/imports/catalog/application/master-characteristics-import";
import type { CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import { referenceSlugFromNormalized } from "@/modules/catalog/domain/reference-normalization";

type CatalogReadModelRow = {
  watch_reference_id: string;
  brand_slug: string;
  reference_code_normalized: string;
  reference_slug: string;
  read_model_json: CatalogWatchDetail;
};

type MatchedPatch = {
  patch: MasterImportPatch;
  row: CatalogReadModelRow;
};

const rootDir = process.cwd();
const workbookSources: Array<{ brandSlug: MasterBrandSlug; sourceFile: string; expectedRows: number }> = [
  {
    brandSlug: "orient",
    sourceFile: "C:/Users/Sergey/Downloads/EternalTime_Orient_MASTER_FINAL_v2 (1).xlsx",
    expectedRows: 82,
  },
  {
    brandSlug: "citizen",
    sourceFile: "C:/Users/Sergey/Downloads/EternalTime_Citizen_MASTER_FINAL.xlsx",
    expectedRows: 25,
  },
  {
    brandSlug: "tissot",
    sourceFile: "C:/Users/Sergey/Downloads/EternalTime_Tissot_MASTER_FINAL_160.xlsx",
    expectedRows: 160,
  },
  {
    brandSlug: "casio",
    sourceFile: "C:/Users/Sergey/Downloads/EternalTime_Casio_MASTER_FINAL_215 (1).xlsx",
    expectedRows: 215,
  },
  {
    brandSlug: "seiko",
    sourceFile: "C:/Users/Sergey/Downloads/EternalTime_Seiko_MASTER_FINAL_73 (1).xlsx",
    expectedRows: 73,
  },
];
const scopedBrands = workbookSources.map((source) => source.brandSlug);
const reportDir = path.join(rootDir, "imports", "reports", "master-characteristics");
const generatedDir = path.join(rootDir, "imports", "generated", "master-characteristics");

function argsHas(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(prefix: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function normalizeJson(value: unknown): string {
  return JSON.stringify(value);
}

function changedKeys(before: CatalogWatchDetail, after: CatalogWatchDetail): string[] {
  const keys = new Set([...before.specifications.map((spec) => spec.key), ...after.specifications.map((spec) => spec.key)]);
  return [...keys].filter((key) => {
    const beforeValue = before.specifications.find((spec) => spec.key === key)?.value ?? null;
    const afterValue = after.specifications.find((spec) => spec.key === key)?.value ?? null;
    return beforeValue !== afterValue;
  });
}

function changedSeo(before: CatalogWatchDetail, after: CatalogWatchDetail): boolean {
  return "seoOverlay" in before || "seoOverlay" in after;
}

function hasSemanticReadModelChange(before: CatalogReadModelRow | undefined, after: CatalogReadModelRow): boolean {
  if (!before) return true;
  return (
    before.reference_code_normalized !== after.reference_code_normalized ||
    before.reference_slug !== after.reference_slug ||
    changedKeys(before.read_model_json, after.read_model_json).length > 0 ||
    changedSeo(before.read_model_json, after.read_model_json)
  );
}

function photoActionCounts(patches: MasterImportPatch[]): Record<string, number> {
  return patches.reduce<Record<string, number>>((counts, patch) => {
    const key = patch.photoAction || "(blank)";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueRows(rows: Array<CatalogReadModelRow | undefined>): CatalogReadModelRow[] {
  const byId = new Map<string, CatalogReadModelRow>();
  for (const row of rows) {
    if (row) byId.set(row.watch_reference_id, row);
  }
  return [...byId.values()];
}

function summarizeRows(input: {
  rows: CatalogReadModelRow[];
  patches: MasterImportPatch[];
  matched: MatchedPatch[];
  missing: MasterImportPatch[];
  ambiguous: Array<{ patch: MasterImportPatch; matches: CatalogReadModelRow[] }>;
  updateRows: CatalogReadModelRow[];
}) {
  const { rows, patches, matched, missing, ambiguous, updateRows } = input;
  const beforeById = new Map(rows.map((row) => [row.watch_reference_id, row]));
  const beforePrice = new Map(rows.map((row) => [row.watch_reference_id, normalizeJson(row.read_model_json.publicPrice)]));
  const afterPrice = new Map(updateRows.map((row) => [row.watch_reference_id, normalizeJson(row.read_model_json.publicPrice)]));
  const priceChanges = [...afterPrice.entries()].filter(([id, value]) => beforePrice.get(id) !== value);
  const byBrand = (brand: MasterBrandSlug) => patches.filter((patch) => patch.brandSlug === brand);
  const matchedByBrand = (brand: MasterBrandSlug) => matched.filter((entry) => entry.patch.brandSlug === brand);
  const missingByBrand = (brand: MasterBrandSlug) => missing.filter((patch) => patch.brandSlug === brand);
  const ambiguousByBrand = (brand: MasterBrandSlug) => ambiguous.filter((entry) => entry.patch.brandSlug === brand);
  const updatedByBrand = (brand: MasterBrandSlug) =>
    updateRows.filter((row) => row.brand_slug === brand && hasSemanticReadModelChange(beforeById.get(row.watch_reference_id), row));

  return {
    generatedAt: new Date().toISOString(),
    sourceFiles: workbookSources.map((source) => source.sourceFile),
    scope: Object.fromEntries(scopedBrands.map((brand) => [brand, byBrand(brand).length])) as Record<MasterBrandSlug, number>,
    expectedScope: Object.fromEntries(workbookSources.map((source) => [source.brandSlug, source.expectedRows])) as Record<MasterBrandSlug, number>,
    totalScope: patches.length,
    databaseRowsRead: rows.length,
    matchedRows: matched.length,
    missingRows: missing.length,
    ambiguousRows: ambiguous.length,
    databaseRowsScheduledForUpdate: updateRows.length,
    priceChanges: priceChanges.length,
    prohibitedSpecificationsAfter: updateRows.reduce(
      (sum, row) => sum + countProhibitedSpecifications(row.read_model_json.specifications),
      0,
    ),
    perBrand: Object.fromEntries(
      scopedBrands.map((brand) => {
        const brandPatches = byBrand(brand);
        const brandUpdateRows = updateRows.filter((row) => row.brand_slug === brand);
        return [
          brand,
          {
            scope: brandPatches.length,
            expectedScope: workbookSources.find((source) => source.brandSlug === brand)?.expectedRows ?? null,
            matched: matchedByBrand(brand).length,
            missing: missingByBrand(brand).length,
            ambiguous: ambiguousByBrand(brand).length,
            scheduledForUpdate: brandUpdateRows.length,
            updated: updatedByBrand(brand).length,
            functionsRows: brandPatches.reduce(
              (sum, patch) => sum + (patch.specifications.some((spec) => spec.key === "functions_raw") ? 1 : 0),
              0,
            ),
            seoRows: brandPatches.filter((patch) => patch.seo).length,
            photoActions: photoActionCounts(brandPatches),
          },
        ];
      }),
    ) as Record<
      MasterBrandSlug,
      {
        scope: number;
        expectedScope: number | null;
        matched: number;
        missing: number;
        ambiguous: number;
        scheduledForUpdate: number;
        updated: number;
        functionsRows: number;
        seoRows: number;
        photoActions: Record<string, number>;
      }
    >,
    referenceCorrections: updateRows
      .filter((row) => row.reference_code_normalized !== beforeById.get(row.watch_reference_id)?.reference_code_normalized)
      .map((row) => ({
        brandSlug: row.brand_slug,
        watchReferenceId: row.watch_reference_id,
        beforeReferenceNormalized: beforeById.get(row.watch_reference_id)?.reference_code_normalized,
        afterReferenceNormalized: row.reference_code_normalized,
        referenceSlug: row.reference_slug,
      })),
    changed: updateRows.map((row) => {
      const before = beforeById.get(row.watch_reference_id);
      return {
        brandSlug: row.brand_slug,
        referenceNormalized: row.reference_code_normalized,
        referenceSlug: row.reference_slug,
        changedSpecificationKeys: before ? changedKeys(before.read_model_json, row.read_model_json) : [],
        seoChanged: before ? changedSeo(before.read_model_json, row.read_model_json) : false,
        specificationCountBefore: before?.read_model_json.specifications.length ?? 0,
        specificationCountAfter: row.read_model_json.specifications.length,
        keySpecificationCountAfter: row.read_model_json.keySpecifications.length,
      };
    }),
    missing: missing.map((patch) => ({
      brandSlug: patch.brandSlug,
      referenceNormalized: patch.referenceNormalized,
      lookupReferenceNormalizedCandidates: patch.lookupReferenceNormalizedCandidates,
    })),
    ambiguous: ambiguous.map((entry) => ({
      brandSlug: entry.patch.brandSlug,
      referenceNormalized: entry.patch.referenceNormalized,
      matches: entry.matches.map((row) => ({
        watchReferenceId: row.watch_reference_id,
        referenceNormalized: row.reference_code_normalized,
        referenceSlug: row.reference_slug,
      })),
    })),
  };
}

function markdownReport(summary: ReturnType<typeof summarizeRows>, blockers: string[]): string {
  const changedCount = summary.changed.filter((row) => row.changedSpecificationKeys.length > 0 || row.seoChanged).length;
  return [
    "# MASTER Characteristics Import — 5 Brands",
    "",
    `Generated at: ${summary.generatedAt}`,
    "",
    "## Source files",
    "",
    ...summary.sourceFiles.map((file) => `- ${file}`),
    "",
    "## Scope",
    "",
    "| Brand | Expected | Parsed | Matched | Missing | Ambiguous | Scheduled update | Updated diff | SEO rows | Function spec rows | Photo actions |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...scopedBrands.map((brand) => {
      const row = summary.perBrand[brand];
      const actions = Object.entries(row.photoActions).map(([key, value]) => `${key}: ${value}`).join("; ");
      return `| ${brand} | ${row.expectedScope ?? "—"} | ${row.scope} | ${row.matched} | ${row.missing} | ${row.ambiguous} | ${row.scheduledForUpdate} | ${row.updated} | ${row.seoRows} | ${row.functionsRows} | ${actions || "—"} |`;
    }),
    "",
    "## Safety",
    "",
    "- Only rows matched from the 5 MASTER scopes are scheduled for DB update.",
    "- Prices/offers/commercial fields are not imported.",
    "- Case color, band color, strap color, bracelet color, and visual positioning are not emitted.",
    `- Price changes expected: 0`,
    `- Price changes detected: ${summary.priceChanges}`,
    `- Prohibited public color/visual keys after patch: ${summary.prohibitedSpecificationsAfter}`,
    "",
    "## Changes",
    "",
    `- DB read-model rows read for scoped brands: ${summary.databaseRowsRead}`,
    `- Rows scheduled for update: ${summary.databaseRowsScheduledForUpdate}`,
    `- Rows with changed specifications or SEO: ${changedCount}`,
    `- Reference corrections: ${summary.referenceCorrections.length}`,
    "",
    blockers.length > 0 ? ["## Blockers", "", ...blockers.map((blocker) => `- ${blocker}`), ""].join("\n") : "## Blockers\n\n_None._\n",
    "## Reference corrections",
    "",
    summary.referenceCorrections.length > 0
      ? [
          "| Brand | Before | After | Slug |",
          "| --- | --- | --- | --- |",
          ...summary.referenceCorrections.map(
            (row) => `| ${row.brandSlug} | ${row.beforeReferenceNormalized ?? "—"} | ${row.afterReferenceNormalized} | ${row.referenceSlug} |`,
          ),
        ].join("\n")
      : "_None._",
    "",
    "## Missing / ambiguous",
    "",
    summary.missing.length > 0
      ? [
          "### Missing",
          "",
          "| Brand | Reference | Lookup candidates |",
          "| --- | --- | --- |",
          ...summary.missing.map(
            (row) => `| ${row.brandSlug} | ${row.referenceNormalized} | ${row.lookupReferenceNormalizedCandidates.join(", ")} |`,
          ),
        ].join("\n")
      : "### Missing\n\n_None._",
    "",
    summary.ambiguous.length > 0
      ? [
          "### Ambiguous",
          "",
          "| Brand | Reference | Matches |",
          "| --- | --- | --- |",
          ...summary.ambiguous.map(
            (row) => `| ${row.brandSlug} | ${row.referenceNormalized} | ${row.matches.map((match) => `${match.referenceNormalized}/${match.referenceSlug}`).join(", ")} |`,
          ),
        ].join("\n")
      : "### Ambiguous\n\n_None._",
    "",
    "## Per-reference diff",
    "",
    "| Brand | Reference | Specs before | Specs after | SEO changed | Changed spec keys |",
    "| --- | --- | ---: | ---: | --- | --- |",
    ...summary.changed.map((row) =>
      `| ${row.brandSlug} | ${row.referenceNormalized} | ${row.specificationCountBefore} | ${row.specificationCountAfter} | ${row.seoChanged ? "yes" : "no"} | ${row.changedSpecificationKeys.join(", ") || "—"} |`,
    ),
    "",
  ].join("\n");
}

function buildMasterSeoOverlayReport(patches: MasterImportPatch[]) {
  return {
    generatedAt: new Date().toISOString(),
    sourceFiles: workbookSources.map((source) => source.sourceFile),
    entries: patches.map((patch) => ({
      catalogReference: patch.referenceDisplay,
      referenceNormalized: patch.referenceNormalized,
      brandSlug: patch.brandSlug,
      specifications: Object.fromEntries(patch.specifications.map((specification) => [specification.key, specification.value])),
      seoTitle: patch.seo?.title ?? null,
      metaDescription: patch.seo?.metaDescription ?? null,
      shortDescription: null,
      longDescription: patch.seo?.overview ?? null,
    })),
    unmatchedRows: [],
  };
}

async function main() {
  loadEnvConfig(rootDir);

  const apply = argsHas("--apply");
  const confirmation = argValue("--confirm-apply=");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase URL or server admin secret key is not configured.");
  }

  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const workbooks = workbookSources.map((source) =>
    parseMasterWorkbook({ brandSlug: source.brandSlug, sourceFile: source.sourceFile }),
  );
  const patches = buildMasterImportPatches(workbooks);
  const blockers: string[] = workbooks.flatMap((workbook) => workbook.warnings);

  for (const source of workbookSources) {
    const brandRows = patches.filter((patch) => patch.brandSlug === source.brandSlug);
    const unique = new Set(brandRows.map((row) => row.referenceNormalized));
    if (brandRows.length !== source.expectedRows) {
      blockers.push(`${source.brandSlug}: expected ${source.expectedRows} MASTER rows, parsed ${brandRows.length}.`);
    }
    if (brandRows.length !== unique.size) blockers.push(`${source.brandSlug}: duplicate references in MASTER.`);
  }

  const { data: rowsData, error: rowsError } = await client
    .from("catalog_public_read_models")
    .select("watch_reference_id,brand_slug,reference_code_normalized,reference_slug,read_model_json")
    .in("brand_slug", scopedBrands);
  if (rowsError) throw rowsError;

  const rows = (rowsData ?? []) as CatalogReadModelRow[];
  const rowByBrandReference = new Map(rows.map((row) => [`${row.brand_slug}:${row.reference_code_normalized}`, row]));
  const patchedById = new Map(rows.map((row) => [row.watch_reference_id, { ...row, read_model_json: { ...row.read_model_json } }]));
  const matched: MatchedPatch[] = [];
  const missing: MasterImportPatch[] = [];
  const ambiguous: Array<{ patch: MasterImportPatch; matches: CatalogReadModelRow[] }> = [];

  for (const patch of patches) {
    const matches = uniqueRows(
      patch.lookupReferenceNormalizedCandidates.map((candidate) =>
        rowByBrandReference.get(`${patch.brandSlug}:${candidate}`),
      ),
    );

    if (matches.length === 0) {
      missing.push(patch);
      blockers.push(`${patch.brandSlug} ${patch.referenceNormalized}: missing in production catalog_public_read_models.`);
      continue;
    }
    if (matches.length > 1) {
      ambiguous.push({ patch, matches });
      blockers.push(`${patch.brandSlug} ${patch.referenceNormalized}: one MASTER row matches multiple production rows.`);
      continue;
    }

    const row = matches[0]!;
    const nextWatch = applyMasterPatchToWatch(row.read_model_json, patch);
    matched.push({ patch, row });
    patchedById.set(row.watch_reference_id, {
      ...row,
      brand_slug: patch.brandSlug,
      reference_code_normalized: patch.referenceNormalized,
      reference_slug: patch.referenceSlug,
      read_model_json: nextWatch,
    });
  }

  const allPatchedRows = attachMasterSiblingReferences([...patchedById.values()].map((row) => row.read_model_json)).map((watch) => {
    const row = [...patchedById.values()].find((candidate) => candidate.read_model_json.id === watch.id);
    if (!row) throw new Error(`Could not reattach row for ${watch.id}`);
    return { ...row, read_model_json: watch };
  });
  const matchedIds = new Set(matched.map((entry) => entry.row.watch_reference_id));
  const updateRows = allPatchedRows.filter((row) => matchedIds.has(row.watch_reference_id));

  const summary = summarizeRows({ rows, patches, matched, missing, ambiguous, updateRows });
  if (summary.priceChanges !== 0) blockers.push("Price snapshot changed inside read models.");
  if (summary.prohibitedSpecificationsAfter !== 0) blockers.push("Prohibited case/band/strap/bracelet color or visual positioning keys remain.");

  await mkdir(reportDir, { recursive: true });
  await mkdir(generatedDir, { recursive: true });
  await writeFile(path.join(generatedDir, "dry-run.json"), `${JSON.stringify({ summary, blockers }, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "dry-run.md"), markdownReport(summary, blockers), "utf8");
  await writeFile(path.join(generatedDir, "master-seo-overlay.json"), `${JSON.stringify(buildMasterSeoOverlayReport(patches), null, 2)}\n`, "utf8");

  console.log(`MASTER dry-run written: ${path.join(generatedDir, "dry-run.json")}`);
  console.log(`MASTER dry-run report written: ${path.join(reportDir, "dry-run.md")}`);
  console.log(`MASTER SEO/spec report written: ${path.join(generatedDir, "master-seo-overlay.json")}`);
  for (const brand of scopedBrands) {
    const row = summary.perBrand[brand];
    console.log(`${brand}=scope:${row.scope},matched:${row.matched},missing:${row.missing},ambiguous:${row.ambiguous},updated:${row.updated}`);
  }
  console.log(`price_changes=${summary.priceChanges}`);
  console.log(`blockers=${blockers.length}`);

  if (!apply) return;
  if (confirmation !== masterCharacteristicsApplyConfirmationPhrase) {
    throw new Error(`Exact confirmation phrase required: --confirm-apply=${masterCharacteristicsApplyConfirmationPhrase}`);
  }
  if (blockers.length > 0) {
    throw new Error(`MASTER apply blocked: ${blockers.join("; ")}`);
  }

  const backupTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(generatedDir, `backup-before-apply-${backupTimestamp}.json`);
  await writeFile(
    backupPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rows: matched.map((entry) => entry.row),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  for (const row of updateRows) {
    const before = rows.find((candidate) => candidate.watch_reference_id === row.watch_reference_id);
    if (!before) throw new Error(`Could not find before-row for ${row.watch_reference_id}`);

    if (row.reference_code_normalized !== before.reference_code_normalized || row.reference_slug !== before.reference_slug) {
      const { error: referenceError } = await client
        .from("watch_references")
        .update({
          reference_code_display: row.read_model_json.referenceDisplay,
          slug: referenceSlugFromNormalized(row.reference_code_normalized),
        })
        .eq("id", row.watch_reference_id);
      if (referenceError) throw referenceError;
    }

    const { error: updateError } = await client
      .from("catalog_public_read_models")
      .update({
        brand_slug: row.brand_slug,
        reference_slug: row.reference_slug,
        reference_code_normalized: row.reference_code_normalized,
        read_model_json: row.read_model_json,
        status: "published",
      })
      .eq("watch_reference_id", row.watch_reference_id);
    if (updateError) throw updateError;
  }

  await writeFile(path.join(generatedDir, "apply-result.json"), `${JSON.stringify({ applied: true, backupPath, summary }, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "apply-result.md"), markdownReport(summary, []), "utf8");
  console.log(`MASTER backup written: ${backupPath}`);
  console.log(`MASTER apply result written: ${path.join(generatedDir, "apply-result.json")}`);
  console.log("MASTER characteristics apply executed.");
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(JSON.stringify(error, null, 2));
  }
  process.exitCode = 1;
});
