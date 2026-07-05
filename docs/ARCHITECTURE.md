# Eternal Time Application Architecture

## Stack

- Next.js with App Router.
- TypeScript with `strict` enabled.
- Tailwind CSS.
- PostgreSQL through Supabase.
- Supabase Auth.
- Supabase Storage.
- Server Components by default.
- Client Components only for required browser interactivity.

The initial architecture is a modular monolith. It should be deployable as one Next.js application with one PostgreSQL database and Supabase-managed auth/storage. Do not split into microservices until scale, team ownership, or provider isolation makes that boundary real.

## Application Shape

Recommended source layout for the implementation phase:

```text
src/
  app/
    (public)/
    (shop)/
    (account)/
    (admin)/
    api/
  modules/
    catalog/
    user-watch-collection/
    collection-intelligence/
    manual-watch-matching/
    selection/
    comparison/
    cart/
    orders/
    payments/
    delivery/
    content/
    seo/
    imports/
    auth/
    admin/
    observability/
  shared/
    config/
    db/
    errors/
    logging/
    ui/
```

`modules/*` should own domain types, query functions, server actions, validators, and tests for that domain. `shared/*` is only for genuinely shared infrastructure. Do not create a generic utils dumping ground.

## Route Groups

- `(public)`: home, informational pages, brand pages, Brand Collection pages, article pages.
- `(shop)`: catalog, watch pages, compare, selection, cart, checkout.
- `(account)`: authenticated account, orders, User Watch Collection, saved items, settings.
- `(admin)`: admin-only catalog, import, order, content, SEO, and audit tools.
- `api`: webhooks, signed URL endpoints, import processing, and provider callback boundaries.

See `docs/ROUTES.md` for concrete route structure and SEO behavior.

## Server Components

Use Server Components for:

- Catalog listing shells.
- Watch pages.
- Brand and Brand Collection pages.
- SEO landing pages.
- Article pages.
- Account pages that render server-fetched data.
- Admin data views.

Server Components should fetch data through server-only data access functions. They must not import service role clients into Client Components.

## Client Components

Use Client Components for:

- Filter controls that update URL state.
- Compare table interactions.
- Image gallery controls.
- Cart quantity controls.
- Checkout form interactions.
- Account mobile navigation.
- File upload widgets.
- Admin import mapping UI.

Client Components should receive already-authorized data or call server actions/routes that enforce authorization.

## Domain Layer

The domain layer defines business concepts and rules:

- Catalog identity: Brand, Brand Collection, Brand Line, Watch Model, Manufacturer Reference.
- Commerce: Catalog Offer, Price, Inventory, Cart, Order, Order Item.
- Ownership: User Watch Collection, User Watch, User Watch Analysis Traits, Service Record, User Watch File.
- Intelligence: Collection Profile, Collection Gap, Recommendation Scenario, Recommendation Candidate.

The domain layer must not depend on React. Domain rules should be testable without rendering pages.

## Application Services

Application services orchestrate workflows:

- Catalog search and filter service.
- Selection session service.
- Comparison service.
- Cart merge and checkout service.
- Order creation service.
- User Watch Collection management service.
- Manual watch source data, trait normalization, matching, and reconciliation service.
- Collection analysis service.
- Import staging and apply service.
- SEO metadata generation service.
- Admin authorization service.

Services should call data access functions and domain rules. They should return typed results and user-safe errors.

## Data Access

Data access should be explicit per module:

- `catalog/queries.server.ts` for public catalog reads.
- `catalog/admin-repository.server.ts` for admin mutations.
- `user-watch-collection/repository.server.ts` for user-owned data.
- `manual-watch-matching/repository.server.ts` for match candidates and provisional identities.
- `orders/repository.server.ts` for commerce records.

Do not spread raw Supabase queries across UI components. Public reads, authenticated reads, admin reads, and service-role tasks should be separate functions.

## Authentication

Supabase Auth is the identity provider. Application user data belongs in `profiles`. The app must support guest sessions for cart, recently viewed, and comparison flows without treating guests as authenticated users.

## Authorization

Authorization is enforced at multiple layers:

- RLS policies in PostgreSQL.
- Server-side role checks for admin actions.
- Route protection in Next.js middleware or server layout boundaries.
- Storage policies for private files.

Frontend conditionals can hide UI, but they are never the source of truth.

## Supabase Boundaries

Use Supabase client types intentionally:

- Anonymous client for public reads allowed by RLS.
- User session client for authenticated user data.
- Service role client only in server-only code for trusted jobs, imports, webhooks, and admin operations that cannot be expressed through user RLS.

Service role keys must never enter client bundles.

