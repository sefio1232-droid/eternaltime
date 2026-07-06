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

## Selection Routes

```text
app/(shop)/select/page.tsx
app/(shop)/select/[sessionId]/page.tsx
app/(shop)/select/[sessionId]/results/page.tsx
```

Selection is structured and deterministic. It should not require AI.

## Cart And Checkout Routes

```text
app/(shop)/cart/page.tsx
app/(shop)/checkout/page.tsx
app/(shop)/checkout/success/page.tsx
app/(shop)/checkout/failure/page.tsx
```

Checkout must revalidate offer orderability, price, inventory, and delivery/payment availability server-side before creating an order.

## Account Routes

```text
app/(account)/account/page.tsx
app/(account)/account/profile/page.tsx
app/(account)/account/orders/page.tsx
app/(account)/account/orders/[orderId]/page.tsx
app/(account)/account/orders/[orderId]/tracking/page.tsx
app/(account)/account/favorites/page.tsx
app/(account)/account/comparisons/page.tsx
app/(account)/account/selection-sessions/page.tsx
app/(account)/account/recently-viewed/page.tsx
app/(account)/account/collection/page.tsx
app/(account)/account/collection/[userWatchId]/page.tsx
app/(account)/account/collection/analysis/page.tsx
app/(account)/account/collection/recommendations/page.tsx
app/(account)/account/addresses/page.tsx
app/(account)/account/notifications/page.tsx
app/(account)/account/support/page.tsx
```

These routes are the user-facing "My Collection" area. In architecture documents the domain term is User Watch Collection. Account mobile navigation should be compact and task-oriented, not a generic SaaS dashboard.

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
