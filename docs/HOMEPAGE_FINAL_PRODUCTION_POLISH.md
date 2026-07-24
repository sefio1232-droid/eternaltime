# Homepage Final Production Polish

This document records the final production polish pass for the public homepage `/`.

## Screenshot-Confirmed Issues

The accepted homepage structure was preserved, but the page still needed refinement in typography, alignment, image fidelity, density, CTA consistency, and model-name handling.

The main issues addressed were:

- hero product meta reading as a detached white card;
- hero controls reading as one compressed text group;
- model captions being vulnerable to truncation;
- English role labels leaking into shortlist UI;
- uneven watch scale inside shortlist and collection compositions;
- loose vertical rhythm between selection criteria and shortlist;
- pale CTA treatment in dark sections;
- insufficient review metadata for asset dimensions and text/overflow checks.

## Preserved Structure

The homepage order remains:

1. Kinetic Hero
2. Ecosystem Path
3. Personal Selection + Shortlist
4. Comparison + Purchase Path
5. Collection Intelligence
6. Journal + Final CTA

No design-lab route, catalog route, backend, Supabase, migration, auth, checkout, or collection persistence logic changed.

## Grid System

The lower homepage sections continue to use the consolidated section module. The polish pass tightened the shared section gap and padding values so the page reads as one product surface rather than separate presentation slides.

## Vertical Rhythm

The selection-to-shortlist gap was reduced. Shortlist headings now sit closer to the candidate grid, and comparison, ecosystem, collection, journal, and final CTA spacing use a smaller shared range.

## Typography

Primary model captions no longer use ellipsis. They wrap in normal flow and keep a stable caption height, which prevents `Seastar Chronog...` and `PRX Powermatic...` style truncation.

Hero product metadata also wraps the active model name instead of forcing a single clipped line.

## Heading Line Breaks

The existing editorial line breaks were preserved, but the type scale and section rhythm were tightened so headings do not float away from the content they introduce.

## CTA System

Homepage CTAs now share a calmer active treatment:

- consistent minimum height;
- consistent letter spacing;
- stronger active contrast in dark sections;
- no disabled-looking pale CTA on active links.

## Hero Polish

The kinetic hero remains the same product architecture:

- 24-watch orbit;
- 10-second autoplay;
- center watch moves left;
- right watch enters center;
- scenario jump;
- previous, pause/resume, next;
- reduced motion;
- server-side catalog enrichment.

Polish changes:

- product meta has a lighter integrated surface;
- controls are visually separated buttons;
- pause button label changes between `Пауза` and `Продолжить`;
- active rail item has a clearer active state;
- central image keeps priority and strong sharpness settings;
- review mode exposes more useful diagnostics.

## Ecosystem Polish

The dark ecosystem section keeps its role as the first lower-page explanation. The polish pass tightened its min-height, aligned the route cells with the watch visual, and strengthened CTA contrast.

## Selection Polish

Selection criteria and shortlist now read as one composition. The large floating shortlist header was pulled closer to the candidate grid, and the criteria cells use a denser rhythm.

## Shortlist Polish

Shortlist watch figures use one shared media abstraction with per-asset optical scale values from `home-premium-assets.ts`.

English role labels are replaced by Russian display labels:

- `Повседневная роль`
- `Финалист под рубашку`
- `Для дороги`
- `Первая механика`

## Comparison Polish

The finalist watch uses the shared media abstraction at a smaller hero-section scale. Comparison rows have a consistent minimum height and read as a product comparison, not an admin table.

## Collection Polish

Collection watch captions wrap fully, and each watch sits in the same media/caption system. The next PRX candidate remains visually emphasized but is not allowed to overpower the rail.

## Journal Polish

The text-first journal preview remains, but the lead block is less heavy and the final strip uses a slightly calmer type scale.

## Final CTA Polish

The final CTA keeps the editorial statement plus two actions, with tighter spacing and unified button treatment.

## Image Fidelity

Homepage watch media uses approved static assets only:

- `public/generated/homepage-premium-assets/`
- `src/components/home/home-premium-assets.ts`

No `/api/catalog/dev-images` dependency is allowed on the homepage.

## Asset Dimensions

Each lower-section watch placement now exposes:

- `data-home-source-dimensions`
- `data-home-generated-dimensions`

Hero orbit slots also expose source and generated dimensions for review diagnostics.

## Upscale Prevention

The production CSS keeps section render sizes below the generated asset dimensions. The shared media abstraction uses bounded CSS sizes and optical scale variables instead of raster upscaling.

## Responsive Behavior

Desktop, tablet, and mobile layout rules remain in the existing modules. The polish pass avoids `100vw`, giant below-hero `min-height: 100vh`, and negative full-bleed patterns that could create horizontal overflow.

## Accessibility

The hero keeps one `h1`; lower sections use `h2` and internal headings. Hero image links now have readable Russian accessible names, and the pause/resume control has dynamic accessible text.

## Motion

Hero motion remains on the 10-second interval. CSS transitions use calm easing and no bounce/spring overshoot. Lower watch hover movement stays below the requested 1.02 scale limit.

## Review Mode

`/?homeReview=1` remains development-only and now includes controls for:

- grid;
- section bounds;
- media bounds;
- text bounds;
- asset dimensions;
- upscale warnings;
- optical case bounds;
- placement ids;
- render keys;
- overflow elements;
- pause/resume motion.

## Runtime QA

Runtime QA must still be performed in a real browser whenever browser automation is available. If the automation surface is blocked by sandbox metadata, do not claim screenshot QA passed.

## Visual QA

Manual visual QA should use:

- `http://localhost:3000/`
- `http://localhost:3000/?homeReview=1`
- `http://localhost:3000/?heroMotion=0`

Check desktop, tablet, and mobile viewports for text wrapping, model-name visibility, watch scale, CTA contrast, horizontal overflow, and hero motion.

## Remaining Limitations

The homepage still depends on the curated seven-asset premium set. Weak exact assets remain excluded until better front-facing source imagery exists.

## Premium Reset Follow-Up

The later premium art-direction reset is documented in `docs/HOMEPAGE_PREMIUM_ART_DIRECTION_RESET.md`.

It keeps this polish contract but pushes the page away from boxed panels and presentation-slide rhythm:

- dark ecosystem and collection chapters are full-bleed;
- shortlist is finalist-led and asymmetric;
- comparison/purchase uses a lighter ownership timeline;
- final CTA includes large real watch imagery;
- review mode includes full-bleed, material, typography, render-size, CTA, section-height, and border-count diagnostics.
