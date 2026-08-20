# Controlled Catalog Database Apply

This document records the apply boundary for the real Eternal Time catalog source pipeline. It does not introduce Catalog UI, Admin UI, image upload, checkout, delivery, payments, User Watch Collection, Collection Intelligence, or AI.

## Apply Scope

The apply layer consumes the generated staged preview:

```text
imports/generated/catalog-import-preview.json
```

It never reads raw Excel/ZIP files directly and never mutates database rows from parser/source adapter code.

Pipeline:

```text
validated preview -> apply eligibility filtering -> apply plan -> preflight -> dry run summary -> confirmed apply execution
```

Only `eligible` records can enter the automatic database apply plan.

## Current Operational Statuses

The apply cycle recognizes:

- `eligible`: may enter automatic apply planning.
- `manual_review`: excluded from automatic apply.
- `intentionally_skipped_missing_reference`: excluded from automatic apply because reliable Manufacturer Reference is unavailable.
- `blocked`: excluded from automatic apply for other critical identity/schema issues.

Current missing/suspicious reference records, including raw reference `7`, are intentionally skipped for this import cycle. They remain in audit/review artifacts with provenance, but they do not create Brand, Watch Model, `watch_references`, Catalog Offer, Price, or image upload plan items.

The audit report phrase is explicit:

```text
Intentionally skipped because reliable manufacturer reference is unavailable.
```

The five current Orient Star rows with `source_metadata_conflict` remain `manual_review`. The importer does not decide whether Orient Star is a Brand or a Brand Collection in this phase.

## Dry Run

Command:

```bash
npm run catalog:import:apply:dry-run
```

Generated outputs:

```text
imports/generated/catalog-apply-dry-run.json
imports/reports/catalog-apply-dry-run.md
imports/generated/catalog-image-upload-plan.json
```

Dry run:

- reads generated preview;
- rechecks eligibility statuses;
- excludes manual review records;
- excludes intentionally skipped records;
- builds controlled apply records;
- checks local Supabase project structure;
- checks remote link state;
- checks required environment values by presence only;
- checks required database tables when a server admin secret database client is available;
- separates plan counts from database comparison counts;
- reports inserts, updates, no-ops, and conflicts only when database comparison is available;
- performs no database writes.

If database comparison is unavailable, dry run does not assume the database has zero existing records.

## Apply Confirmation

Command:

```bash
npm run catalog:import:apply -- --confirm-apply=APPLY_ETERNAL_TIME_CATALOG_IMPORT
```

Without the exact confirmation token, actual apply refuses to write.

Actual apply is allowed only when all are true:

- local Supabase project structure exists;
- versioned migrations exist;
- repository is linked to a remote Supabase project;
- `SUPABASE_SECRET_KEY` is configured in the process environment;
- required apply/catalog tables are available;
- dry run succeeds;
- no apply-level conflicts exist;
- exact confirmation token is provided.

If any condition is not met, no database writes are performed. This is a controlled blocker, not an implementation failure.

## Transaction Strategy

Catalog apply uses the versioned database function:

```text
public.apply_catalog_import_batch(input jsonb)
```

The function is intended as the transactional mutation boundary for the related catalog apply group. It inserts an import batch, import rows, Brands, Brand Collections, Watch Models, `watch_references`, import-managed Catalog Offers, price history, and a safe audit log in one database function call.

Execution is restricted to the Supabase/Postgres `service_role` database role. Application code should authenticate this elevated boundary with a server-only `SUPABASE_SECRET_KEY` (`sb_secret_...`), not with a browser-visible key.

The function is idempotent by catalog identities:

- Brand: normalized name and slug conflict checks.
- Brand Collection: `(brand_id, normalized name)`.
- Watch Model: `(brand_id, normalized name)`.
- `watch_references`: `(brand_id, reference_code_normalized)`.
- Import-managed offer: one inactive standard new offer marked by `catalog_import_pipeline_v1`.

Existing approved catalog content is not destructively overwritten. Missing import values are not instructions to erase existing factual values.

## Import Batch Persistence

The apply migration adds:

- `import_batches`;
- `import_rows`;
- `audit_logs`;
- `public.apply_catalog_import_batch(input jsonb)`.

`import_rows.normalized_json` stores compact structured apply data and provenance pointers, not the full raw source workbook or image binaries.

## Watch References

For each eligible record, apply can create or find:

- Brand;
- Brand Collection when present;
- Watch Model;
- `watch_references` by `(brand_id, reference_code_normalized)`.

New catalog entities are staged as non-public:

- Brands/Brand Collections/References: `draft`;
- Watch Models: `draft`;
- data confidence: `imported`;
- reference status: `unknown`.

Source SEO drafts are not written as approved public editorial copy.

## Commercial Apply

Catalog Offer and public Price are proposed only when `publicPriceCandidate` exists.

The price rule is unchanged:

```text
PUBLIC PRICE CANDIDATE = MAXIMUM VALID RECOGNIZED RUB PRICE VALUE FOR THE NORMALIZED WATCH ROW.
```

`Цена ¥` is internal provenance. `Разница` is not a public price, discount, previous price, or sale amount.

Current source files do not contain confirmed availability or quantity data. Apply does not create `in_stock`, fake quantity, delivery promises, or public visibility. Import-managed offers are inactive and invisible until a later approved commercial/admin step.

## Image Upload Plan

Dry run creates:

```text
imports/generated/catalog-image-upload-plan.json
```

The plan contains no image binaries and does not upload to Supabase Storage.

Executable image upload items are generated only for eligible records and valid image candidates. Manual review, intentionally skipped, and broken image candidates are excluded from executable upload items.

Storage object paths are deterministic and safe:

```text
catalog/watches/{brand-slug}/{reference-slug}/{order}-{safe-filename}
```

Catalog images and User Watch photos remain separate storage concerns.

## Security

The apply process is privileged operational code. It must not add broad public or authenticated write policies to catalog tables. Service role usage remains server/CLI-only and must not enter client bundles.

Generated apply reports must not contain secrets, connection strings, Supabase admin secret keys, legacy service role keys, or image binaries.

## Future Read Experience Boundary

After controlled database apply, a separate Catalog Read Experience phase can read database rows. This apply phase does not create Catalog UI, publish records, upload images, or expose source drafts as final editorial content.
