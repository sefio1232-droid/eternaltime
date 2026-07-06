# Eternal Time Roadmap

The roadmap is dependency-driven. It keeps the MVP realistic while preserving architecture for a larger product.

## Phase 0: Architecture Baseline

Goal: create an approved architecture foundation.

Scope:

- Product, domain, architecture, database, routes, SEO, security, imports, AI, Collection Intelligence, and roadmap documentation.
- Permanent development rules in `AGENTS.md`.

Dependencies:

- None.

Deliverables:

- Documentation set in `docs/`.
- Agreed domain vocabulary.
- Key architecture decisions and deferred decisions.

Definition of done:

- Documents use consistent terms.
- Database model matches domain model.
- Collection Intelligence matches database model.
- AI is optional, not core.
- Roadmap matches architecture.

Intentionally excluded:

- Next.js application scaffold.
- UI.
- Catalog pages.
- Real integrations.

## Phase 1: Application Foundation

Goal: create the production-ready app skeleton.

Scope:

- Next.js App Router project.
- TypeScript strict mode.
- Tailwind CSS.
- Lint, typecheck, formatting, and test setup.
- Environment variable structure.
- Basic route groups.
- Shared error and logging primitives.
- Supabase client setup without domain tables yet.

Dependencies:

- Phase 0.

Deliverables:

- Running app shell.
- CI-like local commands.
- Initial folder/module structure.
- Environment documentation.

Definition of done:

- `lint`, `typecheck`, tests, and production build pass.
- No product UI beyond minimal placeholders needed to verify routing.
- Server/client boundaries are clear.

Intentionally excluded:

- Catalog implementation.
- Auth UI.
- Real database domain migrations.

## Phase 2: Auth, Roles, RLS Baseline

Goal: establish secure identity and authorization before private features.

Scope:

- Supabase Auth integration.
- `profiles`, `roles`, `user_roles`.
- Server-side role checks.
- Admin route guard.
- RLS policy patterns.
- Storage policy baseline.

Dependencies:

- Phase 1.

Deliverables:

- Authenticated session handling.
- Role model.
- Admin authorization helpers.
- RLS smoke tests.

Definition of done:

- Admin is never determined by email in frontend.
- Service role is server-only.
- User-owned table example proves RLS behavior.

Intentionally excluded:

- Full account area.
- Catalog admin tools.

Implementation status:

- Implemented together with the database/catalog foundation: `profiles`, `roles`, `user_roles`, server-side role lookup, admin route guard update, and RLS policy baseline.

## Phase 3: Catalog Domain And Database

Goal: implement the descriptive catalog and commercial-state schema.

Scope:

- Brands, Brand Collections, Brand Lines, Watch Models, Manufacturer References.
- Controlled dictionaries for movements, colors, materials, styles, use cases, functions.
- Hybrid attributes.
- Images.
- Catalog offers, price history, inventory states.
- Search document/facet foundation.

Dependencies:

- Phase 2.

Deliverables:

- Database migrations.
- Typed database access.
- Seed fixtures for development.
- Admin-safe validation for reference uniqueness.

Definition of done:

- Manufacturer reference uniqueness is enforced per brand.
- Descriptive watch data is separate from price/inventory.
- Query strategy supports primary filters.
- Tests cover catalog identity and duplicate prevention.

Intentionally excluded:

- Public catalog UI.
- Bulk import UI.
- Orders.

Implementation status:

- Implemented as database and domain foundation only. Public catalog UI, bulk import UI, and order workflows remain deferred.

## Phase 4: Public Catalog And Watch Pages

Goal: build user-facing catalog discovery surfaces.

Scope:

- Catalog listing.
- Search and filters.
- Brand pages.
- Brand Collection pages.
- Watch pages.
- Image gallery.
- Favorites and recently viewed basics.
- SEO metadata and structured data for catalog entities.

Dependencies:

- Phase 3.

Pre-work:

- Catalog Source Intake and Import Pipeline prepares real source data through staged audit/preview before public catalog UI reads catalog rows.
- The source pipeline does not apply rows to production tables and does not upload images; database apply remains a later approved import step.

Deliverables:

- Server-rendered public catalog.
- URL and canonical behavior.
- Primary filters and pagination.
- Watch page data composition.

Definition of done:

- Pages render from database.
- Filter queries are performant on realistic fixtures.
- Arbitrary filters are not automatically indexable.
- Build and SEO checks pass.

Intentionally excluded:

- Checkout.
- User Watch Collection.
- AI-generated content.

## Phase 5: Account, Favorites, Comparisons, Selection Sessions

Goal: add personal non-commerce interactions.

Scope:

- Account navigation.
- Profile page.
- Favorites.
- Recently viewed.
- Saved comparisons.
- Structured selection sessions.
- Deterministic selection results from catalog attributes.

Dependencies:

- Phase 4.

Deliverables:

- Authenticated account area.
- Guest-to-user continuity for comparisons where appropriate.
- Selection session storage and scoring baseline.

Definition of done:

- Private data is protected by RLS.
- Selection works without AI.
- Mobile account navigation is usable.

Intentionally excluded:

- User watch ownership and Collection Intelligence.
- Cart and checkout.

## Phase 6: User Watch Collection

Goal: implement private watch ownership.

Scope:

- User Watch Collections.
- User Watches linked to Manufacturer References.
- Manual user watches.
- Quick Add and progressive enrichment.
- Raw User Watch source data.
- Normalized user watch analysis traits.
- Manual watch match candidates.
- Lightweight provisional watch identity registry.
- Set contents.
- Notes and condition.
- Service history.
- Private photos and documents with signed access.
- Future public User Watch Collection fields behind opt-in controls.

