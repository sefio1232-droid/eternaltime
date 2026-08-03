# Catalog List Visual Recovery — Phase 2.1

Worktree: `eternal-time-catalog`, branch `ai/claude-catalog`. Scope: `/watches` and `/watches/{brandSlug}` only. This phase followed a rejection of the Phase 2 visual result ("Текущий Phase 2 результат визуально НЕ принят") and rebuilds the same surface to fix specific, screenshot-confirmed defects. It supersedes the visual claims in `docs/CATALOG_LIST_ART_DIRECTION.md` (kept for historical record of what Phase 2 attempted) while the route/data-flow map in `docs/CATALOG_CLAUDE_AUDIT.md` still applies.

## Screenshot-confirmed problems (input to this phase)

1. Disjointed filter toolbar — submit button separated from search, poor field alignment, active filters placed unpredictably.
2. Oversized first viewport before any product is visible.
3. Cards that don't read as one unit — media and content visually detached, price/spec text appearing to float.
4. Inconsistent card heights across a row.
5. Broken image system — empty placeholders dominating the first row, a tiny "ET" mark floating in a large empty box, inconsistent watch scale, stray white rectangular backgrounds.
6. Source-review annotation text leaking into public copy, e.g. `ECB-950YMP-1A блять повтор`.
7. An oversized, miscomposed editorial insert.
8. No premium/editorial cohesion overall.

## Root cause summary

