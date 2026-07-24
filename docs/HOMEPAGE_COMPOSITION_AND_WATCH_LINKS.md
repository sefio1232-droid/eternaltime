# Homepage Composition And Watch Links

## Composition

Selection uses a 12-column desktop composition: copy in columns 1-4, a fully contained PR 100 profile in columns 5-9, and three independent criteria in columns 10-12. Criteria and connector lines stay outside the product silhouette. A divider and 64px transition separate Selection from Shortlist.

Comparison keeps the approved three-model editorial comparison. All model baselines and labels share the same vertical rhythm.

Collection is one continuous decision story: owned watches, detected gap, recommended next watch. The recommendation and its identity are kept inside a dedicated grid area; insights follow beneath the owned set. Mobile uses the same semantic order and a 2x2 owned-watch arrangement.

Journal uses warm ivory around a deep-navy lead, pale steel supporting material, and a champagne/bronze supporting material. The lead watch remains visible at 0.68 opacity. Article and product links are siblings, never nested.

## Watch Link Contract

`HomeScenarioWatch.href` is populated by the server-side Catalog Read Repository enrichment. `getHomeWatchHref()` exposes only canonical detail paths matching `/watches/{brandSlug}/{referenceSlug}`. Presentation components do not derive slugs from a title or raw reference.

Every resolved watch visual is a semantic Next.js `Link` with an accessible label, visible focus state, and restrained hover feedback. Missing canonical destinations remain visible but non-interactive and receive a review warning; the UI never invents a product URL.

The current local catalog dataset resolves 20 of the 24 curated orbit entries. The four unresolved entries are repeated placements of `T120.417.11.041.03`, which is absent from the 559 eligible Catalog Read Repository records. Lower-page reuse produces six visible missing-link warnings on the initial homepage. This remains a catalog-source limitation, not a presentation fallback.

## Accessibility And QA

- Watch hover is limited to a 3px lift and approximately 1.012 scale.
- Focus outlines remain visible on light and dark surfaces.
- Reduced motion removes watch transforms.
- Journal article and watch links are separate sibling anchors.
- Browser DOM checks found zero nested interactive elements.
- Local click/back checks confirmed resolved references, destination URLs, visible reference text, and HTTP 200 responses.

The 13 requested viewport screenshots and runtime report are local-only under `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-links\`.
