# Manual User Watches Architecture

Manual User Watches are a critical Eternal Time scenario. A user must be able to maintain a User Watch Collection even when Eternal Time has never sold the watch and does not yet have it in the public catalog.

Manual user input must not automatically create public catalog records, product pages, catalog images, or factual catalog specifications.

## Core Lifecycle

```text
Add watch
  -> search public catalog
  -> if found: create User Watch linked to watch_reference
  -> if not found: Quick Add manual User Watch
  -> optional progressive enrichment
  -> deterministic normalization
  -> Collection Intelligence participation
  -> matching against catalog/provisional identities
  -> optional reconciliation when catalog reference appears
```

## Product Principles

- User Watch Collection must work independently from catalog size.
- Manual User Watches are ownership records, not catalog records.
- Raw user input and normalized analysis traits are different data.
- Unknown values remain unknown. The system must not invent characteristics.
- AI may suggest classifications later, but AI is not a source of truth.
- User photos remain user-owned and private by default.
- Matching and reconciliation must be non-destructive and reversible.
- Aggregated manual-watch signals may help catalog enrichment, but only through privacy-safe statistics.

## Quick Add UX

The manual form must not feel like an admin product editor.

Flow:

```text
Add watch
  -> catalog search
  -> results
  -> "Do not see your watch?"
  -> Quick Add
  -> optional Add Details
  -> collection item created
  -> enrichment prompts if useful
```

### Minimal Required Fields

Required for manual Quick Add:

- User Watch Collection ID.
- A user-visible watch name. This can be typed directly or generated from any entered brand/model text.

This means a user can add "Grandfather's vintage watch" even if brand, model, and reference are unknown.

### Quick Add Fields

Quick Add should include:

- Display name or nickname.
- Brand free text, optional but encouraged.
- Model/name free text, optional.
- Reference number free text, optional.
- Photo upload, optional.
- Acquisition/source note, optional.

### Add Details Fields

Progressive enrichment may ask for:

- Approximate year or period.
- Movement type.
- Case diameter.
- Dial color.
- Bracelet/strap type.
- Case material.
- Water resistance if known.
- Functions/complications.
- Style/use case tags if the user is comfortable choosing them.

The product should phrase this as improving analysis quality, not as a mandatory technical form.

## Raw User Data vs Normalized Analysis Data

### Raw User Data

Raw user data is private ownership data. It preserves what the user typed or uploaded.

Examples:

- `custom_brand_name`: "Rolex", "Rlx", "Dad's old watch", or unknown.
- `custom_model_name`: "Submariner", "vintage diver", free text.
- `custom_reference`: "126610LN", "ABC-123", or unknown.
- `custom_display_name`: "My black diver".
- `approximate_year_or_period`: "1970s", "2021", "unknown".
- Raw movement text.
- Raw case size text.
- Raw dial color text.
- Raw attachment text.
- Raw material text.
- Raw water resistance text.
- User title, notes, story, condition, photos, documents, service history.

Raw data is not normalized by itself and is not automatically promoted into public catalog facts.

### Normalized Analysis Data

Normalized analysis data is private structured data used by Collection Intelligence.

Examples:

- `movement_type = automatic`.
- `dial_color_family = dark`.
- `attachment_type = steel_bracelet`.
- `case_size_band = medium`.
- `material_family = steel`.
- `style_scores = { sport: 0.7, smart_casual: 0.3 }`.
- `use_case_scores = { everyday: 0.6, swimming: 0.4 }`.
- `functions = [date, gmt]`.
- `brand_identity_status = free_text_only | provisional_identity | catalog_brand`.

Normalized traits can be derived deterministically from controlled user input, inherited from a linked `watch_reference`, accepted from a suggestion, or left unknown.

## Data Provenance Model

Each normalized trait needs provenance and confidence. Provenance is per trait, not only per row.

Recommended source priority for analysis:

1. User-confirmed override on the User Watch.
2. Verified catalog fact from linked `watch_reference`.
3. Accepted deterministic mapping from controlled user input.
4. Accepted admin/catalog specialist correction.
5. Accepted AI/enrichment suggestion.
6. Pending suggestion.
7. Unknown.

Conceptual per-trait metadata:

```ts
type TraitSource =
  | "user_confirmed"
  | "catalog_verified"
  | "deterministic_mapping"
  | "admin_corrected"
  | "ai_suggested_pending"
  | "user_free_text"
  | "unknown";

interface TraitProvenance {
  source: TraitSource;
  confidence: number; // 0..1
  acceptedBy?: "user" | "admin" | "system";
  acceptedAt?: string;
  evidence?: string[];
}
```

### Who Can Change Traits

- User: can edit their own manual traits and reject/accept suggestions for private analysis.
- Application: can apply safe deterministic mappings such as controlled movement type or direct color family mapping.
- Admin/catalog specialist: can correct catalog facts or shared provisional identity facts through admin workflows.
- AI/enrichment service: can only create pending suggestions.

### Correcting Bad Classification

A user can:

- Edit a trait.
- Mark "this does not describe my watch".
- Reject a match suggestion.
- Unlink from a catalog reference.
- Keep personal overrides after linking.

Corrections should update the User Watch Collection version so Collection Intelligence can recalculate.

## Deterministic Normalization Without AI

Manual watches participate in analysis without AI by mapping known facts only.

Examples:

- `movement_type = automatic` contributes to movement distribution.
- Raw/controlled `dial_color = black` maps to `dial_color_family = dark`.
- `attachment = steel_bracelet` contributes to attachment and material dimensions.
- `case_diameter_mm = 40` contributes to size band.
- `water_resistance_m = 200` contributes to water-ready evidence.

Do not infer too much:

- Automatic + black dial + steel bracelet is not enough to declare the watch formal or sport.
- Sport/business/formal scores need enough evidence from watch type, water resistance, dimensions, functions, style tags, or accepted classification.
- Unknown fields remain unknown and reduce profile completeness.

## Trait Completeness And Confidence

Each User Watch contributes partially:

- Known movement contributes to movement profile.
- Known dial color contributes to color profile.
- Unknown size does not contribute to size profile.
- Low-confidence style classification should not drive strong recommendations.

Collection-level metrics:

- `profile_completeness`: ratio of available useful traits across collection items.
- `trait_coverage_by_dimension`: coverage for style, use case, movement, size, color, material, functions.
- `manual_watch_ratio`: share of manual watches.
- `low_confidence_trait_ratio`: share of traits below confidence threshold.

If profile completeness is low, recommendations should use softer wording and may ask for enrichment instead of making strong claims.

## Provisional Watch Identity Registry

### Compared Options

Option A: every manual User Watch is fully independent.

- Lowest MVP complexity.
- Strong privacy.
- Poor deduplication.
- Repeats the same normalized factual traits many times.
- Weak admin catalog enrichment signals.

Option B: internal non-public watch identity for recognized same manual watches.

- Reduces duplication.
- Helps future reconciliation.
- More complexity and privacy responsibility.

Option C: provisional watch identity registry.

- A small internal registry for frequently or confidently matched manual watches.
- Not public catalog.
- Stores normalized identity keys, aggregate counts, and optional reviewed shared traits.
- Supports matching/reconciliation without pretending to be a complete global watch database.

Option D: aggregate-only reports.

- Minimal privacy risk.
- Useful for admin signals.
- Does not help users reconcile when catalog references appear later.

### Final MVP Decision

Use independent User Watches plus a lightweight non-public `provisional_watch_identities` registry.

The registry is not required for Quick Add. It is created only when matching reaches a useful confidence threshold or repeated manual entries justify aggregation.

It stores:

- Normalized brand text/key.
- Normalized reference text/key when available.
- Normalized model text/key.
- Optional brand/line hints.
- Match confidence.
- Aggregate counts.
- Reviewed shared traits only when admin/catalog specialist has approved them.
- Link to `watch_reference_id` when later reconciled.

It must not store private notes, photos, documents, acquisition data, service history, or user stories.

This keeps MVP practical while preventing a dead end when hundreds of users add the same missing reference.

## Matching And Deduplication

Matching tries to connect a manual User Watch with:

- Existing `watch_references`.
- Existing `provisional_watch_identities`.
- A `watch_reference` added later.

Signals:

- Normalized brand.
- Manufacturer reference number.
- Normalized reference number.
- Model name.
- Brand Collection/Brand Line if known.
- Known aliases.
- Existing provisional identity keys.

Manufacturer reference has high weight, but it can be mistyped. Brand+reference exact match is stronger than reference alone.

### Matching Confidence

Recommended statuses:

