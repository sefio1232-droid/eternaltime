# Catalog List Art Direction

Phase 2 record for the `ai/claude-catalog` worktree: a real, visually-load-bearing redesign of the catalog list experience (`/watches`, `/watches/{brandSlug}`). Watch detail (`/watches/{brandSlug}/{referenceSlug}`) is explicitly out of scope for this phase — see `docs/CATALOG_CLAUDE_AUDIT.md` Phase 3.

> **Superseded by Phase 2.1.** The Phase 2 visual result documented below was reviewed and rejected ("визуально НЕ принят") — card composition, the filter toolbar layout, the image placeholder, and default sort order were all rebuilt. See `docs/CATALOG_LIST_VISUAL_RECOVERY.md` for the current, accepted-pending-review state. This file is kept as the historical record of what Phase 2 attempted and why; treat its layout/CSS specifics as outdated.

## Product goal

The catalog is a discovery surface inside Eternal Time's ownership-cycle product, not a standalone storefront. This phase's goal was to make `/watches` read as premium, editorial, calm, and denser than a generic marketplace grid on first open — visible immediately at `http://localhost:3001/watches` — while changing nothing about how filtering, sorting, pagination, or canonical routing actually work.

## Current problems (before this phase)

Recorded in detail in `docs/CATALOG_CLAUDE_AUDIT.md` and restated here as the concrete brief this phase answered:

- The intro was a plain heading plus an unrelated-looking "Не знаете, что выбрать?" banner card.
- The filter bar was a grid of uniform bordered cells with a full-width "Все фильтры" row and an oversized "Применить" button.
- A permanent desktop sidebar duplicated the brand filter, narrowed the product grid, and read as dated e-commerce chrome.
- Cards were marketplace-generic: a misleading heart icon linking to a static `/account/favorites` stub, a "Код {reference}" label, inconsistent image framing, and almost no hover feedback.
- The bottom editorial insert used an arbitrarily cropped image and had no real relationship to the surrounding grid or a real route.
- Pagination was a set of plain bordered squares.
- No loading skeleton or catalog-branded error boundary existed for the list routes.
- No dev-only inspection tooling existed to verify filter state, image provenance, or breakpoint behavior while iterating.

## Final visual direction

**Modern Editorial Watch Catalog + Quiet Luxury + Precise Product Information + Low-Noise Discovery.**

Concretely: warm paper background, cool steel product stages, restrained blue and champagne as the only accent colors, no large border-radius, no glassmorphism, no gradients on cards, no badges, one calm hover interaction per card (image scale + arrow shift), and typography that never exceeds the catalog's own bounded scale (see below) — deliberately smaller than the watch-detail page's still-oversized display type, which this phase did not touch.

## Page structure

```text
Intro (compact editorial header, ~2 columns desktop)
  ├─ Eyebrow + title + lead (left, 7–8 cols equivalent)
  └─ Discovery prompt → /selection (right, 4–5 cols equivalent, thin divider, no card chrome)

Toolbar (sticky, translucent, thin top/bottom rule)
  ├─ Primary row: search, brand*, mechanism, price range, sort, compact submit, "Все фильтры" disclosure
  └─ Active filters row (chips with per-filter remove links + "Сбросить все"), shown only when filters are active

Results head: "Найдено N моделей"

Grid (no sidebar, full content width)
  ├─ Watch cards (image-first, uniform media stage)
  └─ One editorial insert spliced in after the 8th card (or at the end if fewer than 8 results)

Pagination (thin dividers, active page underlined, "Страница X из Y")
```

`*` Brand is only shown as a primary filter on `/watches`; brand catalog pages (`/watches/{brandSlug}`) fix the brand via the route and hide the control, unchanged from before this phase.

A compact "brand strip" above the grid was considered (task section 18) and deliberately **not** added: the brand dropdown already solves brand narrowing, and a second brand control would duplicate the toolbar and add a row the "low-noise" direction argues against.

## Typography

Implemented in `catalog-list-page.module.css` under the `.shell` custom-property scope:

| Role | Size | Notes |
| --- | --- | --- |
| Page title | `clamp(3rem, 4.8vw, 4.5rem)` (48–72px) | `--font-editorial`, never the detail-page scale |
| Intro lead | `clamp(1.0625rem, 1.1vw, 1.1875rem)` (17–19px) | |
| Toolbar labels | `0.68–0.72rem` uppercase, `0.08–0.14em` tracking | |
| Card brand | `0.76rem` uppercase | catalog-watch-card.module.css `.brand` |
| Card model | `clamp(1.0625rem, …, 1.25rem)` (17–20px), 2-line clamp | `.model` |
| Card reference | `0.76rem` monospace (`--font-reference`) | `.reference` |
| Card price | `clamp(1.125rem, …, 1.3125rem)` (18–21px) | `.price` |
| Card specs | `0.78rem` uppercase | `.specs` |

