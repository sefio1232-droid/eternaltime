# Eternal Time Database Architecture

The database is PostgreSQL on Supabase. The model is normalized around clear ownership boundaries: public catalog data, commercial selling state, user-owned private data, content/SEO data, and operational logs.

## Global Conventions

- Primary keys: `uuid` with generated defaults.
- Timestamps: `created_at`, `updated_at`; add `deleted_at` only where soft deletion is required.
- Public slugs: normalized lowercase strings with stable uniqueness constraints.
- Money: store integer minor units plus currency code.
- Reference numbers: store original display value and normalized value.
- RLS: enabled for user-owned, admin, operational, and private data tables.
- Admin actions: write audit logs for sensitive changes.

## Final Catalog Entity Hierarchy

MVP hierarchy:

```text
Brand
  -> Brand Collection
    -> Brand Line optional
      -> Watch Model
        -> Manufacturer Reference
          -> Catalog Offer
            -> Price / Inventory / Delivery estimate
```

Decisions:

- `watch_references` is the canonical concrete watch entity for MVP.
- There is no separate `watch_variants` table in MVP.
- Factual specifications, images, description, Product structured data, favorites, comparisons, recently viewed, and recommendation candidates attach to `watch_references`.
- Price and inventory attach to `catalog_offers`.
- Multiple offers can exist for one reference only when a real commercial need exists, such as different seller/channel/condition/bundle. They must not duplicate watch identity.

## Core Catalog Identity

### `brands`

Purpose: brand identity and brand-level metadata.

Important columns:

- `id`, `name`, `slug`, `country_code`, `description`, `status`.
- `seo_metadata_id` optional.

Relationships:

- Owns `brand_collections`, `brand_lines`, `watch_models`, `watch_references`.

Indexes and uniqueness:

- Unique `slug`.
- Unique normalized `name`.

RLS:

- Public read for published brands.
- Admin write only.

### `brand_collections`

Purpose: brand-owned product family. Not a User Watch Collection and not an Editorial Selection.

Important columns:

- `id`, `brand_id`, `name`, `slug`, `description`, `status`, `sort_order`.

Relationships:

- Belongs to `brands`.
- Can own `brand_lines` and `watch_models`.

Indexes and uniqueness:

- Unique `(brand_id, slug)`.
- Index `(brand_id, status)`.

RLS:

- Public read for published Brand Collections.
- Admin write only.

### `brand_lines`

Purpose: optional subdivision inside a Brand Collection.

Important columns:

- `id`, `brand_id`, `brand_collection_id`, `name`, `slug`, `description`, `status`.

Relationships:

- Belongs to brand and optionally Brand Collection.
- Can own `watch_models`.

Indexes and uniqueness:

- Unique `(brand_id, slug)`.
- Index `(brand_collection_id)`.

RLS:

- Public read for published Brand Lines.
- Admin write only.

### `watch_models`

Purpose: informational model family. It groups related Manufacturer References and can support an optional informational page.

Important columns:

- `id`, `brand_id`, `brand_collection_id`, `brand_line_id`.
- `name`, `slug`, `model_code`, `description`.
- `model_status`: `active`, `discontinued`, `archival`, `draft`.
- `positioning`, `release_year`, `discontinued_year`.
- `has_public_model_page` boolean.

Relationships:

- Belongs to brand, optional Brand Collection, optional Brand Line.
- Owns `watch_references`.

Indexes and uniqueness:

- Unique `(brand_id, slug)`.
- Index `(brand_id, model_status)`.
- Index `(brand_collection_id, model_status)`.

RLS:

- Public read for published/archival models.
- Admin write only.

### `watch_references`

Purpose: canonical concrete watch identity. It represents an official manufacturer reference and stores the factual watch configuration used by pages, filters, comparison, Collection Intelligence, and recommendations.

Important columns:

