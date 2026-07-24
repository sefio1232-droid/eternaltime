# Homepage Asset Curation

This document defines the production homepage visual asset policy for `/`. It does not change catalog data, product identity, imports, Supabase, storage, or shop routes.

## Generated Outputs

- Script: `npm run homepage:prepare-premium-assets`
- Normalized assets: `public/generated/homepage-premium-assets/`
- Manifest: `public/generated/homepage-premium-assets/homepage-premium-assets-manifest.json`
- Contact sheet: `public/generated/homepage-premium-assets/homepage-premium-assets-contact-sheet.jpg`

The contact sheet is an asset QA sheet on a medium-gray checkerboard. It is not a page screenshot and must not be used as production artwork.

## Production Rule

The homepage may render only assets approved in the homepage premium manifest. Debug images, contact sheets, comparison sheets, low-resolution thumbnails, wrong-angle frames, background-heavy images, and watermark/technical-marked images must stay out of production homepage UI.

If a model has weak imagery, it is excluded from large homepage composition until a better exact front-facing asset exists. The page should reuse a smaller set of strong assets rather than stretch a weak one.

## Approved Assets

| Reference | Decision | Production role |
| --- | --- | --- |
| `T150.410.16.051.00` | `APPROVED_HERO` | PR 100 shirt/everyday hero center |
| `T120.417.11.041.03` | `APPROVED_HERO` | Seastar travel/sport hero center |
| `T137.407.33.051.00` | `APPROVED_HERO` | PRX collection hero center |
| `EFK-100D-2A` | `APPROVED_HERO` | first mechanical hero center |
| `T150.210.11.041.00` | `APPROVED_LARGE_SECTION` | supporting PR 100 visual |
| `T150.417.11.041.00` | `APPROVED_LARGE_SECTION` | supporting PR 100 Chronograph visual |
| `MTG-B3000DN-1A` | `APPROVED_LARGE_SECTION` | supporting sport/collection visual |

## Rejected Assets

| Reference | Decision | Reason |
| --- | --- | --- |
| `T129.410.11.053.00` | `REJECTED_LOW_RESOLUTION` | available asset is too small for premium homepage enlargement |
| `RA-AC0M03S10B` | `REJECTED_LOW_RESOLUTION` | Bambino source remains thumbnail-only |
| `RA-AC0Q03S10B` | `REJECTED_LOW_RESOLUTION` | Mako source remains thumbnail-only |
| `GBD-H1000-1A4` | `REJECTED_LOW_RESOLUTION` | exact G-Shock asset is too small for production hero |
| `T120.807.33.051.00` | `REJECTED_LOW_RESOLUTION` | exact Seastar 40 source is too small |
| `T137.407.11.041.00` | `REJECTED_WRONG_ANGLE` | available PRX Blue frames are angled/too weak for front-only hero use |
| comparison/contact/debug images | `REJECTED_DEBUG_ASSET` | never production homepage artwork |

## Typed Visual Config

Homepage watch composition is controlled by `src/components/home/home-premium-assets.ts`.

Each record stores:

- reference;
- generated asset path;
- optical case scale;
- x/y correction;
- hero center/left/right scale;
- section large/medium/small scale;
- shadow width and opacity;
- source and generated dimensions.

The config is intentionally homepage-specific. It is not a catalog image model and must not mutate catalog read repository contracts.

The production homepage media abstraction reads these values for section watch figures. Rendered section sizes are bounded below generated asset dimensions; polish changes should adjust optical scale and CSS frame size rather than upscale raster assets.

The premium art-direction reset allows larger section renders only for approved assets. The intended scale bands are:

- shortlist finalist: large editorial render;
- shortlist secondary candidates: medium render;
- comparison finalist: hero-section render;
- collection existing roles: small-to-medium render;
- collection next candidate: large render;
- final CTA primary watch: hero render;
- final CTA secondary watch: quiet silhouette render.

If an asset cannot support the intended size, the composition should reduce that watch's visual role rather than stretch the bitmap.

## Scenario Curation

The production hero keeps the existing 24-watch orbit structure: six scenarios, four slots each. Weak exact assets are replaced only by approved exact assets from the curated set; no fake watch names are introduced and no import preview is read by the client.

The server page still loads catalog data through `getCatalogReadDataset()`, then `buildHomeScenarios(dataset)` enriches references with catalog links and prices when available.

Below the hero, homepage compositions use explicit placement identity:

- `instanceId` is the React/render identity;
- `watch.reference` is product identity and must not be used as the list key;
- repeated watches may appear only when the composition explicitly wants the same product in a different narrative role;
- non-hero compositions validate duplicate references so accidental repeats are caught before visual QA.

This keeps the six-scenario hero free to reuse strong approved assets while preventing duplicate-card warnings and accidental repeated products in the lower homepage sections.

## Journal Imagery

The homepage journal preview must not use:

- contact sheets;
- comparison sheets;
- technical/debug review images;
- manifest preview images.

Until high-quality editorial photos are curated, the homepage journal preview uses a text-first editorial mosaic with real article links and article metadata.

## Review Mode

`/?homeReview=1` exposes homepage review controls:

- motion on/off;
- grid;
- media bounds;
- section bounds;
- optical case bounds;
- asset quality;
- placement ids;
- render keys;
- static mode;
- reference overlay.

The review drawer may show asset paths and approval metadata. It is development-only and must not appear for normal users.

The final polish and premium reset review mode also exposes full-bleed bounds, material layers, typography scale, watch render size, source size, text bounds, asset dimensions, upscale warnings, CTA variants, section height, border count, and overflow markers so visual hierarchy and image fidelity regressions can be checked without changing production layout.

The final composition lock assigns target visual-height bands per use. Large renders remain bounded by the approved generated asset dimensions; the review drawer compares rendered and natural sizes and marks a placement when a measured render exceeds its loaded raster.
