# Catalog Import Architecture

Catalog imports must be staged, validated, previewed, approved, and applied in a controlled way. Invalid imports must not partially and chaotically mutate production catalog data.

## Goals

- Support Excel and CSV catalog input.
- Normalize brand, Brand Collection, Brand Line, Watch Model, Manufacturer Reference, attributes, images, prices, and inventory data.
- Detect unknown values and duplicates.
- Prevent duplicate brands, Brand Collections, references, and uncontrolled attributes.
- Preserve import reports and row-level errors.
- Allow rollback or safe correction.
- Allow privacy-safe manual-watch aggregate signals to inform catalog enrichment without directly publishing user-entered data.

## Input Format Strategy

Supported formats:

- `.xlsx` for admin-friendly bulk imports.
- `.csv` for supplier/system exports.

Input should map to canonical fields such as:

- Brand.
- Brand Collection.
- Brand Line.
- Model.
- Reference number.
- Reference display name.
- Attributes.
- Image URLs or file references.
- Price.
- Currency.
- Availability.
- Delivery estimate.
- External ID or supplier SKU when available.

The importer should support templates, but should not require every supplier to match the internal schema exactly.

## Workflow

```text
upload
  -> parse
  -> map columns
  -> validate
  -> normalize
  -> deduplicate
  -> preview
  -> approve
  -> apply
  -> report
```

Manual-watch aggregate signals can enter before mapping as an admin research input, but they do not bypass validation, normalization, preview, and approval.

## Local Source Intake Pipeline

The current source-intake implementation is a local, staged pipeline for existing Eternal Time Excel/ZIP catalog files. It reads raw files from `imports/raw/catalog/`, detects source type by file content, parses and normalizes rows, merges source records, validates data quality, audits image candidates, and writes local report/preview artifacts.

Commands:

```bash
npm run catalog:import:audit
npm run catalog:import:preview
```

Outputs:

```text
imports/reports/catalog-source-audit.md
imports/generated/catalog-import-preview.json
```

The raw directory and generated outputs are ignored by Git. The pipeline does not write to production database tables, upload images, copy images to `public/`, or publish source SEO text.

See `docs/CATALOG_SOURCE_DATA.md` for source signatures, priority rules, pricing rules, image audit behavior, and apply eligibility.

## Upload

- Store source files in a private admin import bucket.
- Create `import_batches`.
- Record source filename, file type, uploader, and status.
- Do not apply data during upload.

## Parse

- Extract rows into `import_rows.raw_json`.
- Preserve row number.
- Detect malformed files, empty sheets, duplicate headers, and unsupported encodings.
- Keep parsing errors separate from domain validation errors.

## Mapping

Mapping converts source columns to canonical fields:

- Manual mapping in admin UI.
- Reusable mapping templates per source.
- Required fields validation.
- Optional field mapping for attributes.

AI may later suggest mappings, but admin approval is required.

## Validation

Validate:

- Required fields.
- Reference number format presence when expected.
- Price numeric format and currency.
- Availability values.
- Known Brand Collection, Brand Line, Watch Model, and Manufacturer Reference data.
- Attribute value types and allowed options.
- Image MIME/URL structure when used.
- Duplicate rows inside the same file.

Validation results are stored per row in `import_rows.errors_json` and `warnings_json`.

## Normalization

Normalize:

- Brand names.
- Brand Collection names.
- Reference numbers.
- Slugs.
- Colors.
- Materials.
- Movement types.
- Dimensions and units.
- Water resistance values.
- Boolean function flags.
- Style and use case labels.

Unknown normalized values should become warnings or blocking errors depending on field importance. The importer must not silently create public taxonomy values without approval.

## Deduplication

Deduplication rules:

- Brand: normalized name and existing aliases.
- Brand Collection: `(brand_id, normalized collection name/slug)`.
- Watch Model: brand plus model identity and optional Brand Collection/Brand Line.
- Reference: unique `(brand_id, reference_code_normalized)`.
- Offer: Manufacturer Reference plus seller/channel/condition/bundle context.
- Attributes: controlled definition and option matching.

When uncertain, stage as unresolved rather than creating duplicates.

## Manufacturer References

Reference handling is critical:

- Store display reference and normalized reference.
- Enforce uniqueness within brand.
- Do not assume references are globally unique.
- Do not create fake references for missing data.
- If a row has a supplier SKU but no manufacturer reference, keep SKU as external import metadata until a catalog admin resolves identity.

The local source pipeline uses the existing catalog domain reference normalization. Suspicious values such as tiny numeric-only references are staged for manual review and do not become confirmed public `watch_references`.

## Staged Preview

Preview should show:

- New entities to be created.
- Existing entities to be updated.
- Rows blocked by errors.
- Warnings requiring review.
- Potential duplicate matches.
- Price changes.
- Inventory changes.
- Images to attach.
- Attribute definitions/options needing approval.

No production mutation happens before approval.

For the local source pipeline, preview JSON contains identity, hierarchy, specifications, traits, pricing, content drafts, images, source provenance, validation issues, and apply eligibility. Price staging keeps `publicPriceCandidate` separate from internal source pricing data.

## Apply

Apply must be:

- Server-side only.
- Authorized for catalog/import roles.
- Transactional where practical.
- Idempotent by batch and row.
- Audited.

Apply order:

1. Controlled taxonomy approvals.
2. Brands.
3. Brand Collections and Brand Lines.
4. Models.
5. References.
6. Images.
7. Offers.
8. Price history.
9. Inventory events.
10. Search/facet invalidation.

Rows that still have blocking errors are not applied.

## Rollback Strategy

Rollback options:

- Mark batch-applied records with import batch IDs.
- For newly created records without downstream changes, allow soft delete or reversal.
- For updates, store before/after snapshots in import report or audit logs.
- For prices and inventory, append reversing events rather than deleting history.
- For catalog text updates, keep revision history if implemented.

Rollback should be explicit and audited.

## Reports

Import report should include:

- Total rows.
- Applied rows.
- Failed rows.
- Warning count.
- Created entities.
- Updated entities.
- Skipped rows.
- Duplicate candidates.
- Unknown attributes/options.
- Price changes.
- Inventory changes.
- Links to row-level errors.

## Error Categories

- File error.
- Mapping error.
- Required field missing.
- Unknown controlled value.
- Duplicate reference.
- Conflicting reference data.
- Invalid price.
- Invalid inventory state.
- Invalid dimension/unit.
- Unsafe image source.
- Permission error.
- Apply failure.

## Admin UX Requirements

Admin import UI should support:

- Batch list.
- Batch detail.
- Column mapping.
- Row error table.
- Duplicate resolution.
- Controlled vocabulary approval.
- Preview diff.
- Apply button with confirmation.
- Report download.
- Optional view of privacy-safe missing-watch aggregate signals, such as repeated normalized brand/reference keys from manual User Watches.

Manual-watch aggregate screens must not expose private notes, user photos, documents, service history, acquisition details, or personal stories.

## Non-Goals For Initial Architecture

- Automatic supplier integration.
- Automatic AI cleanup of production data.
- Real-time supplier sync.
- Blind partial import of invalid files.
