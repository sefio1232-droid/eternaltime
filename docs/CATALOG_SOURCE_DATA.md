# Catalog Source Data

This document records the local source intake rules for the Eternal Time catalog import pipeline. It complements `docs/IMPORTS.md`; it does not change the production database model.

## Raw Source Directory

Local source files live in:

```text
imports/raw/catalog/
```

This directory is intentionally ignored by Git. Source XLSX/ZIP files can keep their original filenames. Import detection must not depend on exact filenames.

Generated local outputs are also ignored:

```text
imports/reports/
imports/generated/
imports/tmp/
```

## Source Detection

The source detector uses content signatures:

- file type;
- ZIP entry list;
- nested workbook presence;
- workbook sheet names;
- normalized headers;
- package image paths.

Known source types:

- `main_catalog_workbook`;
- `casio_package`;
- `tissot_package`;
- `orient_package`;
- `unknown`.

Filename is only a weak hint. If signatures are ambiguous, the source is `unknown`, is included in the audit report, and is excluded from automatic processing.

Current source signatures:

- Main workbook: sheets `Casio`, `Tissot`, `Orient`, `Citizen`.
- Casio package: `Casio_для_IT` plus package support sheets such as `Сводка`, `Проверка_моделей`, `Фото_сводка`, `Источники_фото`.
- Tissot package: `Tissot_для_IT`, `Фото_сводка`, `Источники_фото`, `Сводка`.
- Orient package: `Orient_для_IT`, `Фото_сводка`, `Источники_фото`, `Сводка`.

## Source Priority And Merge

Rows are parsed into normalized staging records and then merged by Brand plus normalized Manufacturer Reference. Reference normalization uses the existing catalog domain function; the importer must not duplicate that algorithm.

Priority rules:

- Casio package wins for Casio characteristics, descriptions, and images.
- Tissot package wins for Tissot characteristics, descriptions, and images.
- Orient package wins for Orient characteristics; Orient image paths are audited against actual ZIP entries.
- The main workbook wins for price sourcing and can fill missing hierarchy fields.
- Citizen uses the main workbook because no separate Citizen package is currently expected.

Every normalized field keeps source provenance: source file, source type, workbook, sheet, row, raw column, raw value, normalized value, and resolution reason where applicable.

Conflicts are not silently overwritten. Field-specific priority chooses a staged value, while the conflict remains in audit output and can force manual review.

## Public Price Rule

PUBLIC PRICE CANDIDATE IS THE MAXIMUM VALID RECOGNIZED RUB PRICE VALUE FOR THE NORMALIZED WATCH ROW.

For each normalized watch row, collect all valid source values that are real prices, are expressed in RUB, and contain a positive numeric value. The largest valid RUB amount becomes `publicPriceCandidate`.

Examples of public candidate source columns:

- `Цена ₽ (¥×12)`;
- `Цена ₽`;
- `Цена в России`;
- `Цена на сайте`;
- `Публичная цена сайта`.

Do not:

- choose the minimum price;
- average prices;
- use `Цена ¥` / CNY as public price;
- use `Разница` as public price;
- interpret `Разница` as discount, previous price, or sale amount.

All other source price values remain internal import provenance. The staged representation groups pricing as:

- `publicPriceCandidate`;
- `rubPriceSources`;
- `nonRubPriceSources`;
- `internalAnalyticalValues`.

Each source price stores raw field name, source package, currency, raw value, normalized minor-unit amount when valid, intended visibility, validation state, and provenance.

If one RUB field is invalid but another valid RUB field exists, the row can still stage a public price candidate. If no valid RUB price exists, the row can still stage an informational Manufacturer Reference, but automatic Catalog Offer and public Price apply are disabled.

## Manufacturer Reference Validation

Pipeline:

```text
raw reference -> trim -> existing catalog reference normalization -> validation
```

Validation records:

- raw reference;
- normalized reference;
- missing reference;
- suspicious reference;
- duplicate normalized reference within Brand;
- cross-source conflicts.

Tiny numeric-only values such as `7` are suspicious and block automatic reference apply. The importer does not invent a correct reference from the title.

Reference identity is scoped by Brand. The same reference text under two different brands does not violate identity rules.

## Hierarchy Staging

The staged hierarchy follows the existing domain model:

```text
Brand -> Brand Collection -> optional Brand Line -> Watch Model -> watch_references -> Catalog Offer
```

`watch_references` is the canonical public watch identity. There is no `watch_variants` concept in MVP.

Current source-specific rule:

- `Серия` is a Brand Collection candidate for the current source files.

The importer does not create artificial collections such as `Other`, `Miscellaneous`, or `Разное`. If a Watch Model cannot be staged confidently, the row receives a validation issue rather than invented hierarchy.

## SEO Drafts

SEO descriptions from source files are staged as content drafts only. They are not final editorial content and are not published automatically.

The pipeline stores:

- source;
- raw draft;
- normalized text;
- length.

AI is not used to rewrite or enrich SEO text.

## Characteristics Parsing

Characteristics can appear as one delimited cell:

```text
Размер: ... | вес: ... | корпус/безель: ... | ремешок/браслет: ... | стекло: ...
```

Pipeline:

```text
raw characteristics string -> split by "|" -> parse key/value -> normalize key -> map known key -> preserve unresolved key
```

Known key families include:

- size;
- weight;
- case/bezel;
- strap/bracelet;
- crystal;
- water resistance;
- power;
- movement;
- functions;
- dial;
- brand country;
- type.

Unknown keys are preserved as unresolved import attributes. They do not reject the whole row and do not automatically create public attribute definitions.

## Image Audit

The pipeline creates an image candidate manifest only. It does not upload images to Supabase Storage and does not copy images to `public/`.

Each image candidate records:

- source package;
- Excel image path when present;
- actual ZIP entry when matched;
- remote image URL when present;
- ordering;
- primary image candidate flag;
- validation status;
- provenance.

Local ZIP matching normalizes slashes, leading directories, whitespace, and Unicode. If Excel points to a local image path that is absent from the ZIP, the pipeline records `broken_image_source` and does not create a fake valid image candidate.

Remote image URLs are checked only for structural validity. The pipeline does not mass-download remote images.

Orient receives a dedicated image audit showing workbook image path count, actual ZIP image entry count, broken paths, and references without image candidates.

## Preview And Apply Eligibility

`npm run catalog:import:audit` writes:

```text
imports/reports/catalog-source-audit.md
```

`npm run catalog:import:preview` writes:

```text
imports/generated/catalog-import-preview.json
```

Preview records contain identity, hierarchy, specifications, traits, pricing, content drafts, image candidates, source provenance, validation issues, and apply eligibility.

Eligibility statuses:

- `eligible`;
- `manual_review`;
- `blocked`.

Critical identity issues block automatic apply. Missing public price does not necessarily block informational reference apply, but it blocks automatic Catalog Offer and public Price apply.

## Future Database Apply

This phase prepares an `ImportApplyPlan` only. It does not write production catalog rows.

The future apply process will separately propose:

- Brand changes;
- Brand Collection changes;
- Watch Model changes;
- `watch_references` changes;
- Catalog Offer changes;
- public Price changes;
- image upload candidates.

Future database apply must remain server-side, authorized, audited, and staged through preview approval.
