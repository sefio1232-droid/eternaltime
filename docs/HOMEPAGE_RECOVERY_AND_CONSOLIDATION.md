# Homepage Recovery And Consolidation

This document records the production recovery pass for `/`.

## Purpose

The homepage must present Eternal Time as one coherent watch selection ecosystem, not as disconnected marketing blocks. The recovery pass stabilized the existing kinetic hero, removed duplicated lower-page fragments, and made the section order explicit.

## Final Page Order

1. Header
2. Kinetic hero
3. Ecosystem path
4. Personal selection + shortlist
5. Comparison + purchase path
6. Collection intelligence
7. Journal + final CTA
8. Footer

## Hero Boundary

The homepage keeps the existing production hero orbit:

- one 24-watch orbit;
- six scenarios with four watch slots each;
- automatic movement every 10 seconds;
- center watch moves toward the left while the next watch comes from the right;
- `?heroMotion=0` keeps the page useful without motion;
- `?homeReview=1` exposes diagnostics only in development.

The recovery pass did not change catalog, Supabase, auth, checkout, migrations, Journal routes, or collection persistence.

## Placement Identity

Homepage compositions use explicit placement identity:

- `HomeWatchPlacement.instanceId` is the React key for repeated section visuals.
- `watch.reference` is product identity, not component instance identity.
- A repeated reference may appear across separate sections or hero slots.
- A non-hero composition must not render the same reference twice unless a future design explicitly documents why.

Development assertions:

- `assertUniquePlacementIds(sectionName, placements)`
- `assertNoDuplicateReferencesInComposition(sectionName, placements)`

Hero review mode exposes:

- `data-home-placement-id`
- `data-home-render-key`
- media bounds
- section bounds
- optical case bounds
- asset quality

## Image Sources

Production homepage visuals use curated static assets from:

- `public/generated/homepage-premium-assets/`
- `src/components/home/home-premium-assets.ts`

The homepage must not call `/api/catalog/dev-images`.

## Consolidated Sections

The old lower-page fragments were replaced by five coherent sections:

- `HomeEcosystemPath`
- `HomeSelectionShortlist`
- `HomeComparisonPurchase`
- `HomeCollectionIntelligencePanel`
- `HomeJournalFinal`

These sections use the same scenario model as the hero and render only curated watch assets. They do not create catalog data, copy import previews, or write to storage.

## Text Quality

Visible homepage Russian copy must be stored as readable UTF-8 source text or as deliberate `\u` escapes in tests. Mojibake and replacement characters are treated as production defects.

## Final Production Polish

The follow-up polish pass is recorded in `docs/HOMEPAGE_FINAL_PRODUCTION_POLISH.md`.

That pass preserved the recovered homepage structure and refined model-name wrapping, hero control separation, CTA consistency, lower-section rhythm, watch media optical scaling, and review-mode diagnostics for text bounds, asset dimensions, upscale warnings, and overflow checks.

## Verification Contract

Required checks for future homepage passes:

- no `key={watch.reference}` in homepage repeated UI;
- no `/api/catalog/dev-images` dependency;
- no `100vw` or `min-height: 100vh` in homepage components;
- no `пїЅ`, `???`, or replacement-character copy in rendered homepage source;
- typecheck, tests, lint, build, diff check, and secrets scan.
