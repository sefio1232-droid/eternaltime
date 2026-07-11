# Eternal Time Product Architecture

## Vision

Eternal Time is a premium watch product for the full ownership cycle: discovery, selection, comparison, purchase, personal collection management, collection analysis, and future collection development. It is not only an online store. The catalog is the central product surface, but the long-term value comes from helping a user understand watches and their own preferences.

The approved cross-product journey, visual-density constraints, Candidate model, CTA architecture, and implementation order are recorded in `docs/PRODUCT_JOURNEY_REVIEW.md`.

The primary loop is:

1. A person studies watches.
2. They clarify their preferences.
3. They receive structured help with selection.
4. They compare concrete watch references.
5. They buy a watch.
6. They add watches to a User Watch Collection.
7. Eternal Time analyzes the User Watch Collection.
8. The system identifies stable preferences and gaps.
9. The system suggests logical directions for collection development.
10. The user returns to select the next watch.

This loop is not a required funnel. A user may enter through an article, Brand, watch page, Selection Session, Candidate workspace, or User Watch Collection. Each surface should preserve context and offer one natural next-best action.

## Product Principles

- Premium, calm, and trustworthy: no noisy marketplace behavior, fake urgency, or unsupported commercial promises.
- Informational and commercial data are separate: a watch can exist in the catalog even when it is not currently for sale.
- Ownership is separate from shopping: a user-owned watch may be bought through Eternal Time, bought elsewhere, or manually entered.
- Recommendations must be explainable. Users should understand why a model is suggested.
- Core product value must work without AI.
- SEO is strategic but controlled. Do not generate indexable pages for every arbitrary filter combination.
- MVP should be achievable by one project team without premature microservices.

## Primary User Flows

### Discover And Learn

Users browse brand, Brand Collection, category, guide, and article pages. They can use search, filters, Editorial Selections, and comparison to understand differences between watches.

### Select

Users can start a selection session by answering structured questions about budget, wrist size, use cases, style, mechanism preference, durability, and User Watch Collection context. The first version uses deterministic rules and catalog attributes.

### Compare

Users compare selected Manufacturer References by first-class attributes: dimensions, mechanism, material, water resistance, functions, price, availability, and subjective positioning. Comparison must remain shareable and restorable.

### Consider

Users maintain one Candidate workspace between casual interest and purchase intent. Candidate items can be saved, actively considered, or marked as finalists. MVP does not create a separate Wishlist/Favorites product alongside Candidates.

### Purchase

Users add a current catalog offer to a cart, proceed through checkout, provide contact and delivery information, choose available payment and delivery options, and receive an immutable order snapshot.

Cart contains immediate purchase intent and references Catalog Offers. Candidate items reference Manufacturer References and remain valid when commercial offers change.

### Own

Users maintain a private User Watch Collection. Each User Watch can link to a Manufacturer Reference or exist as a manual entry with user-entered display data and normalized analysis traits. Users can store notes, acquisition data, condition, set contents, service history, photos, and private documents.

Manual add must start with a simple Quick Add flow, not an administrative catalog form. A user should be able to add a watch with only a display name/nickname, then enrich details progressively.

### Develop Collection

Collection Intelligence creates a profile, detects overrepresented and underrepresented dimensions, builds recommendation scenarios, selects candidates from current catalog data, scores them, and explains the result.

## Catalog Experience

The catalog must support:

- Search by brand, Brand Collection, model, reference number, and textual content.
- Fast filters for common facets such as brand, Brand Collection, price, mechanism, dimensions, dial color, material, water resistance, style, use case, functions, and availability.
- Sorting by relevance, price, newest, popularity, and controlled editorial order where appropriate.
- Pagination or cursor-based loading that remains SEO-compatible.
- Brand, Brand Collection, model, reference, category, and Editorial Selection landing pages.
- Candidate saving, recently viewed watches, comparisons, and entry points to Selection Sessions.

The catalog should not treat price, stock, and delivery date as part of the immutable watch description.

## Watch Page Experience

A watch page should eventually include:

- Brand, Brand Collection, model, reference number, display name, and canonical URL.
- Gallery, main image, descriptive attributes, price, previous price if valid, availability, and delivery estimate when verified.
- Mechanism information, dimensions, wrist-fit explanation, water-resistance explanation, set contents, originality, and pre-shipment inspection process.
- Candidates, comparison, similar watches, alternatives in budget, watches with different character, related articles, FAQ, and structured data.
- A future non-AI feature: "How will these watches fit into my collection?"

