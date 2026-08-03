# Casio Updated Photo Archive — Audit (Phase 3.3)

Worktree: `eternal-time-catalog`, branch `ai/claude-catalog`. Machine-readable companion to this
audit: `.tmp/casio-photo-import/manifest.json` (regenerate with
`npx tsx src/modules/catalog/cli/casio-photo-archive-manifest.ts`; gitignored, never committed).

## Archive located

- Requested name: `casio_for_it_all_photos_UPDATED` (zip or extracted folder).
- Searched: repository root, `incoming/`, `imports/`, `public/generated/`, `public/imports/`.
- Found: **`incoming/casio_for_it_all_photos_UPDATED.zip`** — 142,686,043 bytes (~136 MB), most
  recently modified file matching the name pattern (only one found; no older candidate existed to
  disambiguate against).
- Archive contents: `README_ПРОВЕРКА_ФОТО.txt`, `casio_for_it_all_photos_jpg_checked.xlsx` (a
  companion spreadsheet — 6 sheets, read for context only, never used as a matching source), and
  `images/Casio/{REFERENCE}/{REFERENCE}_{N}.jpg` — 218 folders, 640 files total (638 `.jpg` + the
  2 non-image files above).
- The archive was never modified, never had files renamed inside it, and was read directly at
  request time (never pre-extracted to disk) exactly like the existing Orient archive pipeline.

## Ground-truth data-quality finding (found auditing before any image work)

Before matching archive folders, auditing the *current* catalog against its own read models found
that 12 of the 559 raw eligible Casio rows were not real, distinct public products:

- **6 rows** carry literal Cyrillic text where a manufacturer reference must be — either the whole
  "reference" is leftover spreadsheet review text (e.g. `TиссоTы`), or an annotation suffix
  survives sanitization (`GST-B1000D-3A неT ссылки`). Excluded via a new guard in
  `preview-catalog-adapter.ts`: if the *sanitized* `referenceDisplay` still contains Cyrillic, the
  row was never a legitimate distinct product.
- **6 more rows** are verbatim duplicates of an already-present clean-reference row, where
  sanitization *does* fully clean the annotation (e.g. `ECB-900YDB-1A бляTь повTор` → clean
  `ECB-900YDB-1A`), leaving two rows with the identical public reference. Every one of these
  duplicate pairs was checked by hand: the surviving "clean" row always had strictly *more* data
  (a real image, real specifications) than the duplicate (no image, zero specifications, same
  price) — never the reverse. Deduplicated via a new `deduplicateByCleanReference` step, keeping
  the more complete record of each pair, deterministically.

Net effect: 559 → 553 (Cyrillic exclusion) → **547** (deduplication), Casio 234 → 228 → **222**.
Every other brand is unaffected (Tissot 218, Orient 82, Citizen 25, unchanged). This is a data
integrity fix, not new filtering — none of the 12 removed rows described a real distinct watch.

## Matching results

