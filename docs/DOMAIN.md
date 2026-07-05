# Eternal Time Domain Model

This document defines the ubiquitous language for Eternal Time. Future code, database migrations, routes, and admin screens should use these terms consistently.

## Terminology Map

Use these terms precisely:

- `Brand Collection`: a brand-owned product family, such as PRX inside Tissot. Technical table: `brand_collections`.
- `Brand Line`: an optional subdivision inside a Brand Collection. Technical table: `brand_lines`.
- `User Watch Collection`: a user's private or opt-in public personal watch collection. Technical table: `user_watch_collections`.
- `Editorial Selection`: an admin-curated product/content selection, such as "watches under a verified budget". Technical table: `editorial_selections`.
- Avoid the bare term "collection" in architecture decisions unless the surrounding context makes the meaning impossible to confuse.

## Catalog Terms

### Brand

A watch brand or manufacturer-facing commercial brand, for example a brand under which watches are marketed. A Brand owns Brand Collections, Brand Lines, Watch Models, and Manufacturer References. Brand country is a property of the Brand, not of every concrete watch reference.

### Brand Collection

A named product family inside a Brand. It is the brand's own collection concept, not a user's personal collection and not an editorial selection. A Brand Collection can have Watch Models directly or through optional Brand Lines.

### Brand Line

An optional subdivision inside a Brand Collection. It exists only when the brand or catalog structure needs another hierarchy level. Do not force every Watch Model into a Brand Line.

### Watch Model

The informational model family. It groups closely related Manufacturer References that share identity, story, positioning, and design language. Example: "PRX Powermatic 80" as a family that contains multiple dial-color references.

A Watch Model can have an informational page when useful for SEO or education, but it is not the canonical product page for a concrete watch and does not own current price, inventory, Product structured data, or orderability.

### Manufacturer Reference

The concrete catalog watch identity for MVP Eternal Time. It is the official manufacturer reference number normalized under a Brand and usually identifies a specific factory configuration: dial color, case, bracelet/strap, movement, size, and function set.

The Manufacturer Reference is the canonical public watch page entity:

- It receives the canonical watch URL.
- It receives Product structured data when published and data is accurate.
- It owns factual specifications, images, descriptive copy, comparison identity, favorite identity, recently viewed identity, and Collection Intelligence candidate identity.
- It can exist as informational/catalog-only even when no active Catalog Offer exists.

Reference numbers are unique within a Brand after normalization. The system must not assume global uniqueness across all brands.

### Catalog Offer

The commercial offer to sell a Manufacturer Reference through Eternal Time. Offers own sale status, price source, current price, previous price when justified, availability, delivery estimate, purchase limits, and seller-facing state. A Manufacturer Reference may exist without an active offer.

If multiple commercial offers are needed for the same Manufacturer Reference, keep the identity in one Manufacturer Reference and represent seller/channel/condition/bundle differences as separate Catalog Offers. Do not create duplicate references for commercial state.

### Inventory

The current availability state for a Catalog Offer. Inventory changes independently from descriptive catalog data. It must not be stored on Watch Model or Manufacturer Reference as immutable data.

### Price

The commercial amount for a Catalog Offer at a point in time. Current price is query-optimized, while price history stores changes for audit, previous price validation, and order snapshot traceability.

## User Ownership Terms

### User Watch Collection

The private set of watches maintained by a user. It is not a Brand Collection. A user may later opt in to public visibility for selected safe fields.

### User Watch

One watch owned or tracked by a user. It can link to a Manufacturer Reference or be a manual watch with user-provided display data and normalized analysis traits. It owns personal name, acquisition data, source, condition, notes, set contents, service state, photos, and private documents.

Manual User Watches must not automatically create public catalog entries.

### User Watch Source Data

Private raw facts entered by the user about their own watch. Source data preserves user text and estimates such as brand, model, reference, period, raw case size, raw dial color, raw attachment, raw material, and raw water resistance. It is not normalized catalog data and must not be published as catalog facts.

### User Watch Analysis Traits

Normalized private traits used to include a User Watch in Collection Intelligence when catalog data is missing, incomplete, or intentionally overridden for analysis. These traits use the same controlled dictionaries as catalog references where possible: style, use case, movement type, dimensions, dial color family, material/strap type, brand country, and functions.

Analysis traits are user-owned data. They can be entered by the user through controlled fields, inferred from a linked Manufacturer Reference, or later suggested by AI as a reviewable suggestion. AI suggestions are not accepted as source of truth until user/admin confirmation depending on workflow.

### Provisional Watch Identity

An internal, non-public identity used to group repeated or high-confidence manual watches that are not yet in the public catalog. It is not a Manufacturer Reference, does not have a public page, and cannot be ordered. It can provide privacy-safe aggregate signals and future reconciliation hints.

