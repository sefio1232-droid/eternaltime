# Eternal Time Routes

Routes use Next.js App Router groups to separate public, shopping, account, admin, content, and API concerns. Route groups are implementation organization and should not leak into URLs.

## Public Routes

```text
app/(public)/page.tsx
app/(public)/about/page.tsx
app/(public)/contacts/page.tsx
app/(public)/delivery/page.tsx
app/(public)/payment/page.tsx
app/(public)/warranty/page.tsx
```

Notes:

- Do not render legal or commercial promises until verified business settings exist.
- Public business pages should read from centralized `business_settings`.

## Catalog Routes

```text
app/(shop)/watches/page.tsx
app/(shop)/watches/[brandSlug]/page.tsx
app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx
```

Current canonical browsing route is `/watches`. `/catalog` redirects to `/watches` to avoid duplicate public catalog surfaces. Catalog filter URLs are usable for users through query params but are not automatically indexable. SEO landing pages are separate controlled entities.

## Brand And Brand Collection Routes

```text
app/(shop)/brands/page.tsx
app/(shop)/brands/[brandSlug]/page.tsx
app/(shop)/brands/[brandSlug]/collections/[collectionSlug]/page.tsx
app/(shop)/brands/[brandSlug]/collections/[collectionSlug]/[modelSlug]/page.tsx
```

Brand and Brand Collection pages are indexable when published and canonical.

## Category And SEO Landing Routes

```text
app/(shop)/categories/[categorySlug]/page.tsx
app/(shop)/selection/[landingSlug]/page.tsx
app/(shop)/lp/[landingSlug]/page.tsx
```

`lp` or another controlled path hosts controlled SEO landing pages. Landing criteria come from `seo_landing_pages`, not arbitrary query strings.

## Watch Page Routes

Preferred canonical pattern:

```text
/watches/{brandSlug}/{referenceSlug}
```

The canonical watch page entity is `watch_references`. The slug should be stable and usually include normalized reference plus a readable model hint where useful. If slugs change, redirects must preserve canonical value.

Watch pages render:

- Factual specs and descriptions from `watch_references`.
- Current price and inventory from visible `catalog_offers`.
- Sibling colors/configurations from other references under the same `watch_model_id`.
- Breadcrumbs: Brand -> Brand Collection optional -> Watch Model optional -> Manufacturer Reference.

During local development before production database reads are available, the Catalog Read Experience can use the explicit dev-only preview source. That source is disabled in production and must not be used for production SEO indexing.

## Compare Routes

```text
app/(shop)/compare/page.tsx
app/(shop)/compare/[comparisonId]/page.tsx
```

Guest comparisons can be session-scoped. Saved comparisons are user-owned.

Compare is normally entered from Watch Detail or the Candidate workspace. It does not require a permanent primary-navigation item.

Current local comparison behavior:

- `/compare?refs={brandSlug}:{referenceSlug},...` restores 1-4 exact references from the Catalog Read Repository;
- the actionable comparison state is versioned in browser local storage and is also represented by the shareable query;
- Catalog cards and Watch Detail expose isolated add/remove entry points, while the shared public shell mounts the compare tray;
- 2-4 models form the intended analytical state; one model is retained as an honest preparation state;
- identical rows can be collapsed, differences are emphasized, and absent values render as `Нет данных`;
- development-only image candidates that cannot be served are rendered as an explicit neutral image fallback;
- the route is noindex and is intentionally excluded from sitemap generation;
- no database, auth, Candidate, Cart, or Catalog data architecture is changed by this local foundation.

## Candidate Routes

```text
app/(shop)/candidates/page.tsx
```

`/candidates` is the single MVP saved/shortlist workspace. `saved`, `considering`, and `finalist` are item states within this route; do not create separate Wishlist or stage routes.

The route is private to its user or server-managed guest session and is always noindex.

## Selection Routes

```text
app/(shop)/selection/page.tsx
```

Selection is structured and deterministic and does not require AI. The prelude, six questions, and results all use
`/selection` with validated query-string state (`step` plus `scenario`, `fit`, `character`, `movement`,
multi-select `features`, and `budget`). Legacy seven-step query values are migrated where they map safely. Results read
the shared Catalog Read Repository, apply explainable recommendation weights with MATCH / UNKNOWN / CONFLICT semantics,
and link directly to canonical
`/watches/{brandSlug}/{referenceSlug}` detail routes. There are no session or duplicate results routes in the current
implementation.

## Cart And Checkout Routes

```text
app/(shop)/cart/page.tsx
app/(shop)/checkout/page.tsx
app/(shop)/checkout/confirmation/[orderId]/page.tsx
```

Checkout must revalidate offer orderability, price, inventory, and delivery/payment availability server-side before creating an order.

Checkout failure/retry should remain a state of the same Checkout Session when possible. Do not create fake success/failure routes that bypass real Order and Payment state.

## Account Routes