Line-heights follow the brief: headings ~1.02–1.08, body ~1.5–1.55, metadata ~1.25–1.35.

## Colors

Catalog-owned design tokens, declared once as CSS custom properties on `.shell` in `catalog-list-page.module.css` and consumed by every catalog-list component (`catalog-watch-card.module.css`, `catalog-filter-panel.module.css`, `catalog-mobile-filter-sheet.module.css`, `catalog-pagination.module.css`) via inheritance — never written into `src/app/globals.css` and never touching a homepage token:

```css
--catalog-paper: #f5f3ee;
--catalog-paper-light: #fbfaf7;
--catalog-surface: #eeece6;
--catalog-image-stage: #f0f2f1;
--catalog-ink: #10161a;
--catalog-graphite: #2b3338;
--catalog-muted: #747b7f;
--catalog-steel: #83949d;
--catalog-blue: #315e74;
--catalog-blue-soft: #dce7eb;
--catalog-champagne: #b9833d;
--catalog-line: rgba(16, 22, 26, 0.12);
--catalog-line-strong: rgba(16, 22, 26, 0.22);
--catalog-focus: #315e74;
```

The catalog is not beige throughout: warm paper is the page background only; product stages use the cool `--catalog-image-stage`; blue is the only interactive/link accent; champagne is reserved for the editorial insert's eyebrow.

## Filter system

- **Primary toolbar** (`CatalogFilterPanel`, one `<form>`, unchanged GET-to-`pathname` semantics): search field with an icon submit button, brand (on `/watches` only), mechanism, a compact price range pair, sort, and a compact "Показать" submit — no more full-width "Применить" cell.
- **"Все фильтры" disclosure** (native `<details>`, no client JS): collection (only shown when the brand-collection facet has more than one real value), water resistance, case material, crystal, plus its own "Показать модели" submit.
- **Active filters row**: rendered only when at least one filter is active, built from the real `CatalogReadQuery` in `buildActiveChips()` — each chip links to a `catalogQueryHref` with only that one field cleared (a real navigation, not client state), plus a "Сбросить все" link reusing the same reset-href helper (`catalogFilterResetHref`, now exported so the mobile sheet can reuse it too).
- **Visual style**: sticky toolbar wrapper with `rgba(251, 250, 247, 0.94)` background and `backdrop-filter: blur(6px)` behind a `@supports` guard, thin top/bottom rules, underline-style (not boxed) form controls, no rounded-pill overload.
- **Mobile filter sheet** (`CatalogMobileFilterSheet`, the only Client Component besides the dev-only review drawer): real `role="dialog"` / `aria-modal="true"` / `aria-labelledby` semantics, a manual focus trap (Tab/Shift+Tab cycling within the dialog), Escape-to-close, focus moves to the close button on open and returns to the trigger button on close, `document.body.style.overflow` is locked while open and restored on close, and a sticky footer with a real "Сбросить" link and a "Показать {N} моделей" submit button associated to the shared filter `<form>` via the HTML `form` attribute (no duplicate form, no JS-driven submission).

None of this changed `parseCatalogReadQuery`, `catalogQueryToSearchParams`, `catalogQueryHref`, `listCatalogWatches`, or any server/client boundary — verified in `tests/catalog-list-redesign.test.ts`.

## Watch card anatomy

`CatalogWatchCardView` (Server Component, unchanged data contract — `CatalogWatchCard`):

```text
<article> (whole-card <Link href={watch.href}>)
  Media stage (1:1, --catalog-image-stage background, ~12% padding, object-fit: contain)
  Brand (uppercase eyebrow)
  Model heading (brand prefix stripped via new displayWatchModelHeading() helper)
  Reference (monospace, no "Код" label)
  Price
  Up to 2 key specs (uppercase, from the existing keySpecifications field — unchanged selection logic)
  "Смотреть модель →" footer line
```

- **No favorite icon.** The misleading heart that linked to the static `/account/favorites` stub was removed from every card this phase, per the explicit instruction not to ship an action that does nothing. The shared header's own favorite icon (`PublicShell`) is a separate, pre-existing, out-of-scope concern (see `docs/CATALOG_CLAUDE_AUDIT.md`, "Shared problems not to edit") and was intentionally left alone.
- **Hover** is pure CSS: image `scale(1.02)`, a very light bottom gradient wash, and the footer arrow translating 4px — no layout shift, no shadow, no border-radius animation.
- **Linking**: the entire card content sits inside one `<Link>`; there is no nested interactive element and no second link, so there is nothing that could produce invalid nested anchors.
- **Future action note** (per the explicit instruction not to build fake persistence): the natural next iteration is a real "Сохранить в кандидаты" action once the Candidates domain from `docs/DOMAIN_REVIEW.md` §5 is implemented. Nothing resembling that button exists in this phase's production UI.

