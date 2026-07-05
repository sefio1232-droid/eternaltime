# Domain Review Before Implementation

This document records the second domain review before database migrations and application code. It resolves five ambiguity areas: manual User Watches, canonical watch pages, Manufacturer Reference vs Watch Variant, recommendation rules, and collection terminology.

## 1. Manual User Watches And Collection Analysis

Manual User Watches participate in Collection Intelligence without being added to the public catalog.

Data flow:

```text
Manual User Watch
  -> user-entered display data
  -> normalized User Watch Analysis Traits
  -> normalized collection item
  -> Collection Profile
  -> typed rule definitions
  -> scenarios
  -> catalog reference candidates
  -> scoring
```

User-entered display data:

- Custom brand name.
- Custom model name.
- Custom reference.
- Custom display name.
- Acquisition date/source.
- Condition.
- Personal note.
- Set contents.
- Service history.
- Private photos/documents.

Normalized analysis traits:

- Style dimensions.
- Use-case dimensions.
- Movement type.
- Case size.
- Dial color family.
- Strap/bracelet type.
- Brand country.
- Relevant functions.
- Water resistance and material families.

Trait source priority:

1. Confirmed user-specific trait override.
2. Linked `watch_references` traits.
3. User-entered controlled traits for manual watches.
4. Unknown/partial traits with lower confidence.

If catalog reference is absent, Collection Intelligence uses `user_watch_analysis_traits`; missing dimensions are `unknown`. AI-assisted classification may later create pending suggestions only. It must not be required and must not silently publish catalog data.

## 2. Canonical Watch Page Entity

Final decision: the canonical public watch page entity is `watch_references`.

- Canonical URL: `/watches/{brandSlug}/{referenceSlug}`.
- Product structured data: `watch_references` plus safe current `catalog_offers`.
- Images: belong to `watch_references`.
- Factual specifications: belong to `watch_references`.
- Description: belongs to `watch_references`.
- Price: belongs to `catalog_offers`.
- Inventory: belongs to `catalog_offers`.
- Sibling references/colors: other `watch_references` under the same `watch_model_id`.
- Breadcrumbs: Brand -> Brand Collection optional -> Watch Model optional -> Manufacturer Reference.
- Duplicate content: Watch Model pages, if created, are informational summaries and do not duplicate full reference pages.

An informational Watch Model page is optional. It is useful when a model family has search demand or educational value. It is not the primary product page and should not own Product structured data unless it is intentionally modeled as a non-offer informational page without product offer claims.

## 3. Manufacturer Reference vs Watch Variant Stress Test

These examples are conceptual model tests, not statements about Eternal Time assortment.

| Case | Brand | Brand Collection | Watch Model | Manufacturer Reference | Separate Watch Variant entity | Catalog Offer |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Simple Casio/G-Shock reference | Casio | G-Shock | Example rugged digital family | Specific reference code | Not separate in MVP | Active/inactive offer for the reference |
| 2. Tissot PRX blue dial | Tissot | PRX | PRX Powermatic 80 | T137.407.11.041.00 | Not separate; reference is blue configuration | Offer if sold |
| 3. Tissot PRX ice blue dial | Tissot | PRX | PRX Powermatic 80 | T137.407.11.351.00 | Not separate; sibling reference | Offer if sold |
| 4. Orient Bambino close executions | Orient | Bambino-like family | Dress automatic family | Each official reference | Not separate | Separate offers by reference |
| 5. Seiko family with many references | Seiko | Collection/family if applicable | Shared family/model | Each dial/case/bracelet reference | Not separate | Offers attach to each reference |
| 6. Bracelet and strap versions | Any brand | Relevant Brand Collection | Same Watch Model | Usually separate official references; if same reference includes both, represent bundle in offer | Not separate | Standard or bundle offer |
| 7. Discontinued model | Any brand | Relevant Brand Collection | Watch Model status archival/discontinued | Reference status discontinued/archival | Not separate | No active offer, or archival offer state |
| 8. Informational but not sold | Any brand | Relevant Brand Collection | Watch Model | Published reference | Not separate | No active Catalog Offer |
| 9. Temporarily unavailable reference | Any brand | Relevant Brand Collection | Watch Model | Published reference | Not separate | Offer status `sold_out` or inactive |
| 10. Price changed multiple times | Any brand | Relevant Brand Collection | Watch Model | Published reference | Not separate | One offer with `offer_price_history` rows |
| 11. Multiple commercial offers | Any brand | Relevant Brand Collection | Watch Model | One published reference | Not separate | Multiple offers only for real seller/channel/condition/bundle differences |

