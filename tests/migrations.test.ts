import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
const migrations = migrationFiles.map((file) => ({
  file,
  sql: readFileSync(join(migrationsDir, file), "utf8"),
}));
const allSql = migrations.map((migration) => migration.sql).join("\n");

describe("database migrations", () => {
  it("keeps a versioned migration history in dependency order", () => {
    expect(migrationFiles).toEqual([
      "20260705010000_foundation_extensions.sql",
      "20260705011000_identity_roles.sql",
      "20260705012000_catalog_dimensions.sql",
      "20260705013000_catalog_identity.sql",
      "20260705014000_commercial_state_and_media.sql",
      "20260705015000_rls_policies.sql",
      "20260706010000_import_apply_operations.sql",
      "20260711010000_user_watch_collection.sql",
      "20260811010000_commerce_orders_payments.sql",
    ]);
  });

  it("does not reintroduce watch_variants", () => {
    expect(allSql).not.toMatch(/watch_variants/i);
  });

  it("enforces core reference identity constraints", () => {
    expect(allSql).toContain("unique (brand_id, reference_code_normalized)");
    expect(allSql).toContain("reference_code_normalized text generated always");
    expect(allSql).toContain("public.normalize_reference_code(reference_code_display)");
  });

  it("keeps documented catalog uniqueness scopes", () => {
    expect(allSql).toContain("unique (brand_id, slug)");
    expect(allSql).toContain("unique (brand_id, reference_code_normalized)");
    expect(allSql).toContain("catalog_offers_one_visible_active_standard_new_offer");
  });

  it("enables RLS for identity, catalog, commercial, and media tables", () => {
    for (const table of [
      "profiles",
      "user_roles",
      "brands",
      "brand_collections",
      "brand_lines",
      "watch_models",
      "watch_references",
      "catalog_offers",
      "offer_price_history",
      "inventory_events",
      "watch_images",
      "import_batches",
      "import_rows",
      "audit_logs",
      "user_watch_collections",
      "user_watches",
      "user_watch_source_data",
      "user_watch_analysis_traits",
      "user_watch_match_candidates",
      "user_watch_files",
      "commerce_carts",
      "commerce_cart_items",
      "orders",
      "order_items",
      "payment_attempts",
      "payment_events",
      "payment_refunds",
      "order_events",
    ]) {
      expect(allSql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("does not create blanket public write policies", () => {
    expect(allSql).not.toMatch(/for (insert|update|delete|all)\s+to anon/i);
  });

  it("stores delivery provider and CDEK point snapshots on orders", () => {
    expect(allSql).toContain("delivery_provider text not null default 'cdek'");
    expect(allSql).toContain("delivery_quote_snapshot jsonb not null default '{}'::jsonb");
    expect(allSql).toContain("cdek_pickup_point_code text");
    expect(allSql).toContain("cdek_pickup_point_address text");
  });

  it("adds controlled import apply operation tables and transactional RPC boundary", () => {
    expect(allSql).toContain("create table public.import_batches");
    expect(allSql).toContain("create table public.import_rows");
    expect(allSql).toContain("create table public.audit_logs");
    expect(allSql).toContain("create or replace function public.apply_catalog_import_batch(input jsonb)");
    expect(allSql).toContain("grant execute on function public.apply_catalog_import_batch(jsonb) to service_role");
  });

  it("keeps catalog import apply RPC restricted to the service role", () => {
    const applyMigration = migrations.find((migration) => migration.file === "20260706010000_import_apply_operations.sql")?.sql ?? "";

    expect(applyMigration).toContain("security definer");
    expect(applyMigration).toContain("set search_path = public");
    expect(applyMigration).toContain("revoke all on function public.apply_catalog_import_batch(jsonb) from public");
    expect(applyMigration).toContain("grant execute on function public.apply_catalog_import_batch(jsonb) to service_role");
    expect(applyMigration).not.toMatch(/grant execute on function public\.apply_catalog_import_batch\(jsonb\) to anon/i);
    expect(applyMigration).not.toMatch(/grant execute on function public\.apply_catalog_import_batch\(jsonb\) to authenticated/i);
    expect(applyMigration).not.toMatch(/\bexecute\s+format\b/i);
    expect(applyMigration).not.toMatch(/\bexecute\s+immediate\b/i);
  });

  it("adds owner-scoped User Watch Collection tables and authenticated RPC boundaries", () => {
    const collectionMigration = migrations.find(
      (migration) => migration.file === "20260711010000_user_watch_collection.sql",
    )?.sql ?? "";

    expect(collectionMigration).toContain("create table public.user_watch_collections");
    expect(collectionMigration).toContain("create table public.user_watches");
    expect(collectionMigration).toContain("create table public.user_watch_source_data");
    expect(collectionMigration).toContain("create table public.user_watch_analysis_traits");
    expect(collectionMigration).toContain("create table public.provisional_watch_identities");
    expect(collectionMigration).toContain("create table public.user_watch_match_candidates");
    expect(collectionMigration).toContain("create table public.user_watch_files");
    expect(collectionMigration).toContain("user_id = auth.uid()");
    expect(collectionMigration).toContain("owner_user_id = auth.uid()");
    expect(collectionMigration).toContain("message = 'authentication_required'");
    expect(collectionMigration).toContain("grant execute on function public.create_catalog_user_watch");
    expect(collectionMigration).toContain("grant execute on function public.create_manual_user_watch");
    expect(collectionMigration).not.toMatch(/for (insert|update|delete|all)\s+to anon/i);
  });
});
