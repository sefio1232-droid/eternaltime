# Catalog Premium Editorial Rebuild — Phase 2.2

Worktree: `eternal-time-catalog`, branch `ai/claude-catalog`. Scope: `/watches` and `/watches/{brandSlug}` only. Phase 2.1 fixed functional problems (floating card text, toolbar layout, image-first default ordering, missing-image placeholder, sanitation, DOM order, mobile accessibility, loading/error states). This phase is a real *visual* rebuild on top of that — the brief for it opened with "визуально каталог по-прежнему выглядит как обычная техническая витрина интернет-магазина" and closed with a 34-point acceptance checklist (see "Acceptance criteria" below).

## Visual intent

Premium editorial watch catalog in the same ivory/paper/graphite/navy/champagne language as the rest of Eternal Time — not a marketplace grid, not a CMS table. Concretely: a compact first viewport, one calm control rail instead of an administrative form, cards with no heavy bordered rectangle, a material (not flat-gray) media stage, an opening composition that breaks grid monotony on page 1, and a navy editorial insert that reads as a real magazine spread, not another card.

## Intro measurements

`catalog-list-page.module.css` `.intro`: `padding-top: clamp(4.5rem, 5vw, 5.5rem)` (72–88px), `padding-bottom: clamp(2.5rem, 3vw, 3.25rem)`, title clamped to `clamp(2.25rem, 3.2vw, 3.375rem)` (36–54px, down from 44–68px), lead body clamped to 2 lines. Right-side prompt no longer reads as a separate banner: no background, no border box, just a thin champagne divider (`.introDivider`, 1px, 55% opacity) and baseline-aligned copy. Net effect: total intro height is materially shorter than Phase 2.1's, and the first product row is reachable without a full extra scroll on common desktop viewports.

## Filter toolbar

`catalog-filter-panel.tsx` / `.module.css`: kept the 12-column primary row (search 4, brand 2, movement 2, price 2, sort 2) and the action row (toggle | active chips | submit) from Phase 2.1, and tightened it into a calmer rail:

- Removed `position: sticky` and the backdrop-blur paper overlay from `.toolbarWrap` — a sticky toolbar risked overlapping product images while scrolling, which the brief explicitly called out as a reason not to use it this phase.
- Field/control height trimmed 50px → 46px, panel vertical padding and action-row padding trimmed, custom select-arrow position recalculated to match.
- Search placeholder shortened to "Бренд, модель или артикул".
- Price stays one `<fieldset>` with a dash between min/max (unchanged from 2.1).
- Sort no longer repeated in the results header (see below) — it only lives in the toolbar now.

## Opening product composition

New in `catalog-list-page.tsx`: on page 1 only (`result.page === 1`), the first 5 results render through a dedicated `.openingGrid` block instead of the regular grid — 1 lead + 4 supporting, in strict result order:

```ts
const includeOpening = result.page === 1;
const feed = buildCatalogFeed(result.items, featuredWatch !== null, includeOpening);
const openingItems = feed.filter(item => item.type === "watch" && item.role !== "regular");
const regularFeed = feed.filter(item => item.type === "editorial" || item.role === "regular");
```

Each opening item gets a `data-opening-role` attribute (`lead`, `support-1..4`) computed from its array position — CSS then places it with explicit `grid-column`/`grid-row` (never `order`):

- ≥1200px: 12-column grid, lead spans columns 1–7 across both rows, four supporting cards fill a 2×2 block in columns 7–13.
- 768–1199px: lead full width, 2 supporting columns below it.
- <768px: single column, natural linear order (lead, then products 2–5).

Because `openingItems` and `regularFeed` are just two filters over one already-ordered `feed` array — not a reordering — DOM order, visual order, and result order stay identical, and the editorial insert (still spliced in after the 8th overall result) always lands inside `regularFeed`, never inside the opening block. Pages other than page 1 render with an empty `openingItems` and fall straight into the regular grid, unchanged from Phase 2.1.

The lead card uses a `variant="lead"` prop on `CatalogWatchCardView` (4/5 media aspect-ratio, larger typography); supporting cards use the same `variant="regular"` styling as the rest of the grid.

## Regular grid breakpoints

1 column (default) → 2 at ≥600px → 3 at ≥980px → 4 at ≥1200px → 5 only at ≥1920px (previously 5 at ≥1760px, which the brief flagged as too early). Column gap 24–28px, row gap 56–64px (up from a flat ~16–28px), giving cards real vertical breathing room instead of a dense wall.

## Product card anatomy