- `id`, `brand_id`, `watch_model_id`.
- `reference_code_display`.
- `reference_code_normalized`.
- `slug`, `display_name`.
- `status`: `draft`, `published`, `archival`, `hidden`.
- `reference_status`: `current`, `discontinued`, `catalog_only`, `unknown`.
- Descriptive fields: `short_description`, `description`, `movement_description`, `fit_description`, `water_resistance_description`, `set_contents_description`, `authenticity_description`.
- First-class searchable/filterable fields:
  - `movement_type_id`, `movement_id`.
  - `case_material_id`, `case_coating_id`, `case_shape_id`, `case_color_id`.
  - `dial_color_id`.
  - `crystal_type_id`.
  - `strap_material_id`, `bracelet_material_id`, `clasp_type_id`.
  - `case_diameter_mm`, `case_width_mm`, `lug_to_lug_mm`, `case_thickness_mm`, `lug_width_mm`, `weight_g`.
  - `water_resistance_m`.
  - `has_date`, `has_day_date`, `has_gmt`, `has_chronograph`, `has_tachymeter`, `has_world_time`, `has_alarm`, `has_stopwatch`, `has_timer`, `has_moon_phase`, `has_rotating_bezel`.
  - `brand_country_code`, `production_country_code`.
  - `data_confidence`: `verified`, `imported`, `partial`, `unknown`.

Relationships:

- Belongs to a Brand and usually a Watch Model.
- Has images, offers, styles, use cases, functions, and extendable attribute values.

Indexes and uniqueness:

- Unique `(brand_id, reference_code_normalized)` when reference code is present.
- Unique `(brand_id, slug)`.
- Index `(watch_model_id, status)`.
- B-tree indexes on high-use filters: movement type, case material, dial color, diameter, thickness, water resistance.
- GIN/trigram/search index through `catalog_search_documents`.

Reference uniqueness decision:

- Manufacturer reference numbers are unique within a Brand after normalization, not globally.
- Normalization removes whitespace, separators, case differences, and common formatting differences.
- If an import row has no reliable reference, it remains staged/unresolved and must not create a fake public reference.
- If rare evidence shows one reference maps to materially different factory configurations, document the exception before adding an extension model. Do not add `watch_variants` preemptively.

RLS:

- Public read for published/archival references.
- Admin write only.

## Canonical Public Watch Page Entity

`watch_references` owns the canonical public watch page:

- Canonical URL: `/watches/{brandSlug}/{referenceSlug}`.
- Product structured data: generated from `watch_references` plus current safe `catalog_offers` data when available.
- Images: `watch_images.watch_reference_id`.
- Factual specifications: `watch_references` first-class fields and controlled attribute values.
- Description: `watch_references` page copy.
- Price and inventory: `catalog_offers`, not `watch_references`.
- Sibling colors/configurations: other `watch_references` under the same `watch_model_id`.
- Breadcrumbs: Brand -> Brand Collection optional -> Watch Model optional -> Manufacturer Reference.
- Duplicate content control: model pages are informational summaries; reference pages are concrete product pages. A model page must not duplicate full reference specs for every sibling.

## Hybrid Attribute Architecture

The database uses three layers of attributes.

### First-Class Fields

First-class fields live on `watch_references` when they are:

- Used in common filters and sorting.
- Used in Collection Intelligence.
- Used in Recommendation Engine.
- Used in SEO pages and structured data.
- Critical to business logic or comparison.

First-class examples:

- Movement type, movement/caliber.
- Case size dimensions.
- Dial color.
- Case material and color.
- Strap/bracelet material.
- Crystal type.
- Water resistance.
- Core functions/complications booleans or normalized relation.
- Style and use case relations.
- Current/discontinued/catalog-only status.

### Normalized Relation Entities

Use normalized tables for controlled vocabularies and many-to-many facets:

- `movements`: caliber, manufacturer, power reserve, frequency, jewels, movement family.
- `movement_types`: automatic, manual, quartz, solar, radio controlled, hybrid, smart.
- `materials`: steel, titanium, ceramic, resin, gold, leather, rubber, textile, etc.
- `colors`: normalized color families plus display names.
- `crystal_types`: sapphire, mineral, acrylic, hardlex-like values when verified.
- `case_shapes`, `clasp_types`.
- `styles`: dress, sport, diver, field, pilot, classic, smart casual, etc.
- `use_cases`: daily, business, travel, swimming, outdoor, formal, collection piece.
- `functions`: date, day, GMT, chronograph, tachymeter, world time, alarm, stopwatch, timer, moon phase.
- Join tables: `watch_reference_styles`, `watch_reference_use_cases`, `watch_reference_functions`.

