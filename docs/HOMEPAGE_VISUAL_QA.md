# Homepage Visual QA

Status: runtime-checked in local headless Chrome; visible 40-second autoplay observation remains required because that environment forced reduced motion.

## Scope

Checked surface:

- `/`
- `/?homeReview=1`
- `/?heroMotion=0`
- production homepage hero
- consolidated homepage ecosystem sections

Out of scope:

- catalog pages
- brand pages
- Journal route redesign
- Supabase, imports, auth, checkout, payments, migrations

## Viewports To Check

- Desktop: `1536x960`
- Desktop: `1440x900`
- Tablet: `768x1024`
- Mobile: `390x844`
- Desktop compact: `1280x800`
- Tablet wide: `1024x768`

## Checklist

- Hero has real watch images and continuous 10-second orbit motion.
- Hero scenario rail uses: `На каждый день`, `Под рубашку`, `Для путешествий`, `Первая механика`, `Для спорта`, `В коллекцию`.
- Rejected rail labels are absent.
- Text remains readable on hero, section headlines, product meta, journal, and final CTA.
- Primary homepage model names are not truncated with ellipsis.
- Shortlist role labels are Russian display labels, not internal English role ids.
- Lower homepage order is: ecosystem path, selection + shortlist, comparison + purchase path, collection intelligence, journal + final CTA.
- Ecosystem Path and Collection Intelligence read as full-bleed dark chapters, not boxed dark panels inside the page container.
- The shortlist finalist is visually distinct from the secondary candidates.
- The comparison/purchase path reads as an ownership timeline, not as an admin table.
- Final CTA contains large real watch imagery and does not collapse into a text-only strip.
- Each repeated watch placement has a stable placement id.
- No repeated homepage component uses `key={watch.reference}`.
- Homepage does not call `/api/catalog/dev-images`.
- Homepage premium assets come from `public/generated/homepage-premium-assets/`.
- CTAs use real routes and no `href="#"`.
- No horizontal overflow on mobile.

## Review URLs

- `/`
- `/?homeReview=1`
- `/?homeReview=1&heroMotion=0`

Use the review drawer to toggle grid, full-bleed bounds, material layers, typography scale, media bounds, section bounds, text bounds, watch render size, source size, asset dimensions, upscale warnings, CTA variants, section height, copy length, line count, vertical padding, empty-area estimate, reveal initial opacity, reveal trigger point, transition zones, document viewport count, late content, invisible reserved space, border count, optical case bounds, placement ids, render keys, overflow elements, asset quality, static mode, and the reference overlay.

The final composition pass also provides composition grid, grid areas, text flow, watch stages, watch baselines, next-watch container, overlap violations, overflow element, texture opacity, and section heights. The drawer reports measured overflow and overlap results rather than relying only on CSS source checks.

## Density runtime result

- 1536x960: 5,743px / 5.98 viewports.
- 1440x900: 5,485px / 6.09 viewports.
- 1280x800: 5,078px / 6.35 viewports.
- 1024x768: 5,744px / 7.48 viewports.
- 768x1024: 8,117px / 7.93 viewports.
- 390x844: 8,717px / 10.33 viewports.
- Normal and fast scroll: zero late-content and invisible-reserved-space findings after reveal settled.
- Desktop document overflow: none.
- Image failures: none.
- `h1`: exactly one.