- `confirmed`: user/admin accepted link.
- `exact_candidate`: strong normalized brand + reference match.
- `high_confidence_candidate`: strong brand/model/reference evidence, minor formatting differences.
- `possible_candidate`: plausible but needs confirmation.
- `ambiguous`: multiple plausible targets.
- `no_match`: no useful candidate.
- `rejected`: user/admin rejected this match.

No destructive automatic merge is allowed for ambiguous or merely possible matches.

### Automatic Actions

Allowed automatically:

- Safe deterministic normalization of user-controlled fields.
- Create a possible match candidate.
- Group into provisional identity when confidence is high enough and no private data is copied.
- Link to catalog only if the match is exact enough and product policy allows, otherwise ask confirmation.

Not allowed automatically:

- Create public catalog reference.
- Replace user raw data.
- Delete manual values.
- Use user photos as catalog images.
- Merge ambiguous matches.

## Catalog Reconciliation

Critical scenario:

1. User creates manual User Watch.
2. User adds notes, photos, documents, service records, acquisition data.
3. Months later, Eternal Time adds the matching `watch_reference`.
4. Matching process creates a link suggestion.
5. User or admin confirms the link depending on confidence and workflow.

After confirmed linking:

- `user_watches.watch_reference_id` is set.
- Raw manual data remains preserved.
- Ownership data remains preserved.
- Photos, documents, service history, notes, condition, acquisition data remain user-owned.
- Display can prefer catalog specs for factual fields while still showing user nickname and personal fields.
- User-specific trait overrides remain possible.

The User Watch never migrates into the catalog. It remains an ownership entity.

### Conflict Resolution

Example conflict:

- User raw case diameter: `42 mm`.
- Verified catalog reference: `40 mm`.

Source priority for factual analysis:

1. User-confirmed override for their own watch if they intentionally say their item differs.
2. Verified catalog fact from linked `watch_reference`.
3. Accepted deterministic/private trait.
4. Accepted suggestion.
5. Raw user text.
6. Unknown.

Behavior:

- Preserve the original user value.
- Use verified catalog data for default Collection Intelligence if the link is confirmed.
- Show a conflict/caveat in the watch detail enrichment state.
- Let the user choose "this is not my watch" and unlink.
- Let the user keep a personal override for analysis if their watch truly differs.

Unlinking:

- Clears `watch_reference_id`.
- Preserves raw data, photos, service history, documents, and manual traits.
- Recalculates Collection Intelligence using manual traits.

## Photos

Catalog images and user photos are separate.

Catalog reference images:

- Belong to `watch_references`.
- Public when catalog reference is published.
- Managed through catalog/admin workflows.

User watch photos:

- Belong to `user_watches`.
- Private by default.
- Stored in private user storage.
- May be shown in future public User Watch Collection only by explicit per-photo/per-watch visibility.
- Must never become catalog images automatically, even after reconciliation.

## Admin And Catalog Enrichment Signals

Manual watches can produce privacy-safe catalog enrichment signals:

- Count of similar normalized brand/reference/model entries.
- Number of users who added a missing reference.
- Trend over time.
- Match confidence distribution.
- Missing catalog candidate list.

Admin must not see:

- Private notes.
- Documents.
- User photos.
- Acquisition details.
- Service history.
- Personal stories.
- Addresses or order data.

Admin workflow:

```text
aggregated signal
  -> catalog specialist review
  -> normal catalog import/create workflow
  -> validated watch_reference
  -> matching suggestions to affected User Watches
```

There should not be a one-click "publish this user watch as catalog product" action.

## Data Model Review

Current model is close but needs clearer separation and matching support.

Recommended MVP entities:

- `user_watches`: ownership record, linkable to `watch_references`.
- `user_watch_source_data`: private raw user-entered watch facts, one row per User Watch.
- `user_watch_analysis_traits`: private normalized analysis traits, one row per User Watch with per-trait provenance/confidence metadata.
- `provisional_watch_identities`: internal non-public identity registry for repeated or confidently recognized missing watches.
- `user_watch_match_candidates`: non-destructive match suggestions between User Watches, provisional identities, and catalog references.
- Existing collection analysis/recommendation snapshot tables remain valid.

Avoid for MVP:

- A full global watch database.
- Public catalog references created from user data.
- Separate tables for every possible trait provenance.
- Automatic destructive merge.

## Scenario 1: Unknown Watch Without Reference Number

User action:

