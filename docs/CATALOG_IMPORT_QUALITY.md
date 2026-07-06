# Catalog Import Quality Pass

This document records the deterministic normalization and eligibility policy added after the first real-source intake run. It does not authorize database apply, Catalog UI work, image uploads, or admin review UI.

## Baseline And Current Result

Baseline after the first pipeline implementation:

- Normalized records: 592.
- Eligible: 312.
- Manual review: 262.
- Blocked: 18.

After the quality pass:

- Normalized records: 586.
- Eligible: 569.
- Manual review: 5.
- Intentionally skipped missing reference: 12.
- Blocked: 0.

The lower normalized record count is expected: image-manifest-only rows are now attached only to an existing product identity and no longer create standalone catalog candidates.

## Severity And Eligibility Matrix

Identity blocking issues:

- `missing_brand`
- `missing_usable_title`
- `identity_source_conflict`
- `source_metadata_conflict`
- `duplicate_reference_conflict`

Current-cycle skip issues:

- `missing_reference`
- `suspicious_reference`

If the only unresolved operational blocker is unavailable reliable Manufacturer Reference, the record becomes `intentionally_skipped_missing_reference`. It stays in audit outputs but does not enter automatic apply.

Commercial-only issues:

- `missing_public_price_candidate`
- invalid RUB source price when another valid RUB price exists

Commercial-only issues do not block informational `watch_references`, but they prevent automatic active `catalog_offers` and current public price proposals.

Image issues:

- `broken_image_source`
- `invalid_remote_image_url`
- no image candidate

Image issues do not block informational `watch_references`. They only affect image readiness and future image upload candidates.

Optional specification issues:

- `unsupported_characteristic_key`
- partial optional characteristics

Optional specification issues are preserved in staging and do not force manual review.

Content draft issues:

- `content_draft_conflict`

SEO descriptions are source content drafts. Conflicting drafts are preserved with provenance and resolved by source priority for staging, but they do not block informational reference apply.

## Deterministic Auto-Fixes

Allowed deterministic transformations:

- whitespace, casing, punctuation, separator, and Unicode normalization;
- explicit characteristic alias mapping;
- source metadata recognition for `Артикул`, `Бренд`, and `Серия`;
- compatible duplicate merge by exact normalized brand/reference identity;
- field selection by documented source priority;
- non-blocking source conflict classification for content drafts;
- image manifest attachment only when a product row with the same brand/reference exists;
- cross-source reference recovery only when all safe-match requirements are met.

Disallowed transformations:

- inventing a manufacturer reference;
- fuzzy title matching as the only identity signal;
- creating artificial Brand Collections such as `Other`;
- changing factual specifications without source evidence;
- assigning arbitrary images;
- AI inference.

Each auto-fix is represented either by source provenance or an explicit validation issue such as `duplicate_reference_same_identity`, `source_conflict_resolved_by_priority`, or `reference_recovered_from_cross_source`.

## Characteristic Aliases

The quality pass added controlled aliases:

- `водонепроницаемость` -> `water_resistance_raw`;
- `диаметр корпуса`, `диаметркорпуса`, `диаметр_корпуса`, `диаметр-корпуса` -> `case_diameter_raw`;
- `материал корпуса`, `материалкорпуса` -> `case_material_raw`;
- `тип механизма`, `типмеханизма` -> `movement_type_raw`;
- `форма корпуса`, `формакорпуса` -> `case_shape_raw`.

The importer does not use open-ended fuzzy matching for characteristic keys.

`Артикул`, `Бренд`, and `Серия` inside the characteristics cell are treated as source metadata, not watch attributes. They are compared with the normalized identity/hierarchy columns when those columns exist. If they conflict, the row receives `source_metadata_conflict` and remains in manual review.

## Duplicate Classification

Duplicate reference analysis is scoped by Brand.

`duplicate_reference_same_identity`:

- same normalized brand/reference;
- compatible title and Brand Collection data;
- rows are merged as the same identity;
- does not block reference apply.

`duplicate_reference_conflict`:

- same normalized brand/reference;
- materially different identity or hierarchy values;
- requires manual review before automatic apply.

The same normalized reference under different brands is allowed.

## Reference Recovery

Cross-source reference recovery is conservative.

A missing or suspicious reference can be recovered only when:

- Brand matches after normalization;
- title matches exactly after deterministic text normalization;
- a stable source URL is shared;
- exactly one valid normalized manufacturer reference is found for that stable identity.

If the match is absent or ambiguous, recovery is rejected. The importer does not infer references from similar titles.

Tiny numeric-only values such as `7` remain suspicious. They do not become confirmed public references unless a safe cross-source recovery rule supplies a unique valid reference. In the current apply cycle they are intentionally skipped and excluded from `watch_references`.

## Image Manifest Policy

Rows from image manifest sheets are not product rows. They can add image candidates only when they attach to an existing product identity by normalized Brand plus valid normalized Manufacturer Reference.

Broken local ZIP paths remain `broken_image_source`. For Orient, the real source package still has workbook image paths but no matching image entries in the ZIP; this is a source package quality issue, not an identity blocker.

## Public Price Rule

The public price rule is unchanged:

PUBLIC PRICE CANDIDATE IS THE MAXIMUM VALID RECOGNIZED RUB PRICE VALUE FOR THE NORMALIZED WATCH ROW.

`Цена ¥` is internal provenance only. `Разница` is excluded from public price selection and is not a discount, previous price, sale amount, or public price.

## Review Outputs

Generated local outputs:

```text
imports/reports/catalog-source-audit.md
imports/reports/catalog-review-reasons.md
imports/reports/catalog-review-reasons.json
imports/generated/catalog-import-preview.json
imports/generated/catalog-review-queue.json
```

All generated outputs are ignored by Git.

The review queue contains only compact data required for future manual review: candidate ID, brand, title, raw/normalized reference, source packages, issue codes, concise issue context, conflicting values, and suggested action type.

## Remaining Human Review Boundary

After this pass, remaining manual review should represent real identity uncertainty rather than optional enrichment gaps. Missing/suspicious reference rows are intentionally skipped for the current apply cycle and can be revisited later with reliable source evidence.