Runtime artifacts are local-only in `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-density\`.

## Targeted composition QA

The correction pass is accepted at desktop `1440x900` and mobile `390x844` when:

- Hero keeps at least one principal watch visually dominant throughout a handoff and annotation remains visible.
- Selection profile, attached criteria, finalist, and alternatives read as one continuous chapter.
- Comparison shows PR 100 34 mm, PR 100 40 mm, and Seastar Chronograph on a shared baseline.
- Collection presents four owned roles, the missing-accent marker, and Gold PRX on one shelf.
- Journal lead contains a clearly readable PRX macro visual.
- Final CTA is a single deep-navy chapter; its PRX Gold and Seastar pair is fully visible without a diagonal or split plane.
- Document width remains equal to viewport width and all product images load.

Targeted artifacts are stored in `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-targeted\`.

Final targeted runtime at `1440x900`: document 5,577px; Ecosystem 648px; Comparison 620px; Collection 975px. At `390x844`, `scrollWidth` equals `clientWidth` at 390px.

## Four-composition rebuild QA

Local Chrome verification produced zero document-level horizontal overflow and zero image failures at desktop and mobile widths. At `1440x900`, Comparison is 731px and the rebuilt Collection is visually continuous; at `390x844`, document width remains exactly 390px while the two approved internal rails remain horizontally scrollable. Six focused artifacts are stored in `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-four-compositions\`.

## Composition And Deep-Link Pass

- Selection is bounded above its divider; the watch, criteria, and connector lines no longer intersect.
- Collection reads as owned watches, gap, then recommendation on desktop and mobile.
- Journal uses navy, steel, and champagne surfaces with separate article and watch links.
- Browser DOM result: 16 rendered canonical watch links, 6 safe missing-link warnings, and 0 nested interactive elements on the initial viewport state.
- Ten resolved watch placements passed real click, destination-reference, HTTP 200, and back-navigation checks.
- The unresolved warnings all originate from repeated use of `T120.417.11.041.03`, which is not present in the current eligible catalog read dataset; no fake URL is emitted.
- Final desktop metrics: 0 horizontal document overflow, 0 image failures, and exactly 1 `h1`.

The 13 requested screenshots and runtime JSON are in `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-links\`.

## Product Diversity And Editorial Pass

- Selection centers exact-reference Casio `EFK-100D-2A`; its model identity is separated from the product image on desktop and mobile.
- Comparison keeps the approved three-watch structure and now uses eligible Seastar `T120.417.17.051.03` with its official exact-reference Tissot image and canonical route.
- Collection reads as Tissot `T150.417.11.041.00`, Casio `EFK-100D-2A`, Orient `RA-AC0018E30B`, and Citizen `NJ0210-13L`, followed by the gap and Orient `RA-AA0811E19B` recommendation.
- Journal uses Casio `MTG-B3000DN-1A`, Orient `RA-AC0022S30B`, and Citizen `NJ0210-56A` across navy, steel-blue, and burgundy editorial fields.
- Final CTA uses Citizen `NJ0210-13L` with Tissot `T137.407.33.051.00`; Gold PRX appears once outside the hero.
- Runtime DOM: 23 canonical watch links, 0 missing lower-section watch links, 0 nested interactive elements, and 0 image failures.
- All 12 unique watch routes and all 3 journal article routes returned HTTP 200 locally.
- At `1536x960`, `1440x900`, `1280x800`, `1024x768`, `768x1024`, and `390x844`, document `scrollWidth` equals `clientWidth`. Offscreen orbit children remain clipped inside the unchanged hero motion scene.
- Final focused screenshots and runtime JSON are in `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-density\`.

## Final Visual Lock

- Selection uses two fading hairline arcs, a restrained champagne marker, and a soft radial field instead of a closed ring. Mobile keeps one incomplete arc.
- Collection presents the four owned watches on one navy shelf, an incomplete gap marker, and the exact Orient `RA-AA0811E19B` recommendation directly on the same material.
- Homepage-only alpha derivatives preserve the original `328x492` Orient source dimensions for `RA-AC0018E30B` and `RA-AA0811E19B`; the source editorial assets remain unchanged.
- Collection mobile order is heading, body, owned `2x2`, gap, recommendation and actions, then insights.
- Journal keeps Casio, Orient, and Citizen in navy, steel, and oxblood editorial materials without white media rectangles.
- Gold PRX `T137.407.33.051.00` remains exclusive to the final CTA outside the hero.
- Runtime DOM remains at 23 canonical watch links across 12 unique routes, with 0 missing lower-section links, 0 nested interactive elements, and 0 image failures.
- Final QA covers `1536x960`, `1440x900`, `1280x800`, `1024x768`, `768x1024`, and `390x844`. Document width equals viewport width at every target.
- The 11 required focused/full-page screenshots and `runtime-report.json` are stored in `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-density\`.

## Seven-section recomposition

The final recomposition uses one 12-column editorial system across the seven lower homepage compositions:

- Ecosystem joins the editorial introduction, six-step path, and full PR 100 Chronograph stage.
- Selection gives Casio Edifice a transparent safe-area stage with attached criteria.
- Shortlist presents one finalist and three alternatives as one continuous field.
- Comparison aligns three product headers with five shared rows and a separate ownership timeline.
- Collection reads left to right as owned watches, a defined gap, and an Orient recommendation.
- Journal starts its intro, lead story, and two supporting stories on the same vertical axis.
- Final CTA keeps the Gold PRX and Citizen fully visible as one product pair.

Visual QA covers `1536x960`, `1440x900`, `1280x800`, `1024x768`, `768x1024`, and `390x844`. At every target, document `scrollWidth` equals `clientWidth`; the comparison matrix is the only intentional internal mobile scroller. The catalog-enriched development runtime contains 23 canonical watch links across 12 unique routes. The clean production runtime confirms one `h1`, zero image failures, zero nested interactive elements, zero hydration warnings, and the unchanged 10-second hero cycle.

The 15 focused/full-page screenshots and `runtime-report.json` are stored in:

`C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-final-recomposition\`