### Extendable Attributes

Use controlled extendable attributes for rare or evolving data:

- `attribute_definitions`: key, label, scope, value type, unit, allowed options, validation rule, filterability, SEO visibility, admin group.
- `attribute_options`: controlled options for enumerated attributes.
- `watch_reference_attribute_values`: reference, definition, typed value columns, source, confidence.

Rules:

- No free-form uncontrolled EAV for core data.
- Every attribute definition has an owner, type, validation rule, and review status.
- Attributes promoted to common filters or intelligence dimensions must move into first-class fields or normalized relations through a migration.
- Import cannot create new public attribute definitions automatically without admin approval.

## Commercial Catalog State

### `catalog_offers`

Purpose: current commercial offer for a Manufacturer Reference.

Important columns:

- `id`, `watch_reference_id`.
- `status`: `active`, `inactive`, `coming_soon`, `on_request`, `sold_out`.
- `offer_kind`: `standard`, `bundle`, `preorder`, `consignment`, `archival`.
- `condition`: `new`, `pre_owned`, `open_box` if these concepts are approved for the product.
- `current_price_minor`, `previous_price_minor`, `currency_code`.
- `inventory_state_id`.
- `delivery_estimate_id` optional.
- `seller_note`, `purchase_limit`, `is_visible`.

Relationships:

- Belongs to `watch_references`.
- Has price history and inventory events.

Indexes and uniqueness:

- Index `(watch_reference_id, status)`.
- Index `(status, current_price_minor)` for catalog filtering.
- MVP can enforce one active standard offer per reference; relax only when multiple offers become a real requirement.

RLS:

- Public read active/visible offer fields.
- Admin write only.

### `offer_price_history`

Purpose: price changes with audit context.

Important columns:

- `id`, `catalog_offer_id`, `price_minor`, `currency_code`, `valid_from`, `valid_to`, `reason`, `changed_by`.

RLS:

- Admin read/write. Public reads current price through `catalog_offers` only.

### `inventory_states`

Purpose: normalized availability state.

Important columns:

- `id`, `code`, `label`, `is_orderable`, `sort_order`.

Typical states:

- `in_stock`, `preorder`, `on_request`, `out_of_stock`, `archival`.

### `inventory_events`

Purpose: history of stock and availability changes.

Important columns:

- `id`, `catalog_offer_id`, `inventory_state_id`, `quantity_available`, `source`, `changed_at`.

RLS:

- Admin read/write. Public reads summarized state through offers.

## Images And Media

### `watch_images`

Purpose: public catalog images for Manufacturer References.

Important columns:

- `id`, `watch_reference_id`, `storage_bucket`, `storage_path`, `alt_text`, `sort_order`, `is_primary`, `status`.

RLS:

- Public read for published images.
- Admin write only.

### `content_images`

Purpose: public images for articles and SEO pages.

RLS:

- Public read when attached content is published.
- Admin write only.

## Categories And Editorial Selections

### `categories`

Purpose: controlled catalog navigation and SEO-safe category entities. Categories are not arbitrary filters; they are curated taxonomy nodes.

Important columns:

- `id`, `parent_id`, `slug`, `name`, `description`, `status`, `sort_order`, `seo_metadata_id`.
- `criteria_json` optional for rule-based membership.

Relationships:

- Can have child categories.
- Can connect to references through `category_references` or calculated criteria.

Indexes and uniqueness:

- Unique `(parent_id, slug)`.
- Index `(status, sort_order)`.

RLS:

- Public read for published categories.
- Admin write only.

### `category_references`

Purpose: explicit category membership when rules are not enough or editorial control is required.

Important columns:

- `category_id`, `watch_reference_id`, `sort_order`, `added_by`.

Uniqueness:

- Unique `(category_id, watch_reference_id)`.

### `editorial_selections`

Purpose: editorial or commercial product/content selections such as "best everyday watches" or "alternatives under a verified budget".

Important columns:

- `id`, `slug`, `title`, `description`, `status`, `selection_type`, `seo_metadata_id`.

Rules:

- Editorial Selections are admin-managed.
- They may be indexable only when SEO metadata and canonical policy are approved.

### `editorial_selection_items`

Purpose: ordered references or content items inside an Editorial Selection.

Important columns:

- `editorial_selection_id`, `watch_reference_id`, `article_id` nullable, `sort_order`, `editor_note`.

RLS:

- Public read for published selections.
- Admin write only.

## User Identity And Authorization

### `profiles`

Purpose: application profile linked to Supabase Auth user.

Important columns:

- `id` matching `auth.users.id`, `display_name`, `avatar_path`, `locale`, `created_at`.

RLS:

- User reads and updates own profile.
- Admin read through role checks.

### `roles` and `user_roles`

Purpose: role model for admin and operational permissions.

Important columns:

- `roles`: `id`, `code`, `description`.
- `user_roles`: `user_id`, `role_id`, `granted_by`, `granted_at`, `revoked_at`.

Indexes and uniqueness:

- Unique active `(user_id, role_id)` where `revoked_at is null`.

RLS:

- Users cannot grant roles to themselves.
- Admin role management requires server-side authorization.

### `addresses`

Purpose: user-owned address book and order address source.

Important columns:

- `id`, `user_id`, contact fields, address fields, `is_default`, `deleted_at`.

RLS:

- User owns rows.
- Orders store immutable address snapshots separately.

## User Watch Collection

### `user_watch_collections`

Purpose: user's private watch collection container and future public opt-in settings.

Important columns:

- `id`, `user_id`, `title`, `description`, `visibility`: `private`, `public`.
- `public_slug`, `public_description_enabled`, `published_at`.
- `collection_version` integer for analysis invalidation.

RLS:

- User owns collection.
- Public read only when explicitly public and only for public-safe fields.

### `user_watches`

Purpose: one watch owned or tracked by a user.

Important columns:

- `id`, `user_watch_collection_id`, `user_id`.
- `watch_reference_id` nullable.
- User-entered display data: `custom_brand_name`, `custom_model_name`, `custom_reference`, `custom_display_name`.
- `provisional_watch_identity_id` nullable.
- Ownership data: `user_title`, `acquired_at`, `acquisition_source`, `condition`, `personal_note`.
- Set data: `has_box`, `has_papers`, `has_warranty_card`, `has_extra_links`.
- `last_service_at`.
- `public_visibility`: `private`, `public_summary`, `public_full`.

Relationships:

- Belongs to User Watch Collection.
- Optionally links to Manufacturer Reference.
- Optionally links to an internal Provisional Watch Identity.
- Has raw source data, analysis traits, match candidates, service records, photos, files.

Indexes:

- `(user_id, watch_reference_id)`.
- `(provisional_watch_identity_id)`.
- `(user_watch_collection_id)`.

RLS:

- User owns all private fields.
- Public policies expose only opted-in public-safe fields.

### `user_watch_source_data`

Purpose: private raw user-entered facts for a User Watch. This preserves what the user typed or estimated and stays separate from normalized analysis traits.

Important columns:

- `id`, `user_watch_id`, `user_id`.
- `raw_brand_name`, `raw_model_name`, `raw_reference`, `raw_display_name`.
- `raw_year_or_period`, `raw_movement`, `raw_case_size`, `raw_dial_color`, `raw_attachment`, `raw_case_material`, `raw_water_resistance`, `raw_functions`.
- `source_json` for additional raw fields that are not yet first-class.
- `created_at`, `updated_at`.

Rules:

- Raw source data is user-owned and private.
- Raw source data is preserved when a User Watch links to or unlinks from `watch_references`.
- Raw source data is never promoted directly into public catalog facts.

RLS:

- User owns rows.
- Admin/support access requires explicit server-side authorization and must not expose private notes/documents.

### `user_watch_analysis_traits`

Purpose: normalized private traits that let manual User Watches participate in Collection Intelligence without adding them to the public catalog.

Important columns:

