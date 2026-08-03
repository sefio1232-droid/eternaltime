# Catalog Showroom Recovery — Phase 3.4 (site-import specifications + SEO overlay)

Continuation of Phase 3.3, additive only — nothing below this section is superseded. Mandate: the user supplied two new workbooks in `incoming/` (`casio_catalog_site_import_UPDATED.xlsx`, `orient_catalog_site_import_001-079.xlsx`), each with a richer, pre-normalized "Характеристики" (specifications) sheet and an "Импорт_на_сайт" sheet carrying SEO copy (SEO Title / Meta Description / short + long description) per reference. Task: surface both on the public site for every matched watch, without writing unnecessary/redundant text, and re-verify — not redo — that every Casio and Orient photo (not just the primary) is correctly attached.

**Architecture** (same "catalog-owned parallel-but-compatible overlay" pattern as the photo archives): a new CLI script, `src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts`, reads both workbooks read-only and matches every row to a real catalog reference by **exact normalized-reference equality only, brand-scoped** (a Casio row can only match a Casio watch) — never fuzzy/family/approximate. Unmatched rows are recorded, never guessed at. Output: `.tmp/catalog-site-import-overlay/manifest.json` (gitignored, regenerable via `npx tsx src/modules/catalog/cli/catalog-site-import-overlay-manifest.ts`). Types/constants live in `src/modules/catalog/infrastructure/catalog-site-import-overlay-types.ts`.

- **Specifications** flow through the *existing* `CatalogPublicSpecification[]` shape: `preview-catalog-adapter.ts`'s `publicSpecifications()` now spreads an optional overlay record into `sourceValues` *after* the raw import's own values, so an overlay value wins when present but a reference/key absent from the overlay still falls back to the raw import untouched. The read-model type never changes. `specificationDefinitions`/`specificationOrder` gained ~15 keys (`caliber_raw`, `jewel_count_raw`, `clasp_raw`, `crown_raw`, `bezel_raw`, `luminescence_raw`, etc.) to hold the richer data. Deliberately **not** mapped: Casio's separate Длина/Ширина/Толщина/Диаметр columns once "Размер корпуса" already combines them (redundant text), and every price/inventory column in "Импорт_на_сайт" (price stays in `catalog_offers`, never touched here).
- **SEO copy stays entirely outside `CatalogWatchDetail`** — a separate `getPublicCatalogWatchSeoOverlay()` in `catalog-read-repository.server.ts` reads the same manifest independently and is consumed only in `page.tsx` (`generateMetadata` title/description, JSON-LD `description`) and passed as an optional `seoOverlay` prop into `CatalogWatchDetailPage`, which prefers the overlay's `longDescription` over the auto-generated `buildFactualWatchDescription()` in the "Обзор" section when present. The read-model contract (`read-models.ts`) gains no new field.

