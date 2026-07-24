# Homepage Content Compression and Density

## User feedback

The accepted premium homepage was visually distinctive but felt too long and text-heavy. This pass treats "too much text" as a product issue: it reduces repetition, shortens the reading path, and keeps every existing product stage.

## Screenshot-confirmed problems

The previous composition reserved large spaces before finalist, next-watch, and Journal content became visible. Lower headings competed with the hero scale, light/dark transitions read as fog, and Collection placed the next watch in a nearly separate viewport.

## Copy baseline

The pre-pass server-rendered `<main>` contained 507 tokens, including 430 Cyrillic words and 3,727 text characters. This count includes model data and route controls as well as editorial copy.

## Copy reduction

The editorial review counter reports 260 homepage words: 104 body-copy words and 28 headline words. The final server-rendered `<main>` contains 368 total tokens, 279 Cyrillic words, and 2,438 text characters. That is a 35.1% Cyrillic-word reduction and a 34.6% character reduction from baseline.

Repeated watch identity in Shortlist and hidden Final CTA captions was removed. Scenario names remain unchanged, while their supporting descriptions now use two or three words. The six scenarios, models, routes, and product stages are intact.

## Old and new headings

- `Из десятков остаются четыре` became `Остаются четыре`.
- `Сравниваем не шум. Сравниваем различия.` became `Сравниваем главные различия`.
- `Коллекция показывает, чего ей не хватает` became `Коллекция подсказывает следующий шаг`.
- Journal became `Понять часы. Потом выбрать.`

## Old and new body copy

Hero, Ecosystem, Selection, Comparison, Collection, and Journal now use one short body thought each. Final CTA has no body paragraph. Excerpts were removed from the homepage Journal preview, while reading time and factual article links remain.

## Section height baseline

No trustworthy pre-edit runtime height was captured before production files changed, so this document does not invent a baseline pixel value. Screenshot review identified Selection/Shortlist separation, the isolated Collection PRX, and broad material transitions as the main contributors. The requested desktop composition budgets are the comparison baseline.

## Section height result

At 1440x900 the measured production layout is:

- Hero: 805px.
- Ecosystem: 605px.
- Selection and Shortlist: 1,267px.
- Comparison: 504px.
- Collection: 1,076px.
- Journal and Final CTA: 1,069px.

The complete document is 5,485px, or 6.09 viewport heights. At 1536x960 it is 5,743px and 5.98 viewport heights; at 1280x800 it is 5,078px and 6.35 viewport heights.

## Reveal timing changes

Reveal starts at threshold `0.06` with bottom root margin `18%`. Text uses 440-560ms durations, normal media 620-760ms, line drawing 700-760ms, and 60ms desktop stagger. Mobile starts at 75% text opacity, 45% media opacity, a maximum 10-12px translation, and 45ms stagger.

## Empty-state prevention

Layout-critical media is no longer fully hidden. General text starts at opacity 0.62; watches at 0.36; finalist material at 0.65; Journal lead at 0.55; supporting Journal stories at 0.70. Shortlist finalist begins no later than its first alternative. Runtime normal-scroll and fast-scroll checks reported zero late content and zero elements reserving more than 300px below opacity 0.5.

## Transition-zone changes

Dark material edges now resolve within 52px at substantially lower opacity. The two full-bleed dark chapters account for 208px of top and bottom transition material in total. There is no 108px fog band below the header.

## Hero transition verification

The 24-watch data model, 10,000ms step period, manual controls, and scenario jumps are unchanged. Orbit interpolation now guarantees at least 0.81 opacity for a center/incoming watch at the midpoint; product metadata geometry remains mounted and its muted state is at least 0.68.

The headless QA runtime forced `prefers-reduced-motion`, so it could not provide a truthful animated 40-second computed-style trace. Reduced-motion state remained fully visible; manual next changed the watch and scenario jump reached orbit index 12. Animated midpoint behavior remains covered by deterministic interpolation tests and should receive one visible-browser observation.

## Collection density

Collection uses three chapters inside one section: owned lineup and narrative, a bounded horizontal next-watch row, and the insight strip. The next watch is 320-360px on desktop, the row is capped at 440px, and both vertical gaps use the 48-64px range.

## Journal density

Journal intro, lead, and two supporting stories share one desktop row. The lead surface starts at opacity 0.55, supporting titles at 0.70, and homepage excerpts are removed. Journal plus Final CTA measures 1,069px at 1440px wide.

## Desktop result

The desktop runtime reported one `h1`, logical `h2` order, no image failures, no document-level horizontal overflow, no late fast-scroll content, and 6.09 viewport heights at 1440x900.

## Mobile result

Mobile uses compact section padding, shorter copy, no excerpts, and fully visible reduced-motion content. The hero heading uses a wider 10.5ch measure and line-height 1 so its five permitted lines do not collide. The document itself remains horizontally bounded; intentionally clipped orbit layers can extend beyond their local stage without increasing `scrollWidth`.

## Page-height comparison

Measured results:

| Viewport | Document height | Viewport count |
| --- | ---: | ---: |
| 1536x960 | 5,743px | 5.98 |
| 1440x900 | 5,485px | 6.09 |
| 1280x800 | 5,078px | 6.35 |
| 1024x768 | 5,744px | 7.48 |
| 768x1024 | 8,117px | 7.93 |
| 390x844 | 8,717px | 10.33 |

An exact before/after height percentage is unavailable because the initial dirty-worktree runtime was not measured before editing. Copy has an exact baseline and reduction; page height is reported against the requested 7-8 desktop viewport target.

## Runtime QA

Runtime QA covered `/`, `/?homeReview=1`, and `/?heroMotion=0`; six viewport sizes; normal and fast scroll; image loading; manual next, pause state, and scenario jump. Review mode exposes copy length, line count, section height, padding, empty-area estimate, reveal opacity and trigger, transition zones, viewport count, late content, and invisible reserved space.

Screenshots and the machine-readable runtime report are stored in the local temporary directory `C:\Users\Sergey\AppData\Local\Temp\eternal-time-homepage-density\`.

## Remaining limitations

- A visible browser should observe automatic orbit movement for 40 seconds because headless Chrome enforced reduced motion.
- The initial dirty-worktree document height was not captured, so no baseline pixel percentage is claimed.
- Tablet and mobile QA report locally clipped orbit/rail descendants, but `scrollWidth` equals `clientWidth`; there is no document-level horizontal scroll.
