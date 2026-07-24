# Homepage Final Composition Lock

## Screenshot-confirmed problems

The accepted premium direction still had unsafe composition in Collection, an ecommerce-like Shortlist, an over-separated Comparison, an oversized Final CTA headline, inconsistent watch scale, strong striped texture, disabled-looking actions, and horizontal overflow risk.

## Preserved architecture

The product sequence remains Kinetic Hero, Ecosystem Path, Personal Selection and Shortlist, Comparison and Purchase Path, Collection Intelligence, Journal, and Final CTA. The 24-watch orbit, six scenarios, 10-second autoplay, manual controls, reduced motion, curated assets, server-side catalog enrichment, placement identity, and production routes are unchanged.

## Hero composition

The hero controller is unchanged. The visible render window is limited to the center watch, one adjacent watch on each side, and at most one quiet hint on each side. Product annotation uses a 220-240px transparent field with top and bottom hairlines. Controls are three 44px transparent buttons. The scenario rail is a timeline; descriptions are hidden below 1500px.

## Ecosystem blueprint

The full-bleed dark section uses a 12-column container: copy in columns 1-5, a vertical six-step journey in columns 6-8, and the Seastar media stage in columns 9-12. All copy and captions remain in normal flow.

## Selection blueprint

Selection and Shortlist are one chapter. Copy occupies columns 1-5; an approved PR 100 asset forms a quiet watch profile in columns 6-12. Rhythm, fit, and role attach to that profile at three different levels with champagne points and hairlines. The profile light and selection line continue directly into the four-model shortlist.

## Shortlist blueprint

The board uses a six-column finalist material field and a six-column stack of three horizontal alternatives. `Остаются четыре` sits directly above the watches. The finalist and alternatives remain different editorial structures, not four repeated product cards; all names and reasons remain visible in normal flow.

## Comparison blueprint

The section uses columns 1-3 for narrative and columns 4-12 for three real models on one baseline: PR 100 34 mm, PR 100 40 mm, and Seastar Chronograph. The central PR 100 40 mm is optically dominant. A three-row editorial strip compares fit, movement, and role; the ownership journey remains one line with five points on desktop and becomes vertical on mobile.

## Collection blueprint

The collection is one continuous shelf: four owned roles, an explicit missing-accent marker, and the larger PRX Powermatic Gold as the next addition. All objects share one baseline and one dark chapter. Narrative and CTA sit above the same shelf; three open insights form a compact bottom strip. There is no separate next-watch screen.

## Journal blueprint

The 12-column editorial grid uses columns 1-4 for the intro, 5-9 for the lead story, and 10-12 for supporting stories. The lead `Как выбрать размер часов` carries a clearly visible PRX macro treatment; titles and metadata share aligned vertical anchors.

## Final CTA blueprint

The CTA is a full-width deep-navy chapter with no diagonal wedge or ivory split. Copy occupies columns 1-6 and a shared two-watch composition occupies columns 7-12. PRX Gold is primary; Seastar is a quieter companion on the same visual base.

## Watch scale contract

- Hero center: 400-520px visual height.
- Hero adjacent: 240-360px.
- Ecosystem: 340-430px.
- Shortlist finalist: 380-440px.
- Shortlist alternative: 120-170px.
- Comparison finalist: 320-370px.
- Collection owned: 210-265px.
- Collection next: 250-320px.
- Final CTA main: 390-460px.
- Final CTA secondary: 250-320px.

Rendered size is reduced when the approved source cannot support a target without upscale.

## Typography

Hero remains uppercase sans. Lower sections use normal-case editorial headings with serif accents where useful. Eyebrows and compact labels remain uppercase. Display sizes differ by section and do not reuse one giant heading scale.

## Density lock

Homepage copy uses one body thought per section and no Final CTA body. Desktop section spacing is limited to large `88-120px`, medium `64-88px`, and small `40-64px` tokens. After the targeted composition correction, 1440x900 measures 5,577px, or 6.20 viewport heights. The order, routes, references, and 24-watch hero controller remain locked.

## Targeted composition correction

The shared desktop content system uses a 1440px maximum, twelve columns, and `clamp(24px, 3vw, 48px)` gutters. Hero handoff keeps the center or incoming watch at 0.85 opacity or higher while product annotation geometry remains mounted.

Selection and Shortlist form one chapter: the shortlist label follows within 48px, the finalist and three alternatives share one top line, and the finalist image remains fully contained. Comparison uses columns `1-4 / 5-8 / 9-12` for narrative, watch, and criteria/path.

Collection is locked to one shelf: owned lineup, gap marker, and next watch in one normal-flow composition. Journal lead carries a readable macro visual made from an approved homepage asset. Final CTA is a single navy field with one overlapping two-watch group and no clipped diagonal plane.

Dark chapter edges use a 36px falloff with a hairline instead of broad fog-like transition bands.

## CTA variants

The four active variants are Primary Light, Secondary Light, Primary Dark, and Secondary Dark. Active actions never use a gray filled background.

## Material texture

Dark-section stripes are reduced to a low-contrast 0.1-opacity material trace. One radial light supports each main dark-section watch stage.

## Responsive layouts

Desktop uses 12 columns. Tablet changes sections to ordered eight-column or stacked compositions. Mobile uses one normal-flow column; Collection owned watches become a horizontal snap row, while the next watch remains separate.

## Overflow repair

Full-bleed sections own their content container and do not use `100vw` or negative viewport margins. The hero stage clips only its moving media. Review mode identifies any element whose measured rectangle crosses the document viewport.

## Runtime QA

Review URLs are `/`, `/?homeReview=1`, and `/?heroMotion=0`. Review mode reports absolute content count, overlap violations, overflow elements, CTA variants, section heights, rendered watch sizes, source sizes, and upscale warnings.

## Visual QA

The required viewport set is 1536x960, 1440x900, 1280x800, 1024x768, 768x1024, and 390x844. Collection headline/watch and CTA/watch intersections are zero-tolerance defects.

## Remaining limitations

The in-app browser connection must be available to produce authoritative screenshots and observe a full 40-second animation pass. Static checks and HTTP rendering do not replace that visual evidence.
