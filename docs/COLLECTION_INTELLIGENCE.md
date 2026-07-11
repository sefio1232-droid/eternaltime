# Collection Intelligence Architecture

Collection Intelligence is a deterministic module that analyzes a User Watch Collection and suggests logical development directions. It must work without AI.

Current implementation boundary: User Watch Collection now persists catalog-linked and manual User Watches, raw manual source data, empty/partial analysis-trait rows, and collection-version invalidation. Profile extraction, role calculation, gap detection, Recommendation Scenarios, candidate scoring, result snapshots, and user-facing analysis are not implemented yet and must not be simulated in the UI.

## Pipeline

```text
User Watch Collection
  -> user watches
  -> source data and analysis traits
  -> normalized collection items
  -> Collection Profile
  -> typed rule definitions
  -> detected gaps and scenarios
  -> candidate query from current catalog references
  -> deterministic scoring
  -> controlled explanations
  -> stored analysis run
```

The module uses `user_watches`, optional linked `watch_references`, `user_watch_source_data`, `user_watch_analysis_traits`, first-class reference attributes, relation entities, and controlled attribute values. It stores versioned results in `collection_analysis_runs`, `collection_profile_snapshots`, `collection_gaps`, `recommendation_results`, and `recommendation_candidates`.

## Manual User Watches

Manual User Watches are first-class inputs to Collection Intelligence. They do not create public catalog entries.

### Data Flow

```text
Manual User Watch
  -> user-entered display data
  -> raw source data
  -> user-entered normalized analysis traits
  -> normalized collection item
  -> Collection Profile
  -> gap/scenario rules
  -> recommendations from public catalog references
```

### User-Entered Display Data

Display data is private user data and may be free text:

- Custom brand name.
- Custom model name.
- Custom reference.
- Custom display name.
- Acquisition date and source.
- Condition.
- Personal note.
- Set contents.
- Service history.
- Photos and documents.

Display data is not automatically normalized into public catalog entities.

Raw source data is preserved even if the watch is later linked to a catalog reference. It is not overwritten by matching or reconciliation.

### Normalized Analysis Traits

Analysis traits are private structured data used only for analysis:

- Style dimensions.
- Use-case dimensions.
- Movement type.
- Case diameter, lug-to-lug, thickness.
- Dial color family.
- Strap or bracelet material/type.
- Brand country when known.
- Relevant functions.
- Water resistance band.
- Material family.
- Optional price segment when user has provided a non-sensitive analysis value.
- Sport, business, smart casual, formal, travel, and everyday scores when enough evidence exists.

Traits use the same controlled dictionaries as catalog references where possible. They live in `user_watch_analysis_traits` and related join tables.
Each trait has provenance and confidence. A single row-level source is not enough because movement may come from user input while dial color may come from deterministic mapping and style may remain unknown.

### Trait Source Priority

For each User Watch, build normalized collection traits in this order:

1. Confirmed user-specific analysis trait override.
2. Linked `watch_references` catalog traits.
3. User-entered controlled analysis traits for manual watches.
4. Accepted deterministic mapping.
5. Accepted admin/catalog specialist correction.
6. Accepted AI/enrichment suggestion.
7. Unknown/partial trait with lower data confidence.

AI-assisted classification may later propose traits, but suggestions must stay pending until accepted. AI is never required for classification.

### Missing Catalog Reference

If `watch_reference_id` is absent:

- The User Watch remains private and valid.
- Collection Intelligence uses `user_watch_analysis_traits`.
- Missing dimensions become `unknown` and reduce confidence.
- Explanations should mention uncertainty only when it changes the recommendation meaning.

### Updating Manual Traits

Users should be able to edit:

- Movement type.
- Style and use-case tags.
- Case size fields.
- Dial color family.
- Strap/bracelet type.
- Material family.
- Brand country.
- Functions.
- Water resistance.

Admin correction is only needed for support or future assisted workflows; normal manual watches are user-owned.

### Matching And Reconciliation