- `id`, `user_watch_id`, `user_id`.
- `normalization_status`: `empty`, `partial`, `confirmed`, `needs_review`.
- `movement_type_id`, `case_material_id`, `dial_color_id`, `strap_material_id`, `bracelet_material_id`, `attachment_type`.
- `case_diameter_mm`, `lug_to_lug_mm`, `case_thickness_mm`, `water_resistance_m`.
- `brand_country_code`, `production_country_code`.
- `style_scores_json`, `use_case_scores_json`, `function_codes_json`.
- `sport_score`, `business_score`, `smart_casual_score`, `formal_score`, `travel_score`, `everyday_score` where useful for query/reporting.
- `trait_provenance_json`: per-trait source/evidence/actor.
- `trait_confidence_json`: per-trait confidence.
- `completeness_score`, `analysis_confidence`.
- `data_confidence`: `verified`, `user_confirmed`, `deterministic`, `suggested`, `partial`, `unknown`.
- `notes`.

Relationships:

- Belongs to `user_watches`.
- Can use join tables `user_watch_trait_styles`, `user_watch_trait_use_cases`, `user_watch_trait_functions`.

Rules:

- For linked watches, traits default from `watch_references`.
- For manual watches, traits come from controlled user input.
- User display fields and analysis traits are different data. A free-text brand name is not automatically a normalized Brand.
- AI-assisted classification may write pending suggestions only; it cannot silently become accepted trait data.
- Provenance is per trait. A single row-level source is insufficient.
- Unknown values remain unknown and do not contribute to that profile dimension.

RLS:

- User owns rows.
- Not public by default.

### `provisional_watch_identities`

Purpose: internal non-public registry for repeated or high-confidence manual watches missing from the public catalog. This is an aggregation and reconciliation aid, not a catalog entity.

Important columns:

- `id`.
- `normalized_brand_key`, `normalized_model_key`, `normalized_reference_key`.
- `display_label`.
- `status`: `candidate`, `reviewed`, `linked_to_catalog`, `rejected`.
- `watch_reference_id` nullable when reconciled to public catalog.
- `aggregate_count`, `last_seen_at`.
- `shared_traits_json` nullable, only after admin/catalog specialist review.
- `shared_traits_provenance_json`.
- `created_at`, `updated_at`.

Indexes and uniqueness:

- Index normalized brand/reference/model keys.
- Partial unique key can be used for high-confidence brand+reference identities.

Rules:

- No public page.
- No orderability.
- No user photos, documents, notes, service history, acquisition data, or personal stories.
- Can become a catalog enrichment signal, but public catalog creation must use normal catalog workflow.

RLS:

- Not public.
- Admin/catalog read for aggregate review.
- User access only through match/reconciliation results relevant to their own User Watch.

### `user_watch_match_candidates`

Purpose: non-destructive matching suggestions between a User Watch and either a `watch_reference` or `provisional_watch_identity`.

Important columns:

- `id`, `user_watch_id`, `user_id`.
- `candidate_type`: `watch_reference`, `provisional_watch_identity`.
- `watch_reference_id` nullable.
- `provisional_watch_identity_id` nullable.
- `match_status`: `suggested`, `confirmed`, `rejected`, `ambiguous`, `expired`.
- `match_confidence`: `exact_candidate`, `high_confidence_candidate`, `possible_candidate`, `ambiguous`, `no_match`.
- `score`, `signals_json`, `created_at`, `resolved_at`, `resolved_by`.

Rules:

- Matching is non-destructive.
- Ambiguous matches require confirmation.
- Rejected matches should not be repeatedly suggested without new evidence.
- Confirmed catalog match may set `user_watches.watch_reference_id`; it must not delete source data, photos, documents, notes, or service records.

RLS:

- User can see/resolve own match candidates.
- Admin/catalog can see privacy-safe aggregate matching data.

### `service_records`

Purpose: service history for user watches.

Important columns:

- `id`, `user_watch_id`, `service_type`, `service_date`, `provider_name`, `notes`, `cost_minor`, `currency_code`, `next_due_at`.

RLS:

- User owns rows.
- Not public by default.

### `user_watch_files`

Purpose: private documents and private photos attached to user watches.

Important columns:

