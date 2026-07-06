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
    ]) {
      expect(allSql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("does not create blanket public write policies", () => {
    expect(allSql).not.toMatch(/for (insert|update|delete|all)\s+to anon/i);
  });
});
