# SEO Architecture

SEO is a strategic system in Eternal Time. It must be controlled, data-backed, and safe. The application should not create indexable pages for every possible filter combination.

## URL Structure

Preferred public URL families:

- `/watches` for general catalog browsing.
- `/brands/{brandSlug}` for brand pages.
- `/brands/{brandSlug}/collections/{collectionSlug}` for Brand Collection pages.
- `/watches/{brandSlug}/{referenceSlug}` for canonical watch reference pages.
- `/categories/{categorySlug}` for controlled categories.
- `/lp/{landingSlug}` or a better product-approved path for SEO landing pages.
- `/articles/{articleSlug}` and `/guides/{guideSlug}` for content.
- `/compare/{comparisonId}` for saved comparisons when shareable and allowed.

## Slugs

Slugs should be:

- Lowercase.
- Transliteration-safe where needed.
- Stable after publication.
- Unique within the relevant parent scope.
- Redirected when changed.

Watch slugs should prefer brand plus Manufacturer Reference identity. Manufacturer reference display can preserve punctuation, while URL slug uses normalized safe form.

## Canonical Strategy

- Watch page canonical points to the `watch_references` URL.
- General public catalog canonical points to `/watches`; `/catalog` redirects to `/watches`.
- Brand and Brand Collection canonicals point to their clean route without arbitrary query params.
- Filtered catalog URLs are generally canonicalized to `/watches` unless represented by a controlled SEO landing page.
- Paginated pages use self-canonical only when indexation is intentionally allowed.
- Sort/order query parameters should not create alternate canonicals.

## Indexation

Indexable by default when published and complete:

- Brand pages.
- Brand Collection pages.
- Watch pages.
- Controlled category pages.
- Controlled SEO landing pages.
- Articles and guides.

Noindex or canonicalize away:

- Arbitrary filter combinations.
- Search result pages.
- Internal account pages.
- Admin pages.
- Cart and checkout pages.
- Draft content.
- Thin pages without useful content.

## Filters

Filters must support users without creating SEO chaos:

- User filter state can live in query params or path segments.
- Common filter combinations are not automatically indexable.
- If a filter combination has search value, create a reviewed `seo_landing_pages` entity.
- Landing pages own title, description, body, canonical URL, criteria, indexation state, and internal links.

## Pagination

Catalog pagination should have stable ordering and preserve filters. SEO behavior depends on page type:

- General catalog: index first page if useful; deeper pages may be noindex depending on implementation.
- Brand/Brand Collection pages: page 1 is canonical; deeper pages can be discoverable but not necessarily indexable.
- SEO landing pages: index page 1; deeper pages need a deliberate policy.

## Metadata

Metadata sources:

- Entity fields for deterministic fallback.
- `seo_metadata` for approved custom metadata.
- Templates for incomplete but valid pages.
- AI suggestions only after admin approval.

Metadata must not invent:

- Availability.
- Prices.
- Discounts.
- Guarantees.
- Delivery promises.
- Legal seller details.

## Structured Data

Use structured data only when accurate:

- `Product` for watch reference pages with current safe offer data if available.
- `BreadcrumbList` for navigational hierarchy.
- `Article` for articles and guides.
- `FAQPage` only when visible FAQ content exists on the page.

Order data, private User Watch Collection data, and admin draft data should never leak into structured data.

The Catalog Read Experience may use the generated preview source only for development/test. Production sitemap and structured-data generation must not index or publish preview records. Product structured data from the read experience uses only public identity fields, images, and public price; it does not include source price observations, stock claims, shipping, reviews, or aggregate ratings.

## Sitemap

Sitemap generation should be entity-driven:

- Published brands.
- Published Brand Collections.
- Published watch pages.
- Published categories.
- Published SEO landing pages.
- Published articles and guides.

Scaling:

- Split sitemaps by entity type when needed.
- Include `lastmod` from entity publication/update timestamps.
- Exclude noindex, draft, hidden, and private pages.
- Regenerate after imports and content publication.

## Robots

Robots policy:

- Disallow account, admin, checkout, cart, and internal API routes.
- Noindex through metadata for user-specific and filtered URLs where appropriate.
- Keep sitemap URL discoverable.

## SEO Landing Pages

SEO landing pages are controlled content entities. They include:

- Search intent.
- Criteria mapped to catalog filters.
- Title and body copy.
- Metadata.
- Canonical URL.
- Indexation state.
- Internal linking targets.
- Publication status.

They are not generated automatically from every filter combination.

## Internal Linking

Internal linking should connect:

- Brand pages to Brand Collections and important watch references.
- Brand Collection pages to models and articles.
- Watch pages to related models, alternatives, comparisons, and guides.
- Articles to relevant catalog pages.
- SEO landing pages to useful catalog and content nodes.

Orphan page detection can later become an admin/AI SEO assistant feature.

## Articles And Guides

Articles should support:

- Related brands.
- Related Brand Collections.
- Related watches.
- Related SEO landing pages.
- FAQ blocks when genuinely useful.
- Structured data.

Content must not make unsupported commercial claims.

## Comparison Pages

Comparison pages can be useful for users and SEO, but indexation must be controlled:

- User-created private comparisons are noindex/private.
- Editorial comparison pages can be separate content entities.
- Public comparison URLs should avoid duplicate/thin content.

## AI SEO Assistant Boundary

AI SEO assistant may identify gaps and create drafts. It cannot:

- Publish pages.
- Change canonical or robots settings.
- Create arbitrary landing pages from filters.
- Invent facts.

All AI SEO output requires admin review and normal publication.

## Current Public SEO Surface

The current public surface has factual metadata and canonicals for:

- `/`;
- `/watches`;
- `/watches/{brandSlug}`;
- `/watches/{brandSlug}/{referenceSlug}`;
- `/brands`;
- `/journal`;
- published `/journal/{slug}` pages;
- `/selection`;
- `/collection`.

Journal article structured data is emitted only for published articles with stored metadata. Draft Journal sources are not routed, indexed, or listed in the sitemap.

Raw catalog SEO description drafts from import sources remain internal source content drafts and are not published through catalog cards, catalog detail pages, Journal, or metadata.

Source marker rows and source notes are excluded before public read models are built; they cannot create canonical watch URLs or sitemap entries.