```text
app/(account)/account/page.tsx
app/(account)/account/profile/page.tsx
app/(account)/account/orders/page.tsx
app/(account)/account/orders/[orderId]/page.tsx
app/(account)/account/orders/[orderId]/tracking/page.tsx
app/(account)/account/comparisons/page.tsx
app/(account)/account/selections/page.tsx
app/(account)/account/recently-viewed/page.tsx
app/(account)/account/collection/page.tsx
app/(account)/account/collection/[userWatchId]/page.tsx
app/(account)/account/collection/analysis/page.tsx
app/(account)/account/addresses/page.tsx
app/(account)/account/notifications/page.tsx
app/(account)/account/support/page.tsx
```

These routes are the user-facing "My Collection" area. In architecture documents the domain term is User Watch Collection. Account mobile navigation should be compact and task-oriented, not a generic SaaS dashboard.

Collection profile, roles, gaps, and Recommendation Scenarios are sections/tabs inside `/account/collection/analysis` for MVP. Add dedicated routes only if real complexity later requires them.

## Future Public User Watch Collection Routes

```text
app/(public)/collections/@[publicSlug]/page.tsx
```

Rules:

- Public User Watch Collection is opt-in.
- Only explicitly public watches and public-safe fields render.
- Purchase price, documents, order data, private notes, addresses, and service documents never render.

## Content Routes

```text
app/(content)/articles/page.tsx
app/(content)/articles/[articleSlug]/page.tsx
app/(content)/guides/[guideSlug]/page.tsx
```

Articles and guides are controlled content entities with canonical URLs and metadata.

## Admin Routes

```text
app/(admin)/admin/page.tsx
app/(admin)/admin/watches/page.tsx
app/(admin)/admin/brands/page.tsx
app/(admin)/admin/brand-collections/page.tsx
app/(admin)/admin/catalog-attributes/page.tsx
app/(admin)/admin/categories/page.tsx
app/(admin)/admin/images/page.tsx
app/(admin)/admin/inventory/page.tsx
app/(admin)/admin/prices/page.tsx
app/(admin)/admin/orders/page.tsx
app/(admin)/admin/users/page.tsx
app/(admin)/admin/editorial-selections/page.tsx
app/(admin)/admin/articles/page.tsx
app/(admin)/admin/seo/page.tsx
app/(admin)/admin/imports/page.tsx
app/(admin)/admin/promo-codes/page.tsx
app/(admin)/admin/settings/page.tsx
app/(admin)/admin/audit-logs/page.tsx
```

Future:

```text
app/(admin)/admin/ai-seo/page.tsx
```

Admin routes must enforce server-side role checks.

## API And Server Routes

```text
app/api/webhooks/payment/[provider]/route.ts
app/api/webhooks/delivery/[provider]/route.ts
app/api/storage/sign-user-file/route.ts
app/api/imports/[batchId]/parse/route.ts
app/api/imports/[batchId]/validate/route.ts
app/api/sitemap/route.ts
```

API routes must validate input, enforce auth/authorization, and avoid exposing service role operations to clients.

## Rendering Strategy

- Public catalog, brand, Brand Collection, watch reference, article, and SEO landing pages: server-rendered with cache/revalidation where safe.
- Account and admin pages: server-rendered with per-user authorization, no global caching.
- Highly interactive fragments: Client Components nested inside server-rendered pages.
- Checkout and order creation: server-side validation and mutation.

## Route Creation Rule

Before adding a public route, decide:

- Is it indexable?
- What is canonical?
- What metadata source is used?
- Does it belong to an existing entity or a new controlled SEO landing page?
- How will it appear in sitemap and internal linking?

## Implemented Public Experience Routes

Current implemented public routes include:

```text
/
/watches
/watches/{brandSlug}
/watches/{brandSlug}/{referenceSlug}
/brands
/journal
/journal/{slug}
/selection
/collection
```

`/selection` is the implemented URL-state selection flow. `/collection` is the ownership experience and falls back to
the deterministic browser-local runtime when authentication or Supabase is unavailable. Neither route fabricates
backend persistence or authentication.

`/journal` exposes only published Journal articles from the Journal read repository. Draft articles are excluded from public route resolution and sitemap generation.

## Implemented User Watch Collection Routes

```text
/collection
/collection/new
/collection/{userWatchId}
/collection/recommendations/{intent}
/login
/auth/callback
```

- `/collection` is noindex and renders only the authenticated user's User Watches; unauthenticated visitors receive a useful entry state and login path.
- `/collection/new` is authenticated minimal Quick Add.
- `/collection/{userWatchId}` is owner-scoped detail/edit/delete; unknown or foreign IDs resolve as not found.
- `/account/collection` redirects to `/collection` so the product has one ownership surface.
- Watch Detail uses `/login?returnTo=...` when authentication is required and returns to the same Manufacturer Reference.

The previous public `/collection` explanation page has been replaced by the real ownership experience. Collection Profile/gaps/recommendations are not routed or rendered until deterministic Collection Intelligence exists.

Phase 1 local runtime:

- `/collection` renders the local browser-backed collection core when the user is unauthenticated or Supabase is not configured;
- `/collection?demo=1` loads a meaningful demo collection and deterministic local analysis;
- `/collection/new` and `/collection/new?demo=1` open local Quick Add without authentication and accept existing
  `reference` or `catalogReferenceId` hints;
- `/collection/{userWatchId}` and `/collection/{userWatchId}?demo=1` open the matching local detail record and show a
  controlled not-found state for unknown IDs;
- `/collection/recommendations/{intent}` is a noindex collection-domain route for the controlled intents `travel`,
  `sport`, `formal`, `first-mechanical`, `colorful-accent`, `strap-diversity`, and `everyday-upgrade`; it reads the
  current local collection, receives eligible records through the server-only Catalog Read Repository adapter, and
  renders 6-12 deterministic candidates when enough exact matches exist;
- local collection routes receive eligible catalog candidates through the server-only Catalog Read Repository; Client
  Components never read import preview files;
- `/account/collection` remains a redirect to `/collection`;
- local runtime routes are noindex; authenticated owner-scoped Supabase behavior remains unchanged.

Phase 2.2 route behavior:

- `/collection` embeds up to four deterministic catalog recommendations as two exact complements and two exploratory
  directions whenever at least one active local watch exists;
- one-watch collections use initial-confidence copy rather than a blocking insufficient-data section;
- each local shelf record exposes an accessible action menu; delete opens confirmation on the current route;
- `/collection/{userWatchId}` exposes a visible secondary destructive action before the edit form and returns to
  `/collection` after confirmed local or demo deletion;
- `/collection/new` keeps manual/catalog tabs and a compact persistent form action footer without changing route or
  persistence boundaries.

Phase 2.3 demo harness:

```text
/collection?demo=empty
/collection?demo=one
/collection?demo=two
/collection?demo=three
/collection?demo=four
/collection?demo=many
/collection?demo=mixed
/collection?demo=archived
```

`?demo=1` remains an alias for `many`. Named scenarios are deterministic, use separate `sessionStorage` keys, preserve
their scenario query across collection detail/add/recommendation links, and never read or write the ordinary local
collection key. Catalog-linked fixture watches still come through the server-only Catalog Read Repository adapter.

Phase 2.4 route behavior:

- `/collection/new` defaults to catalog mode unless `mode=manual` is explicit;
- the server-only adapter supplies the complete current Catalog Read Repository snapshot; the Client Component never
  reads generated import files;
- the unfiltered picker count is derived from the repository, not hardcoded, and pages results in groups of 24;
- query controls reset pagination while preserving canonical `/watches/{brand}/{reference}` links;
- `/collection/{userWatchId}` renders view mode first and opens edit or status controls only after an explicit action;
- all named demo routes use the same deterministic server snapshot and retain isolated session persistence.

## Product Navigation Decision

Primary navigation target:

- `/journal`;
- `/watches`;
- `/selection`;
- `/collection` for the public explanation or `/account/collection` after authentication.

Utility navigation target:

- search;
- `/candidates` with count when non-empty;
- account;
- `/cart` with a commerce-specific indicator.

Brand discovery remains available through `/brands`, catalog navigation, and search but does not require equal primary-header weight once the User Watch Collection is functional. Cart and Collection must remain visually and semantically distinct.

## Collection Phase 2.5 Route Behavior

- `/collection`, `/collection/new`, `/collection/{userWatchId}`, and recommendation surfaces use the same
  collection-facing primary-image curation and media-presentation policy.
- Catalog-linked records retain canonical `/watches/{brand}/{reference}` routes while technical-only image sets fall
  back to a neutral missing-image state.
- Named demo scenarios remain storage-isolated and exercise the same image policy and adaptive shelf compositions.
- No route reads import preview files on the client, and no public catalog or homepage route behavior changes.

## Collection Phase 2.6 Route Behavior

- `/collection` and `/collection/{userWatchId}` reconcile previously persisted catalog-linked media with the current
  server-provided canonical candidate before rendering shelf or detail.
- `/collection/new` keeps the same catalog/manual tabs and complete repository snapshot, with a compact route-local
  layout that brings controls and the first product row into the initial desktop viewport.
- Shelf count variants, profile, recommendations, and empty onboarding retain their existing route and persistence
  behavior while using denser section rhythm and category-aware watch sizing.
- Manual photos, named demo storage isolation, noindex behavior, and the 24-item picker pagination contract remain
  unchanged.

## Collection Phase 2.7 Navigation And Hydration

- Collection-local navigation resolves to `/collection`, `/collection#collection-shelf`,
  `/collection#collection-recommendations`, and `/collection/new`.
- The recommendations route marks its collection-local entry active; detail marks `Мои часы`; add marks
  `Добавить часы`.
- Section anchors use sticky-header scroll margins and the navigation becomes horizontally scrollable on narrow
  viewports without truncating labels.
- `/collection/new` uses the same unconditional root class on SSR and the first client render. Its add-specific
  spacing is structural CSS, while browser storage remains deferred until after hydration.
- No new public route, catalog route, authenticated backend, or indexation behavior is introduced.
