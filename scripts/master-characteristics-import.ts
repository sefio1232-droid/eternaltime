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

const rootDir = process.cwd();
const orientWorkbookPath = "C:/Users/Sergey/Downloads/EternalTime_Orient_MASTER_FINAL_v2 (1).xlsx";
const citizenWorkbookPath = "C:/Users/Sergey/Downloads/EternalTime_Citizen_MASTER_FINAL.xlsx";
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

function summarizeRows(rows: CatalogReadModelRow[], patches: MasterImportPatch[], patchedRows: CatalogReadModelRow[]) {
  const beforePrice = new Map(rows.map((row) => [row.watch_reference_id, normalizeJson(row.read_model_json.publicPrice)]));
  const afterPrice = new Map(patchedRows.map((row) => [row.watch_reference_id, normalizeJson(row.read_model_json.publicPrice)]));
  const priceChanges = [...beforePrice.entries()].filter(([id, value]) => afterPrice.get(id) !== value);
  const byBrand = (brand: MasterBrandSlug) => patches.filter((patch) => patch.brandSlug === brand);

  return {
    generatedAt: new Date().toISOString(),
    sourceFiles: [orientWorkbookPath, citizenWorkbookPath],
    scope: {
      orient: byBrand("orient").length,
      citizen: byBrand("citizen").length,
      total: patches.length,
    },
    databaseRowsRead: rows.length,
    databaseRowsPatched: patchedRows.length,
    priceChanges: priceChanges.length,
    prohibitedSpecificationsAfter: patchedRows.reduce(
      (sum, row) => sum + countProhibitedSpecifications(row.read_model_json.specifications),
      0,
    ),
    referenceCorrections: patchedRows
      .filter((row) => row.reference_code_normalized !== rows.find((candidate) => candidate.watch_reference_id === row.watch_reference_id)?.reference_code_normalized)
      .map((row) => ({
        brandSlug: row.brand_slug,
        watchReferenceId: row.watch_reference_id,
        referenceNormalized: row.reference_code_normalized,
        referenceSlug: row.reference_slug,
      })),
    changed: patchedRows.map((row) => {
      const before = rows.find((candidate) => candidate.watch_reference_id === row.watch_reference_id);
      return {
        brandSlug: row.brand_slug,
        referenceNormalized: row.reference_code_normalized,
        referenceSlug: row.reference_slug,
        changedSpecificationKeys: before ? changedKeys(before.read_model_json, row.read_model_json) : [],
        specificationCountBefore: before?.read_model_json.specifications.length ?? 0,
        specificationCountAfter: row.read_model_json.specifications.length,
        keySpecificationCountAfter: row.read_model_json.keySpecifications.length,
      };
    }),
  };
}