- The card's floating-text illusion was a CSS Grid artifact: `grid-template-rows: auto 1fr` on the card forces every row in a grid line to match the tallest card, leaving invisible slack under shorter cards' content blocks. Fixed by switching the card to `display:flex; flex-direction:column` with `.footer { margin-top: auto }`.
- The toolbar's disjointed submit button came from the field grid and the action row being two separate uncoordinated layouts. Fixed by unifying both into one 12-column grid.
- The empty first row came from the default sort order not accounting for image availability; watches without images could sort ahead of watches with images. Fixed with a stable image-first tiebreak scoped to the true-default query only.
- The tiny "ET" mark was a minimal, non-editorial placeholder (`media-placeholder-mark` in the shared `catalog-image.tsx`). Catalog cards now use a dedicated `CatalogMissingImage` component instead of relying on that shared fallback.
- The leaked annotation text was raw spreadsheet review notes stored in source identity fields (`title`, `referenceRaw`, `officialName`, and — found during this phase's own test-writing, not in the original screenshots — `watchModelCandidate`, which feeds the watch-detail page heading) and passed through to the public read model unchanged.

## Feed structure repair (no CSS `order`)

`src/components/catalog/catalog-list-page.tsx` now builds one ordered array before rendering:

```ts
type CatalogFeedItem =
  | { type: "watch"; key: string; watch: CatalogWatchCard; priority: boolean }
  | { type: "editorial"; key: string };

function buildCatalogFeed(items: CatalogWatchCard[], includeEditorial: boolean): CatalogFeedItem[]
```

A single `.map()` over this array renders either a card or the editorial insert, in the exact order they should appear in the DOM. No CSS `order` property is used anywhere in `src/components/catalog/**` to reposition a card or the insert — confirmed by `rg "order:" src/components/catalog` (see Verification below) and by dedicated tests (`catalog-list-visual-recovery.test.ts` #3, #4, #20).

## Compact first viewport

The intro block (`src/components/catalog/catalog-list-page.tsx`, `.intro`/`.introMain`/`.introPrompt` in the module CSS) was reduced: shorter title clamp, tighter padding, and the "Не знаете, с чего начать?" prompt now sits beside the heading instead of stacking a second full-width block above the fold. The toolbar and first product row are visible without scrolling on common desktop viewports.

## Filter toolbar rebuild

`src/components/catalog/catalog-filter-panel.tsx` + `.module.css`:

- Primary field row is a real 12-column grid (`grid-template-columns: repeat(12, minmax(0, 1fr))`): search spans 4 columns (6 when the brand filter is hidden on brand pages), brand/movement/sort each span 2, and price (min–max) spans 2 as a single `<fieldset>` with a dash separator.
- The action row (toggle for advanced filters / active-filter chips / submit) is its own explicit grid: `grid-template-columns: auto 1fr auto`. The "more filters" `<details>` element is set to `display: contents` in CSS so its `<summary>` and expanded panel become direct grid items placed with explicit `grid-column`/`grid-row` — never `order`, never `position: absolute`.
- Submit now reads the live result count: `Показать {formatCatalogCount(totalRecords)} моделей`. `CatalogFilterPanel` takes a new required `totalRecords: number` prop and an optional `hidePanelSubmit?: boolean` (used by the mobile sheet, whose sticky footer button uses the HTML `form` attribute to submit the same `<form>` from outside it).

## Active filters

Active-filter chips (`buildActiveChips`) render only when a filter is genuinely non-default — verified by test #7. They sit in the action row's middle column, between the toggle and submit, not scattered elsewhere in the layout.

## Product card anatomy

`src/components/catalog/catalog-watch-card.tsx` + `.module.css`:

```
<article class="card">
  <Link class="link">              ← flex column, single click target for media+content
    <div class="media">…</div>     ← aspect-ratio 4/5, object-fit: contain
    <div class="divider" />
    <div class="content">          ← flex:1, flex-direction:column
      brand → model → reference → price → specs → <div class="footer"> (margin-top: auto)
    </div>
  </Link>
</article>
```

Fixed content hierarchy verified by test #8. Media and content are both inside the same `<Link>` (test #2), so the whole card is one click target and one visual unit — not two detached regions.

## Image presentation and missing-image strategy

- Images use `aspect-ratio`, `object-fit: contain`, and `content-visibility` for a consistent, non-cropping stage across all cards, avoiding the previous stray-white-rectangle look.
- Watches with no usable image render `CatalogMissingImage` (`src/components/catalog/catalog-missing-image.tsx` + `.module.css`) — an inline SVG watch-case silhouette with brand name and reference code, `role="img"` with a descriptive `aria-label` ("Изображение готовится"). This replaces the shared `catalog-image.tsx` minimal "ET" mark for catalog cards specifically; `catalog-image.tsx` itself is untouched since it's shared with the homepage hero.

## Default photo prioritization

`src/modules/catalog/application/catalog-read-service.ts` adds `hasUsableImage()` and augments the final tiebreak of `sortWatches()`:

```ts
const leftHasImage = hasUsableImage(left.watch) ? 0 : 1;
const rightHasImage = hasUsableImage(right.watch) ? 0 : 1;
return leftHasImage - rightHasImage || left.sourceOrder - right.sourceOrder;
```

This only fires on the true-default query (no explicit `sort`, no `search`). Explicit sorts (`price_asc`, `price_desc`, `name_asc`) and search results are untouched and remain pure — verified by tests #11, #12. Total result count is unchanged (#13), and image-less watches remain present and reachable, never hidden (#14).

## Public text sanitation

New module `src/modules/catalog/application/catalog-public-sanitation.ts` exports `sanitizeCatalogPublicText()`, applied in `src/modules/catalog/infrastructure/preview-catalog-adapter.ts` to every public display string derived from source identity text: `title`, `referenceDisplay`, `officialName`, and — added after this phase's own 30-item test suite caught the gap (see below) — `watchModelName` (used by the watch-detail page heading via `displayWatchTitle`).

- Detects known source-spreadsheet review annotations (`блять повтор`, `повтор`, `одни и те же`, `дубль`, `duplicate`, `manual review`, `review note`, `проверить/проверять/проверка`, `хз`, `жду`, `пытаюсь угадать`, plus bracketed annotations) and keeps only the clean prefix.
- Documented example verified end to end: `ECB-950YMP-1A блять повтор` → `ECB-950YMP-1A` (test #18; also present in the regenerated audit report).
- Never touches `referenceNormalized` (canonical identity used for URL slugs and matching) or any raw source row — sanitation is presentation-only, applied after eligibility/identity resolution (test #16, #17).
- Fail-safe: if stripping would leave an empty string, the sanitizer keeps the original text rather than publishing nothing.
- CLI audit: `npx tsx src/modules/catalog/cli/catalog-public-sanitation-audit.ts` writes `public/generated/catalog-review/public-display-sanitation.json` with every sanitized field, its raw value, and the removed suffix. Current real-data run: **24 fields sanitized across 6 watches** (18 across `referenceDisplay`/`title`/`officialName`, plus 6 `watchModelName` entries added after the gap fix).
- Dev-only review: `?catalogReview=1` on `/watches` or `/watches/{brandSlug}` (gated `process.env.NODE_ENV !== "production"` in `page.tsx`, before the dev-data module is even imported) shows raw-vs-sanitized values per reference in the review drawer.

### Known limitation (documented, out of scope)

`referenceNormalized`, and therefore the URL slug for a small number of references, still bakes in noise from upstream import normalization (computed in `src/modules/imports/**`, forbidden to touch in this worktree). Sanitation intentionally does not touch it, because it is canonical matching identity, not display text. This is a pre-existing import-pipeline concern, not a Phase 2.1 regression.

## Editorial insert

The insert is a normal `CatalogFeedItem` spliced into the ordered feed at a fixed position (after the 8th watch, or at the end of a shorter page) — not appended via CSS order, not floated. On ≥600px it lays out as a flex row (46% copy / 54% media); below 600px it stacks. It links to `/selection` via `catalogQueryHref`, a real route, and falls back to `CatalogMissingImage` when the featured watch has no image, instead of an empty box.

## Grid

Product grid breakpoints (`catalog-list-page.module.css`): 1 column by default, 2 at ≥600px, 3 at ≥900px, 4 at ≥1200px, 5 at ≥1760px. No `100vw` width rules exist in the catalog list/filter/card CSS Modules (test #27), avoiding horizontal-overflow risk on narrow viewports.

## Mobile behavior

`CatalogMobileFilterSheet` is unchanged in its accessibility contract: `role="dialog"`, `aria-modal="true"`, `Escape`-to-close, focus restoration on close, and body-scroll lock while open (test #28). It now forwards `totalRecords` and `hidePanelSubmit` to the shared `CatalogFilterPanel` so the sheet's sticky footer button (associated via the HTML `form` attribute) shows the same live result count as desktop.

## Accessibility

- `CatalogMissingImage` uses `role="img"` with a descriptive `aria-label` instead of a bare decorative placeholder.
- Card is a single `<Link>` per product — one predictable tab stop, matching visual grouping.
- Toolbar `<details>`-based "more filters" panel is natively keyboard-operable disclosure, not a custom JS widget.

## Performance

No new client-side JS was added to the default render path. The review drawer (dev-only, opt-in via `?catalogReview=1`) is the only new client component and does not affect production bundles or the default `/watches` render.

## Runtime QA

Environment note for this pass: no browser automation/screenshot tooling is available in this session, consistent with every prior phase in this worktree. Source-level verification (tests, typecheck, `rg` scans) stands in for visual proof; manual URLs are listed below for the user to check directly. If the dev server needs restarting, run `npm run dev` (port 3001 per repo convention) and open:

- `http://localhost:3001/watches`
- `http://localhost:3001/watches?page=2`
- `http://localhost:3001/watches?brand=casio`
- `http://localhost:3001/watches?brand=casio&minPrice=15000`
- `http://localhost:3001/watches?catalogReview=1`
- `http://localhost:3001/watches?brand=doesnotexist12345`

## Visual QA

Not directly observable in this environment (no screenshot tooling); see Runtime QA note above. Target viewports for manual check: 1536×960, 1440×900, 1280×800, 1024×768, 768×1024, 390×844.

## Remaining issues / out of scope

- `referenceNormalized`/slug noise for a small number of references (see "Known limitation" above) — belongs to the import pipeline, forbidden to touch here.
- Watch-detail page redesign, candidate persistence, favorites, comparison drawer, cart, checkout — explicitly out of scope for this phase.
- No visual screenshot evidence could be captured in this environment; verification relies on source-content tests plus the manual URLs above.