- User searches catalog and finds no result.
- User uses Quick Add: "Grandfather's steel watch".
- Optional photo uploaded.
- No reference number.

Stored data:

- `user_watches` row with no `watch_reference_id`.
- `user_watch_source_data` stores display name and any raw text.
- User photo stored as private user watch photo.

Normalized traits:

- Unknown brand, model, reference.
- Any user-selected controlled traits are stored; otherwise unknown.
- Completeness is low.

Collection Intelligence behavior:

- Uses known traits only.
- Does not infer style/use case without evidence.
- Profile completeness decreases.
- Recommendation copy uses softer wording.

Matching behavior:

- No exact match.
- Possible image-based or AI matching is future-only and suggestion-based.
- No provisional identity unless enough normalized text or repeated pattern exists.

Future reconciliation:

- If user later adds brand/reference or catalog reference appears and matching becomes possible, create a match candidate.

## Scenario 2: Exact Reference Missing From Catalog

User action:

- User enters Brand: "Rolex".
- Model: "Submariner".
- Reference: "126610LN".
- Catalog has no matching `watch_reference`.

Stored data:

- `user_watches` without `watch_reference_id`.
- `user_watch_source_data` stores raw brand/model/reference.
- Normalized brand/reference keys are generated for matching.

Normalized traits:

- Deterministic traits can be applied only from user-provided controlled fields.
- If user selects automatic, black dial, steel bracelet, those traits contribute.
- Official specs are not invented.

Collection Intelligence behavior:

- Known traits contribute.
- Unknown dimensions remain unknown.
- Recommendations avoid claims requiring missing evidence.

Matching behavior:

- Exact or high-confidence provisional identity can be created from normalized brand+reference.
- Existing provisional identity is reused if present.

Future reconciliation:

- When `watch_reference` is added, create high-confidence link suggestion.
- Confirmed link sets `watch_reference_id` without losing user data.

## Scenario 3: Many Users Add Same Missing Model

User action:

- 300 users manually enter Example Brand, Diver 300, ABC-123.

Stored data:

- 300 separate `user_watches` remain user-owned.
- Each has private raw source data and ownership data.
- A non-public `provisional_watch_identities` row may represent normalized Example Brand + ABC-123.

Normalized traits:

- Shared reviewed traits can live on provisional identity only after admin/catalog specialist review.
- User-specific overrides remain on each User Watch.

Collection Intelligence behavior:

- Each user collection uses that user's accepted traits.
- If shared reviewed provisional traits exist and user has not overridden them, they can improve completeness.

Matching behavior:

- New similar manual watches match provisional identity.
- Admin sees aggregate count and confidence, not private data.

Future reconciliation:

- If catalog reference is created, provisional identity links to `watch_reference`.
- Affected User Watches receive link suggestions or automatic exact-link candidates based on policy.

## Scenario 4: Manual Watch Later Appears In Public Catalog

User action:

- User added a manual watch months ago.
- Later Eternal Time creates `watch_reference` for the same manufacturer reference.

Stored data:

- Existing `user_watches` row stays.
- Raw source data, notes, photos, documents, and service history stay unchanged.
- Match candidate is created.

Normalized traits:

- Before confirmation: manual/provisional traits continue.
- After confirmation: catalog verified traits become default source for factual dimensions.
- User-confirmed overrides can remain.

Collection Intelligence behavior:

- Recalculates after linking.
- Uses verified catalog facts where appropriate.
- Preserves user-specific overrides and ownership context.

Matching behavior:

- Brand+reference exact match becomes high-confidence or exact candidate.
- User can confirm or reject.

Future reconciliation behavior:

- Confirmed link sets `watch_reference_id`.
- User can unlink later if wrong.

## Scenario 5: Wrong Link Suggested

User action:

- System suggests linking a manual watch to a wrong `watch_reference`.
- User chooses "not my watch".

Stored data:

- Match candidate status becomes `rejected`.
- User Watch remains manual.
- Raw data and manual traits remain unchanged.

Normalized traits:

- Continue using user-entered/accepted traits.
- Rejected catalog traits are not used.

Collection Intelligence behavior:

- No destructive recalculation from wrong catalog facts.
- Profile may remain partial.

Matching behavior:

- The rejected candidate is suppressed for that User Watch.
- Other candidates may appear if evidence changes.

Future reconciliation behavior:

- User can later link to a different reference.
- Admin can review aggregate matching quality without seeing private user data.