Dependencies:

- Phase 2 and Phase 4.

Deliverables:

- User Watch Collection CRUD.
- Manual Quick Add.
- Source data and analysis trait storage.
- Non-destructive match suggestion baseline.
- Service records.
- Private storage upload/download flow.
- RLS and signed URL tests.

Definition of done:

- Catalog watch and user-owned watch are not mixed.
- Manual User Watches work without catalog coverage.
- Raw user data is not overwritten by matching or reconciliation.
- User photos are not catalog images.
- Private files are not in public buckets.
- Public visibility defaults to private.

Intentionally excluded:

- Public User Watch Collection pages.
- Recommendation engine.
- Admin catalog enrichment from manual-watch aggregates.

## Phase 7: Collection Intelligence

Goal: analyze User Watch Collections and recommend development directions.

Scope:

- Profile extraction.
- Gap detection.
- Rule engine.
- Recommendation scenarios.
- Candidate query and scoring.
- Explanation templates.
- Versioned analysis runs.
- Cache invalidation.

Dependencies:

- Phase 6 and Phase 3.

Deliverables:

- Analysis results in account area.
- "How this watch fits my User Watch Collection" baseline.
- Golden fixture tests.

Definition of done:

- Works without AI.
- Recommendations change when catalog data changes.
- Explanations are based on structured evidence.

Intentionally excluded:

- AI wording.
- Public sharing of analysis.

## Phase 8: Cart And Checkout

Goal: implement purchase intent and order creation.

Scope:

- Guest cart.
- User cart.
- Merge guest cart after login.
- Cart items.
- Checkout contact/address flow.
- Promo code architecture.
- Order creation.
- Immutable order item snapshots.

Dependencies:

- Phase 4 and Phase 2.

Deliverables:

- Cart and checkout flow.
- Order records.
- Order item snapshots.
- Server-side offer revalidation.

Definition of done:

- Existing order data survives catalog changes.
- Price and availability are rechecked before order creation.
- Guest cart merge is tested.

Intentionally excluded:

- Real payment provider.
- Real delivery provider.

## Phase 9: Payments, Delivery, And Order Operations

Goal: add provider-ready order lifecycle without fake integrations.

Scope:

- Payment adapter interface.
- Delivery adapter interface.
- Payment events.
- Delivery events.
- Order status history.
- Admin order management.
- Webhook validation structure.

Dependencies:

- Phase 8.

Deliverables:

- Provider-neutral state machines.
- Test adapters or local fakes clearly marked as non-production.
- Admin order status tools.

Definition of done:

- Core order logic is not tied to one provider.
- Webhook handlers validate signatures when real providers are added.
- No invented merchant credentials or promises.

Intentionally excluded:

- Live provider launch without verified business data and credentials.

## Phase 10: Admin Catalog And Imports

Goal: make catalog maintenance scalable and controlled.

Scope:

- Admin catalog CRUD.
- Attribute management.
- Image management.
- Price and inventory admin.
- Excel/CSV upload.
- Column mapping.
- Validation and normalization.
- Preview and approval.
- Apply and report.
- Audit logs.

Dependencies:

- Phase 3 and Phase 2.

Deliverables:

- Import batches and row-level errors.
- Duplicate detection.
- Reference uniqueness safeguards.
- Audit trail.
- Privacy-safe "frequently manually added watches" aggregate view when manual-watch data exists.

Definition of done:

- Invalid imports cannot partially mutate production data.
- Unknown attributes require review.
- Import reports are inspectable.
- User private notes/photos/documents are not exposed in catalog enrichment workflows.

Intentionally excluded:

- Supplier real-time sync.
- AI automatic cleanup.

## Phase 11: Content And SEO Tools

Goal: build controlled content and SEO operations.

Scope:

- Articles and guides.
- SEO metadata management.
- SEO landing pages.
- Sitemap generation.
- Robots and canonical policies.
- Internal linking controls.
- Orphan/thin page reporting baseline.

Dependencies:

- Phase 4 and Phase 10.

Deliverables:

- Content admin.
- SEO landing page admin.
- Sitemap pipeline.
- Metadata validation.

Definition of done:

- SEO landing pages are controlled entities.
- Filter combinations are not automatically indexed.
- Structured data is accurate.

Intentionally excluded:

- AI SEO assistant publication.

## Phase 12: Optional AI Capabilities

Goal: add AI assistance without changing core system dependencies.

Scope:

- Provider-neutral AI task interface.
- AI SEO assistant findings.
- Draft metadata and content suggestions.
- Admin review workflow.
- Optional Collection Intelligence explanation polishing.
- Import mapping suggestions.

Dependencies:

- Phase 7 and Phase 11.

Deliverables:

- AI task and suggestion storage.
- Structured output validation.
- Admin approve/reject flow.
- Audit logs.

Definition of done:

- Disabling AI does not break core product.
- AI output is never published automatically.
- Private data restrictions are enforced.

Intentionally excluded:

- AI as recommendation source of truth.
- AI making authorization, order, payment, or delivery decisions.

## Dependency Summary

- Auth and RLS come before account, admin, User Watch Collection, orders, and private storage.
- Catalog domain comes before catalog UI, selection, Collection Intelligence recommendations, cart, and imports.
- User Watch Collection comes before Collection Intelligence.
- Cart and orders come before real provider integrations.
- Content/SEO tools come before AI SEO assistant.
- AI is last because it must assist mature workflows, not define them.