If a manual User Watch may match a `watch_reference` or internal `provisional_watch_identity`, Collection Intelligence does not change behavior until the match is confirmed or traits are explicitly accepted. Rejected or ambiguous matches must not affect analysis.

When a confirmed link to `watch_reference` is created later:

- Verified catalog traits become default factual source.
- Original raw user source data remains stored.
- User-confirmed overrides can still take priority for that user's own analysis.
- Collection Intelligence recalculates because the User Watch Collection version changes.

## Collection Profile

A Collection Profile is a calculated snapshot, not manually edited user data. It should include:

- Count of watches.
- Catalog-linked vs manual watches.
- Trait confidence distribution.
- Profile completeness.
- Low-confidence dimensions.
- Style distribution.
- Use case distribution.
- Movement type distribution.
- Size distribution: diameter, lug-to-lug, thickness.
- Dial color distribution.
- Case material distribution.
- Strap/bracelet distribution.
- Water resistance bands.
- Function distribution.
- Brand distribution.
- Brand country distribution.
- Price segment distribution when known and allowed.
- Similarity clusters and repetition signals.

The first implementation can store profile details as typed JSON snapshots, while raw dimensions come from typed catalog fields, normalized relations, and `user_watch_analysis_traits`.

Profile completeness should be computed by dimension. A collection can be strong for movement analysis and weak for style analysis at the same time.

## Profile Dimensions

Recommended normalized dimensions:

- `style`: dress, classic, sport, diver, field, pilot, smart casual, technical.
- `use_case`: daily, business, formal, travel, outdoor, swimming, collecting, weekend.
- `movement_type`: automatic, manual, quartz, solar, radio controlled, hybrid, smart.
- `size_band`: small, medium, large, oversized, based on diameter and lug-to-lug.
- `dial_color_family`: black, white, blue, green, silver, champagne, grey, other.
- `material_family`: steel, titanium, ceramic, resin, gold, precious metal, leather, rubber, textile.
- `function_family`: date, GMT, chronograph, world time, alarm, timer, moon phase.
- `price_segment`: entry, mid, premium, luxury, unknown, using implementation-defined boundaries.
- `attachment_type`: bracelet, leather strap, rubber strap, textile strap, integrated bracelet, unknown.
- `use_case_score`: sport, business, smart casual, formal, travel, everyday.

Dimension values must be derived from controlled data, not hardcoded brand myths.

## Incomplete Data Behavior

Manual watches with incomplete traits still contribute to known dimensions.

Rules:

- Known facts contribute normally.
- Unknown values go into unknown buckets and do not imply negative evidence.
- Low-confidence traits can contribute with lower weight.
- A scenario must meet minimum evidence before producing strong wording.
- If profile completeness is low, the system should prefer softer copy or enrichment prompts.

Example:

```text
Known: automatic, black dial, steel bracelet.
Unknown: size, water resistance, style, use case.
Allowed: contribute to movement, dial color, attachment/material.
Not allowed: declare the watch formal, sport, travel-ready, or business-ready without more evidence.
```

Recommended thresholds:

- `profile_completeness < 0.35`: suppress broad collection-balance recommendations and ask for enrichment.
- `0.35 <= profile_completeness < 0.65`: allow cautious recommendations with uncertainty wording.
- `profile_completeness >= 0.65`: normal recommendation wording if scenario evidence is sufficient.

These thresholds are starting architecture guidance, not final product tuning.

## Pragmatic MVP Rule Architecture

Use versioned typed rule definitions in application/domain code. Do not put business rules in React components, do not store arbitrary executable expressions in the database, do not build a no-code rule builder for MVP, and do not make AI the decision maker.

Recommended module shape:

```text
src/modules/collection-intelligence/
  domain/
    profile.ts
    dimensions.ts
    rules.ts
    scoring.ts
    templates.ts
  application/
    analyze-collection.server.ts
    build-candidates.server.ts
  tests/
    fixtures/
```

### Conceptual Interfaces