function markdownReport(summary: ReturnType<typeof summarizeRows>, blockers: string[]): string {
  const changedCount = summary.changed.filter((row) => row.changedSpecificationKeys.length > 0).length;
  return [
    "# MASTER Characteristics Import — Orient + Citizen",
    "",
    `Generated at: ${summary.generatedAt}`,
    "",
    "## Scope",
    "",
    `- Orient: ${summary.scope.orient}`,
    `- Citizen: ${summary.scope.citizen}`,
    `- Total: ${summary.scope.total}`,
    "",
    "## Safety",
    "",
    `- Price changes expected: 0`,
    `- Price changes detected: ${summary.priceChanges}`,
    `- Prohibited public color/visual keys after patch: ${summary.prohibitedSpecificationsAfter}`,
    "",
    "## Changes",
    "",
    `- DB read-model rows read: ${summary.databaseRowsRead}`,
    `- DB read-model rows patched: ${summary.databaseRowsPatched}`,
    `- Rows with changed specifications: ${changedCount}`,
    `- Reference corrections: ${summary.referenceCorrections.length}`,
    "",
    blockers.length > 0 ? ["## Blockers", "", ...blockers.map((blocker) => `- ${blocker}`), ""].join("\n") : "## Blockers\n\n_None._\n",
    "## Per-reference diff",
    "",
    "| Brand | Reference | Specs before | Specs after | Changed keys |",
    "| --- | --- | ---: | ---: | --- |",
    ...summary.changed.map((row) =>
      `| ${row.brandSlug} | ${row.referenceNormalized} | ${row.specificationCountBefore} | ${row.specificationCountAfter} | ${row.changedSpecificationKeys.join(", ") || "—"} |`,
    ),
    "",
  ].join("\n");
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
  const workbooks = [
    parseMasterWorkbook({ brandSlug: "orient", sourceFile: orientWorkbookPath }),
    parseMasterWorkbook({ brandSlug: "citizen", sourceFile: citizenWorkbookPath }),
  ];
  const patches = buildMasterImportPatches(workbooks);
  const blockers: string[] = workbooks.flatMap((workbook) => workbook.warnings);

  for (const brand of ["orient", "citizen"] as const) {
    const brandRows = patches.filter((patch) => patch.brandSlug === brand);
    const unique = new Set(brandRows.map((row) => row.referenceNormalized));
    if (brandRows.length !== unique.size) blockers.push(`${brand}: duplicate references in MASTER.`);
  }

  const { data: rowsData, error: rowsError } = await client
    .from("catalog_public_read_models")
    .select("watch_reference_id,brand_slug,reference_code_normalized,reference_slug,read_model_json")
    .in("brand_slug", ["orient", "citizen"]);
  if (rowsError) throw rowsError;

  const rows = (rowsData ?? []) as CatalogReadModelRow[];
  const rowByBrandReference = new Map(rows.map((row) => [`${row.brand_slug}:${row.reference_code_normalized}`, row]));
  const patchedById = new Map(rows.map((row) => [row.watch_reference_id, { ...row, read_model_json: { ...row.read_model_json } }]));

  for (const patch of patches) {
    const exact = rowByBrandReference.get(`${patch.brandSlug}:${patch.referenceNormalized}`);
    const alias = rowByBrandReference.get(`${patch.brandSlug}:${patch.lookupReferenceNormalized}`);
    const matches = [exact, alias].filter((row, index, all): row is CatalogReadModelRow => Boolean(row) && all.indexOf(row) === index);
    if (matches.length === 0) {
      blockers.push(`${patch.brandSlug} ${patch.referenceNormalized}: missing in production catalog_public_read_models.`);
      continue;
    }
    if (matches.length > 1) {
      blockers.push(`${patch.brandSlug} ${patch.referenceNormalized}: one MASTER row matches multiple production rows.`);
      continue;
    }

    const row = matches[0]!;
    const nextWatch = applyMasterPatchToWatch(row.read_model_json, patch);
    patchedById.set(row.watch_reference_id, {
      ...row,
      brand_slug: patch.brandSlug,
      reference_code_normalized: patch.referenceNormalized,
      reference_slug: patch.referenceSlug,
      read_model_json: nextWatch,
    });
  }

  const patchedRows = attachMasterSiblingReferences([...patchedById.values()].map((row) => row.read_model_json)).map((watch) => {
    const row = [...patchedById.values()].find((candidate) => candidate.read_model_json.id === watch.id);
    if (!row) throw new Error(`Could not reattach row for ${watch.id}`);
    return { ...row, read_model_json: watch };
  });

  const summary = summarizeRows(rows, patches, patchedRows);
  if (summary.priceChanges !== 0) blockers.push("Price snapshot changed inside read models.");
  if (summary.prohibitedSpecificationsAfter !== 0) blockers.push("Prohibited case/band/strap/bracelet color or visual positioning keys remain.");

  await mkdir(reportDir, { recursive: true });
  await mkdir(generatedDir, { recursive: true });
  await writeFile(path.join(generatedDir, "dry-run.json"), `${JSON.stringify({ summary, blockers }, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "dry-run.md"), markdownReport(summary, blockers), "utf8");

  console.log(`MASTER dry-run written: ${path.join(generatedDir, "dry-run.json")}`);
  console.log(`MASTER dry-run report written: ${path.join(reportDir, "dry-run.md")}`);
  console.log(`orient=${summary.scope.orient}`);
  console.log(`citizen=${summary.scope.citizen}`);
  console.log(`price_changes=${summary.priceChanges}`);
  console.log(`blockers=${blockers.length}`);

  if (!apply) return;
  if (confirmation !== masterCharacteristicsApplyConfirmationPhrase) {
    throw new Error(`Exact confirmation phrase required: --confirm-apply=${masterCharacteristicsApplyConfirmationPhrase}`);
  }
  if (blockers.length > 0) {
    throw new Error(`MASTER apply blocked: ${blockers.join("; ")}`);
  }

  for (const row of patchedRows) {
    if (row.reference_code_normalized !== rows.find((before) => before.watch_reference_id === row.watch_reference_id)?.reference_code_normalized) {
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

  await writeFile(path.join(generatedDir, "apply-result.json"), `${JSON.stringify({ applied: true, summary }, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportDir, "apply-result.md"), markdownReport(summary, []), "utf8");
  console.log(`MASTER apply result written: ${path.join(generatedDir, "apply-result.json")}`);
  console.log("MASTER characteristics apply executed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown MASTER characteristics import failure.");
  process.exitCode = 1;
});
