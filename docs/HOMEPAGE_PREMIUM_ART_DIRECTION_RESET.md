# Homepage Premium Art Direction Reset

This document records the premium art-direction reset for the production homepage `/`.

## Preserved Product Architecture

The homepage keeps the approved order:

1. Kinetic Hero
2. Ecosystem Path
3. Personal Selection + Shortlist
4. Comparison + Purchase Path
5. Collection Intelligence
6. Journal + Final CTA

The hero controller remains unchanged: 24 watch placements, six scenarios, four watches per scenario, 10-second autoplay, scenario jumps, previous/pause-resume/next controls, reduced-motion support, and server-side catalog enrichment.

## Visual Direction

The page should read as a luxury watch editorial system, not as a SaaS dashboard, slide deck, or ordinary ecommerce page.

The reset uses:

- ivory and paper backgrounds;
- ink and graphite text;
- navy full-bleed chapters;
- steel and champagne accents;
- softer material gradients;
- light grain;
- fewer dividers;
- stronger product scale where asset quality allows it.

## Palette

- `--home-ivory #F3F0E8`
- `--home-paper #F8F6F1`
- `--home-paper-bright #FCFBF8`
- `--home-ink #0D1215`
- `--home-graphite #242C31`
- `--home-navy #071E2A`
- `--home-navy-light #102F3D`
- `--home-steel #6D8793`
- `--home-steel-light #D6E0E3`
- `--home-blue #245F7B`
- `--home-champagne #B98A45`
- `--home-bronze #8C6334`
- `--home-line rgba(13,18,21,.12)`
- `--home-dark-line rgba(255,255,255,.13)`

## Section Rules

Ecosystem Path and Collection Intelligence are full-bleed dark chapters. They are not boxed dark rectangles inside the page container.

The shortlist is intentionally asymmetric: the finalist receives a larger editorial product treatment and the secondary candidates are smaller.

The comparison/purchase path is a quiet ownership timeline, not an admin table.

The final CTA closes with real watch imagery from the approved homepage scenario data: a primary PRX Gold and a secondary Seastar silhouette.

## Image Scale

Large homepage watch renders use approved assets from `public/generated/homepage-premium-assets/` and per-reference optical scale data from `home-premium-assets.ts`.

No homepage section should intentionally upscale weak source images. If an exact asset is weak, it stays smaller or excluded from large production composition.

## Review Mode

`/?homeReview=1` exposes visual QA controls for:

- full-bleed bounds;
- material layers;
- typography scale;
- watch render size;
- natural/source size;
- upscale warnings;
- grid;
- overflow;
- CTA variants;
- section height;
- border count.

Normal users never see the review drawer.

## Boundaries

This reset does not change backend code, Supabase, migrations, auth, checkout, catalog worktree, catalog imports, collection persistence, or Journal routes.

## Final Composition Lock

The accepted reset is now constrained by `docs/HOMEPAGE_FINAL_COMPOSITION_LOCK.md`. Collection uses separate owned, narrative, next-watch, and insights areas; Shortlist uses one finalist plus three horizontal alternatives; Comparison uses editorial statements and a line timeline. These are structural rules, not optional visual variants.