```ts
type DimensionCode =
  | "style"
  | "use_case"
  | "movement_type"
  | "size_band"
  | "dial_color_family"
  | "material_family"
  | "function_family"
  | "price_segment";

type Severity = "low" | "medium" | "high";
type Priority = "low" | "normal" | "high";

interface CollectionProfile {
  userWatchCollectionId: string;
  collectionVersion: number;
  itemCount: number;
  linkedItemCount: number;
  manualItemCount: number;
  profileCompleteness: number;
  dimensions: Record<DimensionCode, DimensionDistribution>;
  confidence: {
    completeItems: number;
    partialItems: number;
    unknownItems: number;
    lowConfidenceDimensions: DimensionCode[];
  };
}

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

interface DetectedGap {
  dimension: DimensionCode;
  severity: Severity;
  evidence: Record<string, unknown>;
  explanationKey: string;
}

interface CandidateConstraints {
  includeStyles?: string[];
  includeUseCases?: string[];
  includeMovementTypes?: string[];
  includeDialColorFamilies?: string[];
  minWaterResistanceM?: number;
  diameterRangeMm?: { min?: number; max?: number };
  excludeOwnedReferences: true;
  requireOrderableOffer?: boolean;
}

interface DetectedScenario {
  scenarioCode: string;
  ruleId: string;
  ruleVersion: number;
  priority: Priority;
  severity: Severity;
  scenarioConfidence: number;
  minimumEvidenceMet: boolean;
  candidateConstraints: CandidateConstraints;
  templateKey: string;
  evidence: Record<string, unknown>;
}

interface CandidateScore {
  watchReferenceId: string;
  total: number;
  breakdown: {
    scenarioFit: number;
    gapCoverage: number;
    diversityGain: number;
    constraintFit: number;
    commercialFit: number;
    overlapPenalty: number;
    dataQuality: number;
  };
}
```

### Rule Execution

Rules receive a structured `CollectionProfile` and return scenarios. They do not query React state and do not mutate database rows directly.

```ts
function detectScenarios(
  profile: CollectionProfile,
  rules: RuleDefinition[],
): DetectedScenario[] {
  return rules.flatMap((rule) => {
    if (!rule.appliesTo(profile)) return [];
    const gap = rule.detectGap(profile);
    if (!gap) return [];
    return [rule.buildScenario({ profile, gap })];
  });
}
```

### Priority And Severity

- Severity describes the strength of the gap in the user's current collection.
- Priority describes whether the scenario should be shown now.
- Scenario confidence describes how much evidence supports the scenario.
- Priority combines severity, scenario confidence, collection size, user intent, candidate availability, and redundancy with other scenarios.

### Candidate Constraints

Rules output structured candidate constraints. They do not output SQL and do not contain executable expressions from the database. Application services translate constraints into safe typed catalog queries against `watch_references` and `catalog_offers`.

### Gap Detection vs Candidate Scoring

Gap detection answers: "what is missing or overrepresented?"

Candidate scoring answers: "which current catalog references best satisfy this scenario?"

Keep these separate so rules remain testable and candidate scoring can evolve without rewriting gap detection.

Scenario suppression:

- If `minimumEvidenceMet` is false, do not show the scenario as a recommendation.
- If confidence is low, show enrichment prompts or soft observations instead.
- If evidence is strong only for one dimension, avoid broad claims about the whole collection.

## Recommendation Scenarios

Initial scenario families:

- `balanced_daily`: a versatile daily watch that fits many outfits.
- `business_or_formal`: a more refined watch for shirts, offices, or formal use.
- `travel_function`: a GMT/world-time oriented watch when travel use case is missing.
- `light_dial_diversity`: a light or contrasting dial when dark dials dominate.
- `size_diversity`: smaller or larger case size when all watches cluster tightly.
- `mechanism_diversity`: different mechanism type if the user values variety.
- `material_diversity`: different case/strap material to broaden tactile character.
- `water_ready`: stronger water resistance when the collection lacks swimming-safe options.
- `low_overlap_alternative`: a watch with intentionally different character from the current cluster.