## Image presentation rules

Full findings in `docs/CATALOG_IMAGE_AUDIT.md`. Summary:

- `preview-catalog-adapter.ts` now selects each watch's `primaryImage` with `selectBestCatalogHeroImage(imageGallery)` — the same alt-text/order heuristic (`isLikelyTechnicalAngle` / `isProminentCatalogImage`) already trusted for the watch-detail hero — instead of blindly taking `imageGallery[0]`. This is a same-reference, same-gallery reselection only; it never substitutes another reference's image, never fabricates one, and never upscales a source file.
- Audited against the real current dataset (559 public watches): 279 have no image at all (unresolved, listed in the audit, not fixable without new source data), 0 have only technical-angle images available, and 0 required the fix to actually reselect a different image in the current data — meaning the existing source photography already tends to lead with a front view when more than one photo exists. The fix is a real, verified safety net for future/other data, not a fix that happened to change anything visible today.
- Card media stage: fixed 1:1 aspect ratio, `--catalog-image-stage` background, ~12% padding so no watch touches the frame edge, `object-fit: contain` so nothing is cropped or stretched.
- No typed per-reference presentation overrides were added this phase — none were found to be necessary given the audit results above.

## Grid

Defined directly in `catalog-list-page.module.css` (replacing the previous Tailwind `sm:/lg:/xl:grid-cols-*` utility classes with explicit breakpoints matching the brief):

| Width | Columns | Gap |
| --- | --- | --- |
| < 480px | 1 | 14px |
| ≥ 480px | 2 | 18px |
| ≥ 768px | 2 | 20px |
| ≥ 1024px | 3 | 26px |
| ≥ 1200px | 4 | 28px |
| ≥ 1800px | 5 | 28px |

No sidebar exists at any width; the grid uses the full content width. Card heights are equalized by the grid's implicit row sizing plus each card's fixed-aspect media stage and clamped 2-line model heading.

## Editorial insert

Spliced into the grid after the 8th card (via explicit CSS `order`, not a page break) using the existing `featuredWatch` pattern (first item with a real image) so it never invents a product. Two content variants, both linking to a real route:

- If the current result set's movement facet contains an "автомат" value, the insert reads "Механические часы для первой коллекции" and links to `/watches?movement=<that facet value>` — a real, working filtered view of the same catalog, not a fake listing.
- Otherwise it falls back to a generic "Не уверены, с чего начать?" prompt linking to `/selection`.

No cropped back-of-watch photography; the insert reuses the same `CatalogImage` presentation pipeline as the cards (benefiting from the front-image-preference fix above), sized within its own `catalog-image-stage` panel, never stretched or force-cropped.

## Pagination

`CatalogPagination` keeps its exact previous props, URL-building logic (`catalogQueryHref`), and page-window algorithm — only the visual treatment changed: thin vertical dividers instead of boxed buttons, the active page underlined in ink instead of a filled square, disabled Back/Forward links use `tabIndex={-1}` and `aria-disabled`, and a "Страница X из Y" caption was added beneath the control row.

## Empty state

Rendered inline in `CatalogListPage` (not the generic shared `EmptyState` component, which has no action slot): "Ничего не найдено", a factual body line, and a real "Сбросить фильтры →" link built from `catalogFilterResetHref`. No data logic changed — this only renders when `result.items.length === 0`, exactly as before.

## Loading and error states

New, catalog-scoped, added only for the two list routes (`/watches`, `/watches/{brandSlug}`) — the watch-detail route (`[referenceSlug]`) was not touched, and nothing was added to the homepage:

- `catalog-list-loading.tsx` + `.module.css`: a skeleton whose intro/toolbar/grid block dimensions match the real layout (no layout shift once real content arrives), 8 card placeholders, a single calm opacity pulse (not a shimmer sweep), fully disabled under `prefers-reduced-motion`.
- `catalog-list-error.tsx` + `.module.css` (Client Component, required by the Next.js `error.tsx` contract): a factual, non-technical message, a "Попробовать снова" retry button wired to the framework's `reset()`, and a "Вернуться в каталог" link — no stack trace or technical detail is ever shown to the user.
- Wired in as `src/app/(shop)/watches/loading.tsx` / `error.tsx` and `src/app/(shop)/watches/[brandSlug]/loading.tsx` / `error.tsx`.

## Mobile behavior