- Casio catalog references (post data-quality fix): **222**.
- Archive folders: **218**.
- Exact normalized-reference matches: **218 / 218 (100%)**.
- Unmatched archive folders: **0**.
- Catalog references with no archive folder at all: **6** — `DW-5600-1`, `EFR-S567YDC-1A`,
  `GA-100BL-1ADR`, `GA-110-1BPR`, `GBD-200U-9`, `MTP-VD01L-7ADF` (these remain without a usable
  image; the archive's own README independently confirms most of these as "not found" too).
- Matching is exact-normalized-reference only (case/hyphen/space/punctuation-insensitive, via the
  same `normalizeManufacturerReference` the catalog itself uses) — never approximate. The
  archive's own companion spreadsheet records "closest model/family" fallback substitutions for
  some of these un-photographed references (its `Источники_фото` sheet); those approximate
  assignments were deliberately **not** used here — a folder is only ever used for the exact
  reference it is named after.
- Every accepted image is assigned to at most one catalog reference (enforced with a
  `Map<string, string>` from zip entry → assigned reference); confirmed zero duplicate
  assignments across all 634 accepted images.

## Primary-image selection

Archive filenames carry no semantic hint (`{REFERENCE}_{N}.jpg`, unlike Orient's reliable `front`
keyword), and position 1 is **not** reliably the front view — confirmed by direct visual
inspection of several folders where position 1 was a caseback shot. Every one of the 50 folders
whose catalog primary was missing was therefore visually inspected by hand, image by image, until
a clean straight-on or slight three-quarter front view was confirmed; the confirmed filename is
recorded in `PRIMARY_OVERRIDES` in `casio-photo-archive-manifest.ts`. A folder not listed there
(i.e. every reference whose catalog primary was already good) contributes gallery images only —
never an unverified guess at a primary.

- Primary images assigned (verified upgrades): **50**.
- Gallery-only images assigned: **584**.
- Files rejected even as gallery secondaries (wrist-lifestyle shots or extreme macro crops with no
  useful full-case or detail view): **4** — `GA-B2100-2ADR_1.jpg`, `GA-B2100-3ADR_1.jpg`,
  `GMW-B5000GD-1_2.jpg`, `GMW-B5000PC-1_1.jpg`. Every other file (including casebacks, side
  profiles, bracelet-detail shots) is a legitimate secondary angle and was kept.
- No image was upscaled, stretched, or re-canvased — original pixels are read and served
  unmodified directly from the archive.

## Applied to the live catalog (upgrade-only primary, always-augmented gallery)

- Casio watches missing a primary image before the archive: **56**. After: **6** (the 6 with no
  archive folder — see above). **50 primaries added**, exactly matching the verified count.
  **0 existing valid primaries were replaced** — the upgrade only ever fires when
  `classifyCatalogImageRejection` finds the current primary missing or rejected.
  **216 of 222 Casio watches gained additional gallery photos** (the 6 with no archive folder are
  unchanged).
- Orient (re-verified, not regressed): all 82 records still resolve correctly; **78 of 82** gained
  additional gallery photos from the same upgrade mechanism (generalized from the Phase 3.2
  Orient-only version to also always append gallery images, not just on a primary upgrade); 0
  Orient primaries were replaced (all 82 already had a clean primary); the 1 previously-unmatched
  Orient folder (`049_RE-AU0306L00B`) remains unmatched and undocumented as before.
- Total catalog record count is unaffected by any of this — the archive only ever changes which
  images a watch has, never adds or removes a watch record: **547 before, 547 after**.

## Architecture (reused, not duplicated)

- `src/modules/catalog/infrastructure/casio-photo-archive-types.ts` — shared constants/types
  (mirrors `orient-photo-archive-types.ts`).
- `src/modules/catalog/cli/casio-photo-archive-manifest.ts` — the deterministic, offline manifest
  builder (this script; never runs during a request).
- `src/modules/catalog/infrastructure/casio-photo-archive-resolver.ts` (+ `.server.ts` wrapper) —
  serves one image's bytes directly from the zip at request time, gated to non-production exactly
  like the existing dev-image pipeline (the whole `preview` catalog-read source is disabled in
  production already).
- `src/app/api/catalog/dev-images/[imageKey]/route.ts` — dispatches `casio_`-prefixed keys to this
  resolver, `orient_`-prefixed keys to the Orient resolver, everything else to the original
  import-pipeline resolver, with no collision between the three key namespaces.
- `src/modules/catalog/infrastructure/preview-catalog-adapter.ts` — a shared
  `applyPhotoArchiveUpgrade` helper now backs both `applyOrientArchiveUpgrade` and the new
  `applyCasioArchiveUpgrade`, so the "replace primary only when missing/rejected, always append
  gallery" rule is written once and applied identically to both brands.

No new dependency was added (the archive is read with the `jszip` package already used by the
existing Orient/import pipeline). No `package.json`/Next config change was made.
