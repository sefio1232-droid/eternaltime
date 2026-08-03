# Catalog Style Isolation

Phase 1 record for the `ai/claude-catalog` worktree. This document records the mechanical extraction of catalog-owned CSS out of the shared `src/app/globals.css` into catalog-scoped CSS Modules, with no intentional visual or functional change. See `docs/CATALOG_CLAUDE_AUDIT.md` for the surrounding audit and the Phase 1 entry there for status.

## Reason

Before this phase, every catalog-related selector (`.catalog-*`, `.watch-detail-*`, and related layout rules) lived inside the single shared `src/app/globals.css` (4,576 lines), interleaved with homepage, Journal, and account styling — in some cases only a few hundred lines away from unrelated homepage selectors (e.g. `.home-catalog-grid` sits near `.catalog-grid`). A separate agent (Codex) actively edits this same file for homepage work in a parallel worktree/branch. Any catalog visual redesign under that structure would require editing the exact file Codex is also editing, creating a direct, high-probability merge conflict. This phase gives the catalog worktree an independent styling surface for future redesign work (Phase 2+) without touching homepage-owned CSS.

## Original Global Selectors

All catalog/watch-detail selectors found in `src/app/globals.css` before this phase, by area:

- Catalog page shell: `.catalog-page`, `.catalog-page-head`, `.catalog-help-card` (+ `p`, `p + p`, `.editorial-link` sub-rules).
- Catalog toolbar: `.catalog-toolbar` (three separate cascading declarations).
- Catalog results layout: `.catalog-results-layout`, `.catalog-sidebar`, `.catalog-sidebar-list` (+ `a`, `span`, `em`), `.catalog-sidebar-note` (+ `small`), `.catalog-results-head`, `.catalog-view-toggle`, `.catalog-grid`.
- Catalog feature strip: `.catalog-feature-strip` (+ `> span:first-child`, `strong`, `em`), `.catalog-feature-media` (+ coupled `.catalog-image` sub-rule).
- Catalog filters: `.catalog-filter-bar`, `.catalog-filter-primary-row`, `.catalog-filter-item` (+ icon/label sub-rules), `.catalog-filter-search`, `.catalog-filter-control` (+ `select.`, `::placeholder`), `.catalog-filter-icon` (+ all `-search`/`-collection`/`-material`/`-movement`/`-sort` modifiers and pseudo-elements), `.catalog-filter-submit`, `.catalog-filter-more` (+ `summary`, `::-webkit-details-marker`), `.catalog-filter-expanded`, `.catalog-filter-price` (+ `legend`, `> div`), `.catalog-filter-reset`.
- Catalog card: `.catalog-product-card` (+ `h2`, coupled `.price-plate` sub-rule), `.catalog-card-favorite` (+ `span`, `span::before`, originally grouped with the shared header's `.icon-heart`/`.icon-account`), `.catalog-card-media` (+ coupled `.catalog-image--card` / `.catalog-image--composed` sub-rules), `.catalog-card-copy`, `.catalog-card-facts`.
- Watch detail: `.watch-detail-page`, `.watch-detail-hero` (+ coupled `[data-image-presentation="..."] .product-stage-detail` sub-rules), `.watch-detail-copy`, `.watch-detail-title` (+ `-short`/`-medium`/`-long` scale variants), `.watch-detail-deck`, `.watch-detail-price-row`, `.watch-detail-actions` (+ `form`, `> div`, coupled `.inline-flex` sub-rules), `.watch-detail-media-shell`, `.detail-media` (+ coupled `.catalog-image--composed` sub-rule), `.watch-key-specs` (+ `div`, `div + div`, `dt`, `dd`), `.watch-detail-tabs` (+ `a`), `.watch-overview-section` (+ `h2`, coupled `p:not(.type-label)` sub-rule), `.watch-gallery-section` (+ `figure`).

All of the above existed as multiple cascading declarations for the same selector added across three "passes" visible in the file (base rules, a responsive-refinement pass, and a "Visual QA fixes" / "Second-pass composition refinement" pass). Every pass was preserved and moved in its original relative order so cascade/override behavior is byte-for-byte equivalent to before.

## Shared Selectors Retained Globally

These were **not** moved, even though some are only currently consumed by catalog components, because they are genuinely shared/cross-surface primitives (confirmed by grepping actual consumers, not by naming convention alone):

- **`.catalog-image`, `.catalog-image--guarded`, `.catalog-image--card`, `.catalog-image--composed` and all `[data-image-presentation-mode="..."]` variants.** This was the most important discovery of this phase: the homepage renders the same `CatalogImage` React component (`src/components/catalog/catalog-image.tsx`) indirectly through the shared `ResponsiveProductMedia` wrapper in `src/components/ui/editorial-primitives.tsx`, and `globals.css` has home-rooted selectors that style the resulting `.catalog-image` class directly (`.home-hero-watch .catalog-image`, `.home-hero-watch-primary .catalog-image--composed[...]`, `.home-hero-watch-secondary .catalog-image--composed`, `.home-scenario-overview-media .catalog-image`, `.homepage-stage-watch .catalog-image`). Moving these classes into a catalog-only CSS Module would have silently broken homepage hero/scenario image rendering. `catalog-image.tsx` itself was **not modified** in this phase.
- **`.product-stage`, `.product-stage-plain`, `.product-stage-detail`, `.product-stage-contact`.** Documented in `docs/CATALOG_IMPLEMENTATION.md` as a "shared product media presentation" system; also referenced by shared `:has()` composition rules alongside `.catalog-image--composed`.
- **`.price-plate`, `.product-card-surface`.** Generically named (not catalog-prefixed), documented as a general "price plate" / "product card surface" presentation treatment, not catalog-exclusive by design even though current consumers happen to be catalog-only.
- **The `type-*` typographic role family** (`.type-label`, `.type-meta`, `.type-section`, `.type-body`, `.type-reference`, `.type-price`, `.type-editorial`). Several of these (`.type-label`, `.type-body`, `.type-reference`) are confirmed consumed outside the catalog (home, shell, collection, account, error pages), and all of them are one cohesive shared typographic system defined together — splitting it by current-usage-count would fragment a single design system across two files for no benefit.
- **`.editorial-link`, `.editorial-heading-title`, `.editorial-heading-deck`, `.section-heading*`, `.responsive-product-media`, `.thin-divider`, `.icon-action`.** Owned by the shared `src/components/ui/editorial-primitives.tsx` primitives, confirmed consumed outside the catalog (e.g. `(shop)/selection/page.tsx`).
- **`.public-page`, `.public-heading`.** Confirmed consumed broadly across `(public)` routes (Journal, Collection, Login) in addition to catalog/shop routes.
- **`.icon-heart`, `.icon-account`.** Owned by the shared `PublicShell` header (`src/components/shell/public-shell.tsx`), which also renders the same favorite icon at the header level.
- **`.watch-media`, `.watch-media-dark`.** Not referenced by any catalog component at all despite the `watch-` prefix; left untouched as out of scope.
- The mixed `@media (prefers-reduced-motion: reduce)` block that lists `.catalog-image` alongside `.home-hero-watch`, `.editorial-button`, `.editorial-link`, `.public-nav-link` — left as-is since it is a single shared block, not catalog-owned.

Where a catalog-owned rule needed to reference one of these shared classes (e.g. `.catalog-card-media .catalog-image--composed[...]`, `.catalog-help-card .editorial-link`, `.watch-overview-section p:not(.type-label)`), the moved rule uses CSS Modules' `:global(...)` escape hatch to reference the exact same unhashed class name, so the resulting compiled CSS is behaviorally identical to before — verified by a successful `next build` (which runs the real CSS Modules compiler) and full test suite pass.

## Selectors Moved

All selectors listed under "Original Global Selectors" above were moved into the four CSS Modules described below, in their original relative source order (so multi-pass cascade overrides for the same property remain in the same win order). Two selectors were found only during a second verification pass and correctly included: `.catalog-page .editorial-heading-deck` and a `.catalog-help-card { padding: 1rem 1.1rem; }` override.

One glyph-styling rule was duplicated rather than moved verbatim: `.catalog-card-favorite span` / `span::before` were originally written as extra branches of the shared header's combined `.icon-heart, .icon-account { ... }` / `.icon-heart::before { ... }` selectors. The declarations were copied unchanged into `catalog-watch-card.module.css` as their own `.cardFavorite span` / `.cardFavorite span::before` rules, and only the `.catalog-card-favorite` branches were removed from the shared combined selectors in `globals.css` — `.icon-heart`/`.icon-account` themselves are untouched.

## CSS Module Map

Four modules were created, matching the real component tree (two components — `CatalogMobileFilterSheet` and `CatalogPagination` — had no custom global CSS to isolate at all, so no module was created for them; see "Component Migration Map"):

```text
src/components/catalog/catalog-list-page.module.css     — page shell, toolbar, sidebar, results head, grid, feature strip
src/components/catalog/catalog-filter-panel.module.css  — filter bar, items, icons, controls, price range, reset
src/components/catalog/catalog-watch-card.module.css    — card shell, media, favorite icon, copy, facts
src/components/catalog/watch-detail.module.css          — hero, title scale, key specs, tabs, overview, gallery
```

Class names were converted from kebab-case (`catalog-page-head`) to camelCase (`pageHead`) per CSS Modules convention. No design tokens, colors, spacing values, or breakpoints were changed — every rule body is a verbatim copy of its original declaration.

## Component Migration Map

| Component | Change |
| --- | --- |
| `src/components/catalog/catalog-list-page.tsx` | Imports `catalog-list-page.module.css`; `catalog-page`, `catalog-page-head`, `catalog-toolbar`, `catalog-results-layout`, `catalog-sidebar`, `catalog-sidebar-list`, `catalog-sidebar-note`, `catalog-results-head`, `catalog-view-toggle`, `catalog-grid`, `catalog-feature-strip`, `catalog-feature-media` replaced with `styles.*`. `public-page`, `editorial-link`, `type-label` left as literal global strings. |
| `src/components/catalog/catalog-filter-panel.tsx` | Imports `catalog-filter-panel.module.css`; all `catalog-filter-*` classes (including the per-kind icon modifiers, now resolved through a small lookup map instead of string concatenation) replaced with `styles.*`. |
| `src/components/catalog/catalog-watch-card.tsx` | Imports `catalog-watch-card.module.css`; `catalog-product-card`, `catalog-card-favorite`, `catalog-card-media`, `catalog-card-copy`, `catalog-card-facts` replaced with `styles.*`. `product-stage`, `product-stage-plain`, `product-card-surface`, `price-plate`, `type-meta`, `type-price`, `type-reference` left as literal global strings. |
| `src/components/catalog/catalog-watch-detail-page.tsx` | Imports `watch-detail.module.css`; `watch-detail-page`, `watch-detail-hero`, `watch-detail-copy`, `watch-detail-title` (+ the `titleScaleClass()` helper, which now returns `styles.titleShort/-Medium/-Long` instead of literal strings), `watch-detail-deck`, `watch-detail-price-row`, `watch-detail-actions`, `watch-detail-media-shell`, `detail-media`, `watch-key-specs`, `watch-detail-tabs`, `watch-overview-section`, `watch-gallery-section` replaced with `styles.*`. `product-stage`, `product-stage-detail`, `product-stage-plain`, `price-plate`, `type-label`, `type-price`, `type-editorial`, `type-section` left as literal global strings. |
| `src/components/catalog/catalog-mobile-filter-sheet.tsx` | **Not modified.** Uses only Tailwind utility classes plus the shared `type-section` class — no catalog-owned global CSS existed to isolate. It renders `CatalogFilterPanel`, which now carries its own CSS Module, so the mobile sheet gets the isolated styling for free. |
| `src/components/catalog/catalog-pagination.tsx` | **Not modified.** Uses only Tailwind utility classes and CSS variables — no catalog-owned global CSS existed to isolate. |
| `src/components/catalog/catalog-image.tsx` | **Not modified — deliberately out of scope.** This component and its classes are a shared cross-surface primitive (see above); touching it risked breaking the homepage hero/scenario media. |

## Responsive Rules Moved

Every catalog-owned media query fragment was moved into the owning module's own `@media` block, preserving the exact breakpoint values:

- `@media (min-width: 768px)`: page-head grid columns (module 1); filter-expanded grid columns (module 2); hero/overview/gallery grid columns (module 4).
- `@media (min-width: 1024px)`: results-layout grid columns, sidebar visibility (module 1).
- `@media (max-width: 1360px)`, `@media (max-width: 1279px)`: filter-primary-row grid columns (module 2).
- `@media (max-width: 767px)`: feature-strip/feature-media mobile sizing (module 1); filter-primary-row/item/submit mobile layout (module 2); title/key-specs mobile sizing (module 4); `detail-media` mobile min/max-height (module 4); `title-long` mobile sizing (module 4).

Media queries that mixed catalog rules with home/Journal rules in `globals.css` (e.g. the shared `@media (min-width: 768px) { .public-nav, .public-actions { ... } .catalog-page-head { ... } .journal-topline { ... } }` block) were split: the catalog-owned declarations moved into the module's own copy of the same breakpoint, and the non-catalog declarations (`.public-nav`, `.public-actions`, `.journal-topline`, `.journal-layout`, `.journal-cover`, `.home-product-hero-index`, `.home-hero-word-right`, `.home-hero-annotation`, etc.) were left in place in `globals.css`, in their original media query wrapper.

## Known Visual Issues Intentionally Not Fixed

Per the strict mechanical-transfer instruction for this phase, the following pre-existing issues (already documented in `docs/CATALOG_CLAUDE_AUDIT.md`) were preserved exactly as they were, not corrected:

- `.title` (`watch-detail-title`) still scales up to `clamp(3.6rem, 8vw, 7.6rem)` (~122px desktop) — well above the `docs/PRODUCT_JOURNEY_REVIEW.md` page-title budget.
- `.hero` (`watch-detail-hero`) still forces `min-height: min(690px, calc(100vh - 120px))` — a near-full-viewport hero on every watch page.
- The dead tab anchors on the watch detail page (`#fit`/`#collection` links that don't always exist), the sibling-card construction duplication, the missing focus trap in the mobile filter sheet, and the missing `loading.tsx`/`error.tsx` per catalog route are all unchanged.
- The favorite/heart icon on every card and in the header still links to the non-functional `/account/favorites` stub; this phase did not touch that behavior.

These remain queued for the Phase 2+ redesign proposed in `docs/CATALOG_CLAUDE_AUDIT.md`, now on a safe, catalog-owned styling surface.

## Homepage Conflict Prevention

- No file under `src/components/home/**`, `src/app/(public)/page.tsx`, `src/app/design-lab/**`, `src/components/shell/**`, or `src/config/navigation.ts` was read for editing purposes or modified.
- The only homepage-adjacent fact this phase depended on was confirming, via `grep`, that `src/components/home/**` does not import `CatalogImage` directly and that the `.catalog-image*` classes are consumed by the homepage only through the shared `ResponsiveProductMedia` primitive and home-rooted CSS selectors — both of which were left fully intact in `globals.css`.
- `git diff --stat` for this phase touches exactly: `src/app/globals.css`, the four catalog `.tsx` components, two pre-existing catalog-related test files (updated only because they asserted on the literal legacy class-name strings this phase intentionally replaced), plus new files (`CLAUDE.md`, this document, four new `.module.css` files, one new test file). No homepage file appears in the diff.
- `src/app/globals.css` still contains `.home-catalog-grid`, `.home-hero-watch .catalog-image`, `.home-hero-watch-primary`/`-secondary` composed-image rules, `.home-scenario-overview-media .catalog-image`, `.homepage-stage-watch .catalog-image`, and every other home-prefixed selector, unchanged.

## Verification

Run from `C:/Users/Sergey/Documents/New project/eternal-time-catalog` on branch `ai/claude-catalog`, after the migration, before any commit:

- `npm run lint` → **pass**, zero errors/warnings.
- `npm run typecheck` (`tsc --noEmit`) → **pass**, zero errors.
- `npm run test` (`vitest run`) → **pass**, 26 test files / 169 tests. Two pre-existing tests (`tests/visual-system-reset.test.ts`, `tests/approved-visual-direction.test.ts`) initially failed because they asserted on the literal legacy class-name strings (`"catalog-card-media"`, `"watch-detail-hero"`, `"catalog-page-head"`, etc.); they were updated to assert on the equivalent `styles.*` module references instead, preserving their original intent (structure/order/content checks), and now pass. One new file, `tests/catalog-style-isolation.test.ts`, was added with 11 tests covering the isolation contract itself (see below).
- `npm run build` (`next build`, Turbopack) → **pass**. Compiled successfully, 34/34 static pages generated, identical route table to the pre-migration baseline (`/watches`, `/watches/[brandSlug]`, `/watches/[brandSlug]/[referenceSlug]`, `/brands`, `/catalog` all present with the same rendering mode). A successful build is itself strong evidence the `:global()` CSS Modules syntax used throughout is valid and correctly resolved, since Turbopack's CSS Modules compiler would fail the build on malformed module CSS.
- `git diff --check` → **pass**, exit code 0, no whitespace-conflict markers.
- `npm run secrets:scan` → **pass**, "No potential secrets found in git-visible text files."
- `git diff --stat` reviewed manually: only catalog-scoped files changed (see "Homepage Conflict Prevention").
- `src/app/globals.css` line count: 4,576 → 3,771 lines (805 lines removed — the catalog-owned CSS extracted). Brace balance verified equal (586 open / 586 close) before and after.

`tests/catalog-style-isolation.test.ts` asserts, without depending on hashed class names:

1. Each migrated component imports its own CSS Module.
2. Each migrated component's source no longer contains the legacy unscoped `className="catalog-..."` / `className="watch-detail-..."` string literals.
3. Migrated components still reference the confirmed-shared classes (`product-stage`, `price-plate`, `type-*`, `public-page`, `editorial-link`) as plain global strings.
4. The unmodified components (`CatalogMobileFilterSheet`, `CatalogPagination`) still contain their distinguishing structural markers and have no `.module.css` import.
5. `globals.css` no longer defines the migrated rule selectors, but still defines the shared/home-owned selectors that must not move.
6. A homepage component (`home-product-hero.tsx`) still contains its known sentinel string, confirming it was not touched.
7. `parseCatalogReadQuery`/`catalogQueryHref` (the actual data-layer functions, not test doubles) still serialize filter/sort/pagination state identically — proving the data layer was untouched by this phase.

## Manual QA URLs

No browser/screenshot tooling was available in this environment for this phase, so pixel-level visual parity is **not** claimed as verified — only structurally/mechanically verified (identical CSS declarations, in identical cascade order, confirmed by a successful build and full test suite). The following routes and viewport widths should be manually checked before this phase is considered visually confirmed, ideally by diffing against the `935079c` baseline commit:

```text
/watches                          — desktop 1440×900 and mobile 390×844
/watches/casio                    — desktop 1440×900 and mobile 390×844
/watches/{brandSlug}/{referenceSlug} for one real eligible watch — desktop 1440×900 and mobile 390×844
/brands                           — desktop 1440×900 and mobile 390×844
```

Areas to specifically compare against the pre-migration baseline:

- First viewport of `/watches`: header, page title/deck, "Не знаете, что выбрать?" help card, toolbar.
- Filter toolbar at desktop width (1440px and narrower breakpoints at 1360/1279px) and the mobile filter sheet at 390px (open/close, layout inside the sheet).
- Sidebar visibility at 1024px+ vs. hidden below.
- First row of watch cards: image sizing/background, brand/reference row, title, price, quick facts, favorite icon position.
- Feature strip (the promotional link between the first and remaining rows) at desktop and the 767px mobile breakpoint.
- Pagination controls (unchanged component, but worth confirming nothing shifted visually due to surrounding layout changes).
- Watch detail hero: title scale at each of the three title-length variants (short/medium/long), hero media sizing, key-specs strip, tab row, overview section, gallery section, sibling-references grid.
- 768px tablet breakpoint specifically for the hero/overview/gallery grid-column switch.

## Next Redesign Boundaries

This phase does not authorize a visual redesign. The next phase (Phase 2 in `docs/CATALOG_CLAUDE_AUDIT.md`'s implementation plan) may now freely edit the four new `.module.css` files without any risk of conflicting with homepage work, and should prioritize the two concrete, documented scale violations (`.title`, `.hero` min-height) alongside the filter/sorting UX polish already scoped there. Any further extraction of rules currently left in `globals.css` as "shared" (in particular, ever separating `.catalog-image*`/`.product-stage*` into a catalog-specific presentation vs. a true shared primitive) must go through the same shared-consumer verification process used in this phase — grep actual consumers across `src/components/home/**` and `src/components/ui/**` before assuming a class is safe to move, not just its naming pattern.
