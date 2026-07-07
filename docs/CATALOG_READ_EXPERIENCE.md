# Catalog Read Experience

This document records the public catalog read experience boundary introduced after the controlled import apply phase. It does not authorize database apply, Supabase Storage upload, checkout, Compare, Smart Selection, User Watch Collection, Collection Intelligence, or AI.

## Read Boundary

Public catalog UI reads through an explicit boundary:

```text
Catalog data source -> Catalog Read Repository -> Catalog Read Models -> Server Components / UI
```

The UI consumes only public read models. It must not depend on import preview row shape, Excel/ZIP structure, validation issues, source provenance, raw source fields, or Supabase row shape.

Current implementations:

- `preview`: dev/test-only adapter over `imports/generated/catalog-import-preview.json` plus `imports/generated/catalog-image-upload-plan.json`.
- `database`: future production repository. It is intentionally not implemented until a Supabase project and published catalog rows are available.

## Source Selection And Production Guard

Source selection is controlled by:

```text
CATALOG_READ_SOURCE=preview | database
```

Preview source is allowed only in development/test. In production it fails closed. Production must not silently load local preview data when Supabase is unavailable, empty, or unconfigured.

If the production database repository is not configured, catalog pages render a controlled unavailable state rather than fake catalog data.

## Public Read Models

Public read models include:

- public identity: Brand, title, Manufacturer Reference, URL slugs;
- Brand Collection when available;
- Watch Model name;
- public price only;
- primary image presentation source and gallery;
- normalized public specifications;
- sibling Manufacturer References sharing the same Watch Model concept.

They exclude:

- source CNY cost;
- calculated internal source prices;
- Russian market comparison price;
- `Raznitsa` / source difference values;
- import batch data;
- source provenance;
- validation issues;
- raw SEO drafts;
- review status;
- raw source rows.

For the local preview adapter, `publicPriceCandidate` is used as the development public price representation. Other source price values remain internal import provenance.

## Eligible Records Only

The preview adapter maps only records with `applyEligibility.status = eligible`.

Manual-review records and `intentionally_skipped_missing_reference` records are excluded from cards, detail routes, images, and public read models. Raw reference `7` cannot produce a public route.

Current local public read count after public hygiene and controlled apply dry-run is 559 eligible records. The code does not hardcode that number.

## Routes

Canonical catalog routes:

```text
/watches
/watches/{brandSlug}
/watches/{brandSlug}/{referenceSlug}
```

Canonical watch URL:

```text
/watches/{brandSlug}/{referenceSlug}
```

`/catalog` redirects to `/watches` to avoid duplicate canonical catalog pages.

## Filtering

Initial filters are selected from generated coverage analysis:

```text
imports/reports/catalog-read-coverage.md
```

Chosen initial public filters:

- Brand;
- Brand Collection;
- public price range;
- movement;
- water resistance;
- case material;
- glass.

Case diameter/size and strap/bracelet remain public specifications for now. Their source values are useful to read, but not normalized enough for stable public facets.

## Search

Catalog search is deterministic and normalized. It searches public identity fields:

- Brand;
- title;
- official/model name where available;
- Manufacturer Reference.

Reference search uses the existing manufacturer reference normalization strategy so spacing and punctuation variations can match. There is no AI search, vector database, embeddings, or broad fuzzy matching.

## Sorting And Pagination

Supported sorting:

- default/relevance order;
- price ascending;
- price descending;
- name ascending.

Popularity, bestseller, newest, ratings, and review counts are not exposed because the project does not yet have factual data for them.

Pagination is URL-driven and server-side through the Catalog Read Repository boundary. Invalid query values are normalized or ignored safely.

## Watch Cards

Cards show only public facts:

- image or neutral missing-image state;
- Brand;
- title;
- Manufacturer Reference;
- public price;

Cards do not show fake discounts, previous prices, stock claims, delivery promises, ratings, review counts, bestseller badges, default specification snippets, internal source prices, or `Raznitsa`.

## Watch Detail Page

Watch detail pages include:

- breadcrumbs: Catalog -> Brand -> Watch;
- primary image and gallery when available;
- neutral missing-image state;
- Brand, title, Manufacturer Reference, Brand Collection, Watch Model;
- public price;
- grouped public specifications;
- sibling Manufacturer References sharing the same Watch Model concept.

SEO source descriptions remain drafts and are not published automatically. Detail pages remain useful through identity, hierarchy, specifications, public price, and images.

## Development Image Resolver

Local development images are served without copying source binaries to `public/` and without uploading to Supabase Storage.