- `id`, `user_watch_id`, `owner_user_id`, `file_kind`, `storage_bucket`, `storage_path`, `mime_type`, `size_bytes`, `original_filename`.

RLS:

- User owns rows.
- Signed URL generation only through server-side authorization.

## Collection Intelligence

### `collection_analysis_runs`

Purpose: versioned execution record for Collection Intelligence.

Important columns:

- `id`, `user_watch_collection_id`, `user_id`, `analysis_version`, `collection_version`, `status`, `started_at`, `completed_at`.

RLS:

- User reads own runs.
- System/admin may create through server code.

### `collection_profile_snapshots`

Purpose: cached derived profile for an analysis run.

Important columns:

- `id`, `analysis_run_id`, `profile_json`, `dimension_scores_json`, `profile_completeness`, `analysis_confidence`, `low_confidence_dimensions_json`, `summary_text`.

RLS:

- User reads own.

### `collection_gaps`

Purpose: detected gaps from a profile.

Important columns:

- `id`, `analysis_run_id`, `gap_type`, `dimension`, `severity`, `evidence_json`, `explanation`.

### `recommendation_results`

Purpose: scenario-level recommendation output.

Important columns:

- `id`, `analysis_run_id`, `scenario_code`, `rule_id`, `rule_version`, `priority`, `severity`, `scenario_confidence`, `minimum_evidence_met`, `title`, `explanation`, `candidate_constraints_json`, `status`.

### `recommendation_candidates`

Purpose: candidate references and scoring details.

Important columns:

- `id`, `recommendation_result_id`, `watch_reference_id`, `score`, `score_breakdown_json`, `reason_text`.

Indexes:

- `(recommendation_result_id, score desc)`.

## User Behavior

### `favorites`

Purpose: user-saved Manufacturer References.

Important columns:

- `user_id`, `watch_reference_id`, `created_at`.

Uniqueness:

- Unique `(user_id, watch_reference_id)`.

RLS:

- User owns rows.

### `recently_viewed`

Purpose: recent reference views for user or guest session.

Important columns:

- `user_id` nullable, `session_id` nullable, `watch_reference_id`, `viewed_at`.

Retention:

- Define retention during implementation.

### `comparisons` and `comparison_items`

Purpose: saved comparison sets.

Important columns:

- `comparisons`: owner user/session, title, status.
- `comparison_items`: comparison, watch reference, sort order.

RLS:

- User/session scoped.

### `selection_sessions`

Purpose: structured smart selection flow.

Important columns:

- `id`, `user_id` nullable, `session_id`, `answers_json`, `constraints_json`, `status`, `created_at`.

### `selection_session_results`

Purpose: deterministic selection candidates and explanations.

Important columns:

- `selection_session_id`, `watch_reference_id`, `score`, `score_breakdown_json`, `reason_text`.

## Cart And Orders

### `carts`

Purpose: guest or user cart.

Important columns:

- `id`, `user_id` nullable, `session_id` nullable, `status`, `merged_into_cart_id`.

Indexes:

- Active cart by `user_id` or `session_id`.

RLS:

- User/session scoped through server-managed access.

### `cart_items`

Purpose: selected offer and quantity.

Important columns:

- `id`, `cart_id`, `catalog_offer_id`, `quantity`, `added_at`.

Validation:

- Cart item must reference an orderable offer at checkout time.

### `orders`

Purpose: immutable commercial order record.

Important columns:

- `id`, `user_id` nullable, `order_number`, `status`, `payment_status`, `delivery_status`.
- `buyer_snapshot_json`, `delivery_address_snapshot_json`, `delivery_method_snapshot_json`, `payment_method_snapshot_json`.
- `subtotal_minor`, `discount_minor`, `delivery_minor`, `total_minor`, `currency_code`.

Indexes and uniqueness:

- Unique `order_number`.
- Index `(user_id, created_at desc)`.

RLS:

- User reads own orders.
- Admin read/write status through server authorization.

### `order_items`

Purpose: immutable purchase snapshot.

Important columns:

- `id`, `order_id`, `catalog_offer_id`, `watch_reference_id`.
- `item_snapshot_json`: brand, Brand Collection, model, reference, attributes, image, offer state.
- `unit_price_minor`, `quantity`, `total_minor`, `currency_code`.