- Grid: 1 column below 480px, 2 columns from 480px, matching the brief's "2 compact cards only if legible" preference — the card's clamped 2-line model heading and compact type scale were sized specifically to keep this legible; this should still be confirmed visually (see Manual QA below), since no browser tooling was available in this environment.
- Filter trigger is always visible below 768px (`CatalogMobileFilterSheet`'s `.wrap` is `display: none` above 767px, `display: block` below); the sheet itself is a bottom sheet with a sticky footer action and safe-area padding (`env(safe-area-inset-bottom)`).
- Toolbar remains sticky on mobile as on desktop; no permanent sidebar exists at any width, so there is nothing to stack awkwardly.

## Accessibility

- Every filter control has a real `<label>` (visually hidden for the search field's redundant text label, visible for the rest).
- The mobile dialog has correct `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, a manual focus trap, Escape handling, focus-on-open and focus-return-on-close, and body scroll lock — see `catalog-mobile-filter-sheet.tsx`.
- No `div` masquerading as a button anywhere in the new markup; all interactive elements are real `<a>`/`<button>`/`<select>`/`<input>`.
- The card's whole-card link has a visible `:focus-visible` outline (`outline: 2px solid var(--catalog-focus)`), as does every other interactive element in the redesigned components.
- Decorative arrows/icons are `aria-hidden="true"`; the card's "Смотреть модель" text itself is real, announced text, not hidden.
- Pagination and filter/reset controls target at least 44px in their primary dimension.
- Filter chip removal and pagination are plain navigations (`<Link>`), so focus lands on the newly-rendered page's content in the browser's normal way — no custom focus management was needed there because nothing intercepts the navigation.

## Performance

- Only the first 4 cards on a page render with `priority` (eager `loading`, high `fetchPriority`) via a new optional `priority` prop on `CatalogWatchCardView`; the rest lazy-load, unchanged from the previous per-image default.
- No `next/image` `sizes` attribute was added: the shared `CatalogImage` component renders a plain `<img>` without `srcset`, so a `sizes` attribute would have no effect; extending `CatalogImage` itself was out of scope (shared with the homepage hero — see `docs/CATALOG_STYLE_ISOLATION.md`).
- No source image is ever upscaled; only CSS containment (`object-fit: contain`, fixed aspect ratio) changed.
- No animation library was added; every transition is plain CSS (`transition`, `@keyframes`).
- `CatalogWatchCardView`, `CatalogListPage`, `CatalogFilterPanel`, and `CatalogPagination` remain Server Components; only `CatalogMobileFilterSheet` (pre-existing) and the new dev-only `CatalogReviewDrawer` are Client Components — verified in `tests/catalog-list-redesign.test.ts`.

## Review mode

Dev-only, gated by `process.env.NODE_ENV !== "production" && searchParams.catalogReview === "1"`, computed server-side in both `src/app/(shop)/watches/page.tsx` and `.../[brandSlug]/page.tsx` before `CatalogReviewDrawer` is ever rendered — it is structurally impossible for a production build to render it. The fixed-position drawer (`catalog-review-drawer.tsx`) shows route/pathname/canonical, total results, page/pageCount, sort, active filters (behind its own toggle), live viewport width/breakpoint/grid-column count, a server/client component map, and a per-card list (reference, href, image kind, image src behind its own toggle). Its "Show grid / Show card bounds / Show image bounds / Compact density / Default density" controls toggle `data-catalog-review-*` attributes on `<html>`, which only ever match always-present-but-inert marker classes (`catalog-grid-review-overlay`, `catalog-card-review-outline`, `catalog-media-review-outline`) rendered in the real components — so the drawer never affects layout when closed or in production, and toggling it costs nothing beyond a few CSS rules that only match when the attribute is explicitly set by the drawer's own JS.

## Acceptance criteria

Matches Phase 2's own acceptance list in the task brief:

- Sidebar removed, filters no longer read as an admin table, "Все фильтры" is a small disclosure not a heavy row, cards are not marketplace-generic, the favorites heart no longer lies about doing something, images are contained (never edge-to-edge), cards share one media-stage size, hover never shifts layout, the editorial insert reuses real product imagery through the standard presentation pipeline, no horizontal overflow was introduced, the mobile sheet is fully keyboard-operable, pagination reads as a designed control rather than a technical prototype, no fake actions were added, filtering/sorting/pagination/canonical URLs are unchanged (verified by tests reusing the real data-layer functions), and watch detail / homepage were not touched.
- See the Phase 2 entry in `docs/CATALOG_CLAUDE_AUDIT.md` for verification results (lint/typecheck/test/build/secrets) and honest Manual QA guidance, since no browser/screenshot tooling was available in this environment to confirm pixel-level visual parity with the intended design.
