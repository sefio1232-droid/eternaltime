import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CatalogDatabasePreflight } from "../domain/database-apply-types";

export const requiredCatalogApplyTables = [
  "brands",
  "brand_collections",
  "watch_models",
  "watch_references",
  "catalog_offers",
  "offer_price_history",
  "import_batches",
  "import_rows",
  "audit_logs",
] as const;

export type CatalogApplyDatabaseClient = SupabaseClient;

export type CatalogApplyEnvironment = {
  supabaseUrl: string | null;
  serviceRoleKey: string | null;
  publishableKey: string | null;
};

function readMigrationFiles(rootDir: string): string[] {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");

  if (!existsSync(migrationsDir)) {
    return [];
  }

  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export function readCatalogApplyEnvironment(source: Record<string, string | undefined> = process.env): CatalogApplyEnvironment {
  return {
    supabaseUrl: source.NEXT_PUBLIC_SUPABASE_URL || source.SUPABASE_URL || null,
    publishableKey: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || source.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    serviceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY || source.SUPABASE_SERVICE_ROLE || null,
  };
}

export function createCatalogApplyDatabaseClient(env: CatalogApplyEnvironment): CatalogApplyDatabaseClient | null {
  if (!env.supabaseUrl || !env.serviceRoleKey) {
    return null;
  }

  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function checkRequiredTables(client: CatalogApplyDatabaseClient | null): Promise<{
  comparisonAvailable: boolean;
  blocker: string | null;
  checked: string[];
  missing: string[];
}> {
  if (!client) {
    return {
      comparisonAvailable: false,
      blocker: "Supabase URL or service role key is not configured for database comparison.",
      checked: [],
      missing: [...requiredCatalogApplyTables],
    };
  }

  const checked: string[] = [];
  const missing: string[] = [];

  for (const table of requiredCatalogApplyTables) {
    checked.push(table);
    const { error } = await client.from(table).select("*", { count: "exact", head: true });

    if (error) {
      missing.push(table);
    }
  }

  return {
    comparisonAvailable: missing.length === 0,
    blocker: missing.length > 0 ? `Required tables are unavailable: ${missing.join(", ")}` : null,
    checked,
    missing,
  };
}

export async function runCatalogDatabasePreflight(input: {
  rootDir: string;
  env?: CatalogApplyEnvironment;
  client?: CatalogApplyDatabaseClient | null;
}): Promise<CatalogDatabasePreflight> {
  const migrationFiles = readMigrationFiles(input.rootDir);
  const env = input.env ?? readCatalogApplyEnvironment();
  const client = input.client ?? createCatalogApplyDatabaseClient(env);
  const tableCheck = await checkRequiredTables(client);
  const supabaseConfigPath = path.join(input.rootDir, "supabase", "config.toml");
  const linkedProjectPath = path.join(input.rootDir, "supabase", ".temp", "project-ref");
  const linkedProjectJsonPath = path.join(input.rootDir, "supabase", ".temp", "linked-project.json");
  const linked = existsSync(linkedProjectPath) || existsSync(linkedProjectJsonPath);

  return {
    localSupabaseProject: {
      configPresent: existsSync(supabaseConfigPath),
      migrationsPresent: migrationFiles.length > 0,
      migrationFiles,
    },
    remoteLink: {
      linked,
      source: linked ? "supabase_temp" : "missing",
    },
    environment: {
      publicUrlConfigured: Boolean(env.supabaseUrl),
      publishableKeyConfigured: Boolean(env.publishableKey),
      serviceRoleKeyConfigured: Boolean(env.serviceRoleKey),
    },
    database: {
      comparisonAvailable: tableCheck.comparisonAvailable,
      blocker: tableCheck.blocker,
      requiredTablesChecked: tableCheck.checked,
      missingRequiredTables: tableCheck.missing,
    },
  };
}