Rule:

- Do not recompute historical order item display from mutable catalog tables.

### `order_status_history`

Purpose: audit trail of order state changes.

Important columns:

- `order_id`, `from_status`, `to_status`, `reason`, `changed_by`, `created_at`.

### `payment_events` and `delivery_events`

Purpose: provider-agnostic event streams for future integrations.

Important columns:

- `order_id`, `provider_code`, `event_type`, `safe_payload_json`, `received_at`, `processed_at`.

Rule:

- Store safe metadata only. Do not log secrets, full tokens, or raw sensitive payloads.

## Content, SEO, And Business Configuration

### `articles`

Purpose: editorial content.

Important columns:

- `id`, `slug`, `title`, `excerpt`, `body`, `status`, `published_at`, `author_id`.

### `seo_landing_pages`

Purpose: controlled indexable pages for search intent.

Important columns:

- `id`, `slug`, `page_type`, `intent`, `criteria_json`, `title`, `body`, `status`, `canonical_url`.

Rule:

- Do not create SEO landing pages automatically for arbitrary filters.

### `seo_metadata`

Purpose: metadata attached to indexable entities.

Important columns:

- `id`, `entity_type`, `entity_id`, `meta_title`, `meta_description`, `canonical_url`, `robots`, `structured_data_json`.

### `promo_codes`

Purpose: controlled discounts.

Important columns:

- `code`, `discount_type`, `discount_value`, `starts_at`, `ends_at`, `usage_limit`, `status`.

### `business_settings`

Purpose: centralized legal and commercial configuration.

Important columns:

- `key`, `value_json`, `status`, `updated_by`.

Rule:

- Do not invent legal details. Empty or draft settings should not render as verified public claims.

## Imports And Operations

### `import_batches`

Purpose: staged import lifecycle.

Important columns:

- `id`, `source_filename`, `source_kind`, `status`, `uploaded_by`, `mapping_json`, `summary_json`, `created_at`, `applied_at`.

### `import_rows`

Purpose: parsed row, validation state, normalized output, and errors.

Important columns:

- `id`, `import_batch_id`, `row_number`, `raw_json`, `normalized_json`, `status`, `errors_json`, `warnings_json`.

### `audit_logs`

Purpose: sensitive admin and system operation audit.

Important columns:

- `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `safe_metadata_json`, `created_at`.

Rule:

- Audit logs are not a place for secrets, private documents, tokens, or raw payment credentials.

Implementation note:

- Controlled catalog apply adds `import_batches`, `import_rows`, `audit_logs`, and the transactional database function `public.apply_catalog_import_batch(input jsonb)` through a versioned migration.
- The function is an operational service-role boundary for approved catalog import apply. It is not a public write path.
- It stores compact structured apply metadata and safe audit summaries, not raw Excel/ZIP dumps or image binaries.

## Search And Filtering Strategy

Public catalog queries should use:

- First-class indexed fields on `watch_references`.
- Joins to controlled relation tables for styles, use cases, functions, colors, materials, and movements.
- `catalog_offers` for price and orderability filters.
- Full-text search document table or materialized view for relevance search.
- Cursor or page-based pagination with stable ordering.

Avoid:

- Indexing every possible filter combination.
- Making arbitrary filter URLs indexable.
- Storing every characteristic as untyped EAV.

## Computed, Cached, And Not Stored

Computed on demand or cached:

- Facet counts.
- Search documents.
- Collection profile snapshots.
- Recommendation candidates.
- Sitemaps.

Stored as immutable snapshots:

- Order items.
- Order addresses.
- Payment and delivery method selections.

Not stored as source of truth:

- AI-generated SEO text without admin approval.
- Current recommendation text as a permanent fact.
- Public legal or delivery promises without verified business settings.

## Implementation Notes

The database and catalog foundation phase is implemented in versioned Supabase migrations under `supabase/migrations/`.

Exact implementation decisions for role codes, reference normalization, reference slugs, first-class fields, controlled attributes, commercial state, and RLS policy scope are recorded in `docs/CATALOG_IMPLEMENTATION.md`.