`catalog-watch-card.tsx` / `.module.css`, full visual rebuild:

- **No full bordered rectangle.** `.link` has no `border` at all; verified via `grep -n border catalog-watch-card.module.css` returning only a doc comment. The only separation between media and content is the media stage's own soft inset shadow at its bottom edge (a "shadow plane", not a hard rule).
- **Material media stage**: `aspect-ratio: 1 / 1.08` (was 4/5 — brief wanted regular cards closer to square), a two-layer background (`radial-gradient` highlight + a `linear-gradient` base, both pale steel/ivory) instead of a flat gray slab, plus `box-shadow: inset 0 -14px 22px -18px` for the bottom shadow plane. `object-fit: contain` with ~11% padding keeps every watch fully visible, never cropped.
- **Lead variant** (`.cardLead`): 4/5 media aspect-ratio, larger model (28–38px) and price (24–28px) typography.
- **Typography hierarchy**: brand (uppercase, small, steel) → model (serif-weight sans, 20–24px regular / 28–38px lead, up to 3 lines, no ellipsis) → reference (monospace, quiet) → price (medium weight) → up to 2 specs → a quiet "Смотреть модель →" footer link pinned to the bottom via `margin-top: auto` (the Phase 2.1 flex fix, preserved).
- **Hover/focus**: image `translateY(-4px) scale(1.015)`, media background lightens slightly, footer arrow moves 4px, 240–260ms ease — no bounce, glow, or blur. All transforms are disabled under `prefers-reduced-motion: reduce`. Focus outline lives on `.link` (not the overflow-hidden `.media`), so it's never clipped.

## Spec formatting fix