**Real-data verification**: Casio 222/222 catalog references matched (100%, 0 unmatched rows in either sheet). Orient 78/79 matched from the workbook; the one unmatched reference (`RE-AU0306L00B`) is independently confirmed absent from the current catalog by the *existing* Orient photo-archive manifest too (same folder, same reference, unmatched there for the same reason) — not a bug, a genuinely-uncataloged row. Enrichment check: 278 of 547 watches gained at least one new specification field from the overlay, 0 lost any (enrichment only, verified programmatically), and rare fields landed at exactly their expected fill rates (`case_diameter_raw` 10, `bezel_material_raw` 4 — matching the workbook's own sparse-column counts).

**Orient photo archive re-verification** (per the user's explicit "перепроверь архив с ориентами" instruction): regenerated the existing Orient manifest fresh — unchanged from Phase 3.2/3.3 (78 primaries + 310 gallery = 388 entries, 1 unmatched folder, 0 rejected, 4 catalog references with no source folder). Cross-checked against the new workbook's own "Фото" sheet and "Сводка" summary (79 models, 393 photos declared): the archive's real file count is 393 photos + 1 `README.txt` (394 zip entries total); 393 − 5 (the one unmatched folder's files) = 388, matching the manifest exactly. No regression, complete coverage confirmed independently.

Tests: `tests/catalog-site-import-overlay.test.ts` (25 tests) — column mapping (redundant-column exclusion, unit formatting, price-column exclusion), exact/brand-scoped matching, overlay-priority merging into specifications, the SEO-stays-out-of-the-read-model-contract guarantee, and real-manifest invariants (0 Casio unmatched, the single known-absent Orient reference, enrichment-only).

# Catalog Showroom Recovery — Phase 3.3

Worktree: `eternal-time-catalog`, branch `ai/claude-catalog`. Scope: `/watches`, `/watches/{brandSlug}` only. This phase's mandate: complete the catalog's premium visual polish, normalize the remaining raw-string filters (water resistance, case material, crystal), audit and fix data-quality gaps found while re-verifying the ground truth (Cyrillic-contaminated and duplicate-reference rows — see below), and integrate the user-supplied updated Casio photo archive using the same exact-match, upgrade-only architecture Phase 3.2 built for Orient — full detail in `docs/CATALOG_CASIO_PHOTO_ARCHIVE_AUDIT.md`. **This section is additive to Phase 3.2 below, not a replacement** — Recommended's ranking design, the toolbar/panel architecture, and the Orient integration are unchanged in shape, only extended (the Orient upgrade now also always augments the gallery, not just on a primary upgrade — see "Archive image upgrade: gallery always augmented" below). The route/data-flow map in `docs/CATALOG_CLAUDE_AUDIT.md` still applies.

## Ground-truth data-quality fixes (found auditing before any new feature work)

Re-verifying the real 559-record dataset against its own public read model (not trusting the Phase 3.2 report's numbers without checking) found 12 Casio rows that were never legitimate distinct products — full detail and per-row evidence in `docs/CATALOG_CASIO_PHOTO_ARCHIVE_AUDIT.md`:

- 6 rows have literal Cyrillic text surviving in the public `referenceDisplay` (either the whole "reference" is leftover spreadsheet review text, or an annotation suffix survives `sanitizeCatalogPublicText`). Excluded by a new guard in `preview-catalog-adapter.ts`'s `readModelFromCandidate`: a sanitized reference that still contains Cyrillic was never a real manufacturer reference.
- 6 more rows are verbatim duplicates of an already-present clean-reference row, in cases where sanitization *does* fully clean the annotation, leaving two rows with the identical public reference. A new `deduplicateByCleanReference` step groups by `${brandSlug}:${normalizeManufacturerReference(referenceDisplay)}` and keeps the more complete record of each pair (real image + specifications beat none, every time, in every pair found) — deterministic, never a guess.

Real, verified record counts after both fixes: **547 total** (was 559), **Casio 222** (was 234). Every other brand is unaffected. This is why `tests/catalog-showroom-recovery.test.ts` tests #10–11 now assert 547/222 instead of the earlier phase's 559/234 — the earlier numbers included rows that were never real distinct watches.

## Water-resistance, case-material, and crystal normalization

Same pattern as Phase 3.2's mechanism taxonomy — a pure, read-time classifier per field, never a raw-string mutation, wired into both `matchesQuery` and `buildFacets` in `catalog-read-service.ts`:

- `catalog-water-resistance-taxonomy.ts` — `splash | 30m | 50m | 100m | 200m | 300m_plus`. Maps ATM/bar figures to the matching meter bucket (1 ATM ≈ 10 m); returns `null` (never a guessed depth) for vague marketing wording like "водозащита зависит от серии". Verified against real data: 200m 67, 100m 61, 50m 24, splash 21, 30m 4, 82 unspecified.
- `catalog-case-material-taxonomy.ts` — `steel | polymer | carbon | titanium | steel_polymer | other`. Matches stems (`стал`, `смол`) rather than the nominative form, so Russian genitive-case declensions ("из нержавеющей стали") aren't missed. Carbon is checked before steel/polymer so a carbon-and-steel combination reads as its own premium-materials bucket. Verified: steel 347, polymer 70, steel_polymer 29, carbon 19, other 8, titanium 2.
- `catalog-crystal-taxonomy.ts` — `sapphire | mineral | acrylic | other`. Returns `null` when the source names two possible crystal types for the same reference ("...в зависимости от версии") rather than asserting either one. Verified: sapphire 241, mineral 140, acrylic 59, 32 ambiguous/null.

The expanded filter panel's existing `SelectField`s for these three facets needed no JSX changes — they already render whatever `facets.waterResistance`/`caseMaterials`/`crystalTypes` provide, and now receive normalized group values/labels instead of raw strings automatically.

## Archive image upgrade: gallery always augmented, primary still upgrade-only

Phase 3.2's Orient upgrade only ever fired when the current primary was missing/rejected, and fully replaced the gallery when it did — meaning it had zero visible effect once Orient's own remote images were all confirmed clean. Per this phase's explicit requirement that a watch's detail page show several photos, `applyOrientArchiveUpgrade` and the new `applyCasioArchiveUpgrade` now share a single `applyPhotoArchiveUpgrade` helper in `preview-catalog-adapter.ts`: the **primary is still only ever replaced when missing/rejected** (a working primary is never overridden), but archive images are now **always appended as extra gallery entries** (deduplicated by src) regardless of whether the primary needed an upgrade. Verified live: Orient FAA02002D9 (already had a clean remote primary) — primary unchanged, gallery grew from its original count to 10; Casio A158WA-1DF (already had a clean primary) — primary unchanged, gallery grew to 6; Casio DW-5000R-1 (previously imageless) — got a real verified primary plus its 1 gallery image.

See `docs/CATALOG_CASIO_PHOTO_ARCHIVE_AUDIT.md` for the full Casio archive matching/verification report.

---

# Catalog Showroom Recovery — Phase 3.2

Worktree: `eternal-time-catalog`, branch `ai/claude-catalog`. Scope: `/watches`, `/watches/{brandSlug}` only. This phase's mandate: Recommended stops being a filtered subset and becomes a pure ranking of the full catalog; the filter toolbar is rebuilt around a compact primary row plus an expanded panel; mechanism filtering is normalized instead of exposing raw import strings; the editorial insert's dark-watch-on-navy contrast problem is fixed structurally; and the Orient photo archive is integrated as an optional, exact-match-only image upgrade. **This section supersedes the whole of Phase 3.1 below**, which hard-gated Recommended on a 15 000 ₽ price floor and an image-quality requirement — Phase 3.2 explicitly removes both; Recommended is now a reorder, never a second filter. The Phase 3.1 write-up is kept underneath for historical record of what it found/fixed. The route/data-flow map in `docs/CATALOG_CLAUDE_AUDIT.md` still applies to both.

## Recommended is a ranking, not a filter

`src/modules/catalog/application/catalog-read-service.ts` no longer has a `RECOMMENDED_PRICE_FLOOR_MINOR`, an eligibility gate, or any second filtering pass. `listCatalogWatches` now does exactly one thing with the user's real query — `matchesQuery` — and then either reorders or sorts the result:

```ts
const filtered = dataset.watches.filter((watch) => matchesQuery(watch, query));
const sorted = isRecommendedViewActive(query) ? rankRecommendedWatches(filtered) : sortWatches(filtered, query);
```

`totalRecords`, `pageCount`, and `facets` are always computed from `filtered` — never from a narrower "eligible" set. Recommended and All return identical counts for the same query; only the order differs (verified: real dataset — 559 unfiltered, 234 Casio, 218 Tissot, 25 Citizen — all identical across `view=recommended`/`view=all`).

## Deterministic scoring

`recommendedScore(watch)` is a pure function: image-quality/completeness bonuses, a movement/price/specification-completeness bonus, a mid/upper-mid price-band bonus (`1 500 000`–`9 000 000` minor units), a small penalty for the lowest price decile, a small penalty for the top price percentile absent other strengths, and a penalty for a missing/rejected image (via the same `classifyCatalogImageRejection` the editorial insert uses). No `Math.random()`, no `Date.now()`, no fabricated popularity/rating/sales signal anywhere in this file.

The list is stable-sorted by score (ties break on original source order, so results are deterministic across repeated calls with the same input — test #9), then `applyFrontPageDiversityCaps` reorders only the first `RECOMMENDED_FRONT_SIZE` (24) positions:

```ts
function applyFrontPageDiversityCaps(sorted, frontSize, maxPerBrand, maxPerFamily): CatalogWatchDetail[]
```

This is a genuine greedy "pick the best remaining item that satisfies the caps" loop — at every front-page slot it re-scans the entire remaining score-sorted pool for the highest-scored item that respects the brand cap (9), the per-family cap (2), and an anti-immediate-repeat rule, falling back to relaxing only the anti-repeat rule if nothing else qualifies. An earlier single-forward-pass version of this function had a real bug: once every brand's top-scoring tier was exhausted by the anti-repeat rule, the pass fell through into a strictly lower-scored tier instead of coming back for each brand's next-best remaining item, which could put the very cheapest item in each brand ahead of clearly higher-scored mid-price items. The greedy re-scan fixes this — verified against the real dataset (front-24 median price ≥ overall median) and against a synthetic 40-watch fixture (`tests/catalog-showroom-recovery.test.ts` #5). Cap violators are never dropped, only deferred later in the list — total record count and reachability are always preserved (#1, #2, #4).

## Mechanism normalization

`src/modules/catalog/application/catalog-mechanism-taxonomy.ts` — a pure, read-time classifier, never a raw-string mutation:

```ts
type CatalogMechanismGroup = "quartz" | "automatic" | "hand_wound" | "solar" | "digital" | "analog_digital" | "other";
```

Verified against every real `movement_raw`/`movement_type_raw` value in the 559-record dataset: Кварц 221, Автомат 143, Solar 5, Аналого-цифровые 4, unspecified 186. `matchesQuery`'s movement filter and `buildFacets`' movements facet both compare/group on the normalized group, never the raw string (tests #17–20). The filter panel renders `mechanismGroupLabels` as a real radio group (`Любой` / one radio per non-empty group with a live count), never a raw import string as an option.

## Filter toolbar rebuild

`src/components/catalog/catalog-filter-panel.tsx` stays a Server Component (no client JS) and is now two layers:

- **Primary row** (`CatalogFilterPrimaryFields`) — search and sort only, ~46px controls, no beige rectangle, no giant black submit button.
- **Expanded panel** (`CatalogFilterExpandedFields`) — mechanism (radio group), price (min–max), brand/collection where relevant, and the other already-reliably-normalized traits (water resistance, case material, crystal). No filter was added for data that isn't already normalized (no strap/color/display-type filter yet). Footer: **Применить** / result count; **Сбросить все** lives with the active-filters row instead.

The expanded panel is a native `<details>`/`<summary>` disclosure on desktop — no client JS needed, the toggle's label reads `Расширенные фильтры` or `Фильтры · N` once N filters are active. `src/components/catalog/catalog-mobile-filter-sheet.tsx` (the one intentional additional Client Component beyond the review drawer) reuses the exact same `CatalogFilterPrimaryFields`/`CatalogFilterExpandedFields` functions inside its accessible dialog (`role="dialog"`, focus trap, Escape, focus return — unchanged from Phase 2), so there is exactly one implementation of every field, not two divergent forms. The mobile breakpoint (`max-width: 1023px`) now exactly matches the desktop panel's Tailwind `lg:` cutoff (1024px) — the previous 767px/1024px mismatch left a dead zone where neither surface showed.

Active-filter chips (`buildActiveChips`) are a separate, compact, thin-outline row with a champagne left marker — not SaaS pills — rendered only when at least one filter is active; Recommended itself is never shown as a chip.

## Editorial insert contrast fix

`src/components/catalog/catalog-editorial-insert.module.css` adds a soft light steel-blue radial "stage" panel behind the watch photo (`.media::before`) — never a CSS filter on the photo itself, never a lightened/distorted image. This protects against any dark-cased/dark-dial watch reading poorly against the navy background, not just the one specific SKU already excluded by the low-contrast image policy. The insert's height is now an explicit `min-height: 300px; max-height: 360px` at the desktop breakpoint instead of an `aspect-ratio` that scaled past the target range on wide viewports, and the watch image's max-width was tightened so the watch reads at roughly 38–44% of the insert's total width.

## Orient photo archive integration

The user-specified path `incoming/orient-photos.zip` does not exist in this worktree; the only Orient-themed archive present is `incoming/orient_catalog_FULL_001-079.zip` (140 MB, 79 folders `NNN_REFERENCE/`, 394 files, every folder has exactly one file with `front` in its name per its own `README.txt`). This is the archive the integration below actually reads.

`src/modules/catalog/cli/orient-photo-archive-manifest.ts` (run with `npx tsx src/modules/catalog/cli/orient-photo-archive-manifest.ts`) builds `.tmp/orient-photo-import/manifest.json` (gitignored, never committed) by matching each archive folder's reference to a real catalog `referenceNormalized` through the exact same `normalizeManufacturerReference` the catalog itself uses — an archive folder either names a real reference exactly or it is recorded as `unmatched` and left untouched; there is no fuzzy/similarity/closest-match logic anywhere in this file. Every accepted file is assigned to at most one catalog reference, enforced with a `Map<string, string>` from zip entry to the reference it was assigned to.

Real result against the current catalog (82 Orient references):

- 78 of 79 archive folders matched exactly; `049_RE-AU0306L00B` is unmatched (no catalog reference named `REAU0306L00B` today).
- 4 catalog references have no archive folder at all (`RA-AB0002S0BD`, `RA-AB0003S0BD`, `RA-AK0803S10B`, `RA-AS0003S00B`).
- 388 images assigned (78 primary + 310 gallery), 0 rejected for quality (this archive has no caseback/buckle/packaging/lifestyle shots), 0 duplicate assignments.
- **All 82 Orient catalog references already have a working `remote` primary image today** (official orient-watch.com CDN URLs from the existing import pipeline), and none are rejected by `classifyCatalogImageRejection`. Orient is already well-represented in Recommended on its own merits (9 of the front 24 in the real dataset, second only to Casio) — there is nothing broken for the archive to fix today.

Given that, the integration is wired as a strict **upgrade-only fallback**, never a forced replacement: `src/modules/catalog/infrastructure/preview-catalog-adapter.ts` accepts an optional `orientPhotoManifest` and only swaps in an archive image for an exact-matched Orient reference whose *current* primary image is missing or rejected (`classifyCatalogImageRejection(...) !== null`) — a real image is never replaced. `src/modules/catalog/infrastructure/orient-photo-archive-resolver.ts` (+ a `.server.ts` `server-only` wrapper, mirroring `dev-image-resolver.ts`) serves bytes read directly from the zip at request time — never pre-extracted — and is disabled outside `preview` mode in production, exactly like the existing dev-image pipeline it sits beside; `src/app/api/catalog/dev-images/[imageKey]/route.ts` dispatches to it only for keys carrying the `orient_` prefix (`orient-photo-archive-keys.ts`), so the two key namespaces never collide. `catalog-read-repository.server.ts` loads the manifest best-effort (a missing manifest — e.g. a fresh checkout before the CLI script has been run — behaves exactly like no manifest at all).

Because this only ever activates for a missing/rejected image and none currently exist, this wiring has **zero visible effect on the catalog today** — it is safety-net infrastructure for the day a remote image breaks or a new Orient reference is added without one, not a forced ranking boost. Orient reaching page 1 remains entirely score-driven, with no quota.

## Card and editorial trait text cleanup

`formatCatalogCardTrait` (`catalog-display.ts`) replaces the old plain-compaction call on the card and the editorial insert. It normalizes `movement_raw`/`movement_type_raw` through the same mechanism taxonomy (short card labels: Автомат/Кварц/Solar/Механика/Цифровые/Аналого-цифровые), `case_material_raw` through a small pattern set (Сталь/Титан/Карбон/Полимер/Кожа/Каучук), and `water_resistance_raw` to a bucketed `30 м`/`50 м`/`100 м`/`200 м` when the raw value contains one of those exact figures — falling back to the existing general compaction (never a raw multi-clause import sentence) for anything it has no dedicated normalizer for, and never inventing a label for a value it can't confidently read.

## Verification (Phase 3.2)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run secrets:scan
```

272 catalog tests pass (up from 258 at the start of this phase). No commits or pushes were made.

---

# Catalog Premium Showroom Recovery — Phase 3.1 (superseded above, kept for record)

Worktree: `eternal-time-catalog`, branch `ai/claude-catalog`. Scope: `/watches` and `/watches/{brandSlug}` only. This phase is a visual/curation recovery pass on top of Phase 3's reset — not a new architecture. It followed an honest re-assessment (~3/10) of the live catalog: real tabs/filters/records existed, but the toolbar read as an administrative form, the Recommended tab's strict 6/6/6/6 brand split looked mechanical, some Recommended cards showed missing-image placeholders or a genuinely unreadable dark watch photo, and card density felt sparse.

## Image investigation

Sampled 5 real remote product images across both domains the catalog actually uses (`orient-watch.com`, `www.tissotwatches.com` — the only two remote hosts in the whole dataset) by downloading and visually inspecting the served bytes. All 5 were clean official product photography; no "browser panel" or viewer-chrome contamination was found in the sample. One genuine issue *was* found this way: a Tissot PRC 100 Solar (`T151-422-36-051-00`) is an all-black case/dial/strap watch whose numerals are close to unreadable — added to a new `knownLowContrastPatterns` denylist (matched against alt+URL text, not an exact key, since remote URLs carry encoded query params that vary by read path). This is a targeted, visually-verified entry, not a general classifier — see "Known limitations."

## Image quality policy (`catalog-image-presentation-policy.ts`)

New `CatalogImageRejectionReason` type (`missing | caseback | technical-angle | contaminated-ui | low-contrast | crop-risk`) and `classifyCatalogImageRejection()`, which governs **eligibility for the curated Recommended tab specifically** — All/brand tabs still show every watch regardless of image quality. Detection combines: the existing caseback/technical-angle text heuristics and denylist (from Phases 2.2–3), the new low-contrast denylist, and a forward-looking `contaminated-ui` keyword pattern (screenshot/browser/viewer/lightbox/devtools) that has zero effect on today's data (both real image domains are official manufacturer CDNs) but will catch a future bad scrape automatically instead of silently passing it through.

## Price floor: 10 000 ₽ → 15 000 ₽

`RECOMMENDED_PRICE_FLOOR_MINOR` is now `1_500_000`. Cheap watches remain fully reachable via "Все часы", brand tabs, search, an explicit sort, or a manual price filter — unchanged from Phase 3's opt-out design (`isRecommendedViewActive`).

## Recommended eligibility: image quality is now part of it

`isRecommendedEligible()` now requires both the price floor **and** `classifyCatalogImageRejection(watch.primaryImage, 0) === null`. Verified live: zero missing-image cards and zero rejected images anywhere in the Recommended tab, on real data (172 of 559 watches clear both bars).

## Recommended ranking — no forced equal split, and two real bugs fixed along the way

The ranking keeps Phase 3's overall shape (family-interleaved per brand, brand-priority order by average matching price, a small per-brand guarantee before a quality-first greedy fill) but the earlier "always exactly 6/6/6/6" result was hiding two genuine algorithm bugs, both caught by writing tests against a synthetic multi-brand fixture rather than trusting the real-data output alone:

1. **Cross-brand family collision.** `recommendedFamilyKey` used only `brandCollectionName ?? watchModelName`, with no brand scoping — two brands that happened to share a collection label (or, in the test fixture, an intentionally-colliding label) would count toward the *same* family cap. Fixed by scoping the key to `${brandSlug}:${collection}`.
2. **Head-only queue scan.** The greedy picker only ever looked at the *front* of each brand's family-interleaved queue; once that specific item was blocked by the family cap, the whole brand was treated as exhausted for that round — even when a later, still-compliant item sat right behind it. This silently let capped-out brands (e.g. Casio, whose 8 eligible watches split into three families of size 3/3/2) leak a 3rd same-family item onto the Recommended page. Fixed by switching from a cursor-increment scan to a full-queue scan with splice-based removal, so a brand can always contribute *any* remaining compliant item, not just its current head.

The per-brand cap (8) and per-family cap (2) are now **hard, never relaxed** during the main fill — anything that would violate one of them is deferred to the very end of the ranked list (landing on a later page), never injected into page 1 to hit an exact count. A small guarantee phase (3 per brand) still prevents a lower-average-price brand from being fully crowded out by deeper-catalog brands before its own turn comes up.

Live result on real data: 172 eligible (out of 559), first 24 split 8/8/8 across Tissot/Orient/Casio — **Citizen is absent from Recommended's first page not as an algorithm artifact but because all 25 real Citizen watches in the current dataset have no image at all** (verified directly against the source data), so none can pass the image-quality gate. This is an honest data limitation, documented rather than worked around.

## Brand-page diversification (and the same interleave bug, fixed once for both callers)

Brand-scoped default listings (e.g. `/watches?brand=tissot`) now reuse the same fixed `interleaveByFamily()` helper (family-interleave, image-first grouping preserved, pure reordering — never filters, so brand record counts are exactly preserved) instead of plain source order. An explicit sort (`price_asc` etc.) or a search query bypasses this entirely, same opt-out pattern as Recommended curation. Verified on real data: Tissot's default listing never repeats the same collection (e.g. "Seastar 1000") on two consecutive cards.

## Tabs

Reordered to Recommended → Все часы → Tissot → Orient → Citizen → Casio (`BRAND_TAB_PRIORITY` in `catalog-tabs.tsx`), so the smaller premium/editorial brands aren't buried after Casio's larger catalog. A second real bug surfaced here: because `CatalogTabs` read its brand list from the *current page's own* `result.facets.brands`, viewing the Recommended tab (where Citizen has zero eligible watches) made the Citizen tab **disappear entirely** — there was no way to navigate to it. Fixed by computing facets from the query-matched-but-pre-curation set (`filtered`, not `scoped`) in `listCatalogWatches`: facets (brand tabs, filter option counts, price range) now always reflect the user's own explicit filters, never the invisible Recommended curation layer. Verified live: all 4 brand tabs, including Citizen, now render correctly from every tab.

## Filter toolbar

Lightened `--catalog-paper` → `--catalog-paper-light` for the toolbar background (closer to white/ivory, less "beige form"); added a champagne focus-underline on search/select/price controls (in addition to the existing accessible focus outline); shortened and lightened the submit button ("Показать N" instead of "Показать N моделей", smaller padding, no uppercase); price field placeholders now show thousands-separated values ("15 000" instead of "15000") via the existing `formatCatalogCount` helper.

## Result header

Rebuilt as a real heading (`<h2>`, was a plain `<p>`) + a compact metadata line, both tab-aware:
- Recommended: "Рекомендуемые часы" / "От 15 000 ₽ · 1–24 из 172"
- All: "Все часы" / "1–24 из 559"
- Brand: "{Brand name}" / "{N} моделей"

## Density

Masthead: title clamp tightened to 48–58px (was 48–64px), top/bottom padding tightened to 48–64px/34–46px. Grid row-gap reduced 56–64px → 48–56px. Card media padding reduced 7–11% → 7%, image fill increased to 86–88% (was 76–78%) — watches read noticeably larger and the surrounding empty stage area is smaller. Card typography (model, price) nudged up slightly. Overall `.shell` gap and the results-header/grid spacing tightened.

## Presentation categories

`classifyCatalogCardPresentation()` (`catalog-display.ts`) assigns one of `compact-digital | standard-digital | analog-bracelet | analog-strap | diver | oversized-sport` per card, driving only media-stage optical padding (never which image is shown). Given real data constraints — documented below — the practical signal is: a water-resistance-based diver check (real, reasonably populated data), and Casio-only public reference-code family prefixes (e.g. `A1xx`/`F-91`/`AE-1xxx` for compact-digital, `G-`/`GA-`/`GST-`/`MTG-` for oversized-sport) — a rule for a whole model line, not a per-reference override. Everything else defaults to `analog-bracelet`, the catalog's most common real case.

## Tests

240 tests carried over from prior phases, plus a new `tests/catalog-showroom-recovery.test.ts` (18 items per this phase's brief: floor value, zero missing-image/zero critical-rejected/zero contaminated-ui in Recommended, editorial-insert clean-image gating, min-3-brands, max-8-per-brand, max-2-per-family, no-4-consecutive-same-family on brand pages, determinism, explicit-sort-bypasses-diversification, real 559/234/218 record preservation, no-opening-composition, canonical links, no nested interactive elements). Four pre-existing tests (from Phases 1–3) broke because their bare `{}`/partial-filter query fixtures now trigger Recommended curation by default; fixed by adding `view: "all"` to those specific calls, restoring their original intent (testing plain filtering/facets, not curation). Full suite: 30 files, 258 tests, all passing — including the two real algorithm bugs the new fixture-based tests caught and this phase fixed.

## Runtime QA

No browser automation/screenshot tooling in this environment (unchanged from every prior phase — none installed, and installing one would touch the forbidden `package.json`). Verified instead via the live dev server: all 7 named routes return HTTP 200; rendered HTML confirmed zero missing-image placeholders and zero profanity on the Recommended page, correct 559/234/218/25 record counts across All/Casio/Tissot/Citizen, the corrected tab order and the restored Citizen tab, and the Recommended results header's exact copy format.

## Known limitations

- The low-contrast/contaminated-ui denylist is a targeted, visually-verified set (one entry each, so far), not a real vision-based classifier — a full-catalog automated darkness/contamination audit is out of scope without real image analysis.
- Presentation-category precision is limited by real data: `case_diameter_raw` covers only ~1.6% of eligible records, and `movement_raw` almost never distinguishes digital from analog quartz (191 records just say "кварцевый" with no further qualifier) — so the compact-digital/oversized-sport categories rely on public Casio reference-code family prefixes rather than measured size, and most non-Casio watches fall back to the "analog-bracelet" default rather than a precisely-matched category.
- Citizen's absence from Recommended's first page is a real data gap (zero photographed Citizen watches in the current dataset), not a ranking defect — documented rather than worked around (e.g. by lowering its image bar specifically, which would violate the "zero missing-image in Recommended" requirement).