Rules must be generic and explainable. Do not write "if Brand X then recommend Brand Y" unless there is an objective compatibility reason.

## Candidate Query

Candidates are selected from current `watch_references` and `catalog_offers`:

- Reference must be published.
- Offer must be active/orderable if the scenario is purchase-oriented.
- Candidate must match scenario constraints.
- Candidate should respect user constraints such as budget, wrist size, movement preference, and excluded brands.
- Candidate should not already be in the user's User Watch Collection.
- Candidate should avoid near-duplicates unless the scenario explicitly asks for a close alternative.

Catalog changes should affect future recommendations automatically because candidates are queried from current catalog data.

## Scoring

Recommended score components:

- `scenario_fit`: how well the candidate satisfies the scenario criteria.
- `gap_coverage`: how much it fills detected missing dimensions.
- `diversity_gain`: how much it broadens the collection.
- `overlap_penalty`: penalty for being too similar to existing watches.
- `constraint_fit`: budget, size, movement, and availability fit.
- `data_quality`: confidence in catalog and manual watch traits.
- `commercial_fit`: active offer, orderability, and safe delivery state.

Example formula:

```text
score =
  scenario_fit * 0.30
  + gap_coverage * 0.25
  + diversity_gain * 0.20
  + constraint_fit * 0.15
  + commercial_fit * 0.10
  + data_quality * 0.05
  - overlap_penalty
```

Weights are versioned. Changing weights creates a new `analysis_version`.

## Recommendation Templates

Templates are controlled copy in application code or content-managed records with stable keys. MVP should keep templates near the rule definitions in code so tests can validate that every scenario has text.

Example:

```text
У вас уже хорошо представлен сценарий: {strong_use_case}.
Слабее представлен сценарий: {gap_use_case}.
Поэтому стоит рассмотреть часы с характером {target_style}
и параметрами {candidate_constraints}.
```

Rules:

- Do not shame the user's collection.
- Avoid unsupported claims about prestige or investment value.
- Mention uncertainty when manual watches lack enough data.
- Prefer "Based on the available data..." when profile completeness is partial.
- Do not mention private purchase price in public or shareable output.

## Result Snapshot

Persist enough data to explain what happened later:

- Analysis version.
- Rule set version.
- Rule ID and version per scenario.
- Collection version.
- Profile snapshot.
- Detected gaps with severity and evidence.
- Scenario priority.
- Candidate constraints.
- Candidate reference IDs.
- Score and score breakdown.
- Explanation template key and rendered explanation.
- Data confidence/caveats.
- Profile completeness.
- Scenario confidence and minimum evidence status.

Do not store AI text as source of truth for recommendations.

## Recalculation

Recalculate when:

- User adds, removes, or edits a watch.
- User edits manual analysis traits.
- Linked catalog reference attributes change.
- Catalog offer availability changes for purchase-oriented recommendations.
- Analysis algorithm version changes.
- User changes preference constraints.

Use `user_watch_collections.collection_version` or equivalent invalidation key.

## Cache Invalidation

Cached results are valid only for:

- Same `user_watch_collection_id`.
- Same `collection_version`.
- Same `analysis_version`.
- Same relevant catalog version or offer availability version.

When invalid, old results can remain for history but should not be shown as current recommendations.

## Analysis Versioning

Store:

- Algorithm version.
- Rule set version.
- Score weight version.
- Template version.
- Catalog snapshot marker if needed.
- Timestamp.

Deployment rule:

- Changing rule logic, scoring weights, profile dimensions, or templates increments the relevant version.
- Existing snapshots remain historical.
- Current views use the latest successful run for the current User Watch Collection/catalog version.

## Testing Strategy

Test layers:

- Trait extraction from linked catalog references.
- Trait extraction from manual watches with partial data.
- Profile distribution calculations.
- Gap detection rules.
- Scenario priority.
- Candidate constraint generation.
- Candidate filtering.
- Scoring and overlap penalty.
- Explanation template output.
- Snapshot persistence shape.
- Recalculation invalidation.