`formatCompactCatalogSpecValue` (`catalog-display.ts`) was truncating real long values into meaningless fragments — e.g. `"Механический с автоподзаводом (24 камня, 21 600 п/ч, ручной завод)"` → `"Механический с…"`. Fixed by raising the safety-net length cap 26 → 32 chars and adding one more known-safe abbreviation (`механический с автоподзаводом` → `автомат`, matching the brief's own example spec value). Verified against the actual longest raw specification values in the real dataset; no more mid-word ellipsis truncation.

## Primary image fidelity

`A168WA-1WDF`'s primary catalog image was a caseback/clasp shot (confirmed by fetching and visually inspecting the actual served file: engraved "STAINLESS BACK", visible clasp). Source filenames/alt text carry no view-type signal for most of the catalog (files are just `A168WA-1WDF_1.jpg`, `_2.jpg`, `_3.jpg` — no "back"/"front" keyword anywhere), so the existing text-based `isLikelyTechnicalAngle()` heuristic in `catalog-image-presentation-policy.ts` had no way to catch it.

Fix, scoped and honest about its limits:

1. Added `knownTechnicalAngleImageKeys`, a small denylist of specific `imageKey`s visually confirmed to be back/caseback/clasp views (currently: the one A168WA-1WDF key), checked before the text heuristic in `isLikelyTechnicalAngle()`. This is the same per-image-key override pattern the file already used for focal-point tuning (`imageKeyOverrides`) — extended, not invented.
2. Added an explicit front-view keyword preference (`front|face|dial|main|hero|product|frontal|циферблат|спереди|главное`) in `selectBestCatalogHeroImage()`, applied as a soft preference among already-"prominent" candidates. Verified this has **zero effect on current selection order** (no image in the dataset carries these words yet) — it only helps once richer import metadata exists, per the brief's own framing.
3. Did **not** attempt a full 559-model visual reclassification. That requires either enriched import metadata (a `src/modules/imports/**` change, forbidden in this worktree) or a real per-image vision audit pass — out of scope for one phase. Documented here rather than silently left broken.

### Targeted runtime check (brief section 9.2)

Fetched and visually inspected the real served primary image for all four named references:

| Reference | Primary image | Result |
|---|---|---|
| A130WE-7ADF | Clean front dial (digital, Illuminator) | OK, unchanged |
| A158WA-1DF | Clean angled front dial | OK, unchanged |
| A159WA-N1DF | Clean straight-on front dial | OK, unchanged |
| A168WA-1WDF | Was caseback/clasp → now the clean angled front dial (gallery position 2) | **Fixed** |

Confirmed live after the fix: `/watches?q=A168WA-1WDF` now serves imageKey `880087ab703d75bd0656daa3ca1fc767` (front dial), not `4b660c3862bda8abce31d75ac8f41473` (the caseback).

## Editorial insert

Extracted into its own component, `catalog-editorial-insert.tsx` + `.module.css` (new files, as the brief explicitly permitted). Deep navy gradient background (`--catalog-navy` → `--catalog-navy-deep`), `aspect-ratio: 16 / 6` at ≥1200px, columns split roughly 5/7 (copy/media) via a `5fr 7fr` grid at ≥600px, single column below that. Champagne eyebrow ("Подборка"/"Подбор"), a real front-facing product photo (or `CatalogMissingImage`, re-themed for navy contrast via locally-overridden `--catalog-steel`/`--catalog-graphite`/`--catalog-muted` custom properties — they inherit into the shared `CatalogMissingImage` component without needing to fork it). Still a single ordered `CatalogFeedItem` inside the same feed array as before — its position (after the 8th result) and its route (`/selection` or a filtered automatic-movement URL) are unchanged from Phase 2.1.

## Pagination

Added a thin top rule (`border-top`) and switched the active-page underline from plain ink to champagne (`var(--catalog-champagne)`), so the current page reads as a deliberate accent rather than a generic bold state. Everything else (real hrefs, `aria-disabled`/`aria-current` semantics, "Страница X из Y" secondary line) is unchanged from Phase 2.

## Results header

Simplified to just the total count (`559 моделей`) plus, when computable, a quiet "Показаны {start}–{end}" range line derived from the real `result.query.pageSize`/`result.page`/`result.items.length` — no more duplicated "Сортировка: …" line (sort already lives in the toolbar).

## Empty state

Copy tightened to the brief's suggested wording: "Ничего не найдено" / "Измените фильтры или вернитесь ко всему каталогу." with the same real reset link as before.

## Color and material tokens

`.shell` in `catalog-list-page.module.css` gained `--catalog-navy`, `--catalog-navy-deep`, and a slightly warmer `--catalog-paper`/`--catalog-champagne`/`--catalog-blue`, matching the brief's suggested palette closely (exact hex values, not required verbatim). All tokens remain catalog-scoped custom properties declared once on `.shell` — `src/app/globals.css` and homepage tokens are untouched.

## Responsive behavior

Verified structurally (breakpoints present in source, confirmed via `rg`) at the requested widths' underlying CSS rules: 1 col default, 2 at 600px, 3 at 980px, 4 at 1200px, 5 only at 1920px; opening composition collapses 12-col → 2-col (768px) → 1-col (<768px) in strict DOM order with no CSS `order`. No `100vw` width rule exists outside the dev-only review drawer's capped `min(360px, 100vw)`.

## Review mode

`?catalogReview=1` unchanged in its dev-only gating (`process.env.NODE_ENV !== "production"`, checked server-side in `page.tsx` before the dev-data module is even imported). Added one new toggle, "Show opening composition", surfacing each item's `lead`/`supporting` role in the feed list — the smallest useful addition given this phase's priority order (visual production first, review tooling last).

## Screenshots

No browser automation or screenshot tooling is available in this environment (confirmed: no Playwright/Puppeteer in `package.json`, and none is installed — installing one would touch `package.json`/`package-lock.json`, which this worktree is forbidden to modify without explicit approval). This is the same honest limitation recorded in every prior phase of this worktree. In place of pixel screenshots, every structural claim above was verified against the live dev server: HTTP 200 on all 6 required URLs, actual rendered HTML inspected for the opening-composition markers, profanity-free output, correct card counts, and — critically — the A168WA-1WDF fix confirmed by downloading and visually inspecting the actual served JPEG bytes (not just asserting on markup). Manual URLs for visual sign-off:

- `http://localhost:3001/watches`
- `http://localhost:3001/watches?page=2`
- `http://localhost:3001/watches?brand=casio`
- `http://localhost:3001/watches?brand=casio&minPrice=15000`
- `http://localhost:3001/watches?catalogReview=1`
- `http://localhost:3001/watches?brand=doesnotexist12345`

## Known limitations

- Primary-image view-type correction is a targeted, visually-verified denylist of one image key, not a full-catalog fix — see "Primary image fidelity" above.
- No pixel-level visual QA at the six named viewports (1536×960 → 390×844) was possible in this environment; responsive correctness was verified at the CSS-rule level, not by rendering.
- The loading skeleton (`catalog-list-loading.tsx`) was updated to match the new regular-grid breakpoints but does not model the opening composition's asymmetric layout — a low-risk simplification given the skeleton is only visible for a brief loading window.
- `referenceNormalized`/slug noise for a handful of references (documented in Phase 2.1) remains an import-pipeline concern, still out of scope here.