## User Watch Collection Experience

The User Watch Collection area is a core module, not a saved-products list. It must support:

- Watches bought through Eternal Time.
- Catalog watches bought elsewhere.
- Manual watches not present in the catalog.
- Normalized analysis traits for manual watches so they participate in Collection Intelligence without becoming public catalog records.
- Quick Add with minimal required fields.
- Progressive enrichment prompts that improve Collection Intelligence quality.
- Matching and reconciliation when a manual watch later appears in the catalog.
- Service history such as movement service, battery replacement, water-resistance test, accuracy check, strap replacement, and custom events.
- Private photos and documents with signed access.
- Optional future public User Watch Collection pages with explicit opt-in.

Private data must never become public by default.
User watch photos must never become catalog images automatically.

Implementation status:

- `/collection` is the authenticated ownership center with a useful unauthenticated entry state.
- Users can add an existing published Manufacturer Reference from Watch Detail or create a manual User Watch through minimal Quick Add.
- User Watch detail supports nickname/display name, ownership status, acquisition date/price/currency/source, personal note, private photo, and soft deletion.
- Manual watches remain independent from public catalog identity and create private raw source data plus an empty analysis-traits foundation.
- Service history, documents UI, matching/reconciliation UI, Collection Profile, gaps, and recommendations remain planned.

## Collection Development Loop

The loop is deterministic in the base product:

1. Normalize User Watch entries into comparable dimensions.
2. Compute a Collection Profile.
3. Detect stable preferences and repeated patterns.
4. Detect gaps by use case, style, size, mechanism, color, material, brand geography, and price segment.
5. Choose recommendation scenarios.
6. Query eligible catalog candidates.
7. Score candidates.
8. Explain the recommendation in user-safe text.
9. Recalculate when the User Watch Collection or catalog changes.
10. Use softer wording or ask for enrichment when profile completeness is low.

AI may later improve wording or draft explanations, but it must not be required for the recommendation engine to function.

## Smart Selection

Smart selection is a guided decision workflow, not a chat-only AI feature. It should collect structured preferences, compare them with catalog data, and return explainable candidates. It can use previous Candidate Items, comparisons, and Collection Profile when the user is authenticated and has consented to use that context.

## Purchase Flow

The checkout architecture must support:

- Guest cart and authenticated user cart.
- Merging guest cart after login.
- Promo codes.
- Contact data and addresses.
- Delivery method abstraction.
- Payment method abstraction.
- Immutable order item snapshots.
- Order status history.
- Payment and delivery events.
- Idempotent Checkout Session to Order creation.
- Price, orderability, inventory evidence, and delivery revalidation before Order creation.

Existing orders must remain accurate even if catalog text, images, prices, or availability change later.

## Post-Purchase Experience

After purchase, a user should be able to:

- Track the order.
- See the order details and immutable purchased item snapshot.
- Add the purchased watch to their User Watch Collection.
- Attach private documents and photos.
- Record future service events.
- Receive Collection Intelligence analysis that includes the newly owned watch.

Creating ownership from a delivered Order Item is user-confirmed and idempotent. Returned items, gifts, and undelivered orders must not become User Watches automatically.

## MVP Boundaries

MVP should include:

- Application foundation with strict TypeScript and App Router.
- Supabase Auth, profiles, role model, and RLS baseline.
- Catalog domain model and database migrations.
- Public catalog listing and watch pages.
- Controlled filters and SEO-safe URLs.
- Candidates, recently viewed, comparisons, and Selection Sessions.
- User Watch Collection with manual and catalog-linked watches.
- Rule-based Collection Intelligence.
- Cart, checkout skeleton, orders, and provider adapter boundaries.
- Admin tools for catalog, imports, content, SEO metadata, and audit logs.

MVP should not include:

- Microservices.
- AI as a required backend.
- Real payment or delivery integrations without verified provider credentials.
- Automatically generated SEO pages for arbitrary filters.
- Public User Watch Collections unless the private collection model is already stable.

## Post-MVP Functions

- Public opt-in User Watch Collection pages.
- Advanced collection recommendation scenarios.
- AI SEO assistant with draft and approval workflow.
- Content gap detection.
- Deeper service history reminders.
- Supplier-level inventory and offer management.
- Real payment provider integration.
- Real delivery provider integration.
- Advanced personalization and notification settings.
