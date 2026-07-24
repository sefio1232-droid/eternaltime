# Homepage Final Art Direction

This document fixes the production homepage direction for `/`.

## Intent

Eternal Time should read as a premium watch discovery and ownership ecosystem, not as a marketplace, SKU grid, blog, or presentation deck.

## Page Narrative

1. Header
2. Kinetic hero
3. Ecosystem path
4. Personal selection + shortlist
5. Comparison + purchase path
6. Collection intelligence
7. Journal + final CTA
8. Footer

## Scenario Names

The production hero uses exactly these readable rail names:

1. На каждый день
2. Под рубашку
3. Для путешествий
4. Первая механика
5. Для спорта
6. В коллекцию

Rejected labels such as `Под работу`, `Механика`, and `Премиум` must not appear as hero rail names.

## Hero Rules

- Preserve the continuous fractional 24-watch orbit.
- Autoplay advances the orbit every 10 seconds.
- Motion direction remains center to left, with the next watch entering from the right.
- Product metadata follows the active center watch.
- Scenario rail fast-travels to the first model of a scenario.
- Reduced motion and `?heroMotion=0` keep the page usable without animation.
- Only approved exact front-view assets from `public/generated/homepage-premium-assets/` are rendered in the production orbit.
- Side, angled, low-resolution, or watermarked assets stay out of normal hero rendering.

## Section Art Direction

- Ecosystem path: a calm route from curiosity to ownership.
- Personal selection + shortlist: scenario lenses and a narrowed set of candidates.
- Comparison + purchase path: differences, finalist context, and a quiet path to ownership.
- Collection intelligence: role map, gaps, and the next meaningful candidate.
- Journal + final CTA: editorial learning surface with real article links and selection entry.

## Production Polish Rules

- Primary homepage model names must wrap in normal flow; do not use ellipsis for the main model captions.
- Shortlist role labels are Russian editorial labels, not internal role ids such as `daily-fit`.
- Hero controls are separate buttons with clear spacing.
- CTA links should read active and deliberate, never disabled.
- Watch figures use the shared homepage media abstraction and per-asset optical scale values.

## Premium Reset

The current visual baseline is documented in `docs/HOMEPAGE_PREMIUM_ART_DIRECTION_RESET.md`.

The reset preserves the product architecture and hero controller, but changes the surface away from a boxed presentation system:

- Ecosystem Path and Collection Intelligence are full-bleed dark chapters.
- Shortlist uses an asymmetric finalist-led composition instead of four identical cards.
- Purchase path is a quiet ownership timeline instead of a table-like panel.
- Journal + Final CTA closes with large real watch imagery from the approved scenario data.
- The palette is ivory, paper, ink, navy, steel, champagne, and bronze.

## Placement Identity

Homepage repeated UI must use explicit placement identity:

- `HomeWatchPlacement.instanceId` for repeated section keys.
- `watch.reference` only for product identity.
- No `key={watch.reference}` in homepage repeated UI.
- Non-hero compositions validate duplicate placement ids and duplicate watch references during development.

## Review Mode

Development review mode is available through `?heroReview=1` or `?homeReview=1`.

It exposes motion state, active scenario, asset metadata, media bounds, full-bleed bounds, material layers, typography scale, section bounds, text bounds, watch render size, source size, asset dimensions, upscale warnings, overflow markers, CTA variants, section height, border count, optical case bounds, placement ids, render keys, asset quality, reference overlay, and static mode.

Normal users do not see review UI.

## Boundaries

This pass does not change catalog routes, brand routes, Supabase, migrations, catalog read repository contracts, auth, cart, checkout, payment, or collection domain logic.

## Composition Lock

The final section blueprints, scale ranges, normal-flow requirements, and responsive order are recorded in `docs/HOMEPAGE_FINAL_COMPOSITION_LOCK.md`. Future polish must preserve the explicit grid areas and may not reintroduce the old four-card shortlist, mixed five-watch collection rail, boxed journey cells, or gray active CTAs.