### User Watch Match Candidate

A non-destructive suggestion that a User Watch may match a Manufacturer Reference or Provisional Watch Identity. Match candidates have confidence/status and can be confirmed, rejected, or left unresolved. They must not overwrite raw user data.

### Service Record

A user-owned event describing maintenance or modification of a User Watch. Examples: movement service, battery replacement, water-resistance test, accuracy check, strap replacement, polishing, or other user-defined service action.

### User Watch File

A private file attached to a User Watch, such as a receipt, warranty card, service document, or private photo. Public catalog image rules do not apply to these files.

## Intelligence Terms

### Collection Profile

A calculated snapshot of a User Watch Collection across dimensions such as style, use case, mechanism, dimensions, colors, materials, functions, brands, countries, and price segments. It is derived from User Watches using linked Manufacturer Reference traits and/or User Watch Analysis Traits.

### Collection Gap

An underrepresented or missing dimension detected by comparing the Collection Profile to typed rule definitions and balanced-collection heuristics. A gap is not automatically a defect; it becomes useful when it matches a user goal or reasonable next direction.

### Recommendation Scenario

A named, rule-based recommendation intent produced from the Collection Profile and gaps. Examples: add a dress-leaning daily watch, diversify dial colors, add a smaller case size, add a mechanical alternative, or cover travel use cases.

### Recommendation Candidate

A Manufacturer Reference selected from the current catalog as a possible answer to a Recommendation Scenario. It receives a score and explanation based on fit, diversity gain, overlap penalty, availability, budget, and user constraints.

### Collection Analysis Run

One execution of the Collection Intelligence pipeline. It has an input User Watch Collection version, algorithm version, generated profile, gaps, scenarios, candidates, and explainability text.

## Interaction Terms

### Selection Session

A structured user flow for finding watches. It stores answers, constraints, candidate results, and explanation. It may use a user's Collection Profile if the user is authenticated and the product flow allows it.

### Comparison

A saved set of Manufacturer References or order snapshots compared by a user or guest. Comparisons should store item identity and preserve enough context to restore the comparison later.

### Favorite

A saved Manufacturer Reference. Favorite is not ownership and does not imply cart intent.

### Recently Viewed

A lightweight record that a user or anonymous session viewed a Manufacturer Reference. It is used for navigation and personalization but should not become a sensitive behavioral profile without a retention policy.

## Commerce Terms

### Cart

A temporary set of intended purchases. A cart may belong to a guest session or a user. Guest carts can merge into a user cart after authorization.

### Cart Item

A selected Catalog Offer and quantity. It is not an immutable purchase record.

### Order

The immutable commercial record created from checkout. It owns buyer contact snapshot, address snapshot, selected delivery method snapshot, payment method snapshot, status, totals, and order items.

### Order Item

An immutable purchase snapshot of a Catalog Offer and Manufacturer Reference at checkout time. Later catalog edits must not change historical order item data.

### Payment

A provider-agnostic payment state machine and event stream related to an Order. It should not force a single provider into core order logic.

### Delivery

A provider-agnostic shipment or delivery state related to an Order. It can later connect to CDEK, Russian Post, courier providers, or other adapters.

## Content And SEO Terms

### Article

Editorial content such as guides, educational material, comparisons, and buying advice. Articles can link to brands, Brand Collections, Manufacturer References, Editorial Selections, and SEO landing pages.

### SEO Landing Page

A controlled, editorially approved page for a valuable search intent. It may represent a filter-like concept, but it is not an automatically indexed arbitrary filter URL.

### Editorial Selection

An admin-curated product/content selection. It can be commercial, editorial, or SEO-supporting. It is not a Brand Collection and not a User Watch Collection.

### SEO Metadata

Controlled metadata for indexable entities: title, description, canonical URL, robots policy, structured data settings, and internal linking hints.

## Boundary Rules

- A Brand Collection belongs to a Brand. A User Watch Collection belongs to a user. An Editorial Selection belongs to the content/catalog operation.
- A Watch Model is informational. A Manufacturer Reference is the canonical concrete watch identity. A Catalog Offer is commercial.
- Inventory and price describe current selling conditions and belong to Catalog Offers.
- A User Watch represents ownership and may or may not link to a Manufacturer Reference.
- Manual User Watches participate in Collection Intelligence through User Watch Analysis Traits, not through forced public catalog creation.
- User Watch Source Data is preserved across matching, linking, unlinking, and catalog reconciliation.
- Provisional Watch Identities are internal aggregation/reconciliation aids, not public catalog entities.
- Collection Intelligence operates on User Watches plus normalized catalog/reference/user traits.
- AI can assist with drafts, classification suggestions, and wording, but AI output is not a domain source of truth.