## Storage

Storage concerns are separated by access level:

- Public catalog images.
- Public content images.
- Private User Watch Collection media.
- Private user documents.
- Private admin import files and reports.

Private files must use ownership-aware paths, storage policies, and signed URLs. See `docs/SECURITY.md` for policy expectations.

## Caching

Use caching carefully:

- Public catalog and content pages can use Next.js caching/revalidation.
- Search results and faceted filters can use query-level indexes and optional cached facets.
- User-private data should not be globally cached.
- Collection Intelligence results can be cached by User Watch Collection version and analysis algorithm version.
- Order and payment state should favor correctness over caching.

Cache invalidation must be explicit for catalog imports, price changes, inventory changes, content publication, and User Watch Collection edits.

## Background Jobs

The first implementation can use server actions and admin-triggered workflows. Background job boundaries are still useful for:

- Catalog import parsing and validation.
- Applying approved imports.
- Rebuilding search documents and facets.
- Recalculating collection analysis.
- Sitemap generation.
- Provider webhook processing.

Use a simple queue or Supabase-compatible scheduled mechanism only when synchronous processing becomes unreliable.

## Collection Intelligence Boundary

Collection Intelligence is a first-class module. It consumes normalized User Watch Collection data, `watch_references` catalog attributes, and `user_watch_analysis_traits` for manual watches. It produces profile snapshots, gaps, scenarios, candidates, and explanations, and stores versioned results. It does not call AI for core scoring.

MVP recommendation rules use versioned typed rule definitions in application/domain code:

```text
CollectionProfile
  -> RuleDefinition[]
  -> DetectedScenario[]
  -> CandidateConstraints
  -> catalog query
  -> deterministic scoring
  -> result snapshot
```

Rules must not live in React components, must not be duplicated across services, and must not be stored as arbitrary executable expressions in the database. The database stores snapshots, rule IDs, rule versions, candidate constraints, candidate scores, and rendered explanations.

## Manual Watch Boundary

Manual User Watches are handled by the User Watch Collection and manual-watch-matching modules:

- Quick Add creates a private User Watch with raw source data.
- Progressive enrichment adds normalized analysis traits.
- Deterministic normalization maps only known facts.
- Matching creates non-destructive match candidates.
- Provisional Watch Identities group repeated missing watches without becoming public catalog entries.
- Reconciliation can link a User Watch to `watch_references` later without deleting raw input, photos, documents, service history, or user-specific overrides.

Manual user data must not bypass catalog validation. Admin aggregate screens can surface frequently added missing watches, but public catalog references are created only through the normal catalog workflow.

## AI Boundary

AI is optional and provider-agnostic. The architecture may later expose an AI provider adapter, but core catalog, selection, collection analysis, cart, checkout, and order flows must function without it.

AI output should be stored as suggestions or drafts and require human review before publication.

## Payments

Payment logic uses a provider adapter boundary:

- Core order logic owns order state and totals.
- Provider adapters create payment intents, verify callbacks, and translate provider events into internal payment events.
- No real provider integration is created until credentials and business requirements are verified.

## Delivery

Delivery logic uses provider adapters:

- Core order logic stores selected delivery method snapshots.
- Provider adapters can later calculate rates, create shipments, and track status.
- CDEK, Russian Post, courier delivery, and future providers should be adapters, not assumptions embedded in checkout.

## Legal And Business Configuration

Legal and commercial information should be centralized in verified configuration, such as `business_settings`, and rendered only when approved. Do not hardcode or invent INN, OGRNIP, legal address, bank details, phone, email, warranty terms, delivery promises, merchant data, or provider credentials.

## Admin Architecture

Admin is a protected route group with server-side authorization. It manages catalog entities, attributes, images, prices, inventory, imports, orders, content, SEO, promo codes, settings, and audit logs.

Admin changes should create audit log entries for sensitive operations.

## Observability

Use structured server logs with request context, user ID where appropriate, operation name, and error code. Do not log secrets, tokens, private documents, raw payment payloads beyond safe metadata, or unnecessary personal data.

Important event streams:

- Audit logs.
- Import logs.
- Payment events.
- Delivery events.
- Collection analysis recalculation logs.
- Admin publication events.

## Error Handling

Errors should be separated into:

- Domain errors: invalid state, duplicate reference, unavailable offer.
- Authorization errors: not authenticated, not owner, not admin.
- Validation errors: malformed input, unknown attribute, invalid import row.
- Provider errors: payment, delivery, storage, AI, or external service failure.
- Unexpected errors: logged internally with safe user-facing messages.

User-facing messages must be useful without exposing internals.