Golden fixtures should cover small, medium, diverse, and incomplete manual-watch User Watch Collections.

## Example 1: Only G-Shock-Like Sports Watches

Collection data:

- Three rugged digital or analog-digital sports watches.
- High outdoor/daily use case.
- Resin/rubber materials.
- Dark dials or negative displays.
- High water resistance.
- No refined/business/formal watch.

Calculated profile:

- Sport/outdoor: very high.
- Daily: medium to high.
- Business/formal: absent.
- Material variety: low.
- Dial color variety: low.
- Mechanism variety: likely quartz/solar concentrated.

Detected gaps:

- Business or smart casual use case.
- More refined material/strap option.
- Potential light dial or less technical visual character.

Scenarios:

- `business_or_formal`.
- `balanced_daily`.
- `material_diversity`.

Candidate criteria:

- Published references with classic, dress, or smart-casual style.
- Medium size band unless user preference says otherwise.
- Steel or leather acceptable.
- Avoid strong tactical/rugged overlap.
- Active offer if purchase-oriented.

Scoring logic:

- High gap coverage for refined daily/business watches.
- Diversity gain for non-resin material and calmer dial.
- Overlap penalty for another rugged black sports watch.

Final recommendation type:

- A versatile refined everyday watch or dress-leaning watch, not a hardcoded brand.

## Example 2: Several Japanese Sports Watches

Collection data:

- Four watches from Japanese brands.
- Mostly sport, diver, or outdoor use cases.
- Quartz/solar and automatic mixed.
- Strong reliability/durability theme.

Calculated profile:

- Sport/daily: high.
- Brand geography: Japan concentrated.
- Water resistance: medium to high.
- Formal: low.
- Travel function may be absent depending on references.

Detected gaps:

- Dress or business use case.
- Brand geography diversity if user wants variety.
- Travel function if no GMT/world time exists.

Scenarios:

- `business_or_formal`.
- `travel_function` when travel gap exists.
- `low_overlap_alternative`.

Candidate criteria:

- Classic/smart-casual references with restrained dimensions.
- GMT/world-time references only if travel scenario is active.
- Avoid recommending another similar Japanese sports diver unless the user selected that direction.

Final recommendation type:

- A refined daily/business watch or travel-capable watch depending on the stronger gap.

## Example 3: Several Classic Mechanical Watches

Collection data:

- Three mechanical dress or classic watches.
- Leather straps.
- Light or neutral dials.
- Low water resistance.
- No rugged daily watch.

Detected gaps:

- Durable daily or weekend watch.
- Higher water resistance.
- Bracelet/rubber material variety.
- Potential quartz/solar practicality if user is open to it.

Scenarios:

- `balanced_daily`.
- `water_ready`.
- `material_diversity`.

Final recommendation type:

- A durable daily watch or water-ready weekend watch.

## Example 4: Collection Only With Dark Dials

Collection data:

- Five watches across several styles.
- All black, dark blue, or dark grey dials.
- Mixed mechanisms and brands.

Detected gaps:

- Light dial diversity.
- Possibly warmer dial colors if the user's style supports it.

Scenarios:

- `light_dial_diversity`.
- `low_overlap_alternative`.

Final recommendation type:

- A light-dial alternative that broadens visual range without ignoring the user's established taste.

## Example 5: Manual Watch With Partial Traits

Collection data:

- One linked catalog reference.
- One manual watch with custom brand/model text.
- Manual watch has user-selected style `sport`, movement `quartz`, dial color `black`, unknown dimensions.

Calculated profile:

- Manual item included with partial confidence.
- Size distribution has an unknown bucket.
- Style and movement distributions include the manual watch.

Detected gaps:

- Rules that require size evidence lower confidence.
- Style/use-case rules still run.

Final recommendation type:

- Recommendation can be produced, with caveat: some manual watch dimensions are unknown.