Review conclusions:

- Manufacturer Reference and Watch Variant should not be separate MVP entities.
- In this domain they are usually 1:1; a separate Variant mostly duplicates Reference.
- The useful responsibility previously assigned to Watch Variant is now carried by `watch_references`: concrete specs, images, comparison identity, favorites, search/filter identity, and recommendation candidate identity.
- Removing Watch Variant from MVP reduces migrations, joins, admin complexity, import ambiguity, and SEO duplication.
- Adding a separate extension later is possible by introducing `watch_reference_configurations` or similar only if real data proves one reference can map to multiple materially different configurations. That future migration would be additive if current foreign keys consistently point to `watch_references`.

Final recommendation for MVP: use `watch_references` as the concrete catalog entity and do not create `watch_variants`.

## 4. Recommendation Rule Architecture

MVP approach:

```text
versioned typed rule definitions in application/domain code
+ structured Collection Profile
+ catalog traits in database
+ manual User Watch Analysis Traits
+ controlled recommendation templates
+ deterministic scoring
```

Rule definitions live in `src/modules/collection-intelligence/domain/rules.ts` or equivalent implementation-phase module. They receive a `CollectionProfile`, detect gaps, return scenario definitions with priority/severity, and output typed candidate constraints. Candidate scoring is separate from gap detection.

Conceptual shape:

```ts
interface RuleDefinition {
  id: string;
  version: number;
  scenarioCode: string;
  appliesTo(profile: CollectionProfile): boolean;
  detectGap(profile: CollectionProfile): DetectedGap | null;
  buildScenario(input: {
    profile: CollectionProfile;
    gap: DetectedGap;
  }): DetectedScenario;
}

interface DetectedScenario {
  scenarioCode: string;
  ruleId: string;
  ruleVersion: number;
  priority: "low" | "normal" | "high";
  severity: "low" | "medium" | "high";
  candidateConstraints: CandidateConstraints;
  templateKey: string;
  evidence: Record<string, unknown>;
}
```

Persisted recommendation snapshot:

- Analysis version.
- Rule set version.
- Rule ID/version.
- Collection version.
- Profile snapshot.
- Gap evidence and severity.
- Candidate constraints.
- Candidate reference IDs.
- Score breakdown.
- Template key and rendered explanation.
- Confidence/caveats.

Do not store executable rules in the database and do not make AI the decision source.

## 5. Terminology Cleanup

Final ubiquitous language:

| Concept | Use this term | Technical name |
| --- | --- | --- |
| Brand-owned family like PRX | Brand Collection | `brand_collections` |
| Optional subdivision inside brand family | Brand Line | `brand_lines` |
| User's owned-watch set | User Watch Collection | `user_watch_collections` |
| One owned/tracked watch | User Watch | `user_watches` |
| Private normalized traits for manual watches | User Watch Analysis Traits | `user_watch_analysis_traits` |
| Editorial/commercial product grouping | Editorial Selection | `editorial_selections` |
| Concrete catalog watch identity | Manufacturer Reference | `watch_references` |
| Commercial selling state | Catalog Offer | `catalog_offers` |

Avoid:

- Using "collection" alone in architecture decisions.
- Calling Editorial Selections "curated collections".
- Calling Brand Collections "user collections".
- Reintroducing `watch_variants` without a documented post-MVP reason.
