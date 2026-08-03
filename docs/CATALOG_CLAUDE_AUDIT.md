# Eternal Time Catalog Audit

Prepared by Claude in the `eternal-time-catalog` worktree (branch `ai/claude-catalog`) as a read-only first pass: environment verification, permanent instructions, and a full audit with a proposed redesign plan. No production catalog code, homepage code, backend, or imports were modified in this pass. Only `CLAUDE.md` and this file were created.

## Phase status

- **Phase 0 (this audit): done.** Read-only audit and planning pass, no catalog code changed.
- **Phase 1 (CSS isolation): done.** Catalog-owned CSS was extracted from the shared `src/app/globals.css` into four catalog-scoped CSS Modules (`catalog-list-page.module.css`, `catalog-filter-panel.module.css`, `catalog-watch-card.module.css`, `watch-detail.module.css`), with no intentional visual, layout, or functional change. Full details, the exact selector inventory, the shared-vs-catalog-owned classification (including the discovery that `.catalog-image*`/`.product-stage*` are genuinely shared with the homepage hero and must stay global), and manual QA guidance are recorded in `docs/CATALOG_STYLE_ISOLATION.md`.
- **Phase 2 (catalog list visual redesign): done.** A real, visually load-bearing redesign of `/watches` and `/watches/{brandSlug}` — compact editorial intro, redesigned two-row filter toolbar with a real active-filters chip row, permanent desktop sidebar removed, watch card fully rebuilt on catalog-owned design tokens (misleading favorite icon removed), redesigned pagination, a real editorial insert, a catalog-branded empty state, `loading.tsx`/`error.tsx` boundaries for both list routes, a dev-only `?catalogReview=1` inspection drawer, an accessible mobile filter sheet (focus trap, Escape, focus return, scroll lock), and a data-layer fix that prefers a front-facing image over a technical/back angle when one exists in a watch's own gallery. Full details, rationale, and honest manual-QA guidance in `docs/CATALOG_LIST_ART_DIRECTION.md`; the image investigation in `docs/CATALOG_IMAGE_AUDIT.md`. **Watch detail page visuals were not touched** — the two scale violations noted in Phase 1 (`.title` ≈122px desktop in `watch-detail.module.css`, `.hero` 690px min-height) are still unresolved, queued for Phase 3.
- **Phase 2.1 (catalog list visual recovery): done.** The Phase 2 result above was reviewed and rejected ("визуально НЕ принят") on concrete screenshot evidence: disjointed toolbar, floating card text, empty/placeholder-dominated first row, a source-review annotation (`ECB-950YMP-1A блять повтор`) leaking into public copy, and an oversized editorial insert. This phase rebuilt the card on flexbox (fixing a CSS Grid row-stretch bug that caused the floating-text illusion), rebuilt the toolbar on an explicit 12-column grid with no CSS `order` hacks, added a `sanitizeCatalogPublicText()` presentation layer (also catching and fixing an unsanitized `watchModelName` field feeding the watch-detail heading — found via this phase's own test suite, not the original report), added default-sort image-first prioritization, and replaced the minimal "ET" placeholder with a full editorial `CatalogMissingImage` component. Full details in `docs/CATALOG_LIST_VISUAL_RECOVERY.md`, which supersedes the visual specifics (not the route/data-flow map) in `docs/CATALOG_LIST_ART_DIRECTION.md`.
- **Phase 2.2 (premium editorial rebuild): done.** A real visual rebuild on top of Phase 2.1's functional fixes: compact intro (72–88px top padding, ~half the previous title size), a leaner filter rail (no sticky, trimmed field heights), a full product-card visual rebuild (no bordered rectangle, material media stage with radial highlight, typography hierarchy, hover/focus per spec), a new "opening product composition" (1 lead + 4 supporting cards in an explicit-grid-placement 12-column layout, page 1 only, no CSS `order`), a dedicated navy `CatalogEditorialInsert` component, champagne-accented pagination, a simplified results header, and a targeted fix to `selectBestCatalogHeroImage`/`isLikelyTechnicalAngle` (visually confirmed and corrected a caseback image being shown as A168WA-1WDF's primary photo). Full details in `docs/CATALOG_PREMIUM_EDITORIAL_REBUILD.md`.
- **Phase 3 (complete visual reset — header, tabs, filters, curation, grid, editorial system): done.** The prior "Phase 2.2" opening composition (oversized lead card, 2×2 supporting grid) was rejected on screenshot evidence and fully removed — every card, including A130WE-7ADF, now renders through one regular card structure. Fixed the actual root cause of card-image cropping: a `transform: scale(1.22)` applied on top of an already `object-fit: contain`-fitted image inside an `overflow: hidden` card, scoped to the catalog-card slot only. Fixed AE-1200WH-1BV's caseback primary image via the same per-imageKey denylist mechanism used for A168WA-1WDF. Added a real "Рекомендуемые"/"Все часы"/brand `CatalogTabs` system over the existing query architecture (`view` param), plus a deterministic, brand/family-diversified Recommended ranking with a 10 000 ₽ price floor (459/559 watches eligible; first page splits 6/6/6/6 across all four real brands). Moved brand selection out of the primary filter row into the expanded panel now that tabs cover it. Full details in `docs/CATALOG_VISUAL_RESET.md`, which supersedes `docs/CATALOG_PREMIUM_EDITORIAL_REBUILD.md`'s opening-composition section specifically (the rest of that phase's card/toolbar/masthead work was extended, not reverted).
- **Phase 4 (watch detail redesign) and beyond: not started.** Proceed only after explicit user direction, per "Proposed implementation phases" below.

## Worktree verification

- Working directory: `C:/Users/Sergey/Documents/New project/eternal-time-catalog` — matches expected path.
- Branch: `ai/claude-catalog` — matches expected branch.
- `git worktree list` confirms a second worktree at `C:/Users/Sergey/Documents/New project/eternal-time` on `ai/codex-homepage`, both currently at commit `935079c`.
- `git log -1 --oneline`: `935079c wip: snapshot current project state` — matches expected.
- Pre-existing `git status --short` showed only `M next-env.d.ts` (Next.js dev-server-regenerated type reference, reverted itself after `npm run build` ran) and `?? imports/` (local import-pipeline working directory: `imports/generated`, `imports/raw`, `imports/reports`, plus a stray nested `imports/imports/` folder not covered by `.gitignore`, which is why the whole `imports/` directory shows as untracked). Neither is in-progress product work; both are local tooling artifacts and were left untouched.
- No commits were created. No push was performed. No branch switch occurred.

## Instructions reviewed

- `AGENTS.md` (root permanent contract).
- `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN.md`, `docs/DOMAIN_REVIEW.md`, `docs/DATABASE.md`, `docs/ROUTES.md`, `docs/SEO.md`, `docs/SECURITY.md`, `docs/IMPORTS.md`, `docs/ROADMAP.md`.
- Catalog-specific: `docs/CATALOG_IMPLEMENTATION.md`, `docs/CATALOG_READ_EXPERIENCE.md`, `docs/CATALOG_SOURCE_DATA.md`, `docs/CATALOG_IMPORT_QUALITY.md`, `docs/CATALOG_APPLY.md`, `docs/PRODUCT_JOURNEY_REVIEW.md`.
- Not required for catalog scope and not read in depth this pass: `docs/MANUAL_WATCHES.md`, `docs/COLLECTION_INTELLIGENCE.md`, `docs/AI.md`, the `HOME_HERO_*` docs (homepage-owned).

## Product context

Eternal Time is an ownership-cycle product, not a storefront: catalog → selection → candidates → compare → purchase → collection → collection intelligence → next recommendation (`docs/PRODUCT.md`). `docs/PRODUCT_JOURNEY_REVIEW.md` is the binding UX/density contract for any future catalog redesign — it defines a bounded type scale (page titles 36–64px, not 122px), a bounded spacing scale (4–88px), one primary action per screen, and explicitly documents that the *current* implementation is already too large/heavy and needs correction, not further expansion. This review is the design brief the catalog must follow; the catalog is not currently compliant with it (see "Desktop visual audit").

## Domain architecture

Confirmed unchanged and must stay unchanged:

```text
Brand → Brand Collection → optional Brand Line → Watch Model → Manufacturer Reference (watch_references) → Catalog Offer → Price/Inventory/Delivery
```

- Canonical watch URL: `/watches/{brandSlug}/{referenceSlug}`. Verified in `src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx` and `CatalogWatchDetail.href`.
- `watch_references` is the sole canonical concrete-watch entity; no `watch_variants` exists anywhere in the code (`docs/DOMAIN_REVIEW.md` §3).
- Price/inventory belong to `catalog_offers`, never to `watch_references` — the read models correctly keep `publicPrice` separate from identity fields (`src/modules/catalog/domain/read-models.ts`).
- Candidate/Compare/User Watch Collection domain concepts (`candidate_items`, `user_watches`) are **not implemented as migrations yet** — see "Parallel-work risks" and "Shared problems not to edit" for the concrete consequence this has on the current watch card.

## Route map

All catalog routes live under the `(shop)` route group — **not** `(public)` as commonly assumed. Route group folders are not part of the URL.

| URL | File | Type | Data source | Metadata/canonical | Loading/error/empty | Notes |
|---|---|---|---|---|---|---|
| `/watches` | `src/app/(shop)/watches/page.tsx` | Server Component, `dynamic = "force-dynamic"` | `listPublicCatalogWatches` via Catalog Read Repository | Static `metadata` export, canonical `/watches` | `CatalogSourceState` on `CatalogReadSourceError`; `EmptyState` inside `CatalogListPage` when `items.length === 0` | Full facet/sort/pagination entry point |
| `/watches/{brandSlug}` | `src/app/(shop)/watches/[brandSlug]/page.tsx` | Server Component, `force-dynamic` | `getPublicCatalogBrand` + `listPublicCatalogWatches` (parallel) | `generateMetadata` per brand, canonical `/watches/{slug}` | `CatalogSourceState`; `notFound()` when brand missing | Same `CatalogListPage` shell, `includeBrandFilter=false` |
| `/watches/{brandSlug}/{referenceSlug}` | `src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx` | Server Component, `force-dynamic` | `getPublicCatalogWatch` | `generateMetadata` per watch, canonical = `watch.href`, inline `Product` JSON-LD | `CatalogSourceState`; `notFound()` when watch missing | Reads `?collection=` query param only to pass UI state (`invalid_reference` / `duplicate`) into `CollectionWatchAction` |
| `/brands` | `src/app/(shop)/brands/page.tsx` | Server Component, `force-dynamic` | `listPublicCatalogBrands` | Static `metadata`, canonical `/brands` | `CatalogSourceState`; no explicit empty state (renders empty `<section>` if 0 brands, no `EmptyState` component used) | Text-led layout when a brand has <2 watch images |
| `/catalog` | `src/app/(shop)/catalog/page.tsx` | Server Component | none | n/a | n/a | Pure `redirect("/watches")`, matches `docs/ROUTES.md`/`docs/SEO.md` |
| `/compare` | `src/app/(shop)/compare/page.tsx` | not read this pass (out of scope: Compare is a separate future module) | — | — | — | Exists as a route file but Compare logic is explicitly not implemented per `docs/CATALOG_READ_EXPERIENCE.md` |
| `/candidates` (documented in `docs/ROUTES.md`/`docs/PRODUCT_JOURNEY_REVIEW.md`) | **does not exist in code** | — | — | — | — | See "Problems to preserve context for" — the watch card's save action currently points elsewhere |

No search-specific route exists; search is a query param (`?q=`) on `/watches`, submitted via a header `SearchDialog` (shared component, not read in depth — lives in `src/components/shell/search-dialog.tsx`, forbidden to edit).

## Component map

| Component | Path | Boundary | Responsibility | Risk |
|---|---|---|---|---|
| `CatalogListPage` | `src/components/catalog/catalog-list-page.tsx` | Server | Page shell: header, toolbar, brand sidebar, grid, feature strip, pagination | Catalog-only |
| `CatalogFilterPanel` | `src/components/catalog/catalog-filter-panel.tsx` | Server (plain `<form action={pathname}>`, GET) | Search box, 3 primary selects, sort select, `<details>`-based "all filters" disclosure, price range, reset link | Catalog-only |
| `CatalogMobileFilterSheet` | `src/components/catalog/catalog-mobile-filter-sheet.tsx` | Client (`"use client"`, `useState`) | Wraps `CatalogFilterPanel` in a bottom-sheet dialog for `<lg` viewports | Catalog-only |
| `CatalogPagination` | `src/components/catalog/catalog-pagination.tsx` | Server | Prev/next + windowed page links | Catalog-only |
| `CatalogWatchCardView` | `src/components/catalog/catalog-watch-card.tsx` | Server | Product card: image, brand, reference, title, price, up to 2 quick facts, favorite icon | Catalog-only, but links to `/account/favorites` (see findings) |
| `CatalogImage` | `src/components/catalog/catalog-image.tsx` | Server | Renders `<img>` (not `next/image`) or a neutral "missing" placeholder, applies composition CSS vars | Catalog-only |
| `CatalogWatchDetailPage` | `src/components/catalog/catalog-watch-detail-page.tsx` | Server | Full detail page: breadcrumbs, hero, key facts, tab nav, overview, gallery, grouped specs, sibling references | Catalog-only, but imports `CollectionWatchAction` |
| `CatalogSourceState` | `src/components/catalog/catalog-source-state.tsx` | Server | Generic "catalog unavailable" message | Catalog-only |
| `CollectionWatchAction` | `src/components/collection/collection-watch-action.tsx` | Server (uses `getCurrentUser`, Supabase server client) | Renders "Add to collection" CTA on watch detail | **Not catalog-owned** — lives in `src/components/collection/**`, forbidden per this worktree's scope without explicit permission |
| `PublicShell` | `src/components/shell/public-shell.tsx` | Server | Header (logo, nav, search, favorite icon, account icon), footer — used by both `(public)` and `(shop)` layouts | **Shared/forbidden** |
| `EditorialContainer`, `EditorialHeading`, `EmptyState`, `Container`, `Button`/`ButtonLink` | `src/components/ui/**` | Server | Generic UI primitives reused across public/shop/account | **Shared** — treat as read-only unless a change is catalog-exclusive and non-breaking |

No dedicated `CatalogSkeleton`/loading.tsx exists for any catalog route (`src/app/(shop)/watches/loading.tsx`, `.../[brandSlug]/loading.tsx`, `.../[referenceSlug]/loading.tsx` are all absent) — see "Technical audit".

## Data flow

```text
imports/generated/catalog-import-preview.json (dev-only, gitignored)
  + imports/generated/catalog-image-upload-plan.json
        │
        ▼  readOptionalJsonFile (server-only, React `cache()`-deduped per request)
catalog-read-repository.server.ts: getCatalogReadDataset()
        │  resolveCatalogReadSourcePolicy() — preview allowed only outside production,
        │  production without a configured `database` source throws CatalogReadSourceError
        ▼
catalogReadDatasetFromPreview({ preview, imagePlan })  → CatalogReadDataset
        │  (maps ONLY applyEligibility.status === "eligible" AND
        │   sourceRowClassification.action === "allow_public_read_and_apply" records;
        │   strips source provenance, validation issues, SEO drafts, internal prices)
        ▼
listPublicCatalogWatches(query) / getPublicCatalogBrand / listPublicCatalogBrands / getPublicCatalogWatch
        │
        ▼
catalog-read-service.ts: listCatalogWatches(dataset, query)
        │  1. matchesQuery()  — brand/collection/movement/water/material/crystal/price/search, ALL in-memory
        │  2. sortWatches()   — default/price_asc/price_desc/name_asc, ALL in-memory
        │  3. buildFacets(filtered) — facet counts computed AFTER filtering except the active dimension itself
        │  4. paginate (slice)
        ▼
CatalogListResult { items: CatalogWatchCard[], facets, page, pageCount, query }
        │
        ▼
CatalogListPage (Server Component) → CatalogWatchCardView × N (Server Component, no client JS)
```

Key facts:

- **Everything is server-side.** Filtering, sorting, search ranking, and facet counting all run inside `listCatalogWatches` on every request, in memory, over the full eligible dataset (currently ~559 records per `docs/CATALOG_READ_EXPERIENCE.md`). There is no query-level pushdown yet because there is no database — this is expected for the preview-source phase but will need to move to SQL-level filtering when the `database` repository is implemented (`docs/CATALOG_READ_EXPERIENCE.md` "Future Repository").
- The **only** client-side interactivity in the whole catalog list/detail experience is `CatalogMobileFilterSheet`'s open/close `useState` — filtering itself is a plain GET form submit (`action={pathname}`), so all filter/sort state round-trips through the URL server-side. This matches the "Preserve Server/Client boundaries" rule in `AGENTS.md` well.
- **Primary image selection**: `toCatalogWatchCard` just forwards `watch.primaryImage` as staged by the import pipeline; on the detail page, `selectBestCatalogHeroImage` (`catalog-image-presentation-policy.ts`) picks the first image judged "prominent" (not missing, not "technical angle" per alt-text heuristics such as `caseback`, `clasp`, `вид сбоку`, or image order ≥ 4).
- **Price selection**: `publicPrice` on `CatalogWatchCard`/`CatalogWatchDetail` is the `publicPriceCandidate` staged by the import pipeline (max valid recognized RUB price; see `docs/CATALOG_SOURCE_DATA.md`). Missing price renders as `"Цена уточняется"` (`formatCatalogMoney`), never as 0 or blank.
- **Brand/collection labels** come straight from `watch.brandName` / `watch.brandCollectionName` on the read model; no separate lookup.
- **href/canonical**: `watch.href` is built once in the read-model mapping (not shown this pass at the exact line, but consumed consistently everywhere — cards, siblings, breadcrumbs, JSON-LD `url`) and always resolves to `/watches/{brandSlug}/{referenceSlug}`.
- **No direct import-preview reads on the client** — confirmed: `catalog-read-repository.server.ts` has `import "server-only"` at the top and only Server Components (`page.tsx` files) call into it. `CatalogMobileFilterSheet`, the only Client Component in the tree, receives already-resolved `facets`/`query` as props.

## Catalog Read Repository usage

- Single entry point: `src/modules/catalog/infrastructure/catalog-read-repository.server.ts`, exporting `listPublicCatalogWatches`, `getPublicCatalogBrand`, `listPublicCatalogBrands`, `getPublicCatalogWatch`, and `CatalogReadSourceError`.
- Source policy (`catalog-read-source-policy.ts`) is a 2-branch pure function, fully covered by `tests/catalog-read-experience.test.ts`: `preview` + `production` → disallowed; `preview` + non-production → allowed; `database` → allowed (repository for `database` is not implemented yet, so in practice this throws `catalog_source_not_configured` today in any environment where `CATALOG_READ_SOURCE=database`).
- All three catalog route files (`/watches`, `/watches/[brandSlug]`, `/watches/[brandSlug]/[referenceSlug]`) follow the identical pattern: call the repository, catch `CatalogReadSourceError`, render `CatalogSourceState` on failure, otherwise render the real page. This is consistent and good.
- The repository is the correct place to swap `preview` for a real Supabase-backed `database` adapter later; the UI-facing contract (`CatalogListResult`, `CatalogWatchCard`, `CatalogWatchDetail`, `CatalogFilterFacets`) is already decoupled from the preview JSON shape, matching `docs/CATALOG_READ_EXPERIENCE.md`'s stated goal.

## Filters audit

All filters are query-param-driven, server-parsed in `parseCatalogReadQuery` (`catalog-read-query.ts`), rendered by `CatalogFilterPanel`.

| Filter | Exists | Param | Source | Server/client | Default | Reset | Mobile | A11y | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Search (brand/model/reference) | Yes | `q` | free text, NFKC-normalized, 120 char cap | Server | `""` | Cleared by "Сбросить" link | Same form, inside sheet | `<label>` wraps input — OK | Reference search reuses `normalizeManufacturerReference`, so punctuation/spacing variants match (verified by test) |
| Brand | Yes, only on `/watches` (`includeBrandFilter`) | `brand` | facet-derived `brandSlug` options | Server | none | via reset | Same | `<label>` wraps `<select>` — OK | On `/watches/{brandSlug}` the brand is fixed via route param, filter hidden — correct, avoids duplicate-canonical risk |
| Brand Collection | Yes | `collection` | facet-derived, **matched by display name, not slug** (`watch.brandCollectionName !== query.brandCollection`) | Server | none | via reset | Same | OK | Fragile: two different brands with a same-named collection would collide; no current evidence this happens, but it's an identity risk if collection naming isn't unique cross-brand |
| Movement | Yes | `movement` | facet-derived from `movement_type_raw`/`movement_raw` spec text | Server | none | via reset | Same | OK | Raw, unnormalized string values — see "Sorting/Filters technical debt" below |
| Water resistance | Yes | `water` | facet-derived from `water_resistance_raw` | Server | none | via reset | Same | Inside `<details>` — collapsed by default | Same raw-string caveat |
| Case material | Yes | `caseMaterial` | facet-derived from `case_material_raw` | Server | none | via reset | Same | Inside `<details>` | Same raw-string caveat |
| Crystal/glass | Yes | `crystal` | facet-derived from `crystal_type_raw` | Server | none | via reset | Same | Inside `<details>` | Same raw-string caveat |
| Price range | Yes | `priceMin`/`priceMax` | free numeric input, RUB whole units | Server | unset | via reset | Same | `aria-label` on both inputs — OK | Digits-only strip (`nonDigitPattern`), safe-integer guard; no min>max validation (a user can submit `priceMin=999999&priceMax=1`, which just yields 0 results — acceptable but silently confusing, no message explains why) |
| Sort | Yes | `sort` | fixed enum | Server | `default` | via reset | Same | `<label>` wraps `<select>` — OK | See "Sorting audit" |
| Case diameter/size, strap/bracelet material | **Not implemented as filters** | — | — | — | — | — | — | — | Explicitly deferred per `docs/CATALOG_READ_EXPERIENCE.md` ("remain public specifications for now... not normalized enough for stable public facets") — correct, do not add these without real normalized data |
| Style, use case, gender/positioning, availability, delivery, scenario | **Do not exist** | — | — | — | — | — | — | — | No underlying data; `docs/CATALOG_READ_EXPERIENCE.md` explicitly limits filters to the 7 chosen ones. Do not invent these. |

Filter option **values are raw source strings** (e.g. whatever `movement_type_raw` happened to normalize to during import), not a controlled vocabulary — `optionFromCounts` in `catalog-read-service.ts` just uses the raw string as both `value` and `label`. This means near-duplicate facet values from inconsistent source data (e.g. two spellings of the same material) would appear as separate filter options with split counts. This is a data/import-pipeline issue, not something to fix by touching import code (out of catalog-worktree scope) — flag it, don't fix it, unless the user separately authorizes touching `src/modules/imports/**`.

`activeFilterCount` in `CatalogFilterPanel` is computed correctly (matches the 9 dimensions that can be active) and drives both the reset-link visibility and the mobile "Фильтры и порядок" button, which is good; the mobile button itself does not show the count though (`CatalogMobileFilterSheet`'s trigger button has static text, not `activeFilterCount`).

## Sorting audit

- 4 options: `default`, `price_asc`, `price_desc`, `name_asc` — matches `docs/CATALOG_READ_EXPERIENCE.md` exactly (no popularity/bestseller/newest, consistent with "the project does not yet have factual data for them").
- `default` sort ranks by `searchRank()` only when a search term is present (reference-exact → reference-prefix → title-prefix → brand-exact → everything else), otherwise falls back to source/import order (`sourceOrder`) — this is stable and deterministic, not a marketplace-style "featured/sponsored" mechanism. Good.
- Equal prices are tie-broken by `title.localeCompare(..., "ru")`, which is stable and locale-correct.
- Watches without a price sort to the end on `price_asc` (treated as `+Infinity`) and to the end on `price_desc` too (treated as `-Infinity`) — i.e., **unpriced watches never appear first** on either price sort. This is a sensible, deliberate-looking choice (confirmed by reading the code, not stated in docs) worth preserving.
- No `unavailable`/`sold_out` concept exists in the read model at all yet (`catalog_offers.status` is not surfaced), so there is nothing to special-case for availability in sorting — consistent with `docs/CATALOG_READ_EXPERIENCE.md`'s "cards do not show fake stock claims."
- Sort state is fully URL-persisted (`sort=` param, omitted when `default`), so it survives reload/share — correct per `docs/SEO.md` ("Sort/order query parameters should not create alternate canonicals" — and indeed, canonical is always the clean `/watches` or `/watches/{brand}` path, never including query params, per the `generateMetadata` calls).

## Watch card audit

`CatalogWatchCardView` (`src/components/catalog/catalog-watch-card.tsx`):

- Shows: image, brand (`type-meta`), reference code (`Код {referenceDisplay}`), title (`h2`), price (`price-plate`), up to 2 "quick facts" from `keySpecifications`.
- **Does not** show fake discounts, ratings, badges, or stock claims — matches the documented card contract in `docs/CATALOG_READ_EXPERIENCE.md` exactly.
- **Finding (functional bug):** the favorite icon (`<Link href="/account/favorites" aria-label="Открыть избранное">`) does not save *this* watch — it always links to the static `/account/favorites` page regardless of which card it's on, and that page is a `FoundationPage` placeholder stating "Сохранять модели можно будет после подключения личных действий" ("saving will be possible once personal actions are wired up"). The icon currently reads as a real per-item save action but is decorative navigation to an unrelated stub. See "Problems to preserve context for" — this is the single highest-priority interaction gap on the card and connects directly to the documented-but-unbuilt Candidates system.
- The favorite `<Link>` and the main card `<Link href={watch.href}>` are both direct children of the `<article>`, not nested — so there's no invalid-HTML nested-anchor issue, but there are two separately focusable/tabbable links per card purely to reach one dead-end and one real destination.
- Card is a Server Component with zero client JS — hover/scale effect (`group-hover:scale-[1.025]`) is pure CSS, which is good for performance.
- `keySpecifications` truncation to 2 items is sensible density control, consistent with `docs/PRODUCT_JOURNEY_REVIEW.md`'s density goals.
- Grid density: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (from `CatalogListPage`), i.e. up to 4 columns at desktop — reasonable, not a dense marketplace wall (contrast with typical 5–6 column marketplace grids).
- The card does **not** communicate "why this watch fits a role/scenario" — there is no style/use-case/scenario tag surfaced on the card, even though `docs/DATABASE.md` documents `watch_reference_styles`/`watch_reference_use_cases` join tables and `docs/PRODUCT.md` explicitly asks the catalog to communicate "what scenario a model suits." This data is not yet in the read model at all (`CatalogWatchCard` has no style/use-case field), so this is a data-availability gap, not something fixable by editing the card component alone.
- Detail-page sibling cards (`watch-detail-page.tsx` lines 239–259) construct a **partial** `CatalogWatchCard` object inline (missing `officialName: null`, `keySpecifications: []` always empty) rather than reusing `toCatalogWatchCard` from `catalog-read-service.ts` — minor duplication/drift risk; sibling cards will never show quick facts even if the underlying data exists.

## Images audit

- `CatalogImage` renders a plain `<img>` tag (ESLint-disabled for `@next/next/no-img-element`, comment: "catalog images can come from dev ZIP resolver or remote source URLs"), **not** `next/image`. This means: no automatic responsive `srcset`, no built-in lazy-load-with-placeholder beyond the manual `loading="lazy"`/`fetchPriority` attributes, no Next.js image optimization/CDN resizing. This is a deliberate, documented trade-off for the dev-only ZIP-resolver phase, but it is a real technical debt item once a production Storage-backed image source exists — worth flagging for the future-repository phase, not fixing now (fixing it now would require touching image infrastructure and possibly `next.config.*`, which is forbidden).
- Missing-image state renders a neutral `ET` monogram mark (`media-placeholder-mark`), not the literal text `"Фото готовится"` that an earlier phase used — confirmed compliant with `docs/CATALOG_READ_EXPERIENCE.md`'s "Editorial Art Direction Refinement" note that placeholders must not use that copy.
- Image "composition policy" (`catalog-image-presentation-policy.ts`) is a deterministic, alt-text-heuristic system that scores each image as `strong`/`standard`/`weak`/`technical`/`missing` and computes focal point/scale/translate per composition slot (card, feature, detail-hero, detail-gallery, etc.). Heuristics key off Russian/English keywords in alt text (`caseback`, `clasp`, `застёжка`, `вид сбоку`) and numeric ordering (`фото N`, image index ≥ 4 ⇒ "technical angle"). This is a clever, deterministic (non-AI) system, but it is alt-text-fragile: if an import ever produces an image with no matching keyword and an index <4 that is nonetheless a caseback/side shot, it will be scored as a normal front image and could get an oversized/zoomed composition. Worth a spot check against real data during redesign, not a code defect per se.
- Hard-coded per-image overrides exist (`imageKeyOverrides` — 3 specific `development_zip` image keys with manual focal/scale tweaks). This is fine as a stopgap but does not scale; it is dev-source-specific data that will need a real equivalent (or removal) once the production image source replaces the ZIP resolver.
- `selectBestCatalogHeroImage` only ever falls back to the **same watch's own images** (`images.find(...) ?? images[0] ?? { kind: "none", ... }`) — confirmed no cross-reference/cross-model image substitution exists anywhere in the read path. This satisfies the "no visual subsitutions" rule.
- The dev-only ZIP image resolver (`src/app/api/catalog/dev-images/[imageKey]/route.ts`, not read line-by-line this pass but exercised by `tests/catalog-read-experience.test.ts`) is verified by tests to: reject path traversal (`../secret`, `C:\secret.jpg`), return `not_found` for `manual_review`/`intentionally_skipped_missing_reference`/`broken` candidates, and return `disabled` outside development. This matches `docs/SECURITY.md`'s "Development Catalog Images" section exactly.
- Catalog card image container uses `max-h-40` only in the "no image" case (`catalog-watch-card.tsx` line 15) — i.e. missing-image cards get a shorter media box than image-bearing cards, which is intentional (avoids a large empty placeholder box) but means the grid has non-uniform card heights when image coverage is mixed. Worth checking visually with real eligible-record image coverage during redesign.

## Brand navigation audit

- `/brands` (`src/app/(shop)/brands/page.tsx`) reads brand discovery data from the repository (`listPublicCatalogBrands`), not a hardcoded brand list — confirmed matches `docs/CATALOG_READ_EXPERIENCE.md` ("not hardcoded to the initial four brands").
- Adaptive layout: brands with ≥2 real (non-"none") representative watch images get an image grid; brands with <2 get a text-led layout with a generic filler sentence ("для этого бренда сейчас важнее текстовая навигация..."). This directly implements the documented "text-led when representative imagery is weak" rule.
- No `EmptyState`/explicit empty-brands message if `listPublicCatalogBrands()` ever returns zero brands — the page would render a header plus an empty `<section>`. Low risk today (data exists) but worth a defensive empty state for completeness.
- Brand → catalog link target is consistently `/watches/{brand.slug}`, matching canonical route architecture.

## Watch detail navigation

- Breadcrumbs: `Часы (/watches) / {brandName} (/watches/{brandSlug}) / {referenceDisplay}` — matches `docs/DATABASE.md`'s documented breadcrumb shape (Brand → Brand Collection optional → Watch Model optional → Manufacturer Reference), simplified since Brand Collection/Watch Model are not currently in the breadcrumb trail (acceptable simplification, not a violation, since the doc says "optional").
- In-page tab nav (`watch-detail-tabs`, lines 172–178 of `catalog-watch-detail-page.tsx`) links to `#overview`, `#specifications`, `#fit`, `#collection`, plus an external `Журнал` link — **but `#fit` only exists when `gallery.length > 1`, and `#collection` only exists when `siblingReferences.length > 0`.** For any watch with ≤1 usable gallery image or no sibling references (common for singleton references), those tab links point to anchors that don't exist on the page, producing a dead/no-op click. This is a real, verifiable UX bug on real data, not a hypothetical.
- Sibling references section reuses `CatalogWatchCardView` but builds a hand-assembled partial card object (see "Watch card audit" duplication note) instead of calling `toCatalogWatchCard`.
- `CollectionWatchAction` (imported from `src/components/collection/**`, out of catalog scope) is the only primary CTA on the detail page — there is no "Добавить в кандидаты" / Compare action at all yet, consistent with Candidates/Compare being unimplemented, but it means the detail page currently offers exactly one commitment level (full collection ownership) with no lightweight "save for later" step, which is a bigger gap on the detail page than on the card.

## Desktop visual audit

Assessed against `docs/PRODUCT_JOURNEY_REVIEW.md`'s own type/spacing targets (Page title 52–64px desktop max, standard section separation 64–72px, no single non-immersive section should consume most of a viewport):

1. **Composition**: `/watches` uses a header, a toolbar band, a persistent brand sidebar (desktop only, `display:none` below 1024px per `globals.css:2199`), a result grid, an inline mid-grid "feature strip" promo, and pagination — reasonably composed, no single dominant hero.
2. **Watch detail title is verifiably over the documented budget.** `globals.css:1936` sets `.watch-detail-title { font-size: clamp(3.6rem, 8vw, 7.6rem); }` — a **7.6rem (≈122px)** desktop maximum, against the review's own "Page title: 52–64px desktop" ceiling. This is the same oversized-display problem `docs/PRODUCT_JOURNEY_REVIEW.md` already flagged for Home/Journal; the catalog watch-detail page independently exhibits it and was not corrected by that review.
3. **`.watch-detail-hero` sets `min-height: min(690px, calc(100vh - 120px))`** (`globals.css:1921-1926`) — a near-full-viewport hero on every single watch page, which is exactly the pattern `docs/PRODUCT_JOURNEY_REVIEW.md` calls out generally ("Home and watch detail use media stages with desktop minimum heights of 620px and 660px; this leaves little room for context and next actions above the fold" — the audit's own number is slightly stale; current code is 690px, i.e. the problem got larger, not smaller, since that review was written).
4. **Grid**: up to 4 columns desktop (`xl:grid-cols-4`), card gaps `gap-x-5 gap-y-9` — reasonable, not overcrowded.
5. **Filter toolbar** (`.catalog-filter-bar`, `.catalog-filter-primary-row`) is a single dense row at desktop (`globals.css:2888`: `grid-template-columns: minmax(230px,1.25fr) repeat(3,minmax(172px,.86fr)) minmax(170px,.86fr) minmax(116px,auto)`) plus a `<details>` disclosure for secondary filters — a toolbar/facet-band approach, not a permanent sidebar, matching the documented "Modern Horology" direction. This part reads as reasonably premium and controlled.
6. **Typography role system exists** (`type-label`, `type-meta`, `type-section`, `type-reference`, `type-price`, `type-body` utility classes used consistently across catalog components) — a real positive: the catalog is not using ad hoc font sizes for body content, only the two hero-scale numbers above are out of budget.
7. **Color/contrast**: catalog surfaces use `#f7f4ef`/`#f1ede7`-family warm near-whites for product stages against the "cool near-white, graphite, steel, deep-blue" tokens described in `docs/CATALOG_IMPLEMENTATION.md`'s "Complete Visual System Reset" — worth a deliberate visual QA pass to confirm this warm product-stage tint is an intentional "studio surface" choice and not visual system drift (not verified further this pass; flagging for the visual-QA phase).
8. **What reads expensive**: restrained card copy, no marketplace badges/ribbons/fake urgency, quiet `ET` monogram placeholder instead of "loading photo" text, single feature-strip promo instead of banner carousels.
9. **What reads heavy/inconsistent with the product's own stated direction**: the 122px watch-detail title, the near-full-viewport detail hero, and (functionally, not visually) the non-functional favorite icon which undercuts the "premium, trustworthy" goal by presenting a UI affordance that does nothing per-item.

## Mobile audit

Tooling caveat: no browser/viewport screenshot tooling was used this pass (explicitly out of scope for a code-only first pass); this section is derived from reading `globals.css` breakpoints and component structure, not from rendering the app at 390/768/1024px. That limitation should be closed with real device/viewport testing before or during Phase 6 of the redesign plan below.

From code inspection:

- `.catalog-sidebar { display: none; }` by default, `display: block` only at `min-width: 1024px` (`globals.css:2195-2201`) — brand sidebar correctly hidden on mobile/tablet.
- `CatalogMobileFilterSheet` renders only under `lg:hidden`; the full desktop `CatalogFilterPanel` renders only under `hidden lg:block` (`catalog-list-page.tsx:42-49`) — no duplicate-filter-controls-on-screen risk, clean swap at the `lg` breakpoint (1024px in this Tailwind config, matching the `1023px`/`1024px` CSS breakpoints observed).
- Mobile filter sheet is a bottom sheet (`fixed inset-0`, `absolute bottom-0 ... max-h-[88vh] overflow-auto`), `role="dialog" aria-modal="true"`, with an explicit close button — structurally sound as a dialog pattern.
- **Gap**: `CatalogMobileFilterSheet` has no focus trap and no `Escape`-key handler (only the visible close button and, presumably, the browser back button close it) — a real, verifiable a11y gap for a modal dialog, not a hypothetical.
- The mobile grid falls back to `sm:grid-cols-2` (2 columns) below the `sm` breakpoint implicitly meaning 1 column below `sm` (Tailwind default `sm` = 640px) — reasonable for a 390px viewport.
- Watch detail title `clamp(3.6rem, 8vw, 7.6rem)` still starts at 3.6rem (≈58px) on mobile, above the review's own 36-42px mobile page-title budget — the oversized-title problem is not desktop-only.
- `.watch-detail-hero` grid presumably stacks to 1 column on mobile (not confirmed by breakpoint inspection this pass) but the `min-height: min(690px, calc(100vh-120px))` rule is not viewport-gated, so a near-full-viewport-height hero likely also applies on mobile, which is a meaningfully worse problem on small screens (less content visible above the fold on a 700px-tall phone viewport than on desktop).

## UX audit

Primary path: catalog → filter → view model → save → compare → finalist.

- **Starting is clear**: `/watches` has an unambiguous title, count, and toolbar; the "Не знаете, что выбрать?" aside links to `/selection`, giving a second on-ramp.
- **Narrowing choice is functional but flat**: filters work (server-verified by tests) but use raw, unnormalized facet values as labels (e.g. whatever string the import produced for `movement_type_raw`), which can read as inconsistent/technical rather than curated (e.g. potential mixed-case or spacing variants appearing as separate options — not confirmed against live data this pass, flagged as a real risk given the source data pipeline explicitly does not guarantee controlled vocabularies for these fields yet).
- **Filter count is reasonable** (7 total, in a "primary row + disclosure" layout) — does not read as an overwhelming faceted-search wall.
- **Clearing filters is easy**: single "Сбросить выбранные фильтры" link, appears only when needed.
- **State persists in the URL**: confirmed — every filter/sort/page value round-trips through `catalogQueryToSearchParams`/`catalogQueryHref`, so back-button, reload, and link-sharing all work correctly.
- **Opening a model is easy**: whole-card link, standard `<Link href={watch.href}>`.
- **Saving is broken as a user-facing feature**: the only "save" affordance (heart icon) does not save the specific watch — see "Watch card audit" and "Problems to preserve context for." This is the single largest UX gap in the current catalog: users literally cannot do the "save Candidate" step that `docs/PRODUCT.md`/`docs/PRODUCT_JOURNEY_REVIEW.md` treat as core to the product loop.
- **Comparing is entirely absent**: no compare affordance anywhere in the catalog UI (card or detail). Matches documented implementation status (Compare not built) but is a real gap against the product promise.
- **Connection to personal selection exists** at the entry point (`/watches` aside links to `/selection`) but not from individual cards or the detail page.
- **Connection to collection exists only on the detail page** via `CollectionWatchAction`, and only for authenticated users with a real collection backend already implemented (this part *is* real, not a stub — it calls `createUserWatchCollectionRepository`/`createCatalogUserWatchAction`).
- **Empty state exists and is calm**: `EmptyState` component with a clear, non-alarming message ("Попробуйте изменить поиск, цену или параметры часов") — good.
- **Mobile flow is structurally sound** (see Mobile audit) modulo the missing focus trap and the same broken-save issue.

## Technical audit

- **Server/client boundaries**: excellent. Only one Client Component in the entire catalog surface (`CatalogMobileFilterSheet`), and it only manages open/close UI state — no data fetching, no business logic on the client. Fully compliant with `AGENTS.md`'s "Preserve Server Component and Client Component boundaries."
- **No unnecessary Client Components** found.
- **Data fetching**: centralized through the repository, no raw Supabase/JSON reads inside components — compliant with `AGENTS.md`'s "Do not spread raw Supabase queries across UI components" (there's no Supabase involved yet at all, by design, for the preview phase).
- **TypeScript strictness**: `npm run typecheck` passes with 0 errors on the whole project; catalog modules use no `any` (not verified exhaustively line-by-line, but nothing surfaced during reading, and lint is clean).
- **View models**: clean separation (`CatalogWatchCard` vs `CatalogWatchDetail` vs internal `CatalogReadDataset`/`MergedCatalogCandidate`) — the public-facing types never leak import-provenance fields, verified both by reading the code and by the dedicated `tests/catalog-read-experience.test.ts` assertion that stringifies a full dataset and checks forbidden substrings (`"Цена ¥"`, `"Разница"`, `"PRIVATE PROVENANCE"`, `"sourceProvenance"`, `"validationIssues"`) are absent.
- **URL search params / serialization**: robust — `parseCatalogReadQuery` clamps text length, NFKC-normalizes, safely parses integers, whitelists sort values, and defaults invalid input rather than erroring (verified by test: `sort: "bad"`, `priceMin: "oops"` both normalize safely).
- **Filtering/sorting**: correct and tested, but entirely in-memory (see "Data flow") — a known, accepted limitation of the current preview-source phase, not a bug, but the single biggest thing that must change (via `src/modules/catalog/infrastructure/**`, not by rewriting the read-model contracts) when a real database repository replaces the preview adapter.
- **Canonical URLs**: correct everywhere checked — no query params ever leak into `alternates.canonical`.
- **Metadata**: present and factual on all 3 catalog routes plus `/brands`; watch detail additionally emits inline `Product` JSON-LD with brand/sku/mpn/url and conditionally image/offer, correctly omitting `InStock`, reviews, and ratings per `docs/SEO.md`.
- **Image rendering**: plain `<img>`, not `next/image` — see "Images audit." Not a bug for the current dev-source phase, but a real gap for a "premium, fast" catalog once real images exist (no responsive images, no CDN-level optimization, manual `loading`/`fetchPriority` only).
- **Performance**: `getCatalogReadDataset` is wrapped in React's `cache()` so within a single request/render pass the JSON file is read and parsed once, but there is no cross-request cache (`docs/ARCHITECTURE.md`'s "Public catalog and content pages can use Next.js caching/revalidation" is not yet applied — every request currently re-reads and re-parses the full preview JSON from disk; acceptable for local dev, a real cost once this becomes network-backed).
- **Hydration**: no evidence of hydration mismatch risk — all catalog Server Components render static markup from server-computed props, and the one Client Component's initial state (`isOpen = false`) matches server-rendered output.
- **Mobile overflow**: `.watch-detail-tabs` uses `overflow-x: auto` for its tab strip — deliberate horizontal-scroll handling, good; no other obvious horizontal-overflow risk spotted in the classes read this pass.
- **Accessibility**: see dedicated section below.
- **Loading state**: **missing** — no `loading.tsx` exists for any of the three catalog routes despite `dynamic = "force-dynamic"` (meaning these routes never statically prerender and always do work on request); a slow read (e.g. once real DB queries replace in-memory JSON parsing) will show a blank/frozen page rather than a skeleton. This is a real, currently-invisible gap that becomes visible the moment the read source changes.
- **Error state**: `CatalogReadSourceError` is caught and shown via `CatalogSourceState`, but there is no route-level `error.tsx` for genuinely unexpected exceptions (e.g. a bug in `listCatalogWatches` itself) — those would currently fall through to Next.js's default error boundary rather than a catalog-branded one.
- **Empty state**: present on `/watches` (`EmptyState`), absent on `/brands` (see "Brand navigation audit").
- **Test coverage**: strong at the domain/data layer (`tests/catalog-read-experience.test.ts`, `tests/catalog-domain.test.ts`, plus 6 more `catalog-import-*`/`catalog-public-hygiene` files — 25 test files / 158 tests total pass project-wide), **zero** at the component/rendering layer — no test renders `CatalogListPage`, `CatalogWatchCardView`, `CatalogFilterPanel`, or `CatalogMobileFilterSheet`, and no test exercises the dead favorite-link or the conditional tab-anchor issue found in this audit. See "Tests audit."
- **Code duplication**: the sibling-reference card construction in `catalog-watch-detail-page.tsx` (see "Watch card audit") is the one concrete duplication found; otherwise the catalog module is well-factored (`domain`/`application`/`infrastructure` boundaries are real and respected, matching `docs/ARCHITECTURE.md`'s prescribed `src/modules/catalog/` layout).
- **CSS architecture / global style dependency — the most important structural finding of this audit**: every catalog class (`.catalog-*`, `.watch-detail-*`, `.product-stage*`, `.price-plate`, `.catalog-filter-*`, etc.) is defined inside the single 4,576-line `src/app/globals.css`, which also contains all homepage, Journal, and account styling (e.g. `.home-catalog-grid` is defined a few hundred lines away from `.catalog-grid` in the same file, `globals.css:3533` vs `:2959`). There are **no catalog-scoped CSS Modules today.** This file is explicitly forbidden to Claude in this worktree and is very likely being actively edited by Codex for homepage work in the parallel worktree. Any visual redesign of the catalog as currently architected requires editing this exact shared file — a direct, structural conflict with the two-agent split this worktree was set up to enforce. See "Parallel-work risks" for the required resolution before Phase 1 can safely touch catalog visuals.

## SEO audit

- `/watches`: static factual `metadata`, canonical `/watches`, no query params ever included — correct per `docs/SEO.md` ("Filtered catalog URLs are generally canonicalized to `/watches`").
- `/watches/{brandSlug}`: `generateMetadata` per brand (title `"{Brand}: каталог часов"`), canonical `/watches/{slug}` — correct; falls back to generic `"Каталог часов"` title on `CatalogReadSourceError` rather than a misleading/empty title.
- `/watches/{brandSlug}/{referenceSlug}`: `generateMetadata` builds a factual title/description from real brand/reference/price data, canonical = `watch.href`; **no explicit `robots` metadata is set for the not-found case** — when `getPublicCatalogWatch` returns `null`, `generateMetadata` returns just `{ title: "Часы не найдены" }` before `notFound()` is called in the page body, which is standard Next.js pattern (a 404 status is correctly produced by `notFound()`) — not a bug, just noting the metadata function itself doesn't need `robots: "noindex"` here because Next.js's 404 handling already keeps it out of indexation.
- `/brands`: static `metadata`, canonical `/brands` — correct.
- Product structured data (`productStructuredData` in the reference page) correctly excludes `InStock`, reviews, ratings, shipping — matches `docs/SEO.md` exactly. It includes `offers` only `if (watch.publicPrice)`, so watches without a price correctly omit the `Offer` node rather than fabricating one.
- `robots.ts` and `sitemap.ts` exist at `src/app/robots.ts` / `src/app/sitemap.ts` — not read in depth this pass (outside the three-route catalog scope, and editing them would touch shared site-wide SEO config); flagged as **present and worth a follow-up read** before any SEO-affecting catalog change, since `docs/SEO.md` requires sitemap regeneration awareness ("Regenerate after imports and content publication").
- No arbitrary filter URL is ever set as canonical anywhere in the catalog code checked — confirmed compliant with the core SEO rule of `docs/SEO.md`/`docs/ROUTES.md`.
- Query-param pagination (`?page=`) has no explicit `rel=prev/next` or `robots` handling visible in the pages read; `docs/SEO.md` allows page-1-indexable/deeper-pages-noindex as an acceptable policy but doesn't mandate a specific mechanism — current code neither implements nor explicitly opts out of deeper-page indexation control. Worth a decision during the redesign, not an existing violation (default Next.js behavior + the always-clean canonical on page 1 already avoids duplicate-canonical risk; it just doesn't actively noindex `?page=2+`).

## Accessibility audit

- **Semantic structure**: `<article>` cards, `<nav aria-label="...">` for breadcrumbs/pagination/tabs, `<dl>`/`<dt>`/`<dd>` for specifications and key facts — good semantic baseline throughout.
- **Buttons vs links**: mostly correct — navigation uses `<Link>`, the mobile sheet trigger and close use `<button type="button">`. The favorite icon is correctly a `<Link>` (it is navigation, even though broken functionally) rather than a fake `<button>`.
- **Filter labels**: every filter control is wrapped in a `<label>` with visible text (`SelectField`, the search `<label>`), and the two price inputs use `aria-label` since they lack visible per-field text labels beyondthe shared `<legend>` — compliant.
- **Keyboard navigation**: no explicit `tabIndex` misuse found; native form controls and links are used throughout, which keeps default keyboard behavior intact.
- **Focus visibility**: `focus-visible:outline-offset-4` is applied on the card's main link (`catalog-watch-card.tsx` line 14) — a deliberate focus style; not verified whether other interactive elements (filter controls, pagination links) have equivalent focus styling defined elsewhere in `globals.css` (not exhaustively checked this pass).
- **Drawer/dialog accessibility**: `CatalogMobileFilterSheet` sets `role="dialog" aria-modal="true" aria-label="Фильтры каталога"` and ties the trigger's `aria-controls`/`aria-expanded` to it — correct ARIA wiring, but **no focus trap and no Escape-key close handler** (confirmed by reading the component; only `onClick` handlers exist) — a genuine WCAG dialog-pattern gap.
- **Active filter states**: communicated visually via the "выбрано N" count text in the `<summary>` and the reset link's mere presence, not via `aria-pressed`/`aria-current` on individual filter controls — acceptable for `<select>`-based filters (their selected state is natively conveyed), not an issue.
- **Sorting accessibility**: plain `<select name="sort">` inside a labeled `<label>` — accessible by default, no custom widget risk.
- **Image alt text**: `CatalogImage` always renders an `alt` (from the read model) or an `aria-label` on the placeholder span (`role="img"`) — no `alt=""` or missing-alt cases found in the catalog image path.
- **Color contrast**: not measured this pass (would require rendering/tooling); flagged as unverified, not passed or failed.
- **Reduced motion**: no `prefers-reduced-motion` handling found for the card hover `scale-[1.025]` transform — a minor, low-severity gap (a small scale transform is a mild motion trigger, not a major one, but the codebase doesn't appear to gate any catalog animation behind `prefers-reduced-motion` based on what was read).
- **Target sizes**: pagination links use `min-h-10 min-w-10` (40px) — meets common 44px-adjacent touch-target guidance reasonably well; filter controls (`min-height: 58px` per `globals.css:2894`) are comfortably sized.
- **Screen reader order**: DOM order matches visual order everywhere checked (no CSS `order`-based visual reordering that would desync from DOM reading order, except the feature-strip's `order: 2` at mobile widths in `globals.css:2934`, which reorders the feature-strip *after* the results head visually but its DOM position relative to the grid itself was not fully cross-checked against reading order this pass — low-confidence flag, not a confirmed defect).

## Tests audit

Existing catalog tests (all in `tests/`, all passing):

- `catalog-domain.test.ts` — domain rules (reference normalization, money, slugs, scoring).
- `catalog-read-experience.test.ts` — the most catalog-UX-relevant file: source policy fail-closed behavior, eligible-only mapping, no-internal-data-leak assertion, search, filtering, price sort + pagination + invalid-query normalization, canonical route resolution + sibling grouping, dev-image-key validation (including path traversal + manual-review/skipped/broken rejection).
- `catalog-import-*.test.ts` (apply, domain, merge, quality, source-detection) and `catalog-public-hygiene.test.ts` — import-pipeline coverage (out of catalog-worktree editing scope, but good to know exists).

**Not covered by any existing test** (component/rendering layer — zero tests render a catalog React component):

- Route rendering (no test renders `WatchesPage`/`BrandCatalogPage`/`WatchReferencePage` or asserts on output HTML/props passed to `CatalogListPage`).
- Canonical `href` as it appears in actually-rendered `<Link>`/`<a>` output (only tested at the data layer via `watch.href`/`CatalogReadQuery`, not through a rendered component).
- Filter/sort **UI** behavior (the `CatalogFilterPanel` form's actual `name`/`value` wiring, the reset link's `href`, the mobile sheet's open/close interaction).
- Image selection **as rendered** (the presentation-policy math is unit-tested indirectly through fixtures, but `CatalogImage` itself and `resolveCatalogImagePresentation`'s CSS variable output are not).
- Price rendering / missing-price display (`formatCatalogMoney` is not directly unit tested; only exercised indirectly).
- Empty state.
- Mobile structure / responsive behavior.
- Accessibility (no `jest-axe`/`vitest-axe` or similar run against any catalog component, despite `@testing-library/react` + `jsdom` already being devDependencies).
- The favorite-link bug and the conditional-tab-anchor bug found in this audit — neither is caught by any existing test, which is exactly why they were still present.
- `CollectionWatchAction`/`user-watch-collection` server-action integration from the watch detail page (correctly out of catalog scope to test here, but worth noting the detail page's only CTA is currently untested from the catalog side).

**Proposed focused test plan for the future redesign** (not implemented this pass):

1. Component tests (`@testing-library/react` + `jsdom`, already installed) for `CatalogWatchCardView`: renders brand/title/reference/price, renders the correct number of quick facts, renders the missing-price string, and — once fixed — renders a working per-item save action.
2. Component test for `CatalogFilterPanel`: correct `name` attributes and `defaultValue` wiring per filter, reset link `href` correctness, `activeFilterCount` correctness across combinations.
3. Component test for `CatalogMobileFilterSheet`: open/close state, `aria-expanded`/`aria-controls` correctness, and (after the a11y fix) focus trap + Escape handling.
4. Component test for `CatalogPagination`: boundary behavior (page 1 "Назад" disabled, last page "Вперед" disabled), gap-ellipsis rendering.
5. Snapshot/assertion test for `CatalogWatchDetailPage`'s tab nav vs. actual rendered section IDs, to prevent the dead-anchor regression from recurring for any future section that becomes conditional.
6. A minimal route-level test (using Next's route testing utilities or a thin wrapper) asserting `/watches`, `/watches/[brandSlug]`, `/watches/[brandSlug]/[referenceSlug]` each render `CatalogSourceState` on `CatalogReadSourceError` and the real page otherwise — currently only the underlying repository function's error type is implicitly relied upon, not the page-level catch/render logic itself.
7. One accessibility smoke test per catalog page/component using an axe-based matcher, once added as a devDependency.

## What works well

- Clean, enforced `domain`/`application`/`infrastructure` module boundaries in `src/modules/catalog/**`, matching `docs/ARCHITECTURE.md` exactly.
- Server/Client boundary discipline is close to ideal: exactly one Client Component in the whole catalog surface, and it holds only UI state.
- Public read models genuinely never leak import provenance, internal pricing, or validation data — verified both by code reading and by a dedicated test asserting forbidden substrings are absent from the serialized dataset.
- URL-driven filter/sort/pagination state with safe parsing and graceful invalid-input normalization (never a 500, never a crash on garbage query params).
- No fake commerce signals anywhere (no fake discounts, stock claims, ratings, bestseller badges, delivery promises) — fully compliant with the product's "premium, trustworthy, no marketplace noise" principle at the data-presentation level.
- Canonical URLs and metadata are correct and consistent across all three catalog routes plus `/brands`.
- The image composition-policy system is a genuinely thoughtful, deterministic (non-AI) approach to a real problem (inconsistent-quality source photography) rather than a naive fixed aspect-ratio crop.
- Strong domain/data-layer test coverage with fixtures that encode real product rules (e.g. asserting `"Разница"` never appears publicly) rather than just happy-path smoke tests.
- `npm run lint`, `npm run typecheck`, `npm run test` (158/158), `npm run build`, and `npm run secrets:scan` all pass cleanly on the current `935079c` snapshot — the catalog starts this engagement from a genuinely green baseline.

## Problems to preserve context for

These need design/product decisions before Claude should change catalog code, because they touch functionality documented as belonging to not-yet-built modules:

1. **The card/detail "save" affordance is disconnected from any real save mechanism.** The heart icon on every card links to the static `/account/favorites` stub, not to a per-watch save action. Per `docs/DOMAIN_REVIEW.md` §5 and `docs/PRODUCT_JOURNEY_REVIEW.md`, MVP intentionally has **no separate Favorites/Wishlist entity** — the correct target concept is `candidate_items` at stage `saved`, exposed through a documented `/candidates` route. Neither `candidate_lists`/`candidate_items` tables nor a `/candidates` route exist in code yet (confirmed: no migration, no route file). **Do not silently repoint the heart icon at a new bespoke favorites mechanism** — that would recreate the exact standalone-Wishlist pattern the domain review explicitly rejected. This needs either (a) building the real Candidates module first (bigger than a catalog-only change — touches migrations, RLS, a new route, likely outside this worktree's charter), or (b) an explicit, scoped user decision for an interim state (e.g., disable/hide the icon until Candidates exists, with an honest visual treatment, rather than a link to a dead-end stub).
2. **Style/use-case/scenario data is not in the catalog read model at all.** `docs/PRODUCT.md` wants the catalog to communicate "what scenario a model suits," and `docs/DATABASE.md` documents `watch_reference_styles`/`watch_reference_use_cases` join tables for exactly this, but `CatalogWatchCard`/`CatalogWatchDetail` have no style/use-case field today. Surfacing this requires either database-backed data (post-preview-phase) or explicit product sign-off on a preview-source approximation — not a pure component change.
3. **Compare has zero UI presence.** `/compare/page.tsx` exists as a route file but was not read this pass and Compare logic is documented as unimplemented. Before adding any compare affordance to cards/detail pages, confirm with the user whether Compare is in scope for this worktree's redesign phases or is a separate future engagement.

## Catalog-only problems

Safe for Claude to fix directly within the allowed scope in a future phase, once the user approves the redesign plan:

- Dead tab anchors on the watch detail page (`#fit`/`#collection` links that don't always exist) — `src/components/catalog/catalog-watch-detail-page.tsx`.
- Sibling-reference card construction duplicates `toCatalogWatchCard` instead of reusing it, and always zeroes out `keySpecifications` — same file, lines ~239–259, and `src/modules/catalog/application/catalog-read-service.ts`.
- Missing focus trap / Escape handling in `CatalogMobileFilterSheet` — `src/components/catalog/catalog-mobile-filter-sheet.tsx`.
- No `loading.tsx` for any of the three catalog routes.
- No `error.tsx` for genuinely unexpected (non-`CatalogReadSourceError`) failures in the catalog route group.
- No empty-state UI on `/brands` if zero brands are ever returned.
- Zero component/rendering-level tests for any catalog UI component (see "Tests audit" proposed plan).
- Facet option labels are raw unnormalized strings rather than a curated display label (cosmetic/display-layer fix only — do not attempt to fix the underlying source normalization, that lives in `src/modules/imports/**`, out of scope).
- `prefers-reduced-motion` not respected for the card hover scale transform.

## Shared problems not to edit

Real issues whose fix requires touching files outside this worktree's allowed scope. Document only; do not modify:

- **All catalog visual styling lives in the single shared `src/app/globals.css`** (4,576 lines, also containing homepage/Journal/account styles, e.g. `.home-catalog-grid` a few hundred lines from `.catalog-grid`). This is simultaneously a technical-debt finding and the central "Parallel-work risk" — see below.
- The oversized `.watch-detail-title` (122px desktop) and near-full-viewport `.watch-detail-hero` (690px min-height) are defined in `globals.css` and cannot be corrected without editing that forbidden shared file.
- `CollectionWatchAction` (`src/components/collection/**`) is the only CTA on the watch detail page; any change to how ownership/collection actions present on the detail page requires editing a module outside catalog scope.
- `PublicShell` (`src/components/shell/public-shell.tsx`) hardcodes the favorite icon's `href="/account/favorites"` in the site header too (not just the catalog card) — the same broken-affordance problem exists at the header level, and fixing it site-wide is explicitly a shared-shell change.
- `src/config/navigation.ts` also references `/account/favorites` in `accountNavigation` — same root cause, shared config file.
- `imports/imports/` stray nested directory not matched by `.gitignore` (causes `imports/` to show as untracked in `git status`) — this is either a benign one-off local artifact or a `.gitignore` gap; not a catalog-code issue and not touched this pass, flagged for whoever owns the import pipeline / repo hygiene.

## Parallel-work risks

1. **Highest risk: `src/app/globals.css` is a single shared file that both the catalog and the homepage genuinely need to style through, today, with no CSS-Module or scoped-stylesheet boundary between them.** Any Phase 1+ visual redesign of the catalog as currently architected requires editing this exact file, which directly conflicts with "Claude works only on the catalog, Codex works only on the homepage" if both agents touch it in the same window. **Recommended safe integration path** (for the user to approve before Phase 1 visual work begins): introduce catalog-scoped CSS Modules (e.g. `catalog-list-page.module.css`, `catalog-watch-card.module.css`, `catalog-watch-detail-page.module.css`) that progressively absorb the `.catalog-*`/`.watch-detail-*`/`.price-plate` rules out of `globals.css`, migrated class-by-class so each migration is a small, mergeable diff against `globals.css` rather than a large rewrite. This should be proposed as an explicit early phase (see Phase 1 below) and confirmed with the user first, since it does touch the shared file, just in small, additive, easily-reviewable increments rather than a redesign-sized rewrite.
2. **`PublicShell` and `src/config/navigation.ts` are shared between the homepage and the catalog.** Any future fix to the broken favorite-icon affordance (see "Shared problems not to edit") needs coordination, since the icon appears both in the header (shared) and on every catalog card (catalog-owned) — a partial fix (card-only) would leave the header inconsistent, and a full fix requires a change Claude cannot make unilaterally in this worktree.
3. **`imports/generated/catalog-import-preview.json` and `imports/generated/catalog-image-upload-plan.json` are the entire data source for every catalog page today.** These are regenerated by `npm run catalog:import:preview` / `catalog:import:apply:dry-run`, which live in `src/modules/imports/**` (forbidden). If the homepage worktree or any other process regenerates these files with different content, catalog page output changes without any catalog-worktree commit — worth the user's awareness, not something either agent can fully control from a single worktree.
4. **No evidence of homepage code depending on catalog code** (or vice versa) beyond the shared `PublicShell`/`globals.css`/`config/navigation.ts`/`ui/**` primitives already listed — the module boundary (`src/modules/catalog/**` vs `src/components/home/**`) itself is clean and low-risk.

## Recommended redesign direction

Grounded in `docs/PRODUCT_JOURNEY_REVIEW.md`'s own accepted type/spacing scale (which the current catalog does not fully follow) and the concrete findings above, not a generic "make it nicer" statement:

- **Correct, don't reinvent, the existing "Modern Horology / Precision Editorial" direction.** The toolbar-based filter band, compact cards, quiet placeholder mark, and restrained card copy are already aligned with the documented direction and with what a premium catalog should look like — the redesign's job is fixing the two concrete oversized-scale violations (detail title, detail hero height) and the broken save affordance, not replacing the visual language.
- **Bring the watch-detail hero and title within the documented budget**: title ≤ 64px desktop / ≤ 42px mobile (`docs/PRODUCT_JOURNEY_REVIEW.md`'s "Page title" row), hero height bounded so identity + price + one primary action are visible above the fold without a near-full-viewport media block.
- **Resolve the save/Candidate affordance before or alongside any visual polish** — a premium catalog that shows a save icon which does nothing per-item is a worse trust signal than having no icon at all. This is a product decision (see "Problems to preserve context for" #1), not purely visual.
- **Move catalog styling out of `globals.css` into catalog-scoped CSS Modules incrementally**, both to unblock safe parallel work with the homepage worktree and because it is good architecture regardless of the two-agent constraint.
- **Do not add filters/sort options the data doesn't support** (case size, strap material, style/use-case, availability) until the underlying data is genuinely normalized — matches the project's own documented restraint and avoids UI promising something the catalog can't deliver.
- **Add the missing resilience layer** (`loading.tsx`, `error.tsx` per catalog route, focus trap in the mobile sheet, fixed dead tab anchors) as foundational Phase-1/7 work, since these are cheap, catalog-only, and currently invisible only because the data source is fast local JSON — they will become visible the moment a real database-backed repository is wired in.

## Proposed implementation phases

This section originally proposed 8 granular phases after the Phase 0 audit. The user's actual Phase 2 instruction bundled most of that granular scope (CSS-extraction's scale-correction half, filter/sort polish, watch card system fixes, mobile accessibility, loading/error resilience) into a single pass, plus items not originally scoped for that stage (sidebar removal, editorial insert, pagination redesign, review mode, image audit). The table below reflects what actually happened; the remaining phases are renumbered starting from the real next unstarted phase (watch detail).

| Original phase | Status | What happened |
| --- | --- | --- |
| CSS extraction | Done (Phase 1 session) | See `docs/CATALOG_STYLE_ISOLATION.md`. |
| Scale correction (title/hero) | **Still not done** | Deliberately deferred — the task brief for the Phase 2 session explicitly excluded watch-detail visuals. Still queued for the watch-detail phase below. |
| Filter/sort polish | Done (Phase 2 session) | Full toolbar redesign, not just label polish — see `docs/CATALOG_LIST_ART_DIRECTION.md` "Filter system". |
| Watch card fixes | Done (Phase 2 session), differently than proposed | The card was fully rebuilt rather than patched; sibling-card construction still duplicates `toCatalogWatchCard` (untouched, out of this pass's file list) but that only affects `catalog-watch-detail-page.tsx`, which stayed out of scope. The favorite-icon problem was resolved by removing the card's icon entirely (see "Problems to preserve context for" #1 — still applies to the shared header icon). |
| Brand/collection navigation (`/brands` empty state) | **Not done** | Not in the Phase 2 session's file list (`src/app/(shop)/brands/**` was not touched). Still open. |
| Saved/compare journey | **Blocked**, unchanged | Still requires an explicit product decision; nothing was added this phase (no Favorites entity, no fake Candidates persistence, per explicit instruction). |
| Mobile/real-device verification | Partially done | Focus trap/Escape/scroll-lock/focus-return implemented and unit-tested; **real browser/device visual verification still did not happen** — no screenshot tooling was available in this environment, see "Verification results" below. |
| Accessibility/performance resilience | Done | `loading.tsx`/`error.tsx` added for both list routes; contrast was not machine-verified (no tooling), only reviewed by design (dark ink on light paper, well above typical AA thresholds for the token pairs used). |
| Visual QA/integration | Partially done | All automated checks pass; manual pixel-level visual sign-off still needs the user, per the same tooling gap. |

### PHASE 3 (next): Watch detail redesign
- Goal: bring `.title`/`.hero` in `watch-detail.module.css` within the documented budget (title ≤ 64px desktop / ≤ 42px mobile, hero no longer forcing a near-full-viewport height), fix the dead `#fit`/`#collection` tab anchors, fix the sibling-card construction duplication, decide and implement the interim treatment for a real "Сохранить в кандидаты" affordance if the user greenlights it.
- Files: `src/components/catalog/catalog-watch-detail-page.tsx`, `src/components/catalog/watch-detail.module.css`, `src/modules/catalog/application/catalog-read-service.ts` (only if fixing the sibling-card duplication requires exporting `toCatalogWatchCard` usage there).
- Constraints: same domain/data-flow constraints as Phase 2 (no Catalog Read Repository contract changes, no canonical URL changes, no homepage changes); do not build a bespoke Favorites/Candidates persistence without explicit sign-off.
- Acceptance criteria: title/hero within budget; `npm run build`/`lint`/`typecheck`/`test` stay green; visual diff limited to the watch detail route.
- Tests: extend `tests/catalog-list-redesign.test.ts`-style source-contract tests to the detail page; a rendered title-scale check if a testing approach for that is agreed.
- Conflict risk: low — the detail page's CSS Module is already catalog-owned since Phase 1.

### PHASE 4 (later): Brand and collection navigation
- Goal: add an explicit empty state to `/brands`; verify collection-name filter matching robustness (slug-based instead of display-name matching, if data allows).
- Files: `src/app/(shop)/brands/page.tsx`, `catalog-filter-panel.tsx`, `catalog-read-service.ts`.
- Constraints: do not change canonical URL structure.
- Acceptance criteria: `/brands` never renders a bare empty section; collection filter behaves correctly even with same-named collections across brands (or the risk is explicitly documented as accepted).
- Tests: new `/brands` empty-state test.
- Conflict risk: low.

### PHASE 5 (later): Saved/compare journey
- Goal: **blocked on a product decision** — do not start without explicit direction on whether Candidates/Compare are in scope for this worktree or a separate initiative.
- Files: TBD, likely spans beyond `src/app/(shop)/watches/**`/`brands/**` if a real `/candidates` route and domain model are approved.
- Constraints: must follow `docs/DOMAIN_REVIEW.md` §5 exactly (no standalone Wishlist; `candidate_items` stage model only) if greenlit.
- Acceptance criteria: TBD pending scope decision.
- Tests: TBD.
- Conflict risk: unknown until scope is defined; likely touches shared domain/migration layers outside a pure catalog worktree.

### PHASE 6 (later): Real-device visual verification and `/brands` polish
- Goal: close the "no browser tooling used" gap for both Phase 1/2's mobile work and the new catalog list redesign — verify 390/768/1024/1440px behavior for real against `docs/CATALOG_LIST_ART_DIRECTION.md`'s "Manual QA" guidance.
- Files: none expected (verification only), fixes only if real issues are found.
- Constraints: none beyond existing scope.
- Acceptance criteria: screenshots or direct observations at all documented widths replace the code-only responsive review in this audit and in `docs/CATALOG_LIST_ART_DIRECTION.md`.
- Tests: none beyond what already exists; fixes (if any) get their own tests.
- Conflict risk: low.

## Exact files allowed for next phase

Pending user approval and a decision on when Phase 3 (watch detail) starts:

```text
CLAUDE.md                                              (already created)
docs/CATALOG_CLAUDE_AUDIT.md                           (already created)
docs/CATALOG_STYLE_ISOLATION.md                        (already created, Phase 1)
docs/CATALOG_LIST_ART_DIRECTION.md                     (already created, Phase 2)
docs/CATALOG_IMAGE_AUDIT.md                            (already created, Phase 2)
src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx
src/components/catalog/catalog-watch-detail-page.tsx
src/components/catalog/watch-detail.module.css          (title/hero scale correction still pending here)
src/modules/catalog/application/**
src/modules/catalog/domain/**            (additive only — do not change existing read-model field meanings)
src/modules/catalog/infrastructure/**    (additive only — do not change the source-policy contract)
tests/catalog-*.test.ts                  (existing + new)
```

If instead the next phase is `/brands` polish (original Phase 4) or real-device visual verification (original Phase 6), the relevant files are listed under those entries in "Proposed implementation phases" above.

## Files forbidden for next phase

```text
src/app/(public)/page.tsx
src/components/home/**
src/app/design-lab/**
src/components/shell/**
src/config/navigation.ts
src/app/globals.css                      (Phases 1 and 2 both completed without touching it at all)
src/components/collection/**
src/modules/user-watch-collection/**
src/modules/imports/**
imports/**
package.json, package-lock.json, next.config.*, postcss config, eslint config, tsconfig*
Supabase config, migrations, database schema
```

## Acceptance criteria for redesign

- Every phase above passes `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before being considered done.
- No commit/push without explicit user instruction, per `CLAUDE.md`.
- No canonical URL, domain model, or Catalog Read Repository contract change without explicit user sign-off.
- No visual substitution of one reference's data/image for another's, ever.
- No fake commercial signals (stock, discounts, ratings, urgency) introduced at any phase.
- Homepage files, shared shell, shared navigation config, and `globals.css` remain untouched — true through both Phase 1 and Phase 2.
- Every fix proposed in "Catalog-only problems" is either resolved or explicitly deferred with a written reason.

## Open questions

For the user to decide before implementation continues:

1. ~~Is the CSS-extraction-from-`globals.css` approach approved?~~ **Resolved** — completed in Phase 1 and reused successfully through Phase 2 without any further `globals.css` touches.
2. ~~What is the interim treatment for the broken save/favorite affordance?~~ **Resolved for the catalog card** — the icon was removed from every card in Phase 2. The shared header's own favorite icon (`PublicShell`, `src/config/navigation.ts`) still points at the same static `/account/favorites` stub and remains out of this worktree's scope; still open whether/when to fix it there.
3. Is Compare in scope for this worktree at all, ever, or strictly a separate future initiative?
4. Should real-device/browser visual verification (original Phase 6) use real device testing, a headless-browser screenshot tool, or is code-level review (as done in Phases 1 and 2) sufficient for sign-off? No screenshot tooling was available in either pass's environment.
5. Should the `imports/imports/` stray directory / `.gitignore` gap, and the small number of public `referenceDisplay` values containing leftover source-review notes (see `docs/CATALOG_IMAGE_AUDIT.md` "Other data-quality observation"), be reported to whoever owns the import pipeline, even though both are out of this worktree's editing scope?
6. Should the watch-detail redesign (Phase 3) proceed next, or should `/brands` polish (Phase 4) or real-device verification (Phase 6) come first?

## Verification results

### Phase 0/1 (audit + CSS isolation)

Run from `C:/Users/Sergey/Documents/New project/eternal-time-catalog` on branch `ai/claude-catalog`, commit `935079c`:

- `npm run lint` → **pass**, zero errors/warnings.
- `npm run typecheck` (`tsc --noEmit`) → **pass**, zero errors.
- `npm run test` (`vitest run`) → **pass**, 26 test files / 169 tests, all passing.
- `npm run build` (`next build`, Turbopack) → **pass**, 34/34 static pages generated.
- `git diff --check` → **pass**, exit code 0.
- `npm run secrets:scan` → **pass**.

### Phase 2 (catalog list redesign)

Run from the same worktree/branch, still uncommitted against `935079c`, after the full catalog list redesign:

- `npm run lint` → **pass**, zero errors/warnings.
- `npm run typecheck` (`tsc --noEmit`) → **pass**, zero errors.
- `npm run test` (`vitest run`) → **pass**, 27 test files / 190 tests. Three pre-existing catalog tests (`tests/approved-visual-direction.test.ts`, `tests/visual-system-reset.test.ts`, `tests/catalog-style-isolation.test.ts`) were updated where they asserted on structure/class names this phase intentionally changed (e.g. sidebar removal, dropped "Код" label, renamed CSS Module classes) — same testing intent, new implementation facts. One new file, `tests/catalog-list-redesign.test.ts` (25 tests, matching the task's own checklist), was added.
- `npm run build` (`next build`, Turbopack) → **pass**, 34/34 static pages generated, identical route table to the Phase 0/1 baseline.
- `git diff --check` → **pass**, exit code 0.
- `npm run secrets:scan` → **pass**.
- `git diff --stat`/`--name-only` reviewed manually: only catalog-list-scoped files (plus `.gitignore`, for the new generated-review-artifact pattern) appear in the diff; no `src/components/home/**`, no homepage route, no backend/Supabase/migrations, no `package.json`/`package-lock.json`, no Catalog Read Repository contract file (`read-models.ts`) in the diff.

No test, lint, typecheck, or build failure was encountered in either pass that was deferred or masked rather than fixed.