Flow:

```text
Catalog read model
-> stable development image key
-> dev-only server resolver
-> validated image upload plan lookup
-> exact raw ZIP package + exact ZIP entry
-> image response
```

The browser receives only an opaque image key, never an absolute filesystem path or arbitrary ZIP entry path.

Security controls:

- disabled in production;
- unknown keys return 404;
- arbitrary filesystem paths are rejected;
- arbitrary ZIP entries are rejected;
- `..` traversal is rejected;
- only eligible records from the current preview can resolve images;
- manual-review and intentionally skipped records cannot resolve images;
- broken image candidates cannot resolve;
- source Excel/ZIP files are not exposed through HTTP;
- no directory listing exists.

Remote image candidates can render only when the import pipeline already marked the URL structurally valid. The app does not mass-download or crawl images.

## SEO

Catalog and watch pages provide factual titles, descriptions, canonicals, and Product structured data where appropriate.

Structured data does not include:

- `InStock`;
- shipping;
- reviews;
- aggregate ratings;
- internal source price values.

Preview catalog data is a development source. Production sitemap and production SEO behavior must not index preview records.

## Future Repository

The future Supabase catalog repository will implement the same read contracts using published Brands, Brand Collections, Watch Models, `watch_references`, visible safe offers, and public catalog images. The UI contract should not need to change when preview source is replaced by database reads.

## Public Hygiene Filter

The preview adapter reads only candidates whose apply eligibility is `eligible` and whose `sourceRowClassification.action` is `allow_public_read_and_apply`.

Non-product source rows such as spreadsheet section markers, comments, notes, headings, and technical separators are excluded before public read models are built. They are not represented as watch routes, search results, Brand counts, facets, or sibling references.

This filter is defensive; the primary classification happens in the import merge pipeline and is preserved in generated preview/audit artifacts.

## Brand Discovery

`/brands` is a discovery page over the Catalog Read Repository. It is not hardcoded to the initial four brands. The page shows only public brands that have public watch references, their public counts, representative watches, and available Brand Collection names.

`/watches/{brandSlug}` remains the browse route for a brand.

## Public Visual Direction

The public experience now uses the complete visual system reset called Modern Horology / Precision Editorial:

- cool near-white, graphite, steel, and deep-blue semantic tokens instead of beige/brown luxury cues;
- restrained sans-serif typography with explicit display, page, section, body, UI label, metadata, reference, and price roles;
- the `ETERNAL TIME` wordmark with primary navigation for watches, selection, journal, and brands;
- a single header search action that opens a dialog and submits to `/watches?q=...`;
- image-first watch presentation on cool studio surfaces;
- compact product cards showing media, Brand, title, Manufacturer Reference, and public price only;
- catalog filters in a top toolbar/facet band rather than a permanent desktop sidebar;
- mobile filters through an explicit sheet;
- watch detail pages with large media on the left and identity, price, highlights, and non-persistent actions on the right;
- editorial Journal and public selection/collection explanation pages without internal phase, import, or database language.

The UI still exposes the same read/query behavior: search, filters, sorting, pagination, watch detail pages, and dev-only image rendering.

## Journal And Editorial Selections

The public Journal is a repository-backed content boundary with committed article sources for this phase. Public Journal models expose only published articles and calculated reading time. Draft status is internal and is not present in public models.

Editorial selections are presentation/read models only. They are built from eligible public watches through documented deterministic criteria. They do not implement Smart Selection, Collection Intelligence, popularity claims, or database persistence.

## Editorial Art Direction Refinement

The public experience now uses a calmer editorial art direction on top of the same read models:

- watch media is presented on neutral studio/product stages instead of heavy dark rectangles;
- missing images use a quiet non-textual placeholder mark and never render `Фото готовится`;
- typography has been reduced in weight and scale so home, catalog, brand, detail, and Journal pages feel like a mature product surface rather than poster sections;
- the home page is an editorial/product front page that connects catalog, Journal, and future collection thinking without internal implementation language;
- brand pages are text-led when representative imagery is weak and show only real available watch images when present;
- Journal pages use featured, secondary, compact, and category-grouped layouts;
- article pages render related articles only through an explicit same-category factual relation.

This refinement preserves search, filtering, sorting, pagination, detail routes, catalog read isolation, the development image resolver security boundary, and the Journal repository boundary. It does not add Compare logic, Smart Selection logic, User Watch Collection backend, Collection Intelligence, checkout, database apply, Supabase Storage upload, or AI.
